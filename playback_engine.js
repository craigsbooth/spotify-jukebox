// playback_engine.js - Simplified Priority-First Brain
const state = require('./state');
const sessions = require('./session_manager');
const spotifyCtrl = require('./spotify_ctrl');
const intel = require('./intel_engine');
const sse = require('./sse');
const utils = require('./utils');
const sm = require('./state_manager');

// --- SAFETY LOCK: Prevent double-skipping ---
let lastSkipTime = 0;
const SKIP_COOLDOWN_MS = 10000; 

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
const syncState = (party, track) => {
    if (party) {
        party.currentPlayingTrack = track;
        party.playedHistory.add(track.uri);
    }

    state.currentPlayingTrack = track;
    if (state.playedHistory instanceof Set) state.playedHistory.add(track.uri);
    else state.playedHistory = new Set([track.uri]);
    
    sm.saveSettings();
};

/**
 * POP NEXT TRACK
 * Original logic: Priority Queue -> Shuffle Bag fallback
 */
const popNextTrack = async () => {
    const now = Date.now();
    if (now - lastSkipTime < SKIP_COOLDOWN_MS) {
        console.warn("🛡️ Engine: Skip request ignored (Cooldown Active)");
        return { success: false, message: "Skipping too fast!" };
    }

    const party = sessions.getActiveParty();
    const targetState = party || state;

    if (targetState.isPopping) return { success: false, message: "Already popping" };
    targetState.isPopping = true;

    try {
        let nextTrack = null;

        // 1. ORIGINAL PRIORITY: Check Guest Queue First
        if (targetState.partyQueue && targetState.partyQueue.length > 0) {
            // FIXED: Removed .shift(). We only peek. Routes/queue.js handles removal.
            nextTrack = targetState.partyQueue[0];
            console.log(`🎯 Engine: Popped Guest Track - ${nextTrack.name}`);
        } 
        // 2. FALLBACK: Check Shuffle Bag
        else {
            const bag = Array.isArray(targetState.shuffleBag) ? targetState.shuffleBag : [];
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
            const success = await spotifyCtrl.playTrack(nextTrack.uri);
            lastSkipTime = Date.now();

            const sanitized = utils.sanitizeTrack(nextTrack);
            intel.analyzeTrack(sanitized).catch(err => console.error(err));

            const finalTrackObj = { 
                ...sanitized, 
                startedAt: Date.now(),
                duration_ms: sanitized.duration_ms || nextTrack.duration_ms || 180000, 
                addedBy: nextTrack.addedBy || 'Station Alpha',
                addedByGuestId: nextTrack.addedByGuestId,
                lyrics: null 
            };

            syncState(party, finalTrackObj);
            sse.send('THEME_UPDATE', { isSpotifyPlaying: true });

            fetchLyrics(sanitized).then(lyrics => {
                if (state.currentPlayingTrack && state.currentPlayingTrack.uri === sanitized.uri) {
                    state.currentPlayingTrack.lyrics = lyrics;
                    if (party) party.currentPlayingTrack.lyrics = lyrics;
                    sse.send('LYRICS_UPDATE', { lyrics, trackUri: sanitized.uri });
                }
            });

            targetState.isPopping = false;
            return { success: true, track: finalTrackObj };
        } else {
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