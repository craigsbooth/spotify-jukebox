// routes/queue.js - Simplified Priority-First Queue logic
const express = require('express');
const router = express.Router();
const state = require('../state'); 
const sm = require('../state_manager');
const utils = require('../utils'); 
const sse = require('../sse');
const playbackEngine = require('../playback_engine'); 
const sessions = require('../session_manager');

// HELPER: Get Active Party or Fail
const getParty = (res) => {
    const party = sessions.getActiveParty();
    if (!party) {
        res.status(503).json({ error: "No active party session. Host must log in." });
        return null;
    }
    return party;
};

// HELPER: Sync Bridge (Temporary)
const syncToGlobalState = (party) => {
    state.partyQueue = party.partyQueue;
    state.shuffleBag = party.shuffleBag;
    state.playedHistory = party.playedHistory;
    state.tokensEnabled = party.tokensEnabled;
    state.tokenRegistry = party.tokenRegistry;
    sm.saveSettings();
};

// GET Queue (View Only)
// REVERTED: Now strictly returns priority queue + suggestions without modifying state.
router.get('/queue', (req, res) => {
    const party = getParty(res);
    if (!party) return;

    const bag = Array.isArray(party.shuffleBag) ? party.shuffleBag : [];
    const priorityUris = new Set();
    party.partyQueue.forEach(t => priorityUris.add(t.uri));

    // Map Dynamic Names (using party-specific guest names)
    const displayQueue = party.partyQueue.map(track => {
        if (track.addedByGuestId && party.guestNames[track.addedByGuestId]) {
            return { ...track, addedBy: party.guestNames[track.addedByGuestId] };
        }
        return track;
    });

    // Build Buffer (The Suggestion List - not saved to partyQueue)
    const buffer = bag
        .filter(t => !utils.isInHistory(party.playedHistory, t.uri) && !priorityUris.has(t.uri))
        .slice(0, 10)
        .map(t => ({ ...utils.sanitizeTrack(t), isFallback: true }));

    res.json([...displayQueue, ...buffer]);
});

// ADD / VOTE
router.post('/queue', (req, res) => {
    const party = getParty(res);
    if (!party) return;

    const { uri, name, artist, albumArt, album, guestId } = req.body;
    if (!guestId) return res.status(400).json({ error: "No Guest ID" });
    
    const tokenCheck = sm.spendToken(guestId); 
    if (!tokenCheck.success) return res.status(403).json(tokenCheck); 

    const existingIndex = party.partyQueue.findIndex(t => t.uri === uri);
    
    if (existingIndex !== -1) {
        const track = party.partyQueue[existingIndex];
        if (track.votedBy?.includes(guestId)) {
            // Refund tokens if already voted
            if (party.tokensEnabled && party.tokenRegistry[guestId]) {
                party.tokenRegistry[guestId].balance += 1;
            }
            return res.json({ success: false, message: "Already voted!" });
        }
        track.votes += 1;
        track.votedBy.push(guestId);
        track.isFallback = false; 
        party.partyQueue.sort((a, b) => b.votes - a.votes);
        
        syncToGlobalState(party);
        return res.json({ success: true, message: "Upvoted!", tokens: tokenCheck.balance });
    } else {
        const sanitized = utils.sanitizeTrack({ uri, name, artist, albumArt, album });
        party.partyQueue.push({ 
            ...sanitized,
            votes: 1, 
            addedBy: party.guestNames[guestId] || "Guest", 
            addedByGuestId: guestId, 
            votedBy: [guestId], 
            isFallback: false 
        });
        party.partyQueue.sort((a, b) => b.votes - a.votes);
        
        syncToGlobalState(party);
        return res.json({ success: true, message: "Added to Queue!", tokens: tokenCheck.balance });
    }
});

// POP (Manual Next Button)
router.post('/pop', async (req, res) => {
    const party = getParty(res);
    if (!party) return;

    const result = await playbackEngine.popNextTrack();
    
    // Refresh party instance from synced global state
    party.partyQueue = state.partyQueue;
    party.currentPlayingTrack = state.currentPlayingTrack;

    if (result.success) {
        res.json(result.track);
    } else {
        res.status(500).json({ error: result.error || "Failed to pop" });
    }
});

// UTILS
router.post('/shuffle', async (req, res) => {
    const party = getParty(res);
    if (!party) return;

    const spotifyCtrl = require('../spotify_ctrl'); 
    
    if (!party.shuffleBag || party.shuffleBag.length === 0) {
        const count = await spotifyCtrl.refreshShuffleBag();
        party.shuffleBag = state.shuffleBag;
        return res.json({ success: true, count, method: 'downloaded' });
    }
    
    const count = spotifyCtrl.randomizeBag();
    party.shuffleBag = state.shuffleBag; 
    res.json({ success: true, count, method: 'randomized' });
});

router.post('/remove', (req, res) => {
    const party = getParty(res);
    if (!party) return;

    const uriToRemove = req.body.uri;
    party.partyQueue = party.partyQueue.filter(track => track.uri !== uriToRemove);
    
    if (Array.isArray(party.shuffleBag)) {
        party.shuffleBag = party.shuffleBag.filter(track => track.uri !== uriToRemove);
    }
    
    syncToGlobalState(party);
    res.json({ success: true });
});

router.post('/reorder', (req, res) => {
    const party = getParty(res);
    if (!party) return;

    if (Array.isArray(req.body.queue)) {
        party.partyQueue = req.body.queue
            .filter(t => !t.isFallback) // Strictly maintain priority items only
            .map(t => ({
                ...t,
                isFallback: false,
                votes: t.votes || 0,
                votedBy: t.votedBy || []
            }));
        syncToGlobalState(party);
    }
    res.json({ success: true });
});

router.get('/queue/current', async (req, res) => {
    const party = getParty(res);
    if (!party) return;

    try {
        const spotifyApi = require('../spotify_instance');
        let current = party.currentPlayingTrack || state.currentPlayingTrack;

        if (!current) {
            const data = await spotifyApi.getMyCurrentPlayingTrack();
            if (data?.body?.item) {
                const rawTrack = {
                    name: data.body.item.name,
                    artist: data.body.item.artists[0].name,
                    uri: data.body.item.uri,
                    albumArt: data.body.item.album.images[0]?.url,
                    duration_ms: data.body.item.duration_ms
                };
                current = utils.sanitizeTrack(rawTrack);
                party.currentPlayingTrack = current;
            }
        }
        
        if (current?.addedByGuestId) {
             const freshName = party.guestNames[current.addedByGuestId];
             if (freshName) current.addedBy = freshName;
        }
        
        res.json(current);
    } catch (err) {
        res.json(party.currentPlayingTrack || null);
    }
});

module.exports = router;