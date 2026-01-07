// automation.js - Server-Side Autopilot
const state = require('./state');
const playbackEngine = require('./playback_engine');

const startWatchdog = () => {
    console.log("🤖 Auto-DJ Watchdog Active");

    setInterval(() => {
        // 1. SAFETY: Do not auto-skip if Karaoke is active
        if (state.isKaraokeMode) return;

        // 2. CHECK: Do we have a track?
        if (!state.currentPlayingTrack || !state.currentPlayingTrack.startedAt) return;

        const { startedAt, duration_ms, name } = state.currentPlayingTrack;
        const now = Date.now();
        const elapsed = now - startedAt;
        const limit = (duration_ms || 180000) + 2500; // Duration + 2.5s buffer
        
        // 3. LOGGING (Debug "Mid-Skip" issues)
        // Only log if we are getting close (within 10 seconds of skip) to reduce noise
        if (elapsed > limit - 10000 && elapsed < limit) {
             console.log(`⏳ Watchdog: ${name} | Elapsed: ${(elapsed/1000).toFixed(1)}s / ${(limit/1000).toFixed(1)}s`);
        }

        // 4. TRIGGER
        if (elapsed > limit) {
            if (!state.isPopping) {
                console.log(`🤖 Watchdog: Track Time Limit Reached (${(elapsed/1000).toFixed(1)}s). Skipping...`);
                console.log(`   -> Track: ${name} | Duration: ${duration_ms}ms`);
                
                playbackEngine.popNextTrack().then(res => {
                    if (!res.success) console.log("🤖 Watchdog Warning:", res.error);
                });
            }
        }
    }, 1000); // Check every second
};

module.exports = { startWatchdog };