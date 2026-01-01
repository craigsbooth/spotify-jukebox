// spotify_ctrl.js - Hardened Token, Shuffle & Core Playback Control
const path = require('path');
const fs = require('fs');
const state = require('./state');
const spotifyApi = require('./spotify_instance'); 
const sm = require('./state_manager'); 

// Ensure tokens are saved in the root directory relative to this file
const TOKEN_FILE = path.join(__dirname, 'tokens.json');

/**
 * 1. TOKEN PERSISTENCE (Hardened with Auto-Recovery)
 */
async function saveTokens(access, refresh) {
    console.log("💾 Token System: Attempting to save tokens...");
    
    // Identify strings regardless of whether wrapper passed raw string or object
    let cleanAccess = typeof access === 'string' ? access : access?.accessToken;
    let cleanRefresh = typeof refresh === 'string' ? refresh : refresh?.refreshToken;

    // CRITICAL FIX: If access token is missing but refresh exists, recover it immediately
    if (!cleanAccess && cleanRefresh) {
        console.log("🔄 Token System: Access token missing from input, attempting immediate recovery via refresh...");
        try {
            spotifyApi.setRefreshToken(cleanRefresh);
            const data = await spotifyApi.refreshAccessToken();
            cleanAccess = data.body['access_token'];
            console.log("✅ Token System: Successfully recovered access token.");
        } catch (e) {
            console.error("❌ Token System: Recovery failed:", e.message);
        }
    }

    // Update the live API instance memory
    if (cleanAccess) spotifyApi.setAccessToken(cleanAccess);
    if (cleanRefresh) spotifyApi.setRefreshToken(cleanRefresh);
    
    // Save to disk for persistence across restarts
    if (cleanAccess || cleanRefresh) {
        const tokenData = { 
            access_token: cleanAccess || null, 
            refresh_token: cleanRefresh || spotifyApi.getRefreshToken(),
            updatedAt: new Date().toISOString()
        };

        try {
            fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
            console.log("💾 Token System: tokens.json written successfully with active credentials.");
        } catch (err) {
            console.error("❌ Token System: Failed to write tokens.json:", err.message);
        }
    }
}

/**
 * 2. SHUFFLE BAG ENGINE
 */
async function refreshShuffleBag() {
    if (!spotifyApi.getAccessToken()) {
        console.warn("⚠️ Cannot refresh bag: No token found.");
        return 0;
    }
    
    if (!state.fallbackPlaylist?.id) {
        console.warn("⚠️ No fallback playlist set.");
        return 0;
    }

    console.log(`♻️ Controller: Rebuilding Shuffle Bag for: ${state.fallbackPlaylist.name}`);
    
    try {
        let allTracks = [];
        let offset = 0;
        let limit = 100;
        let total = 1;

        while (offset < total) {
            const data = await spotifyApi.getPlaylistTracks(state.fallbackPlaylist.id, { offset, limit });
            const items = data.body.items;
            total = data.body.total;
            
            const batch = items
                .filter(i => i && i.track && i.track.uri)
                .map(i => ({
                    uri: i.track.uri,
                    name: i.track.name,
                    artist: i.track.artists[0].name,
                    album: i.track.album.name,
                    albumArt: i.track.album.images[0]?.url,
                    duration: i.track.duration_ms,
                    isFallback: true,
                    votes: 0
                }));
            
            allTracks = [...allTracks, ...batch];
            offset += limit;
        }

        // Fisher-Yates Shuffle
        for (let i = allTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
        }

        state.shuffleBag = allTracks;
        
        // Reset history safely
        if (state.playedHistory && typeof state.playedHistory.clear === 'function') {
            state.playedHistory.clear();
        }
        
        console.log(`✅ Controller: ${state.shuffleBag.length} tracks loaded into pool.`);
        return state.shuffleBag.length;
    } catch (err) {
        console.error("❌ Controller: Playlist Load Failed:", err.message);
        return 0;
    }
}

/**
 * 3. TRACK SELECTION LOGIC
 */
async function getNextTrack() {
    let nextTrack = null;

    if (state.partyQueue.length > 0) {
        nextTrack = state.partyQueue.shift();
        console.log(`🎯 Dispatcher: Playing Guest Request - ${nextTrack.name}`);
    } 
    else if (state.shuffleBag && state.shuffleBag.length > 0) {
        const freshTracks = state.shuffleBag.filter(t => !sm.isInHistory(t.uri));
        
        if (freshTracks.length === 0) {
            console.log("♻️ Dispatcher: History full. Resetting bag...");
            if (state.playedHistory && typeof state.playedHistory.clear === 'function') {
                state.playedHistory.clear();
            }
            nextTrack = state.shuffleBag[0];
        } else {
            nextTrack = freshTracks[0];
        }
        console.log(`📻 Dispatcher: Playing Fallback - ${nextTrack.name}`);
    }

    if (nextTrack) {
        sm.addToHistory(nextTrack.uri);
    }

    return nextTrack;
}

/**
 * 4. SEARCH
 */
async function searchTracks(query) {
    if (!query) return [];
    try {
        const data = await spotifyApi.searchTracks(query);
        return data.body.tracks.items.map(t => ({
            name: t.name,
            artist: t.artists[0].name,
            album: t.album.name,
            uri: t.uri,
            albumArt: t.album.images[0]?.url,
            id: t.id
        }));
    } catch (e) {
        console.error("❌ Search failed:", e.message);
        return [];
    }
}

module.exports = { saveTokens, refreshShuffleBag, getNextTrack, searchTracks };