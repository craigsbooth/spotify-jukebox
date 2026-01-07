// automation.js - Server-Side Autopilot
const state = require('./state');
const playbackEngine = require('./playback_engine');

const startWatchdog = () => {
    console.log("🤖 Auto-DJ Watchdog Active");

    setInterval(() => {
        // Only act if we have a track and DJ Mode is ON (Optional: remove !isDjMode if you always want auto)
        if (!state.currentPlayingTrack || !state.currentPlayingTrack.startedAt) return;

        const { startedAt, duration_ms } = state.currentPlayingTrack;
        const now = Date.now();
        
        // LOGIC: If elapsed time > duration + 1.5 seconds buffer
        // AND we aren't already popping
        if (now > (startedAt + (duration_ms || 0) + 1500)) {
            if (!state.isPopping) {
                console.log("🤖 Watchdog: Track finished. Auto-playing next...");
                playbackEngine.popNextTrack().then(res => {
                    if (!res.success) console.log("🤖 Watchdog Warning:", res.error);
                });
            }
        }
    }, 1000); // Check every second
};

module.exports = { startWatchdog };