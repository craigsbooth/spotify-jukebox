// 1. MUST BE FIRST - Load environmental variables
require('dotenv').config();

// 2. IMMEDIATE FATAL CHECK - Stop the engine if config is missing
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error("❌ FATAL: Missing Spotify Credentials in .env file.");
    process.exit(1);
}

// 3. Import Standard Libraries
const express = require('express');
const cors = require('cors');

// 4. Import Local Modular Logic
// Note: Recovery logic runs automatically inside spotify_instance.js on import
const spotifyApi = require('./spotify_instance');
const spotifyCtrl = require('./spotify_ctrl');

const app = express();
const port = process.env.PORT || 8888;

// Middleware
app.use(express.json());
app.use(cors({ origin: true }));

/**
 * 5. ATTACH ROUTES
 * We mount Auth at the root (/) to catch /login and /callback easily.
 * System and Queue are prefixed with /api for frontend consistency.
 */
app.use('/', require('./routes/auth')); 
app.use('/api/queue', require('./routes/queue'));
app.use('/api/system', require('./routes/system'));

/**
 * 6. STARTUP SEQUENCE
 * Triggers secondary systems once the server is listening.
 */
app.listen(port, () => {
    console.log(`🚀 Modular Engine live on port ${port}`);

    // Wait 5 seconds after boot to allow spotify_instance to finish 
    // its disk recovery from tokens.json before trying to use the API.
    setTimeout(async () => {
        if (spotifyApi.getAccessToken()) {
            console.log("📦 Startup: Active session found. Rebuilding Shuffle Bag...");
            try {
                await spotifyCtrl.refreshShuffleBag();
            } catch (err) {
                console.error("❌ Startup: Failed to load initial playlist:", err.message);
            }
        } else {
            console.log("ℹ️ Startup: No active session found on disk. Manual login required at /login.");
        }
    }, 5000);
});