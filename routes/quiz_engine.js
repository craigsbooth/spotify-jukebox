// routes/quiz_engine.js - Full V7.2 (Security Masking + Async Queue + Deferred Scoring + Shuffle Fix)
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const quizDB = require('../data/quiz_db'); 
const spotifyApi = require('../spotify_instance'); 
const QuestionFactory = require('./quiz_question_factory');

const STATE_FILE = path.join(__dirname, '../quiz_state.json');

class QuizEngine extends EventEmitter {
    constructor() {
        super();
        this.gameState = {
            status: 'IDLE', 
            teams: [], 
            quizQueue: [], 
            currentTrack: null,
            isPlaying: false, 
            currentQuestion: null, 
            questionHistory: [], 
            config: { 
                duration: 30, 
                timePerQuestion: 20, 
                difficultyFocus: 50, 
                selectedGenres: [], 
                selectedEras: [], 
                enablePictures: true, 
                audioFadeEnabled: true 
            }
        };
        this.loadState();
        this.on('state_update', () => this.saveState());
    }

    saveState() {
        try { 
            fs.writeFileSync(STATE_FILE, JSON.stringify(this.gameState, null, 2)); 
        } catch (e) { 
            console.error("❌ Save Error:", e.message); 
        }
    }

    loadState() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                const saved = JSON.parse(fs.readFileSync(STATE_FILE));
                this.gameState = { ...this.gameState, ...saved };
                this.gameState.isPlaying = false;
                this.gameState.currentQuestion = null;
                console.log("💾 Quiz State Restored.");
            }
        } catch (e) { 
            console.error("⚠️ Load Failed:", e.message); 
        }
    }

    resetSystem() {
        this.gameState.status = 'IDLE';
        this.gameState.teams = [];
        this.gameState.quizQueue = [];
        this.gameState.currentTrack = null;
        this.gameState.isPlaying = false;
        this.gameState.currentQuestion = null;
        this.gameState.questionHistory = [];
        this.emit('state_update', this.gameState);
        return { success: true };
    }

    updateConfig(newConfig) {
        this.gameState.config = { ...this.gameState.config, ...newConfig };
        this.emit('state_update', this.gameState);
    }

    createTeam(name, icon, color) {
        const newTeam = {
            id: Math.random().toString(36).substr(2, 9),
            name: name || `Team ${this.gameState.teams.length + 1}`,
            icon: icon || 'pawn',
            color: color || '#ffffff',
            score: 0,
            hasAnswered: false,
            lastAnswerCorrect: false,
            lastPointsGained: 0,
            roundPoints: 0 // Temp storage for deferred scoring
        };
        this.gameState.teams.push(newTeam);
        this.emit('state_update', this.gameState);
        return newTeam;
    }

    async addTrack(track) {
        const isDuplicate = this.gameState.quizQueue.some(t => t.name === track.name && t.artist === track.artist);
        if (isDuplicate) return { error: "Track already in queue" };

        // Async pre-fetch of question/image data
        try {
            track.preparedQuestion = await QuestionFactory.generate(track, this.gameState.config, this.gameState.questionHistory);
        } catch (e) { 
            console.error("⚠️ Pre-gen failed for single track:", e); 
        }

        this.gameState.quizQueue.push(track);
        this.emit('state_update', this.gameState);
        return { success: true };
    }

    async autoPopulateQueue(count = 10) {
        const { selectedGenres, selectedEras } = this.gameState.config;
        
        let pool = quizDB.tracks.filter(track => {
            const genreMatch = selectedGenres.length === 0 || selectedGenres.includes(track.genre);
            const eraMatch = selectedEras.length === 0 || selectedEras.includes(track.decade);
            
            // Check if specific curated questions have been played
            const hasBeenPlayed = track.questions?.some(q => {
                const qHash = Buffer.from(q.text + q.correct).toString('base64');
                return this.gameState.questionHistory.includes(qHash);
            });
            
            // Check if the generic template has been played
            const templateHash = Buffer.from(`Who performs the track "${track.name}"?` + track.artist).toString('base64');
            const templatePlayed = this.gameState.questionHistory.includes(templateHash);
            
            return genreMatch && eraMatch && !hasBeenPlayed && !templatePlayed;
        });

        if (pool.length === 0) return { error: "No unique tracks left!" };

        // Sort pool randomly and slice to get the requested count
        const selection = pool.sort(() => Math.random() - 0.5).slice(0, count);

        // Pre-generate questions loop
        for (const track of selection) {
            try {
                track.preparedQuestion = await QuestionFactory.generate(track, this.gameState.config, this.gameState.questionHistory);
            } catch (e) {
                console.error(`⚠️ Pre-generation failed for ${track.name}:`, e);
            }
        }

        // FIX: Final shuffle of the selection before adding to the queue. 
        // This ensures the order of questions is unpredictable and reduces spoilers.
        const shuffledSelection = selection.sort(() => Math.random() - 0.5);

        this.gameState.quizQueue = [...this.gameState.quizQueue, ...shuffledSelection];
        this.emit('state_update', this.gameState);
        return { success: true, added: shuffledSelection.length };
    }

    async playNextTrack() {
        if (this.gameState.quizQueue.length === 0) return null;
        const nextTrack = this.gameState.quizQueue.shift();
        
        // 1. URI Discovery via Spotify Search if missing
        if (!nextTrack.uri) {
            try {
                const query = `track:${nextTrack.name} artist:${nextTrack.artist}`;
                const searchRes = await spotifyApi.searchTracks(query, { limit: 1 });
                if (searchRes.body.tracks.items.length > 0) {
                    nextTrack.uri = searchRes.body.tracks.items[0].uri;
                } else {
                    return this.playNextTrack(); // Skip if not found
                }
            } catch (err) { 
                return this.playNextTrack(); 
            }
        }
        
        // 2. Ensure URI format
        if (nextTrack.uri && !nextTrack.uri.startsWith('spotify:track:')) {
            nextTrack.uri = `spotify:track:${nextTrack.uri.split(':').pop()}`;
        }

        this.gameState.currentTrack = nextTrack;
        this.gameState.isPlaying = true;
        this.gameState.status = 'PLAYING';
        this.gameState.currentQuestion = null;
        
        // 3. Reset Round State for all teams
        this.gameState.teams.forEach(t => { 
            t.hasAnswered = false; 
            t.lastAnswerCorrect = false; 
            t.lastPointsGained = 0; 
            t.roundPoints = 0;
        });
        
        this.emit('state_update', this.gameState);
        return nextTrack;
    }

    async generateQuestion() {
        // Attempt to use the pre-generated question
        let question = this.gameState.currentTrack?.preparedQuestion;

        // If no prepared question (or it was already used), generate a fresh one
        if (!question) {
            console.log("🔄 Generating fresh question for current track...");
            question = await QuestionFactory.generate(this.gameState.currentTrack, this.gameState.config, this.gameState.questionHistory);
        }

        if (!question) return null;

        // Consume/Remove the prepared question so it isn't reused on the next click
        if (this.gameState.currentTrack) {
            delete this.gameState.currentTrack.preparedQuestion;
        }

        // Double-check logic. The Factory shuffles options now.
        // We must ensure the correctIndex points to the correct string in the new array.
        const verifiedIndex = question.options.findIndex(opt => opt === question.correct || opt === question.correctAnswer);
        
        if (verifiedIndex !== -1) {
            question.correctIndex = verifiedIndex;
        } else {
            console.error("⚠️ CRITICAL: Correct answer not found in options! Defaulting to 0.");
            question.correctIndex = 0; 
        }

        // Force points to be a clean number
        question.points = parseInt(question.points) || 1000;

        // Reset teams for the new question
        this.gameState.teams.forEach(t => {
            t.hasAnswered = false;
            t.lastAnswerCorrect = false;
            t.lastPointsGained = 0;
            t.roundPoints = 0; // Clear temp points
        });

        // Trigger Audio Fade for Pictures/Questions
        if (question.image || question.type === 'ARTIST') {
            this.emit('audio_command', { action: 'FADE_OUT', duration: 3000 });
        }
        
        this.gameState.currentQuestion = question;
        this.gameState.status = 'QUESTION_ACTIVE';
        this.emit('state_update', this.gameState);
        return question;
    }

    submitAnswer(teamId, answerIndex) {
        if (this.gameState.status !== 'QUESTION_ACTIVE') return { error: "Round closed." };
        
        const team = this.gameState.teams.find(t => t.id === teamId);
        if (!team || team.hasAnswered) return { error: "Already answered." };

        const userChoice = parseInt(answerIndex);
        const correctChoice = this.gameState.currentQuestion.correctIndex;
        const potentialPoints = this.gameState.currentQuestion.points;

        const isCorrect = (userChoice === correctChoice);
        const pointsAwarded = isCorrect ? potentialPoints : 0;

        console.log(`📝 TEAM: ${team.name} | CHOSE: ${userChoice} | CORRECT: ${correctChoice} | RESULT: ${isCorrect ? 'WIN' : 'LOSS'} (+${pointsAwarded})`);

        team.hasAnswered = true;
        team.lastAnswerCorrect = isCorrect;
        team.lastPointsGained = pointsAwarded;
        
        // Store points in temporary 'roundPoints', do NOT add to total score yet.
        team.roundPoints = pointsAwarded; 

        this.emit('state_update', this.gameState);
        return { correct: isCorrect, pointsGained: pointsAwarded };
    }

    // Call this when timer ends or Host clicks "Reveal"
    revealResults() {
        this.gameState.status = 'SHOW_RESULTS';
        
        // Apply deferred scores now
        this.gameState.teams.forEach(t => {
            if (t.roundPoints > 0) {
                t.score += t.roundPoints;
            }
        });

        this.emit('state_update', this.gameState);
        return { success: true };
    }

    getPublicState() {
        const safeState = JSON.parse(JSON.stringify(this.gameState));
        
        // Anti-Cheat: Remove correct index from public data
        if (safeState.currentQuestion) delete safeState.currentQuestion.correctIndex;
        
        // Anti-Cheat: Hide track meta during active questions AND during Listen phase (PLAYING)
        const shouldHide = safeState.status === 'PLAYING' || (safeState.currentQuestion && ['ARTIST', 'TITLE', 'PICTURE', 'SOUNDTRACK', 'PICTURE_ARTIST', 'PICTURE_ALBUM'].includes(safeState.currentQuestion.type));
        
        if (shouldHide) {
            safeState.currentTrack = { ...safeState.currentTrack, name: "???", artist: "???" };
        }
        
        return safeState;
    }
}

module.exports = new QuizEngine();