// automation.js - Server-Side Autopilot (DISABLED)
const state = require('./state');
const playbackEngine = require('./playback_engine');

const startWatchdog = () => {
    console.log("🤖 Auto-DJ Watchdog: STANDBY MODE (Client-Driven)");

    setInterval(() => {
        // 1. SAFETY: Do not auto-skip if Karaoke is active
        if (state.isKaraokeMode) return;

        // 2. CHECK: Do we have a track?
        if (!state.currentPlayingTrack || !state.currentPlayingTrack.startedAt) return;

        const { startedAt, duration_ms, name } = state.currentPlayingTrack;
        const now = Date.now();
        const elapsed = now - startedAt;
        const limit = (duration_ms || 180000) + 2500; // Duration + 2.5s buffer
        
        // 3. LOGGING ONLY (Debug "Mid-Skip" issues)
        // We log if we are close to the limit, but we DO NOT trigger a skip.
        if (elapsed > limit - 10000 && elapsed < limit) {
             // console.log(`⏳ Watchdog: ${name} | Elapsed: ${(elapsed/1000).toFixed(1)}s / ${(limit/1000).toFixed(1)}s`);
        }

        // 4. TRIGGER REMOVED
        // The server no longer forces playback. It waits for the client.
        /*
        if (elapsed > limit) {
            if (!state.isPopping) {
                console.log(`🤖 Watchdog: Track Time Limit Reached. Waiting for Client...`);
                // playbackEngine.popNextTrack(); <--- DISABLED
            }
        }
        */
    }, 1000); // Check every second
};

module.exports = { startWatchdog };