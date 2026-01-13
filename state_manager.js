// state_manager.js - Centralized, Hardened Logic Fortress
const state = require('./state');
const fs = require('fs');
const path = require('path');
const em = require('./economy_manager');
const utils = require('./utils');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');

// Debounce timer for disk writes
let saveTimer = null;

const stateManager = {
    // --- 0. MAINTENANCE SYSTEM (NEW) ---
    performMaintenance: () => {
        console.log("🧹 State Manager: Starting System Maintenance...");
        let stats = { duplicates: 0, voteFixes: 0, ghosts: 0 };

        // A. Queue Integrity
        if (Array.isArray(state.partyQueue)) {
            const uniqueMap = new Map();

            state.partyQueue.forEach(track => {
                if (!track || !track.uri) {
                    stats.ghosts++;
                    return;
                }

                // Deduplicate: Keep the instance with the higher vote count
                if (uniqueMap.has(track.uri)) {
                    const existing = uniqueMap.get(track.uri);
                    if ((track.votes || 0) > (existing.votes || 0)) {
                        uniqueMap.set(track.uri, track);
                    }
                    stats.duplicates++;
                } else {
                    uniqueMap.set(track.uri, track);
                }
            });

            // Rebuild Queue
            state.partyQueue = Array.from(uniqueMap.values());

            // Fix Vote Counts & Missing Fields
            state.partyQueue.forEach(track => {
                if (!Array.isArray(track.votedBy)) track.votedBy = [];

                // Ensure vote count is at least the number of voters
                if (track.votedBy.length > (track.votes || 0)) {
                    track.votes = track.votedBy.length;
                    stats.voteFixes++;
                }
                // Ensure valid fallback flags
                if (track.isFallback === undefined) track.isFallback = false;
            });
        } else {
            state.partyQueue = [];
        }

        // B. Karaoke Integrity
        if (Array.isArray(state.karaokeQueue)) {
            const kMap = new Map();
            state.karaokeQueue.forEach(k => {
                if (k && k.id) kMap.set(k.id, k);
            });
            state.karaokeQueue = Array.from(kMap.values());
        } else {
            state.karaokeQueue = [];
        }

        // C. History Safety
        if (!(state.playedHistory instanceof Set)) {
            state.playedHistory = new Set(Array.isArray(state.playedHistory) ? state.playedHistory : []);
        }

        stateManager.saveSettings();
        console.log("✅ Maintenance Complete:", stats);
        return stats;
    },

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

    // 3. PERFORMANCE MODE (KARAOKE)
    setKaraokeMode: (enabled) => {
        state.isKaraokeMode = !!enabled;
        if (state.isKaraokeMode) state.currentTheme = 'monitor';
        stateManager.saveSettings();
        console.log(`🎤 Performance Mode: ${state.isKaraokeMode ? 'KARAOKE' : 'JUKEBOX'}`);
        return { success: true, isKaraokeMode: state.isKaraokeMode };
    },

    processKaraokeRequest: (trackData, guestId) => {
        if (!state.isKaraokeMode) return { success: false, message: "Karaoke is not active." };

        const gid = guestId || 'anonymous';
        const guestName = (gid === 'host') ? 'Host' : (state.guestNames[gid] || "Guest");

        if (!guestName || guestName === "Guest") {
            return { success: false, message: "Please set your name to request Karaoke!" };
        }

        const tokenResult = stateManager.spendToken(gid);
        if (!tokenResult.success) return tokenResult;

        state.karaokeQueue.push({
            ...trackData,
            singer: guestName,
            addedAt: Date.now()
        });

        const km = require('./karaoke_manager');
        km.updateStageAnnouncement();

        stateManager.saveSettings();
        return { 
            success: true, 
            message: "Karaoke Track Added!", 
            tokens: tokenResult.balance 
        };
    },

    // 4. QUEUE LOGIC - Simplified Priority-First Approach
    processQueueRequest: (trackData, guestId) => {
        const gid = guestId || 'anonymous';
        const guestName = (gid === 'host') ? 'Host' : (state.guestNames[gid] || "Guest");
        
        // This function seems unused in the new system (moved to routes/queue.js),
        // but keeping it here for safety as requested.
        return { success: true }; 
    },

    setKaraokeAnnouncement: (singer, track, durationSec = 60) => {
        state.karaokeAnnouncement = {
            message: `Next up we have ${singer} with ${track}`,
            expiresAt: Date.now() + (durationSec * 1000)
        };
        stateManager.saveSettings();
    },

    // 5. HISTORY & GUEST MANAGEMENT
    addToHistory: (uri) => {
        if (!(state.playedHistory instanceof Set)) {
            state.playedHistory = new Set();
        }
        state.playedHistory.add(uri);

        if (state.playedHistory.size > 500) {
            const arr = Array.from(state.playedHistory);
            state.playedHistory = new Set(arr.slice(-500)); 
        }
        
        stateManager.saveSettings(); 
    },

    registerGuest: (guestId, name) => {
        state.guestNames[guestId] = name;
        state.latestJoiner = name;

        if (!state.tokenRegistry[guestId]) {
            state.tokenRegistry[guestId] = {
                balance: state.tokensInitial || 0,
                lastAccrual: Date.now()
            };
        }

        stateManager.saveSettings();
        setTimeout(() => { 
            if (state.latestJoiner === name) state.latestJoiner = null; 
        }, 5000);
        console.log(`👤 New Guest: ${name} (${guestId})`);
    },

    // 6. PERSISTENCE & THEME
    saveSettings: () => {
        const { 
            shuffleBag, 
            playedHistory, 
            reactionEvent, 
            playlistResults,
            ...persistentData 
        } = state;
        
        const dataToSave = {
            ...persistentData,
            playedHistory: Array.from(playedHistory instanceof Set ? playedHistory : []),
            lastSavedAt: new Date().toISOString()
        };

        if (saveTimer) clearTimeout(saveTimer);

        saveTimer = setTimeout(() => {
            const jsonString = JSON.stringify(dataToSave, null, 2);
            fs.writeFile(SETTINGS_FILE, jsonString, (err) => {
                if (err) console.error("❌ Async Write Failed:", err.message);
            });
        }, 1000);
    },

    setTheme: (config) => {
        const validThemes = ['standard', 'monitor', 'carousel'];
        let updated = false;

        if (typeof config === 'string' && validThemes.includes(config)) {
            state.currentTheme = config;
            updated = true;
        } 
        else if (typeof config === 'object') {
            if (config.theme && validThemes.includes(config.theme)) {
                state.currentTheme = config.theme;
                updated = true;
            }
            if (config.showLyrics !== undefined) {
                state.showLyrics = !!config.showLyrics;
                updated = true;
            }
            if (config.tokensEnabled !== undefined) { state.tokensEnabled = !!config.tokensEnabled; updated = true; }
            if (config.tokensInitial !== undefined) { state.tokensInitial = parseInt(config.tokensInitial); updated = true; }
            if (config.tokensPerHour !== undefined) { state.tokensPerHour = parseInt(config.tokensPerHour); updated = true; }
            if (config.tokensMax !== undefined) { 
                state.tokensMax = parseInt(config.tokensMax); 
                em.enforceGlobalTokenCap();
                updated = true; 
            }
        }

        if (updated) {
            stateManager.saveSettings();
            return { 
                success: true, 
                theme: state.currentTheme, 
                showLyrics: state.showLyrics,
                tokensEnabled: state.tokensEnabled
            };
        }
        return { success: false, message: "Invalid Config" };
    },

    // 7. UTILITY & ECONOMY BRIDGE
    isInHistory: (uri) => utils.isInHistory(state.playedHistory, uri),
    sanitizeTrack: (track) => utils.sanitizeTrack(track),
    syncGuestTokens: (guestId) => em.syncGuestTokens(guestId),
    spendToken: (guestId) => {
        const res = em.spendToken(guestId);
        if (res.success) stateManager.saveSettings();
        return res;
    }
};

module.exports = stateManager;