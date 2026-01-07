// playback_engine.js - The Central DJ Brain (Multi-Host Ready)
const state = require('./state'); // Legacy Global State (Sync Target)
const sessions = require('./session_manager'); // NEW: Source of Truth
const spotifyCtrl = require('./spotify_ctrl');
const intel = require('./intel_engine');
const sse = require('./sse');
const utils = require('./utils');
const sm = require('./state_manager');

// Helper: Fetch Lyrics
const fetchLyrics = async (track) => {
    if (!track || !track.name || !track.artist) return null;
    try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(track.artist)}&track_name=${encodeURIComponent(track.name)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return {
            synced: data.syncedLyrics || null,
            plain: data.plainLyrics || null
        };
    } catch (e) {
        return null;
    }
};

// Helper: Sync Bridge
// Ensures that when the engine picks a track, both the Party Instance and Global State match.
const syncState = (party, track) => {
    // Update Party
    if (party) {
        party.currentPlayingTrack = track;
        party.partyQueue = party.partyQueue; // Queue was shifted in logic below
        party.playedHistory.add(track.uri);
    }

    // Update Global (Legacy UI Support)
    state.currentPlayingTrack = track;
    state.partyQueue = party ? party.partyQueue : state.partyQueue;
    
    if (state.playedHistory instanceof Set) state.playedHistory.add(track.uri);
    else state.playedHistory = new Set([track.uri]);
    
    sm.saveSettings(); // Persist to disk
};

const popNextTrack = async () => {
    // 1. Resolve Target State (Party vs Global)
    const party = sessions.getActiveParty();
    const targetState = party || state; // Fallback to global if no party

    // Prevent double-popping
    if (targetState.isPopping) return { success: false, message: "Already popping" };
    targetState.isPopping = true;

    try {
        let nextTrack = null;

        // 2. Check Guest Queue
        if (targetState.partyQueue.length > 0) {
            nextTrack = targetState.partyQueue.shift();
            console.log(`🎯 Engine: Popped Guest Track - ${nextTrack.name}`);
        } 
        // 3. Check Shuffle Bag
        else {
            const bag = Array.isArray(targetState.shuffleBag) ? targetState.shuffleBag : [];
            
            // Check History (Support both Set and Array just in case)
            const historySet = targetState.playedHistory instanceof Set 
                ? targetState.playedHistory 
                : new Set(targetState.playedHistory || []);

            nextTrack = bag.find(t => !historySet.has(t.uri));

            if (!nextTrack && bag.length > 0) {
                console.log("♻️ Engine: Pool exhausted. Clearing history.");
                if (targetState.playedHistory instanceof Set) targetState.playedHistory.clear();
                nextTrack = bag[0];
            }
        }
        
        if (nextTrack) {
            // PLAY IT
            const success = await spotifyCtrl.playTrack(nextTrack.uri);
            if (!success) console.warn("⚠️ Engine: Spotify Play Request returned false, but updating state anyway.");

            const sanitized = utils.sanitizeTrack(nextTrack);
            intel.analyzeTrack(sanitized).catch(err => console.error(err));

            // Create Final Track Object
            const finalTrackObj = { 
                ...sanitized, 
                startedAt: Date.now(),
                duration_ms: sanitized.duration_ms || nextTrack.duration_ms || 180000, 
                addedBy: nextTrack.addedBy,
                addedByGuestId: nextTrack.addedByGuestId,
                lyrics: null 
            };

            // SYNC UPDATES
            syncState(party, finalTrackObj);

            // Broadcast Updates
            sse.send('THEME_UPDATE', { isSpotifyPlaying: true });

            // Fetch Lyrics
            fetchLyrics(sanitized).then(lyrics => {
                // Check against Global State as it is the "Rendered" truth
                if (state.currentPlayingTrack && state.currentPlayingTrack.uri === sanitized.uri) {
                    state.currentPlayingTrack.lyrics = lyrics;
                    if (party) party.currentPlayingTrack.lyrics = lyrics; // Keep party in sync
                    sse.send('LYRICS_UPDATE', { lyrics, trackUri: sanitized.uri });
                }
            });

            targetState.isPopping = false;
            return { success: true, track: finalTrackObj };
        } else {
            // Empty? Try to refresh.
            await spotifyCtrl.refreshShuffleBag();
            targetState.isPopping = false;
            return { success: false, error: "Station Empty" };
        }
    } catch (e) {
        console.error("Pop Error:", e);
        targetState.isPopping = false;
        return { success: false, error: e.message };
    }
};

module.exports = { popNextTrack };