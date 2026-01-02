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
        // TOKEN CHECK: Attempt to spend a token before processing
        const tokenResult = stateManager.spendToken(guestId);
        if (!tokenResult.success) {
            return tokenResult; // Returns the error message and countdown
        }

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
                return { 
                    success: true, 
                    message: `Vote recorded! (${tokenResult.balance} tokens left)`, 
                    votes: existing.votes,
                    tokens: tokenResult.balance 
                };
            } else {
                // If they've already voted, we shouldn't have spent the token.
                // Note: The logic below in spendToken should be called carefully 
                // but for simplicity in this flow, we refund if action fails.
                state.tokenRegistry[gid].balance += 1; 
                return { success: false, message: "You've already voted for this!" };
            }
        } else {
            state.partyQueue.push({ 
                uri, name, artist, albumArt, album,
                displayName, displayArtist,
                votes: 1, 
                addedBy: guestName, 
                votedBy: [gid], 
                isFallback: false 
            });
            state.partyQueue.sort((a, b) => b.votes - a.votes);
            stateManager.saveSettings();
            return { 
                success: true, 
                message: `Added to queue! (${tokenResult.balance} tokens left)`,
                tokens: tokenResult.balance
            };
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

        // Initialize Tokens for new guests
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
        console.log(`👤 New Guest: ${name} (${guestId}) | Tokens: ${state.tokenRegistry[guestId].balance}`);
    },

    // 6. SETTINGS PERSISTENCE - HARDENED FOR REDEPLOYS
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
            currentPlayingTrack: state.currentPlayingTrack,
            djStatus: state.djStatus,
            lastSavedAt: new Date().toISOString()
        };

        try {
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
            stateManager.saveSettings();
        }
    },

    // 8. THEME & SETTINGS
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
            // Configuration for Token Economy
            if (config.tokensEnabled !== undefined) { state.tokensEnabled = !!config.tokensEnabled; updated = true; }
            if (config.tokensInitial !== undefined) { state.tokensInitial = parseInt(config.tokensInitial); updated = true; }
            if (config.tokensPerHour !== undefined) { state.tokensPerHour = parseInt(config.tokensPerHour); updated = true; }
            if (config.tokensMax !== undefined) { state.tokensMax = parseInt(config.tokensMax); updated = true; }
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

    // 9. UTILITY
    isInHistory: (uri) => {
        if (state.playedHistory instanceof Set) return state.playedHistory.has(uri);
        if (Array.isArray(state.playedHistory)) return state.playedHistory.includes(uri);
        return false;
    },

    // 10. TOKEN BANKER LOGIC
    syncGuestTokens: (guestId) => {
        const guest = state.tokenRegistry[guestId];
        if (!guest) return null;

        const now = Date.now();
        const msSinceLast = now - guest.lastAccrual;
        const msPerToken = (60 * 60 * 1000) / (state.tokensPerHour || 1);

        const earned = Math.floor(msSinceLast / msPerToken);
        if (earned > 0) {
            guest.balance = Math.min(state.tokensMax, guest.balance + earned);
            guest.lastAccrual = guest.lastAccrual + (earned * msPerToken);
        }

        const msToNext = msPerToken - (now - guest.lastAccrual);
        return {
            balance: guest.balance,
            nextIn: Math.ceil(msToNext / 1000) // seconds
        };
    },

    spendToken: (guestId) => {
        if (!state.tokensEnabled) return { success: true };
        if (!guestId) return { success: false, message: "Guest ID Required" };

        const sync = stateManager.syncGuestTokens(guestId);
        if (!sync) return { success: false, message: "Guest not registered" };

        if (sync.balance > 0) {
            state.tokenRegistry[guestId].balance -= 1;
            stateManager.saveSettings();
            return { success: true, balance: state.tokenRegistry[guestId].balance };
        } else {
            const mins = Math.floor(sync.nextIn / 60);
            const secs = sync.nextIn % 60;
            return { 
                success: false, 
                message: `Out of tokens! Next in ${mins}:${secs.toString().padStart(2, '0')}`,
                nextIn: sync.nextIn 
            };
        }
    },

    /**
     * 11. SANITIZATION ENGINE
     */
    sanitizeTrack: (track) => {
        if (!track || !track.name) return track;

        const junkPatterns = [
            /remaster(?:ed)?/gi, /deluxe/gi, /anniversary/gi, /edition/gi, /expanded/gi,
            /version/gi, /mix/gi, /remix/gi, /radio edit/gi, /club/gi, /extended/gi,
            /original/gi, /live(?: at| from)?/gi, /feat(?:\.|uring)?/gi, /ft(?:\.)?/gi,
            /with/gi, /vip/gi, /re-recorded/gi, /mono/gi, /stereo/gi, /acoustic/gi,
            /instrumental/gi, /bonus/gi, /single/gi, /unplugged/gi, /vault/gi
        ];

        const junkRegex = new RegExp(junkPatterns.map(p => p.source).join('|'), 'i');

        let cleanName = track.name
            .replace(/\s*\([^)]*?\)/gi, (match) => junkRegex.test(match) ? '' : match)
            .replace(/\s*\[[^\]]*?\]/gi, (match) => junkRegex.test(match) ? '' : match)
            .replace(/\s*[-–—].*$/gi, (match) => junkRegex.test(match) ? '' : match)
            .trim();

        if (!cleanName || cleanName.length < 2) cleanName = track.name;
        let cleanArtist = track.artist ? track.artist.split(/[,]|feat\.|ft\.|featuring|&|and/i)[0].trim() : track.artist;

        return {
            ...track,
            displayName: cleanName,
            displayArtist: cleanArtist
        };
    }
};

module.exports = stateManager;