// intel_engine.js - Deep Research via Deezer (ISRC), MetaBrainz & YouTube
const state = require('./state');
const sm = require('./state_manager'); // Added for immediate saving

function cleanTitleForSearch(title) {
    if (!title) return "";
    return title.split(' - ')[0].split(' (')[0].split(' [')[0]
        .replace(/remastered|version|radio edit|live/gi, '').trim();
}

/**
 * YOUTUBE SEARCH ENGINE
 * Searches for the official music video and returns the Video ID
 */
async function fetchYouTubeId(artist, title) {
    try {
        const query = encodeURIComponent(`${title} ${artist} official music video`);
        // Using a public search endpoint for YouTube
        const url = `https://www.youtube.com/results?search_query=${query}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const html = await response.text();
        
        // Regex to find the first video ID in the YouTube search result page
        const regex = /"videoId":"([^"]+)"/;
        const match = html.match(regex);
        
        if (match && match[1]) {
            console.log(`🎬 [YOUTUBE] Found Video ID: ${match[1]} for ${title}`);
            return match[1];
        }
        return null;
    } catch (e) {
        console.error("❌ YouTube Search Error:", e.message);
        return null;
    }
}

/**
 * DEEP RESEARCH ENGINE
 */
async function fetchDeepMetadata(artist, title) {
    const clean = cleanTitleForSearch(title);
    const query = encodeURIComponent(`${clean} ${artist}`);
    const headers = { 'User-Agent': 'BoldronJukebox/5.0 (contact: craigbooth@outlook.com)' };

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
                if (abHigh) {
                    mbData.mood = Math.round((abHigh.highlevel?.mood_happy?.probability || 0) * 100);
                }
            }
        } catch (e) { /* MB Fallback */ }

        return {
            title: tDetail.title,
            artist: tDetail.artist.name,
            album: tDetail.album?.title,
            publisher: aDetail.label || 'Independent',
            bpm: mbData.bpm,
            key: mbData.key,
            mood: mbData.mood,
            isrc: isrc,
            releaseDate: tDetail.release_date,
            genres: aDetail.genres?.data?.map((g) => g.name) || []
        };
    } catch (e) {
        console.error("❌ Deep Research Error:", e.message || e);
        return null;
    }
}

/**
 * MAIN ENTRY POINT - Hardened for Instant Feedback
 */
async function analyzeTrack(track) {
    if (!track || !track.uri) return false;

    // Use sanitized names for better search accuracy
    const searchName = track.displayName || track.name;
    const searchArtist = track.displayArtist || track.artist;

    // --- STEP 1: INSTANT UI UPDATE ---
    state.djStatus = {
        ...state.djStatus,
        message: `Researching: ${searchName}`,
        researchTitle: searchName,
        researchArtist: searchArtist,
        researchAlbum: track.album || 'Loading...',
        albumArtwork: track.albumArt || "https://developer.spotify.com/assets/branding-guidelines/icon3@2x.png",
        bpm: '--',
        key: 'N/A',
        publisher: 'Scanning Registry...',
        isrc: '--',
        genres: [],
        valence: 0
    };
    
    // Reset YouTube ID for the new track
    state.youtubeId = null;
    sm.saveSettings(); 

    try {
        // Run YouTube search and Technical metadata research in parallel for speed
        // Removed artificial sleep delay for faster response
        console.log(`⏳ [INTEL] Launching Parallel Research for "${searchName}"...`);
        
        const [ytId, research] = await Promise.all([
            fetchYouTubeId(searchArtist, searchName),
            fetchDeepMetadata(searchArtist, searchName)
        ]);

        // --- STEP 2: FINAL DATA SYNC ---
        state.youtubeId = ytId;
        state.djStatus = { 
            ...state.djStatus,
            message: `Playing: ${searchName}`, 
            researchTitle: research?.title || searchName,
            researchArtist: research?.artist || searchArtist,
            researchAlbum: research?.album || track.album || '--',
            bpm: research?.bpm ?? '--', 
            key: research?.key || 'N/A',
            genres: research?.genres || [],
            valence: research?.mood || 0,
            publisher: research?.publisher || 'Independent',
            isrc: research?.isrc || '--',
            releaseDate: research?.releaseDate || '--'
        };

        // Save the finished research and YouTube ID to disk/state
        sm.saveSettings();

        // --- THE FULL VERBOSE REPORT ---
        console.log("\n=============================================");
        console.log("    TRACK INTELLIGENCE REPORT (2026)");
        console.log("=============================================");
        console.log(`Title       : ${state.djStatus.researchTitle}`);
        console.log(`Artist      : ${state.djStatus.researchArtist}`);
        console.log(`YouTube ID  : ${state.youtubeId || 'Not Found'}`);
        console.log(`BPM         : ${state.djStatus.bpm}`);
        console.log(`MusicalKey  : ${state.djStatus.key}`);
        console.log(`Genres      : ${state.djStatus.genres.join(', ') || 'N/A'}`);
        console.log("=============================================\n");

        return true;
    } catch (e) { 
        console.error(`❌ Intel Engine Failure:`, e.message || e); 
        return false;
    }
}

module.exports = { analyzeTrack };