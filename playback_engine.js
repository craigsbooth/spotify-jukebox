// playback_engine.js - The Central DJ Brain
const state = require('./state');
const spotifyCtrl = require('./spotify_ctrl');
const intel = require('./intel_engine');
const sse = require('./sse');
const utils = require('./utils');
const sm = require('./state_manager');

// Helper: Fetch Lyrics (Moved here)
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

const popNextTrack = async () => {
    // Prevent double-popping
    if (state.isPopping) return { success: false, message: "Already popping" };
    state.isPopping = true;

    try {
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
                console.log("♻️ Queue: Pool exhausted. Clearing history.");
                if (state.playedHistory instanceof Set) state.playedHistory.clear();
                else state.playedHistory = new Set();
                nextTrack = bag[0];
            }
        }
        
        if (nextTrack) {
            if (state.playedHistory instanceof Set) state.playedHistory.add(nextTrack.uri);
            else state.playedHistory = new Set([nextTrack.uri]);

            // PLAY IT
            await spotifyCtrl.playTrack(nextTrack.uri);

            const sanitized = utils.sanitizeTrack(nextTrack);
            intel.analyzeTrack(sanitized).catch(err => console.error(err));

            // Update State
            state.currentPlayingTrack = { 
                ...sanitized, 
                startedAt: Date.now(),
                duration_ms: sanitized.duration_ms || nextTrack.duration_ms || 180000, // Safety Default
                addedBy: nextTrack.addedBy,
                addedByGuestId: nextTrack.addedByGuestId,
                lyrics: null 
            };
            sm.saveSettings();

            // Broadcast Updates
            sse.send('THEME_UPDATE', { isSpotifyPlaying: true });

            // Fetch Lyrics
            fetchLyrics(sanitized).then(lyrics => {
                if (state.currentPlayingTrack && state.currentPlayingTrack.uri === sanitized.uri) {
                    state.currentPlayingTrack.lyrics = lyrics;
                    sse.send('LYRICS_UPDATE', { lyrics, trackUri: sanitized.uri });
                }
            });

            state.isPopping = false;
            return { success: true, track: state.currentPlayingTrack };
        } else {
            await spotifyCtrl.refreshShuffleBag();
            state.isPopping = false;
            return { success: false, error: "Station Empty" };
        }
    } catch (e) {
        console.error("Pop Error:", e);
        state.isPopping = false;
        return { success: false, error: e.message };
    }
};

module.exports = { popNextTrack };