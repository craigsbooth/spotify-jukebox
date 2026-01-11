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
const automation = require('./automation'); // <--- THE NEW WATCHDOG
const pkg = require('./package.json');

const app = express();
const port = process.env.PORT || 8888;

/**
 * 5. VERSION DISCOVERY
 */
const APP_VERSION = pkg.version || "3.0.229";

// Middleware
app.use(express.json());
app.use(cors({ origin: true }));

/**
 * 6. ATTACH ROUTES
 */
app.use('/', require('./routes/auth'));
app.use('/api', require('./routes/queue'));
app.use('/api', require('./routes/system')); // Karaoke routes are handled here now!

// Endpoint for Dashboard Sync
app.get('/api/version', (req, res) => {
    res.json({ version: APP_VERSION });
});

/**
 * 7. STARTUP SEQUENCE
 */
app.listen(port, async () => {
    console.log(`🚀 Modular Engine v${APP_VERSION} live on port ${port}`);

    // --- A. START THE AUTOMATION WATCHDOG ---
    try {
        automation.startWatchdog();
        console.log("✅ Automation Watchdog started.");
    } catch (err) {
        console.error("⚠️ Warning: Automation Watchdog failed to start:", err.message);
    }

    // --- B. CHECK SPOTIFY SESSION ---
    // Immediate Session Check (No 5s Delay)
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