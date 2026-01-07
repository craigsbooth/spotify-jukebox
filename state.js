// state.js - Refined for Type Safety, Deep Research & Karaoke Support
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
    
    // playback timing tracking
    startedAt: null,

    // FEATURE: YouTube Integration for Monitor View
    youtubeId: null,

    // NEW FEATURE: KARAOKE ENGINE
    isKaraokeMode: false,
    karaokeQueue: [], 
    karaokeAnnouncement: null, 

    // FEATURE: GUEST TOKEN ECONOMY
    tokensEnabled: false,
    tokensInitial: 5,
    tokensPerHour: 6,
    tokensMax: 10,
    tokenRegistry: {}, 

    // FEATURE: LYRICS SYNC (Moved inside the state object)
    lyricsDelayMs: 0, 

    // INITIALIZED FOR RESEARCH ENGINE
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

            // 3. Deep Merge djStatus
            state.djStatus = { ...state.djStatus, ...(saved.djStatus || {}) };

            // 4. Queue Cleanup
            if (Array.isArray(state.partyQueue)) {
                state.partyQueue = state.partyQueue.filter(t => !t.isFallback);
            }

            console.log(`💾 State: Successfully restored session from ${SETTINGS_FILE}`);
        }
    } catch (e) { 
        console.error("❌ State: Error loading settings.json, falling back to defaults.", e.message); 
        state.playedHistory = new Set();
    }
} else {
    console.log("ℹ️ State: No settings.json found, starting with clean defaults.");
}

module.exports = state;