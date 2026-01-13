// playback_engine.js - Stable Core (Root)
const state = require('./state');
const sessions = require('./session_manager');
const spotifyCtrl = require('./spotify_ctrl');
const intel = require('./intel_engine'); 
const sse = require('./sse');
const utils = require('./utils');
const sm = require('./state_manager');

// --- LOAD SEPARATE LYRICS ENGINE ---
// This prevents breaking the player if lyrics fail
let lyrics;
try {
    lyrics = require('./lyrics_engine'); // Assumes lyrics_engine.js is in root
} catch (e) {
    try {
        lyrics = require('../lyrics_engine'); // Try fallback path
    } catch (e2) {
        console.warn("⚠️ Playback: Could not load lyrics_engine.js");
    }
}

// --- SAFETY VARIABLES ---
let lastSkipTime = 0;
let popStartTime = 0;
const SKIP_COOLDOWN_MS = 1000; 

// Helper: Sync Bridge
const syncState = (party, track) => {
    if (party) {
        party.currentPlayingTrack = track;
        if (!party.playedHistory) party.playedHistory = new Set();
        party.playedHistory.add(track.uri);
    }
    state.currentPlayingTrack = track;
    if (!state.playedHistory || !(state.playedHistory instanceof Set)) {
        state.playedHistory = new Set(state.playedHistory || []);
    }
    state.playedHistory.add(track.uri);
    sm.saveSettings();
};

const popNextTrack = async () => {
    const now = Date.now();

    // 1. COOLDOWN
    if (now - lastSkipTime < SKIP_COOLDOWN_MS) {
        console.warn("🛡️ POP: Ignored (Cooldown)");
        return { success: false, message: "Skipping too fast!" };
    }

    const party = sessions.getActiveParty();
    const targetState = party || state;

    // 2. STALE LOCK BREAKER (Fixes "Already in progress" bug)
    if (targetState.isPopping) {
        if (now - popStartTime > 5000) {
            console.warn("🔨 POP: Smashing stale lock");
            targetState.isPopping = false;
        } else {
            console.warn("⚠️ POP: Already in progress");
            return { success: false, message: "Already popping" };
        }
    }

    targetState.isPopping = true;
    popStartTime = now;

    try {
        // 3. SANITIZE QUEUE
        if (!Array.isArray(targetState.partyQueue)) targetState.partyQueue = [];
        if (!Array.isArray(targetState.shuffleBag)) targetState.shuffleBag = [];

        let nextTrack = null;

        // 4. QUEUE LOGIC (Shift is required for Skip/Next to work)
        if (targetState.partyQueue.length > 0) {
            nextTrack = targetState.partyQueue.shift(); 
            console.log(`🎯 POP: Popped Guest Track - ${nextTrack?.name}`);
        } 
        else {
            const historySet = targetState.playedHistory instanceof Set 
                ? targetState.playedHistory 
                : new Set(targetState.playedHistory || []);

            nextTrack = targetState.shuffleBag.find(t => !historySet.has(t.uri));

            if (!nextTrack && targetState.shuffleBag.length > 0) {
                console.log("♻️ POP: Pool exhausted. Clearing history.");
                if (targetState.playedHistory instanceof Set) targetState.playedHistory.clear();
                nextTrack = targetState.shuffleBag[0];
            }
        }
        
        if (nextTrack && nextTrack.uri) {
            // A. PLAY AUDIO
            await spotifyCtrl.playTrack(nextTrack.uri);
            lastSkipTime = Date.now();

            // B. PREPARE DATA
            const sanitized = utils.sanitizeTrack(nextTrack);
            const finalTrackObj = { 
                ...sanitized, 
                startedAt: Date.now(),
                duration_ms: sanitized.duration_ms || nextTrack.duration_ms || 180000, 
                addedBy: nextTrack.addedBy || 'Station Alpha',
                addedByGuestId: nextTrack.addedByGuestId,
                lyrics: null 
            };

            // C. UPDATE STATE
            syncState(party, finalTrackObj);

            // D. BROADCAST (Immediate)
            sse.send('CURRENT_TRACK', finalTrackObj);
            sse.send('THEME_UPDATE', { isSpotifyPlaying: true });
            sse.send('LYRICS_UPDATE', { lyrics: null, trackUri: sanitized.uri });

            // E. BACKGROUND TASKS (Non-Blocking / Fire & Forget)
            
            // 1. DJ Intel
            if (intel && typeof intel.analyzeTrack === 'function') {
                intel.analyzeTrack(sanitized).catch(e => console.error("Intel Error:", e));
            }

            // 2. Lyrics
            if (lyrics && typeof lyrics.fetchLyrics === 'function') {
                lyrics.fetchLyrics(sanitized).then(lyricData => {
                    const safeLyrics = lyricData || { plain: "No lyrics found." };
                    
                    // Update State
                    if (state.currentPlayingTrack) state.currentPlayingTrack.lyrics = safeLyrics;
                    if (party && party.currentPlayingTrack) party.currentPlayingTrack.lyrics = safeLyrics;
                    
                    // Update UI
                    sse.send('LYRICS_UPDATE', { lyrics: safeLyrics, trackUri: sanitized.uri });
                }).catch(e => console.error("Lyrics Error:", e));
            }

            return { success: true, track: finalTrackObj };

        } else {
            console.warn("⚠️ POP: Station Empty");
            await spotifyCtrl.refreshShuffleBag();
            return { success: false, error: "Station Empty" };
        }

    } catch (e) {
        console.error("🔥 POP ERROR:", e);
        return { success: false, error: e.message };
    } finally {
        targetState.isPopping = false;
    }
};

module.exports = { popNextTrack };