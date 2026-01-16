// routes/quiz_team_manager.js
const fs = require('fs');
const path = require('path');

// Persistence
const TEAMS_FILE = path.join(__dirname, '../data/quiz_teams.json');

class QuizTeamManager {
    constructor() {
        this.teams = {}; // { teamId: { name, score, members: [], answers: {} } }
        this.loadTeams();
    }

    loadTeams() {
        if (fs.existsSync(TEAMS_FILE)) {
            try {
                this.teams = JSON.parse(fs.readFileSync(TEAMS_FILE));
            } catch (e) {
                console.error("Failed to load teams:", e);
                this.teams = {};
            }
        }
    }

    saveTeams() {
        try {
            // Ensure directory exists
            const dir = path.dirname(TEAMS_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(TEAMS_FILE, JSON.stringify(this.teams, null, 2));
        } catch (e) {
            console.error("Failed to save teams:", e);
        }
    }

    registerTeam(teamName, memberId) {
        // Check if team exists
        let teamId = Object.keys(this.teams).find(id => this.teams[id].name === teamName);
        
        if (!teamId) {
            teamId = 'team_' + Math.random().toString(36).substr(2, 9);
            this.teams[teamId] = {
                id: teamId,
                name: teamName,
                score: 0,
                members: [],
                answers: {} // { questionId: { answer, correct, points } }
            };
        }

        // Add member if not already there
        if (!this.teams[teamId].members.includes(memberId)) {
            this.teams[teamId].members.push(memberId);
        }

        this.saveTeams();
        return this.teams[teamId];
    }

    submitAnswer(teamId, questionId, answer, isCorrect, pointsPossible, timeRemaining, totalTime) {
        if (!this.teams[teamId]) return null;

        // Prevent double answering
        if (this.teams[teamId].answers[questionId]) {
            return this.teams[teamId];
        }

        let pointsAwarded = 0;
        if (isCorrect) {
            // Flat Scoring Logic (Fixed per request)
            // No speed bonuses. Full points awarded for correct answer.
            pointsAwarded = pointsPossible || 1000;
        }

        this.teams[teamId].answers[questionId] = {
            answer,
            correct: isCorrect,
            points: pointsAwarded,
            timestamp: Date.now()
        };

        if (pointsAwarded > 0) {
            this.teams[teamId].score += pointsAwarded;
        }

        this.saveTeams();
        return { ...this.teams[teamId], added: pointsAwarded };
    }

    getLeaderboard() {
        return Object.values(this.teams)
            .map(t => ({ name: t.name, score: t.score, id: t.id }))
            .sort((a, b) => b.score - a.score);
    }

    resetTeams() {
        this.teams = {};
        this.saveTeams();
    }
}

// Singleton
const teamManager = new QuizTeamManager();
module.exports = teamManager;