// karaoke_engine.js - Specialized YouTube Scraper for Karaoke Tracks
const pkg = require('./package.json');

const KaraokeEngine = {
    /**
     * EMBED VALIDATION
     * Checks if the video owner allows playback on external sites.
     */
    isEmbeddable: async (videoId) => {
        try {
            const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
            const response = await fetch(url);
            // YouTube returns 200 for embeddable, 401/403 for restricted videos.
            return response.ok;
        } catch (e) {
            return false;
        }
    },

    /**
     * SEARCH YOUTUBE FOR KARAOKE
     * Scrapes results and filters out restricted/non-embeddable videos.
     */
    search: async (query) => {
        try {
            const fullQuery = encodeURIComponent(`${query} karaoke`);
            const url = `https://www.youtube.com/results?search_query=${fullQuery}`;
            
            const response = await fetch(url, {
                headers: { 'User-Agent': `BoldronJukebox/${pkg.version}` }
            });
            const html = await response.text();
            
            const regex = /"videoId":"([^"]+)","thumbnail":\{"thumbnails":\[\{"url":"([^"]+)".*?"title":\{"runs":\[\{"text":"([^"]+)"/g;
            const candidates = [];
            let match;
            
            // Gather candidates from the first 15 results
            while ((match = regex.exec(html)) !== null && candidates.length < 15) {
                candidates.push({
                    id: match[1],
                    thumb: match[2],
                    title: match[3].replace(/\\u0026/g, '&'),
                    isKaraoke: true
                });
            }

            // Sequential filter to ensure we only return 6 embed-friendly results
            const verifiedResults = [];
            for (const item of candidates) {
                if (verifiedResults.length >= 6) break;
                const canEmbed = await KaraokeEngine.isEmbeddable(item.id);
                if (canEmbed) verifiedResults.push(item);
            }

            return verifiedResults;
        } catch (e) {
            console.error("❌ Karaoke Engine Error:", e);
            return [];
        }
    }
};

module.exports = KaraokeEngine;