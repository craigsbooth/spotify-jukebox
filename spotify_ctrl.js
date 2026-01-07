// spotify_ctrl.js - Multi-Host Aware Playback & Shuffle
const state = require('./state');
const spotifyApi = require('./spotify_instance'); 
const sm = require('./state_manager'); 
const tokenManager = require('./token_manager'); 
const sessions = require('./session_manager'); // NEW: Source of Truth

// HELPER: Sync Bridge
// Ensures changes to the Party instance are reflected in the legacy global state
const syncToGlobal = (party) => {
    state.shuffleBag = party.shuffleBag;
    state.partyQueue = party.partyQueue;
    state.playedHistory = party.playedHistory;
    state.currentPlayingTrack = party.currentPlayingTrack;
};

const spotifyCtrl = {
    saveTokens: tokenManager.saveTokens,
    handleExpiredToken: tokenManager.handleExpiredToken,

    refreshShuffleBag: async () => {
        // 1. Resolve Target State (Party vs Global)
        const party = sessions.getActiveParty();
        const targetState = party || state; // Fallback to global if no party (legacy mode)

        if (!spotifyApi.getAccessToken()) {
            console.warn("⚠️ Cannot refresh bag: No token found.");
            return 0;
        }
        
        // Use Party's specific fallback playlist or the default
        const playlistId = targetState.fallbackPlaylist?.id || state.fallbackPlaylist.id;
        const playlistName = targetState.fallbackPlaylist?.name || "Fallback";

        if (!playlistId) {
            console.warn("⚠️ No fallback playlist set.");
            return 0;
        }

        console.log(`♻️ Controller: Rebuilding Shuffle Bag for: ${playlistName}`);
        try {
            let allTracks = [];
            let offset = 0;
            let limit = 50; 
            let hasNext = true;

            // FIX: Robust Pagination Loop
            while (hasNext) {
                const data = await spotifyApi.getPlaylistTracks(playlistId, { offset, limit });
                
                const batch = data.body.items
                    .filter(i => i && i.track && i.track.uri) 
                    .map(i => ({
                        uri: i.track.uri, 
                        name: i.track.name, 
                        artist: i.track.artists[0].name,
                        album: i.track.album.name, 
                        albumArt: i.track.album.images[0]?.url,
                        duration_ms: i.track.duration_ms, 
                        isFallback: true, 
                        votes: 0
                    }));
                
                allTracks.push(...batch); 
                
                offset += limit;
                hasNext = !!data.body.next; 
                
                if (offset > 2000) break; 
            }

            // Fisher-Yates Shuffle
            for (let i = allTracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
            }

            // UPDATE THE PARTY INSTANCE
            targetState.shuffleBag = allTracks;
            
            // Clear history for a fresh start
            if (targetState.playedHistory instanceof Set) targetState.playedHistory.clear();
            else targetState.playedHistory = new Set();
            
            // BRIDGE: Sync back to global if we are in party mode
            if (party) syncToGlobal(party);
            
            console.log(`✅ Controller: ${targetState.shuffleBag.length} tracks loaded & shuffled for ${targetState.partyName}.`);
            return targetState.shuffleBag.length;

        } catch (err) {
            if (err.statusCode === 401) {
                await tokenManager.handleExpiredToken();
                return await spotifyCtrl.refreshShuffleBag();
            }
            console.error("❌ Controller: Playlist Load Failed:", err.message);
            return 0;
        }
    },

    getNextTrack: async () => {
        // 1. Resolve Target State
        const party = sessions.getActiveParty();
        const targetState = party || state;

        let nextTrack = null;

        // 2. Check Guest Queue First
        if (targetState.partyQueue.length > 0) {
            nextTrack = targetState.partyQueue.shift();
            console.log(`🎯 Dispatcher: Playing Guest Request - ${nextTrack.name}`);
        } 
        // 3. Fallback Logic
        else if (targetState.shuffleBag && targetState.shuffleBag.length > 0) {
            // Find tracks not in history
            const freshTracks = targetState.shuffleBag.filter(t => !sm.isInHistory(targetState.playedHistory, t.uri));
            
            if (freshTracks.length === 0) {
                console.log("♻️ Dispatcher: History full. Re-shuffling fallback pool...");
                
                // Reset History
                if (targetState.playedHistory instanceof Set) targetState.playedHistory.clear();
                
                // Reshuffle Bag
                for (let i = targetState.shuffleBag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [targetState.shuffleBag[i], targetState.shuffleBag[j]] = [targetState.shuffleBag[j], targetState.shuffleBag[i]];
                }
                
                nextTrack = targetState.shuffleBag[0];
            } else {
                nextTrack = freshTracks[0];
            }
            console.log(`📻 Dispatcher: Playing Fallback - ${nextTrack.name}`);
        }

        if (nextTrack) {
            sm.addToHistory(targetState.playedHistory, nextTrack.uri);
            if (party) syncToGlobal(party); // Sync change back to global
        }
        
        return nextTrack;
    },

    playTrack: async (uri) => {
        if (!uri) return;
        try {
            await spotifyApi.play({ uris: [uri] });
            
            // Update timestamp on both
            state.startedAt = Date.now();
            const party = sessions.getActiveParty();
            if (party) party.startedAt = Date.now();

            console.log(`🎵 Spotify: Now Playing URI: ${uri}`);
            return true;
        } catch (err) {
            if (err.statusCode === 401) {
                try {
                    await tokenManager.handleExpiredToken();
                    return await spotifyCtrl.playTrack(uri);
                } catch (re) { /* Fail */ }
            }
            console.error("⚠️ Spotify Playback Error:", err.message);
            
            // Auto-transfer logic if no device active
            if (err.message.includes("NO_ACTIVE_DEVICE")) {
                const devices = await spotifyApi.getMyDevices();
                const target = devices.body.devices.find(d => d.type === "Computer") || devices.body.devices[0];
                if (target) {
                    console.log(`📡 Controller: Forcing playback to: ${target.name}`);
                    await spotifyApi.play({ uris: [uri], device_id: target.id });
                    
                    state.startedAt = Date.now();
                    const party = sessions.getActiveParty();
                    if (party) party.startedAt = Date.now();
                    
                    return true;
                }
            }
            return false;
        }
    },

    transferPlayback: async (deviceId) => {
        try {
            await spotifyApi.transferMyPlayback([deviceId], { play: true });
            console.log(`📱 Controller: Playback transferred to device: ${deviceId}`);
            return { success: true };
        } catch (err) {
            if (err.statusCode === 401) {
                await tokenManager.handleExpiredToken();
                return await spotifyCtrl.transferPlayback(deviceId);
            }
            return { success: false, error: err.message };
        }
    },

    searchTracks: async (query) => {
        if (!query) return [];
        try {
            const data = await spotifyApi.searchTracks(query);
            return data.body.tracks.items.map(t => ({
                name: t.name, artist: t.artists[0].name, album: t.album.name,
                uri: t.uri, albumArt: t.album.images[0]?.url, id: t.id
            }));
        } catch (e) {
            if (e.statusCode === 401) {
                await tokenManager.handleExpiredToken();
                return await spotifyCtrl.searchTracks(query);
            }
            return [];
        }
    }
};

module.exports = spotifyCtrl;