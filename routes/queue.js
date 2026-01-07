// routes/queue.js - Hardened Deduplication & Auto-Demotion
const express = require('express');
const router = express.Router();
const state = require('../state');
const sm = require('../state_manager');
const utils = require('../utils'); 
const sse = require('../sse');
const playbackEngine = require('../playback_engine'); 

// GET Queue (View Only)
router.get('/queue', (req, res) => {
    // 1. AUTO-DEMOTION: Filter out "Stuck" fallback tracks from the Party Queue
    // If a track is in the priority queue but has 0 votes and is a fallback, 
    // it doesn't belong there. It blocks the shuffle.
    const cleanPartyQueue = [];
    state.partyQueue.forEach(track => {
        const isStuckFallback = (track.isFallback || track.addedBy === 'Fallback Track') && (!track.votes || track.votes === 0);
        if (!isStuckFallback) {
            cleanPartyQueue.push(track);
        }
    });
    // Apply the cleanup to the state
    if (state.partyQueue.length !== cleanPartyQueue.length) {
        state.partyQueue = cleanPartyQueue;
        // We don't need to add them back to shuffleBag because shuffleBag is a full copy anyway
        console.log("🧹 Auto-Demotion: Cleared stuck fallback tracks from Priority Queue.");
    }

    const bag = Array.isArray(state.shuffleBag) ? state.shuffleBag : [];
    const priorityUris = new Set();
    state.partyQueue.forEach(t => priorityUris.add(t.uri));

    // Dynamic Names
    const dynamicQueue = state.partyQueue.map(track => {
        if (track.addedByGuestId && state.guestNames[track.addedByGuestId]) {
            return { ...track, addedBy: state.guestNames[track.addedByGuestId] };
        }
        return track;
    });
    state.partyQueue = dynamicQueue;

    // Build Buffer (The Fallback List)
    const buffer = bag
        .filter(t => !utils.isInHistory(state.playedHistory, t.uri) && !priorityUris.has(t.uri))
        .slice(0, 10)
        .map(t => ({ ...utils.sanitizeTrack(t), isFallback: true }));

    res.json([...state.partyQueue, ...buffer]);
});

// ADD / VOTE
router.post('/queue', (req, res) => {
    const { uri, name, artist, albumArt, album, guestId } = req.body;
    if (!guestId) return res.status(400).json({ error: "No Guest ID" });
    
    const tokenCheck = sm.spendToken(guestId);
    if (!tokenCheck.success) return res.status(403).json(tokenCheck); 

    const existingIndex = state.partyQueue.findIndex(t => t.uri === uri);
    
    if (existingIndex !== -1) {
        const track = state.partyQueue[existingIndex];
        if (track.votedBy?.includes(guestId)) {
            // Refund
            if (state.tokensEnabled && state.tokenRegistry[guestId]) {
                state.tokenRegistry[guestId].balance += 1;
            }
            return res.json({ success: false, message: "Already voted!" });
        }
        track.votes += 1;
        track.votedBy.push(guestId);
        track.isFallback = false; // Promoted!
        state.partyQueue.sort((a, b) => b.votes - a.votes);
        sm.saveSettings();
        return res.json({ success: true, message: "Upvoted!", tokens: tokenCheck.balance });
    } else {
        const sanitized = utils.sanitizeTrack({ uri, name, artist, albumArt, album });
        state.partyQueue.push({ 
            ...sanitized,
            votes: 1, 
            addedBy: state.guestNames[guestId] || "Guest", 
            addedByGuestId: guestId, 
            votedBy: [guestId], 
            isFallback: false 
        });
        state.partyQueue.sort((a, b) => b.votes - a.votes);
        sm.saveSettings();
        return res.json({ success: true, message: "Added to Queue!", tokens: tokenCheck.balance });
    }
});

// POP (Manual Next Button)
router.post('/pop', async (req, res) => {
    const result = await playbackEngine.popNextTrack();
    if (result.success) {
        res.json(result.track);
    } else {
        res.status(500).json({ error: result.error || "Failed to pop" });
    }
});

// UTILS
router.post('/shuffle', async (req, res) => {
    const spotifyCtrl = require('../spotify_ctrl'); 
    
    // If empty, download
    if (!state.shuffleBag || state.shuffleBag.length === 0) {
        const count = await spotifyCtrl.refreshShuffleBag();
        return res.json({ success: true, count, method: 'downloaded' });
    }
    
    // Instant Shuffle
    const count = spotifyCtrl.randomizeBag();
    res.json({ success: true, count, method: 'randomized' });
});

router.post('/remove', (req, res) => {
    const uriToRemove = req.body.uri;
    const initialLength = state.partyQueue.length;
    state.partyQueue = state.partyQueue.filter(track => track.uri !== uriToRemove);
    if (state.partyQueue.length === initialLength && Array.isArray(state.shuffleBag)) {
        state.shuffleBag = state.shuffleBag.filter(track => track.uri !== uriToRemove);
    }
    res.json({ success: true });
});

router.post('/reorder', (req, res) => {
    if (Array.isArray(req.body.queue)) {
        state.partyQueue = req.body.queue.map(t => {
            const isRadioOrigin = t.addedBy === 'Fallback Track' || t.isFallback === true;
            const hasVotes = (t.votes || 0) > 0;
            return {
                ...t,
                isFallback: hasVotes ? false : isRadioOrigin, 
                addedBy: t.addedBy || 'Fallback Track',
                votes: t.votes || 0,
                votedBy: t.votedBy || []
            };
        });
        sm.saveSettings();
    }
    res.json({ success: true });
});

router.get('/queue/current', async (req, res) => {
    try {
        const spotifyApi = require('../spotify_instance');
        if (!state.currentPlayingTrack) {
            const data = await spotifyApi.getMyCurrentPlayingTrack();
            if (data && data.body && data.body.item) {
                const rawTrack = {
                    name: data.body.item.name,
                    artist: data.body.item.artists[0].name,
                    uri: data.body.item.uri,
                    albumArt: data.body.item.album.images[0]?.url,
                    duration_ms: data.body.item.duration_ms
                };
                state.currentPlayingTrack = utils.sanitizeTrack(rawTrack);
            }
        }
        if (state.currentPlayingTrack && state.currentPlayingTrack.addedByGuestId) {
             const freshName = state.guestNames[state.currentPlayingTrack.addedByGuestId];
             if (freshName) state.currentPlayingTrack.addedBy = freshName;
        }
        res.json(state.currentPlayingTrack);
    } catch (err) {
        res.json(state.currentPlayingTrack || null);
    }
});

module.exports = router;