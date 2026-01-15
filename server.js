// 1. MUST BE FIRST - Load environmental variables
require('dotenv').config();

// 2. IMMEDIATE FATAL CHECK - Stop the engine if config is missing
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error("❌ FATAL: Missing Spotify Credentials in .env file.");
    process.exit(1);
}

// 3. Import Standard Libraries
const express = require('express');
const http = require('http'); // Required for WebSockets
const { Server } = require('socket.io'); // The Real-Time Engine
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 4. Import Local Modular Logic
const spotifyApi = require('./spotify_instance');
const spotifyCtrl = require('./spotify_ctrl');
const automation = require('./automation'); 
const state = require('./state'); 
const pkg = require('./package.json');
// Note: Quiz Engine is now imported inside the specific route files, not here.

const app = express();
const server = http.createServer(app); // Wrap Express
const io = new Server(server, { cors: { origin: "*" } }); // Init Socket.io
const port = process.env.PORT || 8888;

/**
 * 5. VERSION DISCOVERY
 */
const APP_VERSION = pkg.version || "3.3.0-clean-arch";

// Middleware
app.use(express.json());
app.use(cors({ origin: true }));

/**
 * 6. ATTACH ROUTES
 */
// --- NEW: CLEAN QUIZ INTEGRATION (MOUNTED BEFORE GENERIC API ROUTES) ---
// Import the Quiz API Routes and pass 'io' for broadcasting
const quizRoutes = require('./routes/quiz_routes')(io);
app.use('/api/quiz', quizRoutes);

// Import the Quiz Real-Time Socket Handler
require('./routes/quiz_socket')(io);
// -----------------------------------

// --- EXISTING JUKEBOX ROUTES ---
app.use('/', require('./routes/auth'));
app.use('/api', require('./routes/queue'));
app.use('/api', require('./routes/system'));

// Endpoint for Dashboard Sync
app.get('/api/version', (req, res) => {
    res.json({ version: APP_VERSION });
});

/**
 * 7. STARTUP SEQUENCE
 */
// Use server.listen instead of app.listen to support WebSockets
server.listen(port, async () => {
    console.log(`🚀 Modular Engine v${APP_VERSION} live on port ${port} (with WebSockets)`);
    console.log(`📡 Quiz API: Mounted at /api/quiz/ (Endpoints: /config, /next, /ask-question)`);

    // --- CRASH RECOVERY (PERSISTENCE) ---
    const SETTINGS_FILE = path.join(__dirname, 'settings.json');
    if (fs.existsSync(SETTINGS_FILE)) {
        try {
            const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
            const savedData = JSON.parse(raw);
            
            // 1. Restore plain data (Queues, Configs, Tokens)
            Object.assign(state, savedData);
            
            // 2. Hydrate Complex Objects (Sets)
            if (Array.isArray(state.playedHistory)) {
                state.playedHistory = new Set(state.playedHistory);
            }
            
            console.log(`💾 Persistence: Restored ${state.partyQueue?.length || 0} tracks and ${state.karaokeQueue?.length || 0} karaoke singers.`);
        } catch (e) {
            console.error("⚠️ Persistence: Failed to load settings.json", e.message);
        }
    }
    // ------------------------------------------

    // --- A. START THE AUTOMATION WATCHDOG ---
    try {
        automation.startWatchdog();
        console.log("✅ Automation Watchdog started.");
    } catch (err) {
        console.error("⚠️ Warning: Automation Watchdog failed to start:", err.message);
    }

    // --- B. CHECK SPOTIFY SESSION ---
    // Immediate Session Check
    if (spotifyApi.getAccessToken()) {
        console.log(`📦 Startup [v${APP_VERSION}]: Session found. Rebuilding Shuffle Bag...`);
        try {
            await spotifyCtrl.refreshShuffleBag();
            console.log("✅ Shuffle Bag rebuilt successfully.");
        } catch (err) {
            console.error("❌ Startup: Failed to load initial playlist:", err.message);
        }
    } else {
        console.log("ℹ️ Startup: No active session found on disk. Manual login required at /login.");
    }
});