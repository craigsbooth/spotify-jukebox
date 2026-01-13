// lyrics_engine.js - Dedicated & Fast
const lyricsCache = new Map();

/**
 * Clean title for better search results
 */
function cleanTitle(title) {
    if (!title) return "";
    return title.split(' - ')[0].split(' (')[0].split(' [')[0]
        .replace(/remastered|version|radio edit|live|feat\..*/gi, '').trim();
}

/**
 * Fetch Lyrics (Non-blocking)
 */
async function fetchLyrics(track) {
    if (!track || !track.name || !track.artist) return null;

    // 1. FAST PATH: Check Cache
    if (lyricsCache.has(track.uri)) {
        console.log(`⚡ Lyrics: Cache hit for ${track.name}`);
        return lyricsCache.get(track.uri);
    }

    const searchName = cleanTitle(track.name);
    const searchArtist = track.artist.split(',')[0].trim();

    console.log(`🔍 Lyrics: Fetching live for "${searchName}"...`);

    try {
        const query = encodeURIComponent(`${searchArtist} ${searchName}`);
        const url = `https://lrclib.net/api/search?q=${query}`;
        
        const res = await fetch(url);
        if (res.ok) {
            const results = await res.json();
            if (Array.isArray(results) && results.length > 0) {
                const match = results.find(r => r.syncedLyrics) || results[0];
                const lyricsData = { 
                    synced: match.syncedLyrics || null, 
                    plain: match.plainLyrics || null 
                };

                // Save to cache so next time it's instant
                lyricsCache.set(track.uri, lyricsData);
                console.log(`✅ Lyrics: Found and Cached for "${searchName}"`);
                return lyricsData;
            }
        }
    } catch (e) {
        console.warn(`⚠️ Lyrics: Fetch failed for ${searchName}`);
    }

    return null;
}

module.exports = { fetchLyrics };