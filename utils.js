// utils.js - Shared Helper Functions
const utils = {
    /**
     * Checks if a URI exists in the history (Set or Array)
     */
    isInHistory: (history, uri) => {
        if (!history) return false;
        if (history instanceof Set) return history.has(uri);
        if (Array.isArray(history)) return history.includes(uri);
        return false;
    },

    /**
     * Cleans up track titles and artists to remove clutter
     */
    sanitizeTrack: (track) => {
        if (!track || !track.name) return track;

        const junkPatterns = [
            /remaster(?:ed)?/gi, /deluxe/gi, /anniversary/gi, /edition/gi, /expanded/gi,
            /version/gi, /mix/gi, /remix/gi, /radio edit/gi, /club/gi, /extended/gi,
            /original/gi, /live(?: at| from)?/gi, /feat(?:\.|uring)?/gi, /ft(?:\.)?/gi,
            /with/gi, /vip/gi, /re-recorded/gi, /mono/gi, /stereo/gi, /acoustic/gi,
            /instrumental/gi, /bonus/gi, /single/gi, /unplugged/gi, /vault/gi
        ];

        const junkRegex = new RegExp(junkPatterns.map(p => p.source).join('|'), 'i');

        let cleanName = track.name
            .replace(/\s*\([^)]*?\)/gi, (match) => junkRegex.test(match) ? '' : match)
            .replace(/\s*\[[^\]]*?\]/gi, (match) => junkRegex.test(match) ? '' : match)
            .replace(/\s*[-–—].*$/gi, (match) => junkRegex.test(match) ? '' : match)
            .trim();

        if (!cleanName || cleanName.length < 2) cleanName = track.name;
        let cleanArtist = track.artist ? track.artist.split(/[,]|feat\.|ft\.|featuring|&|and/i)[0].trim() : track.artist;

        return {
            ...track,
            displayName: cleanName,
            displayArtist: cleanArtist
        };
    }
};

module.exports = utils;