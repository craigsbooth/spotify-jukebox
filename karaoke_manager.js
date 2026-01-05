// karaoke_manager.js - Stage Manager for Performance Mode
const state = require('./state');
const sm = require('./state_manager');
const spotifyCtrl = require('./spotify_ctrl');
const karaokeEngine = require('./karaoke_engine');

const KaraokeManager = {
    /**
     * STAGE TRANSITION
     * Pauses Spotify, triggers YouTube, and pre-announces the next singer.
     */
    popNext: async () => {
        if (!state.isKaraokeMode || state.karaokeQueue.length === 0) {
            return { success: false, message: "No singers in queue." };
        }

        // 1. ENGINE SEPARATION: Force Spotify to pause before YouTube starts
        try {
            await spotifyCtrl.pause();
            console.log("⏸️ Spotify paused for performance.");
        } catch (e) {
            console.warn("⚠️ Spotify pause command failed or already paused.");
        }

        // 2. Shift the queue
        const nextPerformance = state.karaokeQueue.shift();
        
        // 3. Update the Global YouTube ID (Projector watches this)
        state.youtubeId = nextPerformance.id;

        // 4. Reset announcements for current playback
        state.karaokeAnnouncement = null;

        console.log(`🎤 Stage Manager: ${nextPerformance.singer} is taking the mic.`);
        
        // 5. Pre-emptively announce the NEXT person in line
        KaraokeManager.updateStageAnnouncement();

        sm.saveSettings();
        return { 
            success: true, 
            performance: nextPerformance,
            remaining: state.karaokeQueue.length 
        };
    },

    /**
     * SUGGESTION ENGINE
     * Pulls popular karaoke tracks based on genre
     */
    getSuggestions: async (genre = 'popular') => {
        try {
            const query = `${genre} karaoke hits`;
            return await karaokeEngine.search(query);
        } catch (e) {
            console.error("❌ Failed to fetch karaoke suggestions:", e.message);
            return [];
        }
    },

    /**
     * PRE-STAGE ANNOUNCEMENT
     * Triggers the "Coming up next" banner before the song starts.
     */
    updateStageAnnouncement: () => {
        if (state.isKaraokeMode && state.karaokeQueue.length > 0) {
            const next = state.karaokeQueue[0];
            state.karaokeAnnouncement = {
                message: `Coming up next: ${next.singer} with ${next.title}`,
                expiresAt: Date.now() + (60 * 1000)
            };
            return true;
        }
        return false;
    },

    /**
     * QUEUE MANAGEMENT
     */
    removePerformance: (index) => {
        if (state.karaokeQueue && state.karaokeQueue[index]) {
            state.karaokeQueue.splice(index, 1);
            KaraokeManager.updateStageAnnouncement();
            sm.saveSettings();
            return true;
        }
        return false;
    },

    /**
     * BACKGROUND MAINTENANCE & ENGINE SYNC
     * Automatically resumes Spotify if the stage is clear.
     */
    startMaintenance: () => {
        setInterval(async () => {
            // Cleanup expired announcements
            if (state.karaokeAnnouncement && Date.now() > state.karaokeAnnouncement.expiresAt) {
                state.karaokeAnnouncement = null;
            }

            // AUTO-RESUME ENGINE SYNC:
            // If Karaoke mode is on, but NO video is active (youtubeId is null),
            // and NO announcement is showing, automatically resume Spotify background music.
            if (state.isKaraokeMode && !state.youtubeId && !state.karaokeAnnouncement) {
                try {
                    // Check if Spotify is currently paused before sending resume
                    const status = await spotifyCtrl.getPlaybackState();
                    if (status && !status.is_playing) {
                        console.log("▶️ Resuming background music (Stage Clear)");
                        await spotifyCtrl.resume();
                    }
                } catch (e) {
                    // Fail silently to prevent log spamming during intervals
                }
            }
        }, 2000);
        console.log("🛠️ Karaoke Manager: Auto-maintenance & Engine Sync started.");
    }
};

// Initialize background tasks
KaraokeManager.startMaintenance();

module.exports = KaraokeManager;