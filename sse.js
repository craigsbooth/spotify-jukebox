// sse.js - Shared Real-Time Broadcaster
const state = require('./state'); // <--- FIXED PATH (Was ./server/state)

let clients = [];

/**
 * Handle new connections from Projector/Guest
 */
const addClient = (req, res) => {
    // 1. CRITICAL HEADERS
    // 'X-Accel-Buffering': 'no' tells Nginx to disable buffering for this specific request
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // <--- THE FIX FOR NGINX
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.flushHeaders();

    // 2. SEND INITIAL STATE (Sync immediately on connect)
    const initialState = {
        theme: state.currentTheme,
        youtubeId: state.youtubeId,
        isKaraokeMode: state.isKaraokeMode,
        karaokeQueue: state.karaokeQueue,
        isSpotifyPlaying: state.currentPlayingTrack?.is_playing || false,
        
        // PUSH LYRICS ON CONNECT (If they exist)
        currentLyrics: state.currentPlayingTrack?.lyrics || null,
        
        // Push current track if available
        currentTrack: state.currentPlayingTrack || null
    };
    
    // Write immediate data to force the pipe open
    res.write(`data: ${JSON.stringify({ type: 'INIT', payload: initialState })}\n\n`);

    // 3. ADD TO POOL
    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // 4. CLEANUP ON DISCONNECT
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
            // If using compression middleware, flush is needed, but usually fine here
            if (typeof client.res.flush === 'function') {
                client.res.flush();
            }
        } catch (e) {
            console.error("SSE Broadcast Error:", e.message);
        }
    });
};

module.exports = { addClient, send };