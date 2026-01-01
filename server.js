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
const fs = require('fs');
const path = require('path');

// 4. Import Local Modular Logic
const spotifyApi = require('./spotify_instance');
const spotifyCtrl = require('./spotify_ctrl');

const app = express();
const port = process.env.PORT || 8888;

/**
 * 5. VERSION DISCOVERY
 * Priority: 1. version.txt (Disk) | 2. .env (Env) | 3. Default
 */
let APP_VERSION = process.env.APP_VERSION || "3.0.0-dev";
try {
    const versionPath = path.join(__dirname, 'version.txt');
    if (fs.existsSync(versionPath)) {
        APP_VERSION = fs.readFileSync(versionPath, 'utf8').trim();
    }
} catch (e) {
    console.warn("⚠️ Version System: Could not read version.txt, falling back to env.");
}

// Middleware
app.use(express.json());
app.use(cors({ origin: true }));

/**
 * 6. ATTACH ROUTES
 */
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
app.listen(port, () => {
    console.log(`🚀 Modular Engine v${APP_VERSION} live on port ${port}`);

    // Wait 5 seconds after boot to allow spotify_instance recovery
    setTimeout(async () => {
        if (spotifyApi.getAccessToken()) {
            console.log(`📦 Startup [v${APP_VERSION}]: Session found. Rebuilding Shuffle Bag...`);
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