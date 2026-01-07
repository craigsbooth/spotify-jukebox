// sse.js - Shared Real-Time Broadcaster
const state = require('./state');

let clients = [];

/**
 * Handle new connections from Projector/Guest
 */
const addClient = (req, res) => {
    // Set headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial "Sync" payload immediately
    const initialState = {
        theme: state.currentTheme,
        youtubeId: state.youtubeId,
        isKaraokeMode: state.isKaraokeMode,
        karaokeQueue: state.karaokeQueue,
        isSpotifyPlaying: state.currentPlayingTrack?.is_playing || false,
        
        // PUSH LYRICS ON CONNECT (If they exist)
        currentLyrics: state.currentPlayingTrack?.lyrics || null 
    };
    
    res.write(`data: ${JSON.stringify({ type: 'INIT', payload: initialState })}\n\n`);

    // Add to pool
    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // Cleanup on disconnect
    req.on('close', () => {
        clients = clients.filter(c => c.id !== clientId);
    });
};

/**
 * Broadcast an event to ALL connected clients
 * @param {string} type - Event Name (e.g. 'LYRICS_UPDATE')
 * @param {object} payload - Data object
 */
const send = (type, payload) => {
    // Filter out closed connections safely
    clients.forEach(client => {
        try {
            client.res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
        } catch (e) {
            console.error("SSE Broadcast Error:", e.message);
        }
    });
};

module.exports = { addClient, send };