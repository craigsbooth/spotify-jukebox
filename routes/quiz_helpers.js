// routes/quiz_helpers.js - Shared Quiz Utilities (Decoy Generation & Spotify API)
const quizDB = require('../data/quiz_db');
const spotifyApi = require('../spotify_instance');

const QuizHelpers = {
    /**
     * Generates a list of artist decoys from the same decade.
     */
    getDecoyArtists(track) {
        const correct = track.artist;
        const allTracks = quizDB.tracks;
        
        // 1. Prioritize artists from the SAME DECADE
        let decoys = [...new Set(
            allTracks
            .filter(t => t.decade === track.decade && t.artist !== correct)
            .map(t => t.artist)
        )];

        // 2. Backfill with any artist if needed
        if (decoys.length < 3) {
            const others = [...new Set(
                allTracks
                .filter(t => t.artist !== correct && !decoys.includes(t.artist))
                .map(t => t.artist)
            )];
            decoys = [...decoys, ...others];
        }

        // 3. Shuffle and pick 3, then add correct and shuffle again
        const selected = decoys.sort(() => Math.random() - 0.5).slice(0, 3);
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
     * NEW: Generates album decoys for Album Context questions (Suggestion #2).
     * Prioritizes albums from the same artist, then backfills with albums from the same decade.
     */
    getDecoyAlbums(track) {
        const correct = track.album || "Unknown Album";
        
        // 1. Prioritize other albums from the SAME ARTIST
        let decoys = [...new Set(
            quizDB.tracks
            .filter(t => t.artist === track.artist && t.album !== correct)
            .map(t => t.album)
        )];

        // 2. Backfill with albums from the SAME DECADE if needed
        if (decoys.length < 3) {
            const sameDecade = [...new Set(
                quizDB.tracks
                .filter(t => t.decade === track.decade && t.album !== correct && !decoys.includes(t.album))
                .map(t => t.album)
            )];
            decoys = [...decoys, ...sameDecade];
        }

        // 3. Shuffle and pick 3
        const selected = decoys.sort(() => Math.random() - 0.5).slice(0, 3);
        
        // 4. Emergency backfill if DB is extremely small
        while (selected.length < 3) {
            selected.push(`Album ${selected.length + 1}`);
        }

        return [correct, ...selected].sort(() => Math.random() - 0.5);
    },

    /**
     * Fetches Album metadata (Image, Popularity, Name) for Picture Rounds and Logic checks.
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
     * Fetches Artist imagery for Picture Rounds.
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