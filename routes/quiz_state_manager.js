// routes/quiz_state_manager.js - State Persistence & Initialization logic
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../quiz_state.json');

class QuizStateManager {
    /**
     * Returns the default starting state for a new quiz session.
     */
    static getInitialState() {
        return {
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
    }

    /**
     * Saves the current game state to a local JSON file for recovery.
     */
    static save(gameState) {
        try { 
            fs.writeFileSync(STATE_FILE, JSON.stringify(gameState, null, 2)); 
        } catch (e) { 
            console.error("❌ State Manager: Save Error:", e.message); 
        }
    }

    /**
     * Loads the saved state from disk. 
     * Resets runtime-only flags (isPlaying, currentQuestion) to ensure a clean resume.
     */
    static load() {
        const defaultState = this.getInitialState();
        try {
            if (fs.existsSync(STATE_FILE)) {
                const saved = JSON.parse(fs.readFileSync(STATE_FILE));
                console.log("💾 State Manager: Quiz State Restored.");
                return { 
                    ...defaultState, 
                    ...saved, 
                    isPlaying: false, 
                    currentQuestion: null 
                };
            }
        } catch (e) { 
            console.error("⚠️ State Manager: Load Failed:", e.message); 
        }
        return defaultState;
    }

    /**
     * Provides a clean reset state for a master system reset.
     */
    static reset() {
        return this.getInitialState();
    }
}

module.exports = QuizStateManager;