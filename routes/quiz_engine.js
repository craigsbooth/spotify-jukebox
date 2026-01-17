// routes/quiz_engine.js - V11.0 (Batch Consumption Model)
const EventEmitter = require('events');
const quizDB = require('../data/quiz_db'); 
const spotifyApi = require('../spotify_instance'); 
const QuestionFactory = require('./quiz_question_factory'); // Uses V11 Batch Logic
const StateManager = require('./quiz_state_manager');
const TeamManager = require('./quiz_team_manager');

class QuizEngine extends EventEmitter {
    constructor() {
        super();
        this.gameState = StateManager.load();
        
        // Ensure config has the explicit toggle (Default: true)
        if (typeof this.gameState.config.allowExplicit === 'undefined') {
            this.gameState.config.allowExplicit = true;
        }

        this.on('state_update', () => StateManager.save(this.gameState));
    }

    resetSystem() {
        this.gameState = StateManager.reset();
        TeamManager.resetTeams(); 
        this.emit('state_update', this.gameState);
        return { success: true };
    }

    updateConfig(newConfig) {
        this.gameState.config = { ...this.gameState.config, ...newConfig };
        this.emit('state_update', this.gameState);
    }

    createTeam(name, icon, color) {
        const newTeam = {
            id: 'team_' + Math.random().toString(36).substr(2, 9),
            name: name,
            icon: icon,
            color: color,
            score: 0,
            answers: {} 
        };

        TeamManager.teams[newTeam.id] = newTeam;
        TeamManager.saveTeams();
        this.gameState.teams.push(newTeam);
        this.emit('state_update', this.gameState);
        return newTeam;
    }

    async addTrack(track) {
        // Prevent duplicates in the queue
        const isDuplicate = this.gameState.quizQueue.some(t => t.name === track.name && t.artist === track.artist);
        if (isDuplicate) return { error: "Track already in queue" };

        try {
            // V11: Generate Batch Upfront
            // This ensures we verify metadata and create all valid questions before adding to queue
            track.questionQueue = await QuestionFactory.generateBatch(track, this.gameState.config);
            
            // Safety: If no questions could be generated (rare), skip adding track
            if (!track.questionQueue || track.questionQueue.length === 0) {
                console.warn(`⚠️ Engine: No valid questions generated for ${track.name}. Skipping.`);
                return { error: "No valid questions generated" };
            }

        } catch (e) { 
            console.error("⚠️ Engine: Pre-gen failed for track:", e.message); 
            return { error: "Generation failed" };
        }

        this.gameState.quizQueue.push(track);
        this.emit('state_update', this.gameState);
        return { success: true };
    }

    async autoPopulateQueue(count = 10) {
        const { selectedGenres, selectedEras, allowExplicit } = this.gameState.config;
        
        // FILTER: Genres, Eras, and EXPLICIT content
        let pool = quizDB.tracks.filter(track => {
            const genreMatch = selectedGenres.length === 0 || selectedGenres.includes(track.genre);
            const eraMatch = selectedEras.length === 0 || selectedEras.includes(track.decade);
            
            // Explicit Filter
            if (allowExplicit === false && track.explicit === true) return false;

            // Check if we've played this specific track recently
            const hasBeenPlayed = track.questions?.some(q => {
                const qHash = Buffer.from(q.text + q.correct).toString('base64');
                return this.gameState.questionHistory.includes(qHash);
            });
            
            return genreMatch && eraMatch && !hasBeenPlayed;
        });

        if (pool.length === 0) return { error: "No unique tracks left matching criteria!" };

        const selection = pool.sort(() => Math.random() - 0.5).slice(0, count);

        // V11: Process batches for all selected tracks
        for (const track of selection) {
            try {
                track.questionQueue = await QuestionFactory.generateBatch(track, this.gameState.config);
            } catch (e) {
                console.error(`⚠️ Engine: Batch Gen failed for ${track.name}:`, e.message);
            }
        }

        // Only add tracks that actually successfully generated questions
        const validSelection = selection.filter(t => t.questionQueue && t.questionQueue.length > 0);
        
        const shuffledSelection = validSelection.sort(() => Math.random() - 0.5);
        this.gameState.quizQueue = [...this.gameState.quizQueue, ...shuffledSelection];
        this.emit('state_update', this.gameState);
        return { success: true, added: shuffledSelection.length };
    }

    async playNextTrack() {
        if (this.gameState.quizQueue.length === 0) return null;
        const nextTrack = this.gameState.quizQueue.shift();
        
        // Resolve Spotify URI if missing
        if (!nextTrack.uri) {
            try {
                const query = `track:${nextTrack.name} artist:${nextTrack.artist}`;
                const searchRes = await spotifyApi.searchTracks(query, { limit: 1 });
                if (searchRes.body.tracks.items.length > 0) {
                    nextTrack.uri = searchRes.body.tracks.items[0].uri;
                } else {
                    return this.playNextTrack(); // Skip if not found
                }
            } catch (err) { return this.playNextTrack(); }
        }
        
        if (nextTrack.uri && !nextTrack.uri.startsWith('spotify:track:')) {
            nextTrack.uri = `spotify:track:${nextTrack.uri.split(':').pop()}`;
        }

        this.gameState.currentTrack = nextTrack;
        
        // V11 Safety: If for some reason questionQueue is missing (legacy state), generate it now
        if (!this.gameState.currentTrack.questionQueue) {
             this.gameState.currentTrack.questionQueue = await QuestionFactory.generateBatch(this.gameState.currentTrack, this.gameState.config);
        }

        this.gameState.isPlaying = true;
        this.gameState.status = 'PLAYING';
        this.gameState.currentQuestion = null;
        
        this.emit('state_update', this.gameState);
        return nextTrack;
    }

    /**
     * V11: Consumes questions from the pre-generated batch.
     */
    async generateQuestion() {
        // 1. Validation
        if (!this.gameState.currentTrack) return null;

        // 2. Queue Check
        const queue = this.gameState.currentTrack.questionQueue;
        
        // If queue is empty or undefined, we are done with this track.
        if (!queue || queue.length === 0) {
             console.log(`ℹ️ Engine: Batch exhausted for "${this.gameState.currentTrack.name}". Signaling end of track.`);
             return null; 
        }

        // 3. Pop the next question (FIFO)
        const question = queue.shift(); 

        // 4. Setup Scoring
        const verifiedIndex = question.options.findIndex(opt => opt === question.correct);
        question.correctIndex = verifiedIndex !== -1 ? verifiedIndex : 0;
        question.points = parseInt(question.points) || 1000;

        // 5. Reset Round Stats
        this.gameState.teams.forEach(t => {
            t.lastAnswerCorrect = false;
            t.lastPointsGained = 0;
            t.hasAnswered = false; 
        });

        // 6. Trigger Audio Effects
        if (question.image || question.type === 'ARTIST') {
            this.emit('audio_command', { action: 'FADE_OUT', duration: 3000 });
        }
        
        // 7. Update State
        this.gameState.currentQuestion = question;
        this.gameState.status = 'QUESTION_ACTIVE';
        
        // Add current batch count to state so Frontend can display "Questions Remaining"
        this.gameState.questionsRemaining = queue.length;

        this.emit('state_update', this.gameState);
        return question;
    }

    submitAnswer(teamId, answerIndex) {
        if (this.gameState.status !== 'QUESTION_ACTIVE') return { error: "Round closed." };
        
        const team = this.gameState.teams.find(t => t.id === teamId);
        if (!team) return { error: "Team not found" };

        const question = this.gameState.currentQuestion;
        const isCorrect = (parseInt(answerIndex) === question.correctIndex);
        const points = isCorrect ? (question.points || 1000) : 0;

        let tmResult = TeamManager.submitAnswer(teamId, question.id, answerIndex, isCorrect, points, 0, 0);

        if (!tmResult) {
            TeamManager.teams[teamId] = team;
            TeamManager.saveTeams();
            tmResult = TeamManager.submitAnswer(teamId, question.id, answerIndex, isCorrect, points, 0, 0);
        }

        team.score = tmResult.score;
        team.lastAnswerCorrect = isCorrect;
        team.lastPointsGained = points; 
        team.hasAnswered = true; 

        return { ...tmResult, correct: isCorrect };
    }

    revealResults() {
        this.gameState.status = 'SHOW_RESULTS';
        this.emit('state_update', this.gameState);
        return { success: true };
    }

    getPublicState() {
        const safeState = JSON.parse(JSON.stringify(this.gameState));
        if (safeState.currentQuestion) delete safeState.currentQuestion.correctIndex;
        
        const shouldHide = safeState.status === 'PLAYING' || (safeState.currentQuestion && ['ARTIST', 'TITLE', 'PICTURE', 'SOUNDTRACK', 'PICTURE_ARTIST', 'PICTURE_ALBUM', 'ALBUM'].includes(safeState.currentQuestion.type));
        
        if (shouldHide) {
            safeState.currentTrack = { ...safeState.currentTrack, name: "???", artist: "???" };
        }
        
        return safeState;
    }
}

module.exports = new QuizEngine();