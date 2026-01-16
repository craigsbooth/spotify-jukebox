// routes/quiz_engine.js - V8.0 (Refactored: State & Team Logic Delegated)
const EventEmitter = require('events');
const quizDB = require('../data/quiz_db'); 
const spotifyApi = require('../spotify_instance'); 
const QuestionFactory = require('./quiz_question_factory');
const StateManager = require('./quiz_state_manager');
const TeamManager = require('./quiz_team_manager');

class QuizEngine extends EventEmitter {
    constructor() {
        super();
        // Load initial state via Manager
        this.gameState = StateManager.load();
        
        // Auto-save on every state update
        this.on('state_update', () => StateManager.save(this.gameState));
    }

    /**
     * Resets the entire system to a clean IDLE state.
     */
    resetSystem() {
        this.gameState = StateManager.reset();
        this.emit('state_update', this.gameState);
        return { success: true };
    }

    /**
     * Updates global quiz configuration.
     */
    updateConfig(newConfig) {
        this.gameState.config = { ...this.gameState.config, ...newConfig };
        this.emit('state_update', this.gameState);
    }

    /**
     * Registers a new team in the lobby.
     */
    createTeam(name, icon, color) {
        const newTeam = TeamManager.createTeam(name, icon, color, this.gameState.teams.length);
        this.gameState.teams.push(newTeam);
        this.emit('state_update', this.gameState);
        return newTeam;
    }

    /**
     * Adds a single track to the quiz queue with a pre-generated question.
     */
    async addTrack(track) {
        const isDuplicate = this.gameState.quizQueue.some(t => t.name === track.name && t.artist === track.artist);
        if (isDuplicate) return { error: "Track already in queue" };

        try {
            track.preparedQuestion = await QuestionFactory.generate(track, this.gameState.config, this.gameState.questionHistory);
        } catch (e) { 
            console.error("⚠️ Engine: Pre-gen failed for track:", e.message); 
        }

        this.gameState.quizQueue.push(track);
        this.emit('state_update', this.gameState);
        return { success: true };
    }

    /**
     * Auto-populates the queue with shuffled unique tracks and pre-generated questions.
     */
    async autoPopulateQueue(count = 10) {
        const { selectedGenres, selectedEras } = this.gameState.config;
        
        let pool = quizDB.tracks.filter(track => {
            const genreMatch = selectedGenres.length === 0 || selectedGenres.includes(track.genre);
            const eraMatch = selectedEras.length === 0 || selectedEras.includes(track.decade);
            
            const hasBeenPlayed = track.questions?.some(q => {
                const qHash = Buffer.from(q.text + q.correct).toString('base64');
                return this.gameState.questionHistory.includes(qHash);
            });
            
            const templateHash = Buffer.from(`Who performs "${track.name}"?` + track.artist).toString('base64');
            const templatePlayed = this.gameState.questionHistory.includes(templateHash);
            
            return genreMatch && eraMatch && !hasBeenPlayed && !templatePlayed;
        });

        if (pool.length === 0) return { error: "No unique tracks left!" };

        const selection = pool.sort(() => Math.random() - 0.5).slice(0, count);

        for (const track of selection) {
            try {
                track.preparedQuestion = await QuestionFactory.generate(track, this.gameState.config, this.gameState.questionHistory);
            } catch (e) {
                console.error(`⚠️ Engine: Pre-gen failed for ${track.name}:`, e.message);
            }
        }

        const shuffledSelection = selection.sort(() => Math.random() - 0.5);
        this.gameState.quizQueue = [...this.gameState.quizQueue, ...shuffledSelection];
        this.emit('state_update', this.gameState);
        return { success: true, added: shuffledSelection.length };
    }

    /**
     * Advances to the next track in the queue.
     */
    async playNextTrack() {
        if (this.gameState.quizQueue.length === 0) return null;
        const nextTrack = this.gameState.quizQueue.shift();
        
        if (!nextTrack.uri) {
            try {
                const query = `track:${nextTrack.name} artist:${nextTrack.artist}`;
                const searchRes = await spotifyApi.searchTracks(query, { limit: 1 });
                if (searchRes.body.tracks.items.length > 0) {
                    nextTrack.uri = searchRes.body.tracks.items[0].uri;
                } else {
                    return this.playNextTrack(); 
                }
            } catch (err) { return this.playNextTrack(); }
        }
        
        if (nextTrack.uri && !nextTrack.uri.startsWith('spotify:track:')) {
            nextTrack.uri = `spotify:track:${nextTrack.uri.split(':').pop()}`;
        }

        this.gameState.currentTrack = nextTrack;
        this.gameState.isPlaying = true;
        this.gameState.status = 'PLAYING';
        this.gameState.currentQuestion = null;
        
        TeamManager.resetRoundState(this.gameState.teams);
        this.emit('state_update', this.gameState);
        return nextTrack;
    }

    /**
     * Generates or retrieves the active question for the current track.
     */
    async generateQuestion() {
        let question = this.gameState.currentTrack?.preparedQuestion;

        if (!question) {
            question = await QuestionFactory.generate(this.gameState.currentTrack, this.gameState.config, this.gameState.questionHistory);
        }

        if (!question) return null;

        if (this.gameState.currentTrack) {
            delete this.gameState.currentTrack.preparedQuestion;
        }

        const verifiedIndex = question.options.findIndex(opt => opt === question.correct);
        question.correctIndex = verifiedIndex !== -1 ? verifiedIndex : 0;
        question.points = parseInt(question.points) || 1000;

        TeamManager.resetRoundState(this.gameState.teams);

        if (question.image || question.type === 'ARTIST') {
            this.emit('audio_command', { action: 'FADE_OUT', duration: 3000 });
        }
        
        this.gameState.currentQuestion = question;
        this.gameState.status = 'QUESTION_ACTIVE';
        this.emit('state_update', this.gameState);
        return question;
    }

    /**
     * Processes a team's answer submission.
     */
    submitAnswer(teamId, answerIndex) {
        if (this.gameState.status !== 'QUESTION_ACTIVE') return { error: "Round closed." };
        
        const team = this.gameState.teams.find(t => t.id === teamId);
        return TeamManager.submitAnswer(team, answerIndex, this.gameState.currentQuestion, this.gameState.config);
    }

    /**
     * Reveals the correct answer and finalizes team scores.
     */
    revealResults() {
        this.gameState.status = 'SHOW_RESULTS';
        TeamManager.finalizeScores(this.gameState.teams);
        this.emit('state_update', this.gameState);
        return { success: true };
    }

    /**
     * Generates a masked state for public guest consumption.
     */
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