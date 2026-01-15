// routes/quiz_question_factory.js - Full V7.0 (Shuffling, API Images, Decade Decoys)
const quizDB = require('../data/quiz_db');
const spotifyApi = require('../spotify_instance');

class QuestionFactory {
    static async generate(track, config, history) {
        if (!track) return null;

        // 1. Try finding a curated track in the DB
        const vaultTrack = quizDB.tracks.find(t => 
            t.name.toLowerCase() === track.name.toLowerCase() || 
            t.artist.toLowerCase() === track.artist.toLowerCase()
        );

        let pool = [];
        if (vaultTrack && vaultTrack.questions) {
            pool = vaultTrack.questions.filter(q => {
                const diff = config.difficultyFocus;
                const matchesDiff = (diff < 30) ? (q.difficulty === 'Easy' || q.difficulty === 'Medium') :
                                    (diff > 70) ? (q.difficulty === 'Hard' || q.difficulty === 'Extreme') : true;
                const matchesPic = config.enablePictures || !q.type.includes('PICTURE');
                const qHash = Buffer.from(q.text + q.correct).toString('base64');
                return matchesDiff && matchesPic && !history.includes(qHash);
            });
        }

        // 2. If no curated questions, use the generator
        if (pool.length === 0) return await this.generateTemplate(track, config, history);

        // 3. Select a random curated question
        const selected = pool[Math.floor(Math.random() * pool.length)];
        
        // FIX #4: Shuffle the options so correct answer position is random
        // We create a new shuffled array from the options
        const shuffledOptions = [...selected.options].sort(() => Math.random() - 0.5);
        
        // Re-calculate index based on shuffle
        let calculatedIndex = shuffledOptions.indexOf(selected.correct);
        
        if (calculatedIndex === -1) {
             console.error(`⚠️ DATA ERROR: Curated question "${selected.text}" invalid keys. Fallback.`);
             return await this.generateTemplate(track, config, history);
        }

        const selectedHash = Buffer.from(selected.text + selected.correct).toString('base64');
        history.push(selectedHash);

        return {
            id: Math.random().toString(36).substr(2),
            type: selected.type,
            text: selected.text,
            options: shuffledOptions, // Send shuffled options
            correctIndex: calculatedIndex,
            correct: selected.correct, // Keep reference for Engine verification
            image: selected.imagePath || null, 
            points: parseInt(selected.points) || 1000,
            difficulty: selected.difficulty,
            expiresAt: Date.now() + (config.timePerQuestion * 1000)
        };
    }

    static async generateTemplate(track, config, history) {
        const rand = Math.random();
        
        // FIX #6: Increased picture probability to 80% (if enabled)
        const usePicture = config.enablePictures && rand > 0.2; 
        
        let qData = null;
        if (usePicture) {
            if (rand > 0.6) {
                qData = await this.getArtistData(track);
            } else {
                qData = await this.getAlbumData(track);
            }
        }

        // Fallback to text if API fails or random roll was text
        if (!qData) qData = {
            text: `Who performs the track "${track.name}"?`,
            type: 'ARTIST',
            image: null
        };

        const qHash = Buffer.from(qData.text + track.artist).toString('base64');
        
        // FIX #1: Strict History Check preventing duplicates
        if (history.includes(qHash)) return null; 

        const options = this.getDecoyOptions(track);
        history.push(qHash);
        
        return {
            id: Math.random().toString(36).substr(2),
            type: qData.type,
            text: qData.text,
            options: options, // Already shuffled in getDecoyOptions
            correctIndex: options.indexOf(track.artist),
            correct: track.artist,
            image: qData.image,
            points: 500,
            difficulty: 'Easy',
            expiresAt: Date.now() + (config.timePerQuestion * 1000)
        };
    }

    static getDecoyOptions(track) {
        const correct = track.artist;
        const allTracks = quizDB.tracks;
        
        // 1. Prioritize artists from the SAME DECADE
        let decoys = [...new Set(
            allTracks
            .filter(t => t.decade === track.decade && t.artist !== correct)
            .map(t => t.artist)
        )];

        // 2. Backfill with any artist if needed (if DB is small)
        if (decoys.length < 3) {
            const others = [...new Set(
                allTracks
                .filter(t => t.artist !== correct && !decoys.includes(t.artist))
                .map(t => t.artist)
            )];
            decoys = [...decoys, ...others];
        }

        // 3. Shuffle and pick 3
        const selected = decoys.sort(() => Math.random() - 0.5).slice(0, 3);
        
        // 4. Safe Fallback
        while (selected.length < 3) {
            selected.push(`Artist ${selected.length + 1}`);
        }

        // FIX #4: Return final array shuffled (Correct + 3 Decoys)
        return [correct, ...selected].sort(() => Math.random() - 0.5);
    }

    static async getAlbumData(track) {
        if (!track.uri) return null;
        try {
            const id = track.uri.split(':').pop();
            const res = await spotifyApi.getTrack(id);
            const img = res.body.album.images[0]?.url;
            return img ? { text: "Identify the Artist from this Album", type: 'PICTURE_ALBUM', image: img } : null;
        } catch (e) { 
            console.error("⚠️ Spotify Album Fetch Failed:", e.message);
            return null; 
        }
    }

    static async getArtistData(track) {
        try {
            const res = await spotifyApi.searchArtists(track.artist);
            const img = res.body.artists.items[0]?.images[0]?.url;
            return img ? { text: "Identify this Artist", type: 'PICTURE_ARTIST', image: img } : null;
        } catch (e) { 
            console.error("⚠️ Spotify Artist Fetch Failed:", e.message);
            return null; 
        }
    }
}

module.exports = QuestionFactory;