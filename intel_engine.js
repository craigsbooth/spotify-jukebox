// intel_engine.js - Deep Research & Prefetching (No Lyrics)
const state = require('./state');
const sm = require('./state_manager');

// --- MEMORY CACHE ---
const intelCache = new Map();
// FIX: Added activeRequests to prevent double-fetching the same song
const activeRequests = new Map(); 
const pendingPrefetches = new Set(); 

function cleanTitleForSearch(title) {
    if (!title) return "";
    return title.split(' - ')[0].split(' (')[0].split(' [')[0]
        .replace(/remastered|version|radio edit|live/gi, '').trim();
}

function parseDuration(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    else seconds = parts[0];
    return seconds * 1000;
}

/**
 * YOUTUBE SEARCH
 */
async function fetchYouTubeId(artist, title, targetDurationMs) {
    try {
        const query = encodeURIComponent(`${title} ${artist} official music video`);
        const url = `https://www.youtube.com/results?search_query=${query}`;
        
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        const html = await response.text();
        const jsonMatch = html.match(/var ytInitialData = ({.*?});/);
        if (!jsonMatch) return null;

        const data = JSON.parse(jsonMatch[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
        if (!contents) return null;

        let bestMatch = null;
        let minDiff = Infinity;
        
        const videos = contents.filter(item => item.videoRenderer).map(item => item.videoRenderer);

        for (const video of videos) {
            const vidId = video.videoId;
            const timeStr = video.lengthText?.simpleText;
            if (!vidId || !timeStr) continue;

            const duration = parseDuration(timeStr);
            const diff = Math.abs(duration - targetDurationMs);

            if (diff < minDiff) {
                minDiff = diff;
                bestMatch = vidId;
            }
        }

        if (minDiff > 30000 && videos.length > 0) return videos[0].videoId;
        return bestMatch;

    } catch (e) {
        return null;
    }
}

/**
 * DEEP METADATA
 */
async function fetchDeepMetadata(artist, title) {
    const clean = cleanTitleForSearch(title);
    const query = encodeURIComponent(`${clean} ${artist}`);
    const headers = { 'User-Agent': 'BoldronJukebox/5.0' };

    try {
        const dSearch = await fetch(`https://api.deezer.com/search?q=${query}&limit=1`);
        const dData = await dSearch.json();
        if (!dData.data?.length) return null;

        const dTrackId = dData.data[0].id;
        const dAlbumId = dData.data[0].album.id;

        const [tDetail, aDetail] = await Promise.all([
            fetch(`https://api.deezer.com/track/${dTrackId}`).then(r => r.json()),
            fetch(`https://api.deezer.com/album/${dAlbumId}`).then(r => r.json())
        ]);

        const isrc = tDetail.isrc;
        let mbData = { bpm: tDetail.bpm ?? 0, key: 'N/A', mood: 0 };
        
        try {
            const mbRes = await fetch(`https://musicbrainz.org/ws/2/recording?query=isrc:${isrc}&fmt=json`, { headers });
            const mbJson = await mbRes.json();
            if (mbJson.recordings?.length > 0) {
                const rid = mbJson.recordings[0].id;
                const [abLow, abHigh] = await Promise.all([
                    fetch(`https://acousticbrainz.org/api/v1/${rid}/low-level`).then(r => r.ok ? r.json() : null),
                    fetch(`https://acousticbrainz.org/api/v1/${rid}/high-level`).then(r => r.ok ? r.json() : null)
                ]);
                if (abLow) {
                    mbData.key = `${abLow.tonal.key_key || ''} ${abLow.tonal.key_scale || ''}`.trim() || 'N/A';
                    mbData.bpm = Math.round(abLow.rhythm?.bpm) || mbData.bpm;
                }
                if (abHigh) mbData.mood = Math.round((abHigh.highlevel?.mood_happy?.probability || 0) * 100);
            }
        } catch (e) { }

        return {
            title: tDetail.title,
            artist: tDetail.artist.name,
            album: tDetail.album?.title,
            publisher: aDetail.label || 'Independent',
            bpm: mbData.bpm,
            key: mbData.key,
            genres: aDetail.genres?.data?.map((g) => g.name) || [],
            valence: mbData.mood,
            isrc: isrc,
            releaseDate: tDetail.release_date
        };
    } catch (e) {
        return null;
    }
}

/**
 * WORKER
 */
async function performResearch(track) {
    const searchName = track.displayName || track.name;
    const searchArtist = track.displayArtist || track.artist;
    const durationMs = track.duration_ms || 180000;

    const [ytId, research] = await Promise.all([
        fetchYouTubeId(searchArtist, searchName, durationMs),
        fetchDeepMetadata(searchArtist, searchName)
    ]);

    return {
        youtubeId: ytId,
        djStatus: {
            message: `Playing: ${searchName}`, 
            researchTitle: research?.title || searchName,
            researchArtist: research?.artist || searchArtist,
            researchAlbum: research?.album || track.album || '--',
            bpm: research?.bpm ?? '--', 
            key: research?.key || 'N/A',
            genres: research?.genres || [],
            valence: research?.valence || 0,
            publisher: research?.publisher || 'Independent',
            isrc: research?.isrc || '--',
            releaseDate: research?.releaseDate || '--'
        }
    };
}

const IntelEngine = {
    // FIX: Shared Request Handler (prevents race conditions)
    _getOrFetch: async (track) => {
        if (intelCache.has(track.uri)) return intelCache.get(track.uri);
        if (activeRequests.has(track.uri)) return await activeRequests.get(track.uri);

        const promise = performResearch(track).then(data => {
            intelCache.set(track.uri, data);
            activeRequests.delete(track.uri);
            return data;
        }).catch(err => {
            activeRequests.delete(track.uri);
            throw err;
        });

        activeRequests.set(track.uri, promise);
        return await promise;
    },

    /**
     * PREFETCH
     */
    prefetchNext: async () => {
        let nextTrack = null;
        if (state.partyQueue && state.partyQueue.length > 0) {
            nextTrack = state.partyQueue[0];
        } else if (state.shuffleBag && state.shuffleBag.length > 0) {
            const historySet = state.playedHistory instanceof Set ? state.playedHistory : new Set();
            nextTrack = state.shuffleBag.find(t => !historySet.has(t.uri)) || state.shuffleBag[0];
        }

        if (!nextTrack || !nextTrack.uri) return;

        // Skip if already working on it
        if (intelCache.has(nextTrack.uri) || activeRequests.has(nextTrack.uri)) return;

        console.log(`🔮 [INTEL] Prefetching data for next track: ${nextTrack.name}`);
        
        IntelEngine._getOrFetch(nextTrack).then(() => {
            console.log(`✅ [INTEL] Prefetch complete for ${nextTrack.name}`);
        }).catch(e => console.error("Prefetch error", e));
    },

    /**
     * MAIN ANALYZE
     */
    analyzeTrack: async (track) => {
        if (!track || !track.uri) return false;

        // 1. CHECK CACHE FIRST (The Fast Path)
        if (intelCache.has(track.uri)) {
            console.log(`⚡ [INTEL] Cache Hit! Applying pre-calculated data for ${track.name}`);
            const cached = intelCache.get(track.uri);
            
            state.youtubeId = cached.youtubeId;
            
            state.djStatus = { 
                ...state.djStatus,
                message: `Playing: ${track.displayName || track.name}`,
                albumArtwork: track.albumArt || "https://developer.spotify.com/assets/branding-guidelines/icon3@2x.png",
                ...cached.djStatus 
            };
            
            intelCache.delete(track.uri); // Consume cache
            sm.saveSettings();
            return true;
        }

        // 2. CACHE MISS
        console.log(`🐢 [INTEL] Cache Miss. Live research for ${track.name}`);
        state.youtubeId = null;
        
        state.djStatus = { 
            ...state.djStatus, 
            message: `Researching: ${track.name}`,
            albumArtwork: track.albumArt || "https://developer.spotify.com/assets/branding-guidelines/icon3@2x.png",
            bpm: 'Scan...', key: '...' 
        };
        sm.saveSettings();

        try {
            // Use _getOrFetch to ensure we don't double-fetch if prefetch just started
            const data = await IntelEngine._getOrFetch(track);
            state.youtubeId = data.youtubeId;
            state.djStatus = { ...state.djStatus, ...data.djStatus };
            sm.saveSettings();
            return true;
        } catch (e) {
            console.error("Live analysis failed", e);
            return false;
        }
    }
};

module.exports = IntelEngine;