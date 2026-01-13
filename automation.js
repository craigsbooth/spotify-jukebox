// automation.js - Watchdog & Prefetch Trigger
const state = require('./state');
const intel = require('./intel_engine');

const startWatchdog = () => {
    console.log("🤖 Automation Watchdog: ACTIVE");

    setInterval(() => {
        // 1. SAFETY: Do not interfere if Karaoke is active
        if (state.isKaraokeMode) return;

        // 2. CHECK: Do we have a playing track?
        const track = state.currentPlayingTrack;
        if (!track || !track.startedAt || !track.duration_ms) return;

        const now = Date.now();
        const elapsed = now - track.startedAt;
        const remaining = track.duration_ms - elapsed;
        
        // 3. PREFETCH TRIGGER (The Magic)
        // If between 15 seconds and 2 seconds remaining, prefetch the next song.
        // The Intel Engine handles deduplication, so calling this every second is fine.
        if (remaining < 15000 && remaining > 2000) {
            intel.prefetchNext();
        }
        
        // 4. AUTO-SKIP (Optional Backup)
        // If track is waaaay over (e.g. 5 seconds past end), we could force a pop here.
        // But currently we trust the Client Auto-DJ logic.

    }, 1000); // Run every second
};

module.exports = { startWatchdog };