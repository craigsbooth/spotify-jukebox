// routes/queue.js - Hardened Deduplication & Auto-Demotion (Multi-Host Ready)
const express = require('express');
const router = express.Router();
const state = require('../state'); // Legacy global state (kept for bridge sync)
const sm = require('../state_manager');
const utils = require('../utils'); 
const sse = require('../sse');
const playbackEngine = require('../playback_engine'); 
const sessions = require('../session_manager'); // NEW: Source of Truth

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
// Ensures that changes to the Party Instance are reflected in the Global State
// so that the Playback Engine (not yet updated) can still see the queue.
const syncToGlobalState = (party) => {
    state.partyQueue = party.partyQueue;
    state.shuffleBag = party.shuffleBag;
    state.playedHistory = party.playedHistory;
    state.tokensEnabled = party.tokensEnabled;
    state.tokenRegistry = party.tokenRegistry;
    // Persist to disk
    sm.saveSettings();
};

// GET Queue (View Only)
router.get('/queue', (req, res) => {
    const party = getParty(res);
    if (!party) return;

    // 1. AUTO-DEMOTION: Filter out "Stuck" fallback tracks from the Party Queue
    const cleanPartyQueue = [];
    party.partyQueue.forEach(track => {
        const isStuckFallback = (track.isFallback || track.addedBy === 'Fallback Track') && (!track.votes || track.votes === 0);
        if (!isStuckFallback) {
            cleanPartyQueue.push(track);
        }
    });

    // Apply the cleanup
    if (party.partyQueue.length !== cleanPartyQueue.length) {
        party.partyQueue = cleanPartyQueue;
        syncToGlobalState(party);
        console.log("🧹 Auto-Demotion: Cleared stuck fallback tracks from Priority Queue.");
    }

    const bag = Array.isArray(party.shuffleBag) ? party.shuffleBag : [];
    const priorityUris = new Set();
    party.partyQueue.forEach(t => priorityUris.add(t.uri));

    // Dynamic Names (using party-specific guest names)
    const dynamicQueue = party.partyQueue.map(track => {
        if (track.addedByGuestId && party.guestNames[track.addedByGuestId]) {
            return { ...track, addedBy: party.guestNames[track.addedByGuestId] };
        }
        return track;
    });
    party.partyQueue = dynamicQueue;

    // Build Buffer (The Fallback List)
    const buffer = bag
        .filter(t => !utils.isInHistory(party.playedHistory, t.uri) && !priorityUris.has(t.uri))
        .slice(0, 10)
        .map(t => ({ ...utils.sanitizeTrack(t), isFallback: true }));

    res.json([...party.partyQueue, ...buffer]);
});

// ADD / VOTE
router.post('/queue', (req, res) => {
    const party = getParty(res);
    if (!party) return;

    const { uri, name, artist, albumArt, album, guestId } = req.body;
    if (!guestId) return res.status(400).json({ error: "No Guest ID" });
    
    // Use State Manager but pass the PARTY's registry if possible, 
    // note: sm.spendToken currently uses global state. 
    // For now, we rely on the sync at the end to keep them aligned.
    const tokenCheck = sm.spendToken(guestId); 
    if (!tokenCheck.success) return res.status(403).json(tokenCheck); 

    const existingIndex = party.partyQueue.findIndex(t => t.uri === uri);
    
    if (existingIndex !== -1) {
        const track = party.partyQueue[existingIndex];
        if (track.votedBy?.includes(guestId)) {
            // Refund (Manually update party registry)
            if (party.tokensEnabled && party.tokenRegistry[guestId]) {
                party.tokenRegistry[guestId].balance += 1;
            }
            syncToGlobalState(party);
            return res.json({ success: false, message: "Already voted!" });
        }
        track.votes += 1;
        track.votedBy.push(guestId);
        track.isFallback = false; // Promoted!
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

    // Playback Engine still uses global state, which is fine because we are syncing.
    const result = await playbackEngine.popNextTrack();
    
    // We should refresh our local party instance after the pop
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
    
    // If empty, download
    if (!party.shuffleBag || party.shuffleBag.length === 0) {
        const count = await spotifyCtrl.refreshShuffleBag();
        // Refresh bag from global state after controller action
        party.shuffleBag = state.shuffleBag;
        return res.json({ success: true, count, method: 'downloaded' });
    }
    
    // Instant Shuffle
    const count = spotifyCtrl.randomizeBag();
    party.shuffleBag = state.shuffleBag; // Sync back
    res.json({ success: true, count, method: 'randomized' });
});

router.post('/remove', (req, res) => {
    const party = getParty(res);
    if (!party) return;

    const uriToRemove = req.body.uri;
    const initialLength = party.partyQueue.length;
    
    party.partyQueue = party.partyQueue.filter(track => track.uri !== uriToRemove);
    
    if (party.partyQueue.length === initialLength && Array.isArray(party.shuffleBag)) {
        party.shuffleBag = party.shuffleBag.filter(track => track.uri !== uriToRemove);
    }
    
    syncToGlobalState(party);
    res.json({ success: true });
});

router.post('/reorder', (req, res) => {
    const party = getParty(res);
    if (!party) return;

    if (Array.isArray(req.body.queue)) {
        party.partyQueue = req.body.queue.map(t => {
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
        syncToGlobalState(party);
    }
    res.json({ success: true });
});

router.get('/queue/current', async (req, res) => {
    const party = getParty(res);
    if (!party) return;

    try {
        const spotifyApi = require('../spotify_instance');
        
        // Prioritize the party's track, but fallback to global if synced
        let current = party.currentPlayingTrack || state.currentPlayingTrack;

        if (!current) {
            const data = await spotifyApi.getMyCurrentPlayingTrack();
            if (data && data.body && data.body.item) {
                const rawTrack = {
                    name: data.body.item.name,
                    artist: data.body.item.artists[0].name,
                    uri: data.body.item.uri,
                    albumArt: data.body.item.album.images[0]?.url,
                    duration_ms: data.body.item.duration_ms
                };
                current = utils.sanitizeTrack(rawTrack);
                party.currentPlayingTrack = current;
                // No need to full sync here, just updating read state
            }
        }
        
        if (current && current.addedByGuestId) {
             const freshName = party.guestNames[current.addedByGuestId];
             if (freshName) current.addedBy = freshName;
        }
        
        res.json(current);
    } catch (err) {
        res.json(party.currentPlayingTrack || null);
    }
});

module.exports = router;