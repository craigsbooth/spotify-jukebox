// spotify_ctrl.js - Playback, Shuffle & Search (Pagination Fixed)
const state = require('./state');
const spotifyApi = require('./spotify_instance'); 
const sm = require('./state_manager'); 
const tokenManager = require('./token_manager'); 

const spotifyCtrl = {
    saveTokens: tokenManager.saveTokens,
    handleExpiredToken: tokenManager.handleExpiredToken,

    refreshShuffleBag: async () => {
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
            let limit = 50; // Safer limit (sometimes 100 causes issues)
            let hasNext = true;

            // FIX: Robust Pagination Loop using 'next' check
            while (hasNext) {
                const data = await spotifyApi.getPlaylistTracks(state.fallbackPlaylist.id, { offset, limit });
                
                const batch = data.body.items
                    .filter(i => i && i.track && i.track.uri) // Filter nulls
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
                
                allTracks.push(...batch); // Performance: Push instead of spread
                
                // Update Loop State
                offset += limit;
                hasNext = !!data.body.next; // Stop if no next page
                
                // Safety Break (Prevent infinite loops on huge playlists)
                if (offset > 2000) break; 
            }

            // Fisher-Yates Shuffle
            for (let i = allTracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
            }

            state.shuffleBag = allTracks;
            if (state.playedHistory instanceof Set) state.playedHistory.clear();
            
            console.log(`✅ Controller: ${state.shuffleBag.length} tracks loaded & shuffled.`);
            return state.shuffleBag.length;
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
        let nextTrack = null;

        // 1. Check Guest Queue First
        if (state.partyQueue.length > 0) {
            nextTrack = state.partyQueue.shift();
            console.log(`🎯 Dispatcher: Playing Guest Request - ${nextTrack.name}`);
        } 
        // 2. Fallback Logic
        else if (state.shuffleBag && state.shuffleBag.length > 0) {
            // Find tracks not in history
            const freshTracks = state.shuffleBag.filter(t => !sm.isInHistory(t.uri));
            
            if (freshTracks.length === 0) {
                console.log("♻️ Dispatcher: History full. Re-shuffling fallback pool...");
                
                // FIX: Clear History AND Re-Shuffle to avoid playing same order
                if (state.playedHistory instanceof Set) state.playedHistory.clear();
                
                // Quick Shuffle of the existing bag
                for (let i = state.shuffleBag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [state.shuffleBag[i], state.shuffleBag[j]] = [state.shuffleBag[j], state.shuffleBag[i]];
                }
                
                nextTrack = state.shuffleBag[0];
            } else {
                nextTrack = freshTracks[0];
            }
            console.log(`📻 Dispatcher: Playing Fallback - ${nextTrack.name}`);
        }

        if (nextTrack) sm.addToHistory(nextTrack.uri);
        return nextTrack;
    },

    playTrack: async (uri) => {
        if (!uri) return;
        try {
            await spotifyApi.play({ uris: [uri] });
            state.startedAt = Date.now();
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