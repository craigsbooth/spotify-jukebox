// spotify_ctrl.js - RESTORED SIMPLE ENGINE
const state = require('./state');
const spotifyApi = require('./spotify_instance'); 
const sm = require('./state_manager'); 
const tokenManager = require('./token_manager'); 

const spotifyCtrl = {
    saveTokens: tokenManager.saveTokens,
    handleExpiredToken: tokenManager.handleExpiredToken,

    // 1. SIMPLE REFRESH: Fetch playlist -> Fill state.shuffleBag
    refreshShuffleBag: async () => {
        const token = spotifyApi.getAccessToken();
        if (!token) {
            console.warn("⚠️ Controller: Cannot refresh bag - No Access Token.");
            return 0;
        }

        // Always use the global fallback settings
        const playlistId = state.fallbackPlaylist?.id;
        if (!playlistId) {
            console.warn("⚠️ Controller: No fallback playlist ID set in global state.");
            return 0;
        }

        console.log(`♻️ Controller: Fetching tracks for global fallback (ID: ${playlistId})`);
        
        try {
            let allTracks = [];
            let offset = 0;
            let limit = 50; 
            let hasNext = true;

            // Robust Pagination Loop
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
                
                // Safety break to prevent infinite loops on massive playlists
                if (offset > 2000) break; 
            }

            if (allTracks.length === 0) return 0;

            // Fisher-Yates Shuffle
            for (let i = allTracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
            }

            // DIRECT UPDATE TO GLOBAL STATE
            state.shuffleBag = allTracks;
            if (state.playedHistory instanceof Set) state.playedHistory.clear();
            else state.playedHistory = new Set();
            
            console.log(`✅ Controller: Queue populated with ${state.shuffleBag.length} tracks.`);
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

    // 2. SIMPLE GET NEXT: Check Queue -> Check Bag
    getNextTrack: async () => {
        let nextTrack = null;

        // A. Priority: The Manual Queue
        if (state.partyQueue.length > 0) {
            nextTrack = state.partyQueue.shift();
            console.log(`🎯 Dispatcher: Playing from Queue - ${nextTrack.name}`);
        } 
        // B. Fallback: The Shuffle Bag
        else if (state.shuffleBag && state.shuffleBag.length > 0) {
            // Filter out played tracks
            const freshTracks = state.shuffleBag.filter(t => !sm.isInHistory(state.playedHistory, t.uri));
            
            if (freshTracks.length === 0) {
                console.log("♻️ Dispatcher: Re-shuffling fallback pool...");
                state.playedHistory.clear();
                // Simple re-shuffle
                for (let i = state.shuffleBag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [state.shuffleBag[i], state.shuffleBag[j]] = [state.shuffleBag[j], state.shuffleBag[i]];
                }
                nextTrack = state.shuffleBag[0];
            } else {
                nextTrack = freshTracks[0];
            }
            console.log(`📻 Dispatcher: Playing from Bag - ${nextTrack.name}`);
        }

        if (nextTrack) {
            sm.addToHistory(state.playedHistory, nextTrack.uri);
        }
        
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
                } catch (re) {}
            }
            console.error("⚠️ Spotify Playback Error:", err.message);
            return false;
        }
    },

    transferPlayback: async (deviceId) => {
        try {
            await spotifyApi.transferMyPlayback([deviceId], { play: true });
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