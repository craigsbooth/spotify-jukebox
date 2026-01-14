// routes/queue.js - Intelligent Jukebox Queue Engine
const express = require('express');
const router = express.Router();
const state = require('../state'); 
const sm = require('../state_manager');
const utils = require('../utils'); 
const playbackEngine = require('../playback_engine'); 

/**
 * 1. GET QUEUE
 * Merges the persistent Priority Queue with the volatile Suggestion Buffer.
 */
router.get('/queue', (req, res) => {
    const queue = state.partyQueue || [];
    const bag = state.shuffleBag || [];
    const priorityUris = new Set(queue.map(t => t.uri));

    // Map names from the global guest registry
    const displayQueue = queue.map(track => {
        let displayName = track.addedBy || "Guest";
        if (track.addedByGuestId && state.guestNames?.[track.addedByGuestId]) {
            displayName = state.guestNames[track.addedByGuestId];
        }
        return { ...track, addedBy: displayName, isFallback: false };
    });

    // Take top 10 from shuffle bag that aren't already in the priority queue
    const buffer = bag
        .filter(t => !priorityUris.has(t.uri))
        .slice(0, 10)
        .map(t => ({ ...utils.sanitizeTrack(t), isFallback: true }));

    res.json([...displayQueue, ...buffer]);
});

/**
 * 2. ADD / VOTE (Legacy + Token Economy)
 * Handles "Add Track" and "Upvote" actions with token spending.
 */
router.post('/queue', (req, res) => {
    const { uri, name, artist, albumArt, album, guestId } = req.body;
    if (!guestId) return res.status(400).json({ error: "No Guest ID" });
    
    const tokenCheck = sm.spendToken(guestId); 
    if (!tokenCheck.success) {
        return res.status(403).json({ success: false, message: "Not enough tokens!", balance: tokenCheck.balance });
    }

    const existingIndex = state.partyQueue.findIndex(t => t.uri === uri);
    const currentGuestName = state.guestNames?.[guestId] || "Guest";

    if (existingIndex !== -1) {
        // Increment votes but DO NOT re-sort (preserves manual DJ order)
        const track = state.partyQueue[existingIndex];
        
        // Ensure arrays exist
        if (!track.votedBy) track.votedBy = [];
        if (!track.downvotedBy) track.downvotedBy = [];
        
        if (!track.votedBy.includes(guestId)) {
            track.votedBy.push(guestId);
            // Recalculate Score
            track.votes = track.votedBy.length - track.downvotedBy.length;
        }

        sm.saveSettings();
        return res.json({ success: true, message: "Upvoted!", tokens: tokenCheck.balance });
    } else {
        // Add new track to the bottom of the priority queue
        const sanitized = utils.sanitizeTrack({ uri, name, artist, albumArt, album });
        state.partyQueue.push({ 
            ...sanitized,
            votes: 1, 
            addedBy: currentGuestName,
            addedByGuestId: guestId,
            votedBy: [guestId],
            downvotedBy: [], // NEW: Initialize Downvotes
            isFallback: false 
        });
        
        sm.saveSettings();
        return res.json({ success: true, message: "Added!", tokens: tokenCheck.balance });
    }
});

/**
 * 2.5. VOTE (NEW: DOWNVOTE / VETO)
 * Handles explicit Downvotes and Veto logic.
 */
router.post('/vote', (req, res) => {
    const { uri, guestId, type } = req.body; // type: 'UP' or 'DOWN'
    const voteType = type || 'UP'; 

    const trackIndex = state.partyQueue.findIndex(t => t.uri === uri);
    if (trackIndex === -1) return res.status(404).json({ error: "Track not found" });

    const track = state.partyQueue[trackIndex];

    // Initialize arrays if missing
    if (!track.votedBy) track.votedBy = [];
    if (!track.downvotedBy) track.downvotedBy = [];

    // Check if user has already interacted
    const hasUpvoted = track.votedBy.includes(guestId);
    const hasDownvoted = track.downvotedBy.includes(guestId);

    if (hasUpvoted || hasDownvoted) {
        return res.json({ success: false, message: "You have already voted on this track." });
    }

    if (voteType === 'DOWN') {
        track.downvotedBy.push(guestId);
        console.log(`👎 Downvote: ${track.name} by ${guestId}`);
    } else {
        track.votedBy.push(guestId);
        console.log(`👍 Upvote: ${track.name} by ${guestId}`);
    }

    // Recalculate Net Score
    track.votes = track.votedBy.length - track.downvotedBy.length;

    // VETO CHECK: If score drops to -3, delete the track
    if (track.votes <= -3) {
        state.partyQueue.splice(trackIndex, 1);
        console.log(`🚫 VETOED: ${track.name} was removed by community vote.`);
        sm.saveSettings();
        return res.json({ success: true, message: "Track Vetoed!", vetoed: true });
    }

    sm.saveSettings();
    res.json({ success: true, votes: track.votes });
});

/**
 * 3. REORDER & INTELLIGENT PROMOTION
 * Saves manual order. Only 'promotes' suggestions if dragged into the top zone.
 */
router.post('/reorder', (req, res) => {
    const incomingData = Array.isArray(req.body) ? req.body : req.body.queue;

    if (incomingData && Array.isArray(incomingData)) {
        // Logic: Only save tracks that were already real OR dragged into the priority area.
        const currentQueueSize = state.partyQueue.length;
        const newPriorityQueue = [];
        
        incomingData.forEach((track, index) => {
            const isAlreadyPriority = track.isFallback === false || track.isFallback === undefined;
            // If it's a fallback but moved into the "Real" list space, it's a promotion.
            const isDraggedToTop = track.isFallback === true && index < currentQueueSize + 1;

            if (isAlreadyPriority) {
                newPriorityQueue.push({
                    ...track,
                    isFallback: false,
                    votes: track.votes || 1
                });
            } 
            else if (isDraggedToTop) {
                // User intentionally dragged a suggestion up
                newPriorityQueue.push({
                    ...track,
                    isFallback: false, // Promotion!
                    votes: 1,
                    addedBy: "DJ Selection" 
                });
            }
        });

        state.partyQueue = newPriorityQueue;
        sm.saveSettings();
        res.json({ success: true, count: state.partyQueue.length });
    } else {
        res.status(400).json({ success: false, error: "Invalid queue format" });
    }
});

/**
 * 4. POP (UPDATED FIX)
 * Handles removal from BOTH the Priority Queue AND the Shuffle Bag.
 */
router.post('/pop', async (req, res) => {
    const topTrack = state.partyQueue[0]; // Check top of priority queue

    // Run the engine (this plays the song)
    const result = await playbackEngine.popNextTrack();

    if (result.success) {
        const playedUri = result.track.uri;

        // SCENARIO A: It was a Priority Track
        if (topTrack && topTrack.uri === playedUri) {
            console.log(`📉 Removing Priority Track: ${topTrack.name}`);
            state.partyQueue.shift();
            sm.saveSettings();
        } 
        // SCENARIO B: It was a Fallback Track (Priority was empty)
        else {
            console.log(`📉 Removing Fallback Track from Bag: ${result.track.name}`);
            // Find and remove this song from the shuffleBag so it doesn't stay in suggestions
            if (state.shuffleBag && state.shuffleBag.length > 0) {
                const initialLength = state.shuffleBag.length;
                state.shuffleBag = state.shuffleBag.filter(t => t.uri !== playedUri);
                
                // Only save if we actually removed something
                if (state.shuffleBag.length < initialLength) {
                    sm.saveSettings();
                }
            }
        }
        
        res.json(result.track);
    } else {
        res.status(500).json({ error: result.error || "Failed to pop" });
    }
});

/**
 * 5. REMOVE
 */
router.post('/remove', (req, res) => {
    const { uri } = req.body;
    state.partyQueue = state.partyQueue.filter(track => track.uri !== uri);
    sm.saveSettings();
    res.json({ success: true });
});

module.exports = router;