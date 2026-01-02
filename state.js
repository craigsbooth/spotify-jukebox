// state.js - Refined for Type Safety & Deep Research Support
const fs = require('fs');
const path = require('path');

// Use absolute path for consistency across modular imports
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

let state = {
    // Corrected ID for Viva Latino based on Spotify standards
    fallbackPlaylist: { id: '37i9dQZF1DX10zKzsJ2j87', name: 'Viva Latino' },
    currentTheme: 'standard',
    partyName: "The Pinfold", 
    showLyrics: false, 
    showDebug: false,
    crossfadeSec: 8, 
    partyQueue: [], 
    currentPlayingTrack: null, 
    guestNames: {}, 
    latestJoiner: null,
    reactionEvent: { id: 0, emoji: null }, 
    isDjMode: false,
    
    // BUG 1 FIX: Added startedAt to track playback timing across the system
    startedAt: null,

    // FEATURE: YouTube Integration for Monitor View
    // Stores the current active video ID for the Projector display
    youtubeId: null,

    // INITIALIZED FOR RESEARCH ENGINE (Default Template)
    djStatus: { 
        message: "Digital DJ Idle", 
        researchTitle: "", 
        researchArtist: "", 
        researchAlbum: "", 
        bpm: "--", 
        key: "N/A", 
        publisher: "Scanning...",
        isrc: "--",
        releaseDate: "--",
        genres: [],
        valence: 0,
        albumArtwork: "/placeholder.png"
    }, 
    
    shuffleBag: [], 
    playedHistory: new Set() 
};

/**
 * STARTUP HYDRATION
 * Attempts to load settings from settings.json and properly re-type complex objects.
 */
if (fs.existsSync(SETTINGS_FILE)) {
    try {
        const fileContent = fs.readFileSync(SETTINGS_FILE, 'utf8');
        if (fileContent) {
            const saved = JSON.parse(fileContent);
            
            // 1. Safety Merge: Spread defaults first, then overwrite with saved values
            state = { ...state, ...saved };
            
            // 2. CRITICAL FIX: JSON cannot store Sets. We must convert the Array back to a Set.
            if (saved.playedHistory && Array.isArray(saved.playedHistory)) {
                state.playedHistory = new Set(saved.playedHistory);
            } else {
                state.playedHistory = new Set();
            }

            // 3. Deep Merge djStatus: Ensures UI doesn't crash if keys were missing in saved state
            state.djStatus = { ...state.djStatus, ...(saved.djStatus || {}) };

            // 4. Queue Cleanup: Ensure we don't restore temporary fallback items as permanent requests
            if (Array.isArray(state.partyQueue)) {
                state.partyQueue = state.partyQueue.filter(t => !t.isFallback);
            }

            console.log(`💾 State: Successfully restored session from ${SETTINGS_FILE}`);
        }
    } catch (e) { 
        console.error("❌ State: Error loading settings.json, falling back to defaults.", e.message); 
        // Ensure state remains functional even on crash
        state.playedHistory = new Set();
    }
} else {
    console.log("ℹ️ State: No settings.json found, starting with clean defaults.");
}

module.exports = state;