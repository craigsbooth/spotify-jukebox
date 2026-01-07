// state.js - Refined for Type Safety, Deep Research & Karaoke Support
const fs = require('fs');
const path = require('path');

// Use absolute path for consistency across modular imports
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

/**
 * THE PARTY MODEL
 * Defines the state for a single Jukebox session.
 * Now refactored into a Class to support Multi-Host architecture.
 */
class Party {
    constructor(id = 'default', hostName = "The Pinfold") {
        this.id = id;
        
        // --- CORE SETTINGS ---
        this.fallbackPlaylist = { id: '37i9dQZF1DX10zKzsJ2j87', name: 'Viva Latino' };
        this.currentTheme = 'standard';
        this.partyName = hostName;
        this.showLyrics = false;
        this.showDebug = false;
        this.crossfadeSec = 8;
        
        // --- PLAYBACK STATE ---
        this.partyQueue = [];
        this.currentPlayingTrack = null;
        this.startedAt = null;
        this.playedHistory = new Set();
        this.shuffleBag = [];
        
        // --- INTERACTIVE FEATURES ---
        this.guestNames = {};
        this.latestJoiner = null;
        this.reactionEvent = { id: 0, emoji: null };
        this.isDjMode = false;
        this.youtubeId = null; // Monitor View Integration

        // --- KARAOKE ENGINE ---
        this.isKaraokeMode = false;
        this.karaokeQueue = [];
        this.karaokeAnnouncement = null;

        // --- TOKEN ECONOMY ---
        this.tokensEnabled = false;
        this.tokensInitial = 5;
        this.tokensPerHour = 6;
        this.tokensMax = 10;
        this.tokenRegistry = {};

        // --- LYRICS SYNC ---
        this.lyricsDelayMs = 0;

        // --- RESEARCH ENGINE ---
        this.djStatus = {
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
        };
    }

    /**
     * Hydrate this party instance from a JSON object (e.g., settings.json)
     */
    loadSettings(saved) {
        // 1. Safety Merge: Spread defaults first, then overwrite with saved values
        Object.assign(this, saved);

        // 2. CRITICAL FIX: JSON cannot store Sets. Convert Array back to Set.
        if (saved.playedHistory && Array.isArray(saved.playedHistory)) {
            this.playedHistory = new Set(saved.playedHistory);
        } else {
            this.playedHistory = new Set();
        }

        // 3. Deep Merge djStatus to prevent overwriting sub-fields
        this.djStatus = { ...this.djStatus, ...(saved.djStatus || {}) };

        // 4. Queue Cleanup: Remove fallbacks on restore
        if (Array.isArray(this.partyQueue)) {
            this.partyQueue = this.partyQueue.filter(t => !t.isFallback);
        }
        
        console.log(`💾 Party State: Restored session for '${this.partyName}'`);
    }
}

// --- SINGLETON INSTANTIATION (Legacy Support) ---
// We create a default instance so existing code (require('./state')) continues to work.
const defaultParty = new Party('singleton');

/**
 * STARTUP HYDRATION
 * Attempts to load settings from settings.json into the default party.
 */
if (fs.existsSync(SETTINGS_FILE)) {
    try {
        const fileContent = fs.readFileSync(SETTINGS_FILE, 'utf8');
        if (fileContent) {
            const saved = JSON.parse(fileContent);
            defaultParty.loadSettings(saved);
        }
    } catch (e) {
        console.error("❌ State: Error loading settings.json, falling back to defaults.", e.message);
        defaultParty.playedHistory = new Set();
    }
} else {
    console.log("ℹ️ State: No settings.json found, starting with clean defaults.");
}

// EXPORT THE INSTANCE (Compatible with existing code)
module.exports = defaultParty;

// EXPORT THE CLASS (For future Session Manager usage)
module.exports.Party = Party;