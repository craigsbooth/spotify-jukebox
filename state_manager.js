// state_manager.js - Centralized, Hardened Logic Fortress
const state = require('./state');
const fs = require('fs');
const path = require('path');

// Ensure we use a consistent absolute path for settings
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

const stateManager = {
    // 1. DJ ENGINE CONTROL
    setDjMode: (enabled) => {
        state.isDjMode = !!enabled;
        if (state.djStatus) {
            state.djStatus.isDjMode = state.isDjMode;
        }
        stateManager.saveSettings();
        console.log(`🎧 DJ Engine Toggle: ${state.isDjMode ? 'ACTIVE' : 'STANDBY'}`);
        return { success: true, isDjMode: state.isDjMode };
    },

    // 2. MIXER SETTINGS
    setCrossfade: (seconds) => {
        const val = parseInt(seconds);
        if (!isNaN(val)) {
            state.crossfadeSec = val;
            if (state.djStatus) {
                state.djStatus.crossfadeSec = val;
            }
            stateManager.saveSettings();
            return { success: true, crossfadeSec: state.crossfadeSec };
        }
        return { success: false };
    },

    // 3. QUEUE LOGIC
    processQueueRequest: (trackData, guestId) => {
        const { uri, name, artist, albumArt, album } = trackData;
        const gid = guestId || 'anonymous';
        const guestName = state.guestNames[gid] || "Guest";

        const existing = state.partyQueue.find(t => t.uri === uri);
        
        if (existing) {
            if (!existing.votedBy.includes(gid)) {
                existing.votes += 1;
                existing.votedBy.push(gid);
                state.partyQueue.sort((a, b) => b.votes - a.votes);
                return { success: true, message: "Vote recorded!", votes: existing.votes };
            } else {
                return { success: false, message: "You've already voted for this!" };
            }
        } else {
            state.partyQueue.push({ 
                uri, name, artist, albumArt, album, 
                votes: 1, 
                addedBy: guestName, 
                votedBy: [gid], 
                isFallback: false 
            });
            state.partyQueue.sort((a, b) => b.votes - a.votes);
            return { success: true, message: "Added to queue!" };
        }
    },

    // 4. HISTORY LOGIC - HARDENED
    addToHistory: (uri) => {
        if (!(state.playedHistory instanceof Set)) {
            state.playedHistory = new Set();
        }
        state.playedHistory.add(uri);
        stateManager.saveSettings(); 
    },

    // 5. GUEST MANAGEMENT
    registerGuest: (guestId, name) => {
        state.guestNames[guestId] = name;
        state.latestJoiner = name;
        stateManager.saveSettings();
        setTimeout(() => { 
            if (state.latestJoiner === name) state.latestJoiner = null; 
        }, 5000);
        console.log(`👤 New Guest: ${name} (${guestId})`);
    },

    // 6. SETTINGS PERSISTENCE - HARDENED FOR REDEPLOYS
    saveSettings: () => {
        // Explicitly extract ephemeral vs persistent data
        const { 
            shuffleBag, 
            playedHistory, 
            reactionEvent, 
            playlistResults, // Adding this to exclude search results from disk
            ...persistentData 
        } = state;
        
        const dataToSave = {
            ...persistentData,
            // Always convert Set to Array for JSON storage
            playedHistory: Array.from(playedHistory instanceof Set ? playedHistory : []),
            // Explicitly ensure the current track and research status are saved
            currentPlayingTrack: state.currentPlayingTrack,
            djStatus: state.djStatus,
            lastSavedAt: new Date().toISOString()
        };

        try {
            // Use a temporary variable for stringification to catch errors before writing
            const jsonString = JSON.stringify(dataToSave, null, 2);
            fs.writeFileSync(SETTINGS_FILE, jsonString);
        } catch (e) {
            console.error("💾 Critical Failure: Could not save settings.json:", e.message);
        }
    },

    // 7. INTEL & GENRES
    updateGenres: (genres) => {
        if (state.djStatus) {
            state.djStatus.genres = genres || [];
            stateManager.saveSettings(); // Save genres when they are updated
        }
    },

    // 8. THEME & LYRICS
    setTheme: (newTheme) => {
        const validThemes = ['standard', 'monitor', 'carousel'];
        if (validThemes.includes(newTheme)) {
            state.currentTheme = newTheme;
            stateManager.saveSettings();
            return { success: true, theme: state.currentTheme };
        }
        return { success: false, message: "Invalid Theme" };
    },

    // 9. UTILITY
    isInHistory: (uri) => {
        if (state.playedHistory instanceof Set) return state.playedHistory.has(uri);
        if (Array.isArray(state.playedHistory)) return state.playedHistory.includes(uri);
        return false;
    }
};

module.exports = stateManager;