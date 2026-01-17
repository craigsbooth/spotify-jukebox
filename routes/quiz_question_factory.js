// routes/quiz_question_factory.js - V11.0 (Batch Generation & Difficulty Sorting)
const quizDB = require('../data/quiz_db');
const helpers = require('./quiz_helpers');

class QuestionFactory {
    
    /**
     * Generates a comprehensive list of ALL valid questions for a specific track.
     * Returns an array sorted by the user's difficulty preference.
     */
    static async generateBatch(track, config) {
        if (!track) return [];

        const questions = [];
        
        // 1. GATHER DATA (Parallel Fetching for Speed)
        // We fetch Year, Album, and Artist Image upfront
        const [deepYear, spotifyData, artistImage] = await Promise.all([
            helpers.getOriginalYear(track),
            helpers.getAlbumData(track),
            helpers.getArtistData(track)
        ]);

        const bestYear = deepYear || track.year;
        const albumName = track.album || spotifyData?.albumName;
        const primaryImage = artistImage?.image || spotifyData?.image;

        // 2. DEFINE POSSIBLE QUESTION TYPES
        // We create a "Candidate List". We will attempt to build each one.
        const candidates = [
            {
                type: 'ARTIST',
                text: `Who performs "${track.name}"?`,
                correct: track.artist,
                points: 500,
                difficulty: 1, // Easy
                hasImage: false
            },
            {
                type: 'GENRE',
                text: `What is the primary genre of "${track.name}"?`,
                correct: track.genre,
                points: 750,
                difficulty: 2, // Medium
                hasImage: false
            }
        ];

        // Add YEAR if valid
        if (bestYear) {
            candidates.push({
                type: 'YEAR',
                text: `In what year was "${track.name}" originally released?`,
                correct: bestYear.toString(),
                points: 1000,
                difficulty: 4, // Hard
                hasImage: false
            });
        }

        // Add ALBUM if valid (and popular enough to likely be known)
        if (albumName && (!spotifyData || spotifyData.popularity > 50)) {
            candidates.push({
                type: 'ALBUM',
                text: `On which album does the track "${track.name}" appear?`,
                correct: albumName,
                points: 1250,
                difficulty: 3, // Hard
                hasImage: false
            });
        }

        // Add PICTURE Questions (if enabled)
        if (config.enablePictures && primaryImage) {
            candidates.push({
                type: 'PICTURE_ARTIST',
                text: "Who is the artist shown in this picture?",
                correct: track.artist,
                points: 800,
                difficulty: 1, // Visuals are usually easier
                hasImage: true,
                imagePath: primaryImage
            });
        }

        // 3. GENERATE & VALIDATE EACH CANDIDATE
        for (const template of candidates) {
            // Check for duplicate types (e.g. don't ask Artist twice if we have text + picture)
            // Strategy: Allow both, but we will shuffle them later. 
            // Or prioritize Picture if available? Let's keep both for variety in the batch.

            // GENERATE OPTIONS (Decoys)
            let options = [];
            if (template.type === 'YEAR') options = helpers.getDecoyYears(template.correct);
            else if (template.type === 'GENRE') options = helpers.getDecoyGenres(template.correct);
            else if (template.type === 'ALBUM') options = helpers.getDecoyAlbums(track);
            else options = helpers.getDecoyArtists(track); // Works for ARTIST and PICTURE_ARTIST

            // QUALITY CONTROL (The V10.2 Fix)
            // Reject if any option is "Unknown", empty, or generic "Album X"
            const hasBadData = [template.correct, ...options].some(ans => {
                if (!ans) return true;
                const str = ans.toString();
                return str.includes("Unknown") || str.trim() === "" || /^Album \d+$/i.test(str);
            });

            if (!hasBadData) {
                // Determine randomized correct index
                const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
                const correctIndex = shuffledOptions.indexOf(template.correct);

                if (correctIndex !== -1) {
                    questions.push({
                        id: Math.random().toString(36).substr(2),
                        type: template.type,
                        text: template.text,
                        options: shuffledOptions,
                        correctIndex: correctIndex,
                        correct: template.correct,
                        image: template.hasImage ? template.imagePath : null,
                        points: template.points,
                        difficultyVal: template.difficulty, // Internal use for sorting
                        difficulty: this.getDifficultyLabel(template.difficulty),
                        expiresAt: Date.now() + (config.timePerQuestion * 1000)
                    });
                }
            }
        }

        // 4. APPLY DIFFICULTY SLIDER (Sorting)
        // config.difficultyFocus is 0 (Easy) to 100 (Hard)
        const focus = config.difficultyFocus || 50;

        if (focus < 30) {
            // EASY MODE: Sort by Difficulty Ascending (1 -> 4)
            questions.sort((a, b) => a.difficultyVal - b.difficultyVal);
        } else if (focus > 70) {
            // HARD MODE: Sort by Difficulty Descending (4 -> 1)
            questions.sort((a, b) => b.difficultyVal - a.difficultyVal);
        } else {
            // BALANCED MODE: 
            // Keep Artist/Picture (1) first as a warm-up, then shuffle the rest
            const easy = questions.filter(q => q.difficultyVal === 1);
            const hard = questions.filter(q => q.difficultyVal > 1).sort(() => Math.random() - 0.5);
            return [...easy, ...hard];
        }

        return questions;
    }

    static getDifficultyLabel(val) {
        if (val === 1) return "Easy";
        if (val === 2) return "Medium";
        if (val === 3) return "Hard";
        return "Expert";
    }
}

module.exports = QuestionFactory;