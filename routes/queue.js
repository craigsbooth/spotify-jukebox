// routes/queue.js - Hardened Deduplication & Pro Logic
const express = require('express');
const router = express.Router();
const state = require('../state');
const intel = require('../intel_engine');
const spotifyApi = require('../spotify_instance'); // Added: Required for the /current sync
const spotifyCtrl = require('../spotify_ctrl');
const sm = require('../state_manager');

const isInHistory = (uri) => {
    if (state.playedHistory instanceof Set) return state.playedHistory.has(uri);
    if (Array.isArray(state.playedHistory)) return state.playedHistory.includes(uri);
    return false;
};

/**
 * FIXED: Deduplicated Queue Delivery
 * Ensures that if a track is in the Party Queue, it is REMOVED from the shuffle buffer.
 */
router.get('/queue', (req, res) => {
    const bag = Array.isArray(state.shuffleBag) ? state.shuffleBag : [];
    
    // Create a Set of URIs currently in the priority queue for O(1) lookup
    const priorityUris = new Set(state.partyQueue.map(t => t.uri));

    // Filter the buffer: 1. Not in History, 2. NOT already in the Priority Queue
    const buffer = bag
        .filter(t => !isInHistory(t.uri) && !priorityUris.has(t.uri))
        .slice(0, 10)
        .map(t => ({ ...t, isFallback: true })); // Explicitly flag for UI differentiation

    res.json([...state.partyQueue, ...buffer]);
});

router.post('/queue', (req, res) => {
    const { uri, name, artist, albumArt, album, guestId } = req.body;
    if (!guestId) return res.status(400).json({ error: "No Guest ID" });
    
    // Delegation to state manager to ensure saveSettings() is called
    const existingIndex = state.partyQueue.findIndex(t => t.uri === uri);
    
    if (existingIndex !== -1) {
        const track = state.partyQueue[existingIndex];
        if (track.votedBy?.includes(guestId)) return res.json({ success: false, message: "Already voted!" });
        
        track.votes += 1;
        track.votedBy.push(guestId);
        track.isFallback = false; // Promotion: It is no longer a fallback track
        
        state.partyQueue.sort((a, b) => b.votes - a.votes);
        sm.saveSettings();
        return res.json({ success: true, message: "Upvoted!" });
    } else {
        state.partyQueue.push({ 
            uri, name, artist, albumArt, album, 
            votes: 1, 
            addedBy: state.guestNames[guestId] || "Guest", 
            votedBy: [guestId], 
            isFallback: false 
        });
        state.partyQueue.sort((a, b) => b.votes - a.votes);
        sm.saveSettings();
        return res.json({ success: true, message: "Added to Queue!" });
    }
});

router.post('/pop', async (req, res) => {
    let nextTrack = null;

    // 1. Check Guest Queue
    if (state.partyQueue.length > 0) {
        nextTrack = state.partyQueue.shift();
    } 
    // 2. Check Shuffle Bag
    else {
        const bag = Array.isArray(state.shuffleBag) ? state.shuffleBag : [];
        nextTrack = bag.find(t => !isInHistory(t.uri));

        if (!nextTrack && bag.length > 0) {
            console.log("♻️ Queue: Pool exhausted. Clearing history to loop fallback.");
            if (state.playedHistory instanceof Set) state.playedHistory.clear();
            else state.playedHistory = new Set();
            nextTrack = bag[0];
        }
    }
    
    if (nextTrack) {
        if (state.playedHistory instanceof Set) {
            state.playedHistory.add(nextTrack.uri);
        } else {
            state.playedHistory = new Set([nextTrack.uri]);
        }

        // --- CRITICAL FIX ---
        // We REMOVED 'await'. The research now happens in the background.
        // The music starts IMMEDIATELY.
        intel.analyzeTrack(nextTrack).catch(err => console.error("Intel background error:", err));

        state.currentPlayingTrack = { ...nextTrack, startedAt: Date.now() };
        res.json(state.currentPlayingTrack);
    } else {
        await spotifyCtrl.refreshShuffleBag();
        res.status(404).json({ error: "Station Empty. Please add tracks or set a Fallback Playlist." });
    }
});

router.post('/shuffle', async (req, res) => {
    const count = await spotifyCtrl.refreshShuffleBag();
    res.json({ success: true, count });
});

router.post('/remove', (req, res) => {
    state.partyQueue = state.partyQueue.filter(track => track.uri !== req.body.uri);
    res.json({ success: true });
});

router.post('/reorder', (req, res) => {
    if (Array.isArray(req.body.queue)) state.partyQueue = req.body.queue.filter(t => !t.isFallback);
    res.json({ success: true });
});

// --- UPDATED INTELLIGENCE BRIDGE ---
router.get('/current', async (req, res) => {
    try {
        // If state is empty, perform a live fetch from Spotify to re-sync
        if (!state.currentPlayingTrack) {
            const data = await spotifyApi.getMyCurrentPlayingTrack();
            if (data && data.body && data.body.item) {
                state.currentPlayingTrack = {
                    name: data.body.item.name,
                    artist: data.body.item.artists[0].name,
                    uri: data.body.item.uri,
                    albumArt: data.body.item.album.images[0]?.url,
                    duration_ms: data.body.item.duration_ms
                };
            }
        }
        res.json(state.currentPlayingTrack);
    } catch (err) {
        // Fallback to current state if API call fails
        res.json(state.currentPlayingTrack || null);
    }
});

module.exports = router;