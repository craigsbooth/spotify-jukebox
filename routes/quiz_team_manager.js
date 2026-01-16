// routes/quiz_team_manager.js - Team Management & Speed Bonus Scoring logic
const quizDB = require('../data/quiz_db');

class QuizTeamManager {
    /**
     * Creates a new team object with initialized scoring fields.
     */
    static createTeam(name, icon, color, currentTeamsCount) {
        return {
            id: Math.random().toString(36).substr(2, 9),
            name: name || `Team ${currentTeamsCount + 1}`,
            icon: icon || 'pawn',
            color: color || '#ffffff',
            score: 0,
            hasAnswered: false,
            lastAnswerCorrect: false,
            lastPointsGained: 0,
            roundPoints: 0 // Temp storage for deferred scoring until reveal
        };
    }

    /**
     * Processes a submitted answer and calculates points with a Speed Bonus.
     * Speed Bonus rewards up to 50% extra points based on remaining time.
     */
    static submitAnswer(team, answerIndex, currentQuestion, config) {
        if (!team || team.hasAnswered) return { error: "Already answered or invalid team." };

        const userChoice = parseInt(answerIndex);
        const correctChoice = currentQuestion.correctIndex;
        const potentialPoints = currentQuestion.points;

        // --- SPEED BONUS CALCULATION ---
        const durationMs = (config.timePerQuestion || 20) * 1000;
        const timeRemaining = Math.max(0, currentQuestion.expiresAt - Date.now());
        
        // Reward up to 50% extra points for speed
        const speedBonus = Math.floor((potentialPoints * 0.5) * (timeRemaining / durationMs));

        const isCorrect = (userChoice === correctChoice);
        const pointsAwarded = isCorrect ? (potentialPoints + speedBonus) : 0;

        // Log the result for the host console
        console.log(`📝 TEAM: ${team.name} | CHOSE: ${userChoice} | CORRECT: ${correctChoice} | RESULT: ${isCorrect ? 'WIN' : 'LOSS'} (+${pointsAwarded} inc. ${speedBonus} speed bonus)`);

        // Update team state
        team.hasAnswered = true;
        team.lastAnswerCorrect = isCorrect;
        team.lastPointsGained = pointsAwarded;
        
        // Store points in temporary 'roundPoints' for deferred scoring
        team.roundPoints = pointsAwarded; 

        return { correct: isCorrect, pointsGained: pointsAwarded };
    }

    /**
     * Resets the round-specific state for all teams.
     */
    static resetRoundState(teams) {
        teams.forEach(t => {
            t.hasAnswered = false;
            t.lastAnswerCorrect = false;
            t.lastPointsGained = 0;
            t.roundPoints = 0;
        });
    }

    /**
     * Finalizes deferred scores by adding round points to the total score.
     */
    static finalizeScores(teams) {
        teams.forEach(t => {
            if (t.roundPoints > 0) {
                t.score += t.roundPoints;
            }
        });
    }
}

module.exports = QuizTeamManager;