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
        // We sanitize the track data here to create clean display names
        const sanitized = stateManager.sanitizeTrack(trackData);
        const { uri, name, artist, albumArt, album, displayName, displayArtist } = sanitized;
        
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
                displayName, displayArtist, // Store the sanitized versions
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

    // 8. THEME & SETTINGS (BUG 3 FIX)
    // Updated to accept an object so showLyrics can be updated independently of theme
    setTheme: (config) => {
        const validThemes = ['standard', 'monitor', 'carousel'];
        let updated = false;

        // If it's a string (old format), handle it
        if (typeof config === 'string' && validThemes.includes(config)) {
            state.currentTheme = config;
            updated = true;
        } 
        // If it's the new object format, update specific fields
        else if (typeof config === 'object') {
            if (config.theme && validThemes.includes(config.theme)) {
                state.currentTheme = config.theme;
                updated = true;
            }
            if (config.showLyrics !== undefined) {
                state.showLyrics = !!config.showLyrics;
                updated = true;
            }
        }

        if (updated) {
            stateManager.saveSettings();
            return { 
                success: true, 
                theme: state.currentTheme, 
                showLyrics: state.showLyrics 
            };
        }
        
        return { success: false, message: "Invalid Theme" };
    },

    // 9. UTILITY
    isInHistory: (uri) => {
        if (state.playedHistory instanceof Set) return state.playedHistory.has(uri);
        if (Array.isArray(state.playedHistory)) return state.playedHistory.includes(uri);
        return false;
    },

    /**
     * 10. SANITIZATION ENGINE (EXPANDED & HARDENED)
     * Hardened RegEx to strip clutter from Spotify titles.
     */
    sanitizeTrack: (track) => {
        if (!track || !track.name) return track;

        // Expanded list of keywords to catch Remixes, Live versions, Edits, and Editions
        const junkPatterns = [
            /remaster(?:ed)?/gi,
            /deluxe/gi,
            /anniversary/gi,
            /edition/gi,
            /expanded/gi,
            /version/gi,
            /mix/gi,
            /remix/gi,
            /radio edit/gi,
            /club/gi,
            /extended/gi,
            /original/gi,
            /live(?: at| from)?/gi,
            /feat(?:\.|uring)?/gi,
            /ft(?:\.)?/gi,
            /with/gi,
            /vip/gi,
            /re-recorded/gi,
            /mono/gi,
            /stereo/gi,
            /acoustic/gi,
            /instrumental/gi,
            /bonus/gi,
            /single/gi,
            /unplugged/gi,
            /vault/gi
        ];

        // Combine into a master regex check
        const junkRegex = new RegExp(junkPatterns.map(p => p.source).join('|'), 'i');

        let cleanName = track.name
            // 1. Remove everything in parentheses if it contains junk keywords
            .replace(/\s*\([^)]*?\)/gi, (match) => junkRegex.test(match) ? '' : match)
            // 2. Remove everything in brackets if it contains junk keywords
            .replace(/\s*\[[^\]]*?\]/gi, (match) => junkRegex.test(match) ? '' : match)
            // 3. Remove everything after a dash if it contains junk keywords
            .replace(/\s*[-–—].*$/gi, (match) => junkRegex.test(match) ? '' : match)
            .trim();

        // Safety: If we stripped too much and the string is empty, use the original
        if (!cleanName || cleanName.length < 2) cleanName = track.name;

        // Clean Artist Name: Take the first artist before any comma or "feat" variants
        let cleanArtist = track.artist ? track.artist.split(/[,]|feat\.|ft\.|featuring|&|and/i)[0].trim() : track.artist;

        return {
            ...track,
            displayName: cleanName,
            displayArtist: cleanArtist
        };
    }
};

module.exports = stateManager;