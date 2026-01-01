// intel_engine.js - Deep Research via Deezer (ISRC) & MetaBrainz
const state = require('./state');
const sm = require('./state_manager'); // Added for immediate saving

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function cleanTitleForSearch(title) {
    if (!title) return "";
    return title.split(' - ')[0].split(' (')[0].split(' [')[0]
        .replace(/remastered|version|radio edit|live/gi, '').trim();
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

    // --- STEP 1: INSTANT UI UPDATE ---
    // Wipe old technical data immediately so the Host knows a new scan has started.
    state.djStatus = {
        ...state.djStatus,
        message: `Researching: ${track.name}`,
        researchTitle: track.name,
        researchArtist: track.artist,
        researchAlbum: track.album || 'Loading...',
        // FIX: Ensure placeholder doesn't 404 if albumArt is missing
        albumArtwork: track.albumArt || "https://developer.spotify.com/assets/branding-guidelines/icon3@2x.png",
        bpm: '--',
        key: 'N/A',
        publisher: 'Scanning Registry...',
        isrc: '--',
        genres: [],
        valence: 0
    };
    
    // Broadcast the "Scanning" state to the dashboard immediately
    sm.saveSettings(); 

    try {
        console.log(`⏳ [INTEL] Lazy Loading Research for "${track.name}" in 3s...`);
        await sleep(3000);

        const research = await fetchDeepMetadata(track.artist, track.name);
        
        // --- STEP 2: FINAL DATA SYNC ---
        state.djStatus = { 
            ...state.djStatus,
            message: `Playing: ${track.name}`, 
            researchTitle: research?.title || track.name,
            researchArtist: research?.artist || track.artist,
            researchAlbum: research?.album || track.album || '--',
            bpm: research?.bpm ?? '--', 
            key: research?.key || 'N/A',
            genres: research?.genres || [],
            valence: research?.mood || 0,
            publisher: research?.publisher || 'Independent',
            isrc: research?.isrc || '--',
            releaseDate: research?.releaseDate || '--'
        };

        // Save the finished research to disk
        sm.saveSettings();

        // --- THE FULL VERBOSE REPORT ---
        console.log("\n=============================================");
        console.log("    TRACK INTELLIGENCE REPORT (2025)");
        console.log("=============================================");
        console.log(`Title       : ${state.djStatus.researchTitle}`);
        console.log(`Artist      : ${state.djStatus.researchArtist}`);
        console.log(`Album       : ${state.djStatus.researchAlbum}`);
        console.log(`Publisher   : ${state.djStatus.publisher}`);
        console.log(`BPM         : ${state.djStatus.bpm}`);
        console.log(`MusicalKey  : ${state.djStatus.key}`);
        console.log(`Mood        : ${state.djStatus.valence}%`);
        console.log(`ISRC        : ${state.djStatus.isrc}`);
        console.log(`ReleaseDate : ${state.djStatus.releaseDate}`);
        console.log(`Genres      : ${state.djStatus.genres.join(', ') || 'N/A'}`);
        console.log("=============================================\n");

        return true;
    } catch (e) { 
        console.error(`❌ Intel Engine Failure:`, e.message || e); 
        return false;
    }
}

module.exports = { analyzeTrack };