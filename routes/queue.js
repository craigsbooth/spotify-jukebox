// routes/queue.js - Hardened Deduplication & Pro Logic
const express = require('express');
const router = express.Router();
const state = require('../state');
const intel = require('../intel_engine');
const spotifyApi = require('../spotify_instance'); 
const spotifyCtrl = require('../spotify_ctrl');
const sm = require('../state_manager');
const utils = require('../utils'); // Import Shared Utils

/**
 * FIXED: Deduplicated Queue Delivery
 * Ensures that if a track is in the Party Queue, it is REMOVED from the shuffle buffer.
 * Mounted at: GET /api/queue
 */
router.get('/queue', (req, res) => {
    const bag = Array.isArray(state.shuffleBag) ? state.shuffleBag : [];
    
    // Create Set directly from the queue for O(1) lookups
    const priorityUris = new Set();
    state.partyQueue.forEach(t => priorityUris.add(t.uri));

    // --- DYNAMIC NAME RESOLUTION ---
    // Iterate through the Party Queue and update the "addedBy" name 
    // based on the latest Guest ID registry.
    const dynamicQueue = state.partyQueue.map(track => {
        // If we have a stored Guest ID, look up the freshest name
        if (track.addedByGuestId && state.guestNames[track.addedByGuestId]) {
            return { ...track, addedBy: state.guestNames[track.addedByGuestId] };
        }
        return track;
    });
    // Update state to reflect fresh names (optional, but keeps state clean)
    state.partyQueue = dynamicQueue;

    // Filter the buffer: 1. Not in History, 2. NOT already in the Priority Queue
    const buffer = bag
        .filter(t => !utils.isInHistory(state.playedHistory, t.uri) && !priorityUris.has(t.uri))
        .slice(0, 10)
        .map(t => ({ 
            ...utils.sanitizeTrack(t), // <--- FIX: Clean up "Remastered/Feat" on Fallback tracks
            isFallback: true 
        }));

    res.json([...state.partyQueue, ...buffer]);
});

/**
 * Handle Guest Requests and Voting
 * UPDATED: Integrated Token Economy
 * Mounted at: POST /api/queue
 */
router.post('/queue', (req, res) => {
    const { uri, name, artist, albumArt, album, guestId } = req.body;
    if (!guestId) return res.status(400).json({ error: "No Guest ID" });
    
    // --- TOKEN GATEKEEPER ---
    const tokenCheck = sm.spendToken(guestId);
    if (!tokenCheck.success) {
        return res.status(403).json(tokenCheck); 
    }

    const existingIndex = state.partyQueue.findIndex(t => t.uri === uri);
    
    if (existingIndex !== -1) {
        const track = state.partyQueue[existingIndex];
        
        // Refund if already voted
        if (track.votedBy?.includes(guestId)) {
            if (state.tokensEnabled && state.tokenRegistry[guestId]) {
                state.tokenRegistry[guestId].balance += 1;
            }
            return res.json({ success: false, message: "Already voted!" });
        }
        
        track.votes += 1;
        track.votedBy.push(guestId);
        track.isFallback = false; // Promotion
        
        state.partyQueue.sort((a, b) => b.votes - a.votes);
        sm.saveSettings();
        return res.json({ 
            success: true, 
            message: "Upvoted!", 
            tokens: tokenCheck.balance 
        });
    } else {
        // SANITIZATION UPDATE: Use Utils
        const sanitized = utils.sanitizeTrack({ uri, name, artist, albumArt, album });
        
        state.partyQueue.push({ 
            ...sanitized,
            votes: 1, 
            addedBy: state.guestNames[guestId] || "Guest", 
            addedByGuestId: guestId, // <--- CRITICAL: Store the ID for future lookups
            votedBy: [guestId], 
            isFallback: false 
        });
        state.partyQueue.sort((a, b) => b.votes - a.votes);
        sm.saveSettings();
        return res.json({ 
            success: true, 
            message: "Added to Queue!", 
            tokens: tokenCheck.balance 
        });
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
        nextTrack = bag.find(t => !utils.isInHistory(state.playedHistory, t.uri));

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

        // --- EXECUTION LINK ---
        await spotifyCtrl.playTrack(nextTrack.uri);

        // --- SANITIZATION FIX ---
        const sanitized = utils.sanitizeTrack(nextTrack);

        // Analysis happens in background
        intel.analyzeTrack(sanitized).catch(err => console.error("Intel background error:", err));

        // Transfer the Guest ID info to the current playing track so Projector can see it
        state.currentPlayingTrack = { 
            ...sanitized, 
            startedAt: Date.now(),
            addedBy: nextTrack.addedBy,
            addedByGuestId: nextTrack.addedByGuestId // Pass it through
        };
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
    const uriToRemove = req.body.uri;
    
    // 1. Try removing from Party Queue
    const initialLength = state.partyQueue.length;
    state.partyQueue = state.partyQueue.filter(track => track.uri !== uriToRemove);
    
    // 2. If not found/removed in Party Queue, remove from Shuffle Bag (Fallback)
    if (state.partyQueue.length === initialLength && Array.isArray(state.shuffleBag)) {
        state.shuffleBag = state.shuffleBag.filter(track => track.uri !== uriToRemove);
        console.log(`🗑️ Removed ${uriToRemove} from Shuffle Bag`);
    }

    res.json({ success: true });
});

// FIX: ALLOW REORDERING & SET CORRECT FALLBACK LABEL
router.post('/reorder', (req, res) => {
    if (Array.isArray(req.body.queue)) {
        // We map the new queue. If a track was a "Fallback" (isFallback: true),
        // we flip it to false because the Host has explicitly ordered it.
        // We set addedBy to 'Fallback Track' so the UI knows to show the Radio icon.
        state.partyQueue = req.body.queue.map(t => ({
            ...t,
            isFallback: false, // Lock it in
            addedBy: t.addedBy || 'Fallback Track',
            // If it was a fallback, it has no guest ID, so addedByGuestId remains undefined
            votes: t.votes || 0,
            votedBy: t.votedBy || []
        }));
        
        sm.saveSettings();
    }
    res.json({ success: true });
});

/**
 * --- UPDATED INTELLIGENCE BRIDGE ---
 * Mounted at: GET /api/queue/current
 */
router.get('/queue/current', async (req, res) => {
    try {
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
        
        // DYNAMIC RESOLUTION FOR CURRENT TRACK TOO
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