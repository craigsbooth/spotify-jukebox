// spotify_ctrl.js - Playback, Shuffle & Search (Token Hardened)
const state = require('./state');
const spotifyApi = require('./spotify_instance'); 
const sm = require('./state_manager'); 
const tokenManager = require('./token_manager'); 

const spotifyCtrl = {
    // RESTORED: Mapping for auth.js and other modules that call spotifyCtrl.saveTokens
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
            let offset = 0, limit = 100, total = 1;

            while (offset < total) {
                const data = await spotifyApi.getPlaylistTracks(state.fallbackPlaylist.id, { offset, limit });
                total = data.body.total;
                const batch = data.body.items
                    .filter(i => i && i.track && i.track.uri)
                    .map(i => ({
                        uri: i.track.uri, name: i.track.name, artist: i.track.artists[0].name,
                        album: i.track.album.name, albumArt: i.track.album.images[0]?.url,
                        duration: i.track.duration_ms, isFallback: true, votes: 0
                    }));
                allTracks = [...allTracks, ...batch];
                offset += limit;
            }

            for (let i = allTracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
            }

            state.shuffleBag = allTracks;
            if (state.playedHistory && typeof state.playedHistory.clear === 'function') {
                state.playedHistory.clear();
            }
            console.log(`✅ Controller: ${state.shuffleBag.length} tracks loaded into pool.`);
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
        if (state.partyQueue.length > 0) {
            nextTrack = state.partyQueue.shift();
            console.log(`🎯 Dispatcher: Playing Guest Request - ${nextTrack.name}`);
        } else if (state.shuffleBag && state.shuffleBag.length > 0) {
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
        if (nextTrack) sm.addToHistory(nextTrack.uri);
        return nextTrack;
    },

    playTrack: async (uri) => {
        if (!uri) return;
        try {
            await spotifyApi.play({ uris: [uri] });
            state.startedAt = Date.now();
            console.log(`🎵 Spotify: Now Playing URI: ${uri}`); // RESTORED
            return true;
        } catch (err) {
            if (err.statusCode === 401) {
                try {
                    await tokenManager.handleExpiredToken();
                    return await spotifyCtrl.playTrack(uri);
                } catch (re) { /* Fail */ }
            }
            console.error("⚠️ Spotify Playback Error:", err.message);
            if (err.message.includes("NO_ACTIVE_DEVICE")) {
                const devices = await spotifyApi.getMyDevices();
                const webPlayer = devices.body.devices.find(d => d.name.includes("Web Player") || d.type === "Computer");
                const anyActive = webPlayer || devices.body.devices[0];
                if (anyActive) {
                    console.log(`📡 Controller: Forcing playback to: ${anyActive.name}`);
                    await spotifyApi.play({ uris: [uri], device_id: anyActive.id });
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
            console.error("❌ Controller: Transfer failed:", err.message);
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
            console.error("❌ Search failed:", e.message); // RESTORED
            return [];
        }
    }
};

module.exports = spotifyCtrl;