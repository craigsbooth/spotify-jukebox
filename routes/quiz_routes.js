const express = require('express');
const router = express.Router();
const spotifyApi = require('../spotify_instance');
const quizEngine = require('./quiz_engine');

let revealTimeout = null;

module.exports = (io) => {
    /**
     * DUAL BROADCAST SYSTEM
     * Projector/Host get 'full_state' (unmasked)
     * Guests get 'quiz_update' (masked via getPublicState)
     */
    quizEngine.on('state_update', (state) => {
        // Send full data to Projector/Host Room
        io.to('quiz_projector').emit('quiz_update', state);
        
        // Send anti-cheat data to Guests
        io.to('quiz_guests').emit('quiz_update', quizEngine.getPublicState());
    });

    quizEngine.on('audio_command', (cmd) => {
        io.emit('audio_command', cmd);
    });

    const clearTimers = () => {
        if (revealTimeout) {
            clearTimeout(revealTimeout);
            revealTimeout = null;
        }
    };

    // --- PLAYER ACTIONS ---

    router.post('/join', (req, res) => {
        const { name, icon, color } = req.body;
        const newTeam = quizEngine.createTeam(name, icon, color);
        if (newTeam) res.json({ success: true, team: newTeam });
        else res.status(400).json({ error: "Could not join lobby" });
    });

    router.post('/answer', (req, res) => {
        const { teamId, answerIndex } = req.body;
        const result = quizEngine.submitAnswer(teamId, parseInt(answerIndex));
        if (result.error) return res.status(400).json(result);
        res.json({ success: true, correct: result.correct });
    });

    // --- HOST & CONFIGURATION ACTIONS ---

    router.get('/devices', async (req, res) => {
        try {
            const data = await spotifyApi.getMyDevices();
            res.json({ devices: data.body.devices || [] });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    router.post('/config', (req, res) => {
        quizEngine.updateConfig(req.body);
        res.json({ success: true });
    });

    // UPDATED: Async to support pre-fetching images
    router.post('/auto-populate', async (req, res) => {
        const { count } = req.body;
        try {
            const result = await quizEngine.autoPopulateQueue(count || 10);
            if (result.error) return res.status(400).json(result);
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    router.post('/reset', (req, res) => {
        clearTimers();
        const result = quizEngine.resetSystem();
        res.json(result);
    });

    router.post('/end-quiz', (req, res) => {
        clearTimers();
        quizEngine.gameState.status = 'FINISHED';
        quizEngine.emit('state_update', quizEngine.gameState);
        res.json({ success: true });
    });

    router.post('/queue/remove', (req, res) => {
        const { index } = req.body;
        if (quizEngine.gameState.quizQueue[index]) {
            quizEngine.gameState.quizQueue.splice(index, 1);
            quizEngine.emit('state_update', quizEngine.gameState);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Item not found" });
        }
    });

    router.get('/search', async (req, res) => {
        const { q } = req.query;
        try {
            const data = await spotifyApi.searchTracks(q);
            const tracks = data.body.tracks.items.map(t => ({
                id: t.id, 
                name: t.name, 
                artist: t.artists[0].name, 
                album: t.album.name,
                year: t.album.release_date.split('-')[0], 
                image: t.album.images[0].url, 
                uri: t.uri
            }));
            res.json({ tracks });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // UPDATED: Async to support pre-fetching images
    router.post('/queue', async (req, res) => {
        try {
            await quizEngine.addTrack(req.body.track);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    router.post('/next', async (req, res) => {
        clearTimers();
        try {
            const track = await quizEngine.playNextTrack(); 
            if (!track) return res.status(400).json({ error: "Queue empty" });
            
            await spotifyApi.play({ device_id: req.body.deviceId, uris: [track.uri] });
            res.json({ success: true });
        } catch (e) { 
            console.error("Playback Error:", e.message);
            res.status(500).json({ error: e.message }); 
        }
    });

    // UPDATED: Async generation & Timer logic
    router.post('/ask-question', async (req, res) => {
        clearTimers();
        
        // Wait for async generation (DB or Spotify API)
        const question = await quizEngine.generateQuestion();
        
        if (!question) return res.status(400).json({ error: "No question available" });

        const timerMs = (quizEngine.gameState.config.timePerQuestion || 20) * 1000;
        
        // FIX: Timer now calls revealResults() to enforce scoring
        revealTimeout = setTimeout(() => {
            if (quizEngine.gameState.status === 'QUESTION_ACTIVE') {
                quizEngine.revealResults();
            }
        }, timerMs);

        res.json({ success: true });
    });

    // UPDATED: Calls the engine method to finalize scores
    router.post('/reveal-answer', (req, res) => {
        clearTimers();
        quizEngine.revealResults();
        res.json({ success: true });
    });

    router.get('/token', (req, res) => { 
        res.json({ token: spotifyApi.getAccessToken() }); 
    });

    return router;
};