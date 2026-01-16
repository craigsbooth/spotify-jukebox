// routes/quiz_question_factory.js - V8.3 (Refined Mix & Corrected Suggestion #2)
const quizDB = require('../data/quiz_db');
const helpers = require('./quiz_helpers');

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

        // 2. Fallback to Generator
        if (pool.length === 0) return await this.generateTemplate(track, config, history);

        // 3. Process curated question
        const selected = pool[Math.floor(Math.random() * pool.length)];
        const shuffledOptions = [...selected.options].sort(() => Math.random() - 0.5);
        const calculatedIndex = shuffledOptions.indexOf(selected.correct);
        
        if (calculatedIndex === -1) return await this.generateTemplate(track, config, history);

        const selectedHash = Buffer.from(selected.text + selected.correct).toString('base64');
        history.push(selectedHash);

        return {
            id: Math.random().toString(36).substr(2),
            type: selected.type,
            text: selected.text,
            options: shuffledOptions,
            correctIndex: calculatedIndex,
            correct: selected.correct,
            image: selected.imagePath || null, 
            points: parseInt(selected.points) || 1000,
            difficulty: selected.difficulty,
            expiresAt: Date.now() + (config.timePerQuestion * 1000)
        };
    }

    static async generateTemplate(track, config, history) {
        const typeRoll = Math.random();
        // DEFAULT: Artist ID (500 pts)
        let template = { type: 'ARTIST', text: `Who performs "${track.name}"?`, correct: track.artist, points: 500 };
        
        // 1. Manage the % Mix
        if (typeRoll > 0.8) { // 20% Year Recognition (1000 pts)
            template = { type: 'YEAR', text: `In what year was "${track.name}" released?`, correct: track.year.toString(), points: 1000 };
        } else if (typeRoll > 0.6) { // 20% Genre Identification (750 pts)
            template = { type: 'GENRE', text: `What is the primary genre of "${track.name}"?`, correct: track.genre, points: 750 };
        }

        // 2. Fetch Spotify Metadata (Popularity & Images)
        const spotifyData = await helpers.getAlbumData(track);
        
        // 3. Suggestion #2: Album Context Questions (Only for tracks with Popularity > 70)
        // Replaces Genre/Year if track is famous enough
        if (spotifyData && spotifyData.popularity > 70 && Math.random() > 0.6) {
            template = { 
                type: 'ALBUM', 
                text: `On which album does the track "${track.name}" appear?`, 
                correct: track.album || spotifyData.albumName, 
                points: 1250 
            };
        }

        // 4. Picture Round Enhancement
        let image = null;
        if (config.enablePictures && Math.random() > 0.3) {
            const picData = Math.random() > 0.5 ? await helpers.getArtistData(track) : spotifyData;
            if (picData?.image) {
                image = picData.image;
                template.points += 250; // Visual bonus for identifying from imagery
            }
        }

        const qHash = Buffer.from(template.text + template.correct).toString('base64');
        if (history.includes(qHash)) return null; 

        // Generate Options via Helpers
        let options = [];
        if (template.type === 'YEAR') options = helpers.getDecoyYears(template.correct);
        else if (template.type === 'GENRE') options = helpers.getDecoyGenres(template.correct);
        else if (template.type === 'ALBUM') options = helpers.getDecoyAlbums(track);
        else options = helpers.getDecoyArtists(track);

        history.push(qHash);
        if (history.length > 50) history.shift(); // Maintain memory efficiency

        return {
            id: Math.random().toString(36).substr(2),
            type: template.type,
            text: template.text,
            options: options,
            correctIndex: options.indexOf(template.correct),
            correct: template.correct,
            image: image,
            points: template.points,
            difficulty: template.points >= 1250 ? 'Hard' : (template.points >= 750 ? 'Medium' : 'Easy'),
            expiresAt: Date.now() + (config.timePerQuestion * 1000)
        };
    }
}

module.exports = QuestionFactory;