// routes/quiz_helpers.js - V11.0 (Batch Compatible)
const quizDB = require('../data/quiz_db');
const spotifyApi = require('../spotify_instance');

// Helper: Clean title for better search accuracy
function cleanTitleForSearch(title) {
    if (!title) return "";
    return title.split(' - ')[0].split(' (')[0].split(' [')[0]
        .replace(/remastered|version|radio edit|live/gi, '').trim();
}

// Helper: Clean Artist for loose matching (removes "The ")
function normalizeArtist(artist) {
    if (!artist) return "";
    return artist.toLowerCase().replace(/^the\s+/, '').trim();
}

const QuizHelpers = {
    /**
     * Generates a list of artist decoys from the same decade.
     */
    getDecoyArtists(track) {
        const correct = track.artist;
        const allTracks = quizDB.tracks;
        
        let decoys = [...new Set(
            allTracks
            .filter(t => t.decade === track.decade && t.artist !== correct)
            .map(t => t.artist)
        )];

        if (decoys.length < 3) {
            const others = [...new Set(
                allTracks
                .filter(t => t.artist !== correct && !decoys.includes(t.artist))
                .map(t => t.artist)
            )];
            decoys = [...decoys, ...others];
        }

        const selected = decoys.sort(() => Math.random() - 0.5).slice(0, 3);
        // Fallback: Engine QC will filter out questions with "Artist X"
        while (selected.length < 3) selected.push(`Artist ${selected.length + 1}`);

        return [correct, ...selected].sort(() => Math.random() - 0.5);
    },

    /**
     * Generates year decoys centered around the release year.
     */
    getDecoyYears(correctYear) {
        const year = parseInt(correctYear);
        const decoys = new Set();
        while (decoys.size < 3) {
            const offset = Math.floor(Math.random() * 11) - 5; // +/- 5 years
            const decoy = year + offset;
            if (decoy !== year && decoy > 1950 && decoy <= new Date().getFullYear()) {
                decoys.add(decoy.toString());
            }
        }
        return [correctYear, ...decoys].sort(() => Math.random() - 0.5);
    },

    /**
     * Generates genre decoys from a standard pool.
     */
    getDecoyGenres(correctGenre) {
        const genres = ["Rock", "Pop", "Hip Hop", "Grunge", "Indie", "Metal", "Country", "R&B", "Electronic", "Disco", "Jazz", "Soul", "Punk", "Funk", "Reggae"];
        const decoys = genres.filter(g => g !== correctGenre).sort(() => Math.random() - 0.5).slice(0, 3);
        return [correctGenre, ...decoys].sort(() => Math.random() - 0.5);
    },

    /**
     * Generates album decoys for Album Context questions.
     */
    getDecoyAlbums(track) {
        const correct = track.album || "Unknown Album";
        
        let decoys = [...new Set(
            quizDB.tracks
            .filter(t => t.artist === track.artist && t.album !== correct)
            .map(t => t.album)
        )];

        if (decoys.length < 3) {
            const sameDecade = [...new Set(
                quizDB.tracks
                .filter(t => t.decade === track.decade && t.album !== correct && !decoys.includes(t.album))
                .map(t => t.album)
            )];
            decoys = [...decoys, ...sameDecade];
        }

        const selected = decoys.sort(() => Math.random() - 0.5).slice(0, 3);
        
        // Fallback: Engine QC will filter out questions with "Album X"
        while (selected.length < 3) {
            selected.push(`Album ${selected.length + 1}`);
        }

        return [correct, ...selected].sort(() => Math.random() - 0.5);
    },

    /**
     * Fetches the ORIGINAL release year using iTunes Search API.
     * Includes Strict Filtering, Fallback Search, Dominance Logic, and Confidence Checks.
     */
    async getOriginalYear(track) {
        if (!global.fetch) return null;

        try {
            const clean = cleanTitleForSearch(track.name);
            const safeTerm = `${track.artist} ${clean}`.replace(/'/g, "");
            let url = `https://itunes.apple.com/search?term=${encodeURIComponent(safeTerm)}&media=music&entity=song&limit=30`;
            
            let res = await fetch(url);
            let json = await res.json();
            let results = json.results || [];

            // FALLBACK: If 0 results, try searching ONLY the Title
            if (results.length === 0) {
                const safeTitle = clean.replace(/'/g, "");
                url = `https://itunes.apple.com/search?term=${encodeURIComponent(safeTitle)}&media=music&entity=song&limit=50`;
                res = await fetch(url);
                json = await res.json();
                results = json.results || [];
            }

            if (results.length === 0) return null;

            const yearCounts = {};
            const lowerClean = clean.toLowerCase();
            const normArtist = normalizeArtist(track.artist);
            let totalValidResults = 0;

            for (const item of results) {
                if (!item.releaseDate || !item.trackName || !item.artistName) continue;

                const tName = item.trackName.toLowerCase();
                const aName = normalizeArtist(item.artistName);
                const year = parseInt(item.releaseDate.split('-')[0]);

                // Filter 1: Title Must Match
                if (!tName.includes(lowerClean)) continue;

                // Filter 2: Artist Must Match
                if (!aName.includes(normArtist) && !normArtist.includes(aName)) continue;

                // Filter 3: Ignore obvious re-releases
                if (tName.includes('live') || tName.includes('demo') || tName.includes('remix') || tName.includes('concert')) {
                    continue; 
                }

                if (year > 1900 && year <= new Date().getFullYear() + 1) {
                    yearCounts[year] = (yearCounts[year] || 0) + 1;
                    totalValidResults++;
                }
            }

            const uniqueYears = Object.keys(yearCounts).map(Number).sort((a, b) => a - b);
            if (uniqueYears.length === 0) return null;

            let bestYear = uniqueYears[0];
            
            // STRATEGY: Dominant Successor
            if (uniqueYears.length > 1) {
                const firstYear = uniqueYears[0];
                const nextYear = uniqueYears[1];
                const firstVotes = yearCounts[firstYear];
                const nextVotes = yearCounts[nextYear];

                // If next year is overwhelming (1.5x votes), pick it.
                if (nextVotes > (firstVotes * 1.5)) {
                    bestYear = nextYear;
                }
            }

            // FINAL SAFETY: Low Confidence Check
            const bestVotes = yearCounts[bestYear];
            if (bestVotes === 1 && totalValidResults < 3) {
                console.warn(`⚠️ Skipped Year Question: Low confidence for "${track.name}" (${bestYear} has 1 vote).`);
                return null;
            }

            console.log(`✅ Year Found: ${bestYear} for "${track.name}"`);
            return bestYear.toString();

        } catch (e) {
            console.error("⚠️ iTunes Fetch Error:", e.message);
            return null;
        }
    },

    /**
     * Fetches Album metadata (Image, Popularity, Name).
     */
    async getAlbumData(track) {
        if (!track.uri) return null;
        try {
            const id = track.uri.split(':').pop();
            const res = await spotifyApi.getTrack(id);
            return { 
                image: res.body.album.images[0]?.url, 
                popularity: res.body.popularity, 
                albumName: res.body.album.name 
            };
        } catch (e) { 
            console.error("⚠️ Helpers: Spotify Data Fetch Failed:", e.message);
            return null; 
        }
    },

    /**
     * Fetches Artist imagery.
     */
    async getArtistData(track) {
        try {
            const res = await spotifyApi.searchArtists(track.artist);
            const img = res.body.artists.items[0]?.images[0]?.url;
            return img ? { image: img } : null;
        } catch (e) { 
            console.error("⚠️ Helpers: Spotify Artist Fetch Failed:", e.message);
            return null; 
        }
    }
};

module.exports = QuizHelpers;