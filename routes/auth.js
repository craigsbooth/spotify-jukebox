// routes/auth.js - Flexible Auth Handshake
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const spotifyApi = require('../spotify_instance');
const spotifyCtrl = require('../spotify_ctrl');
const state = require('../state');
const sm = require('../state_manager');

const TOKEN_PATH = path.join(__dirname, '../tokens.json');

// 1. THE LOGIN REDIRECT
router.get('/login', (req, res) => {
    const scopes = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'playlist-read-private',
        'playlist-read-collaborative'
    ];
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

// 2. THE HANDSHAKE LOGIC
const handleCallback = async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No authorization code found.");

    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        
        // CRITICAL: Extract from .body to avoid null tokens
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];

        if (accessToken) {
            // A. Save credentials for persistence (Keep this for server restart resilience)
            await spotifyCtrl.saveTokens(accessToken, refreshToken);
            
            // B. Professional Solution: Fetch user profile to identify the host
            spotifyApi.setAccessToken(accessToken);
            const me = await spotifyApi.getMe();
            
            // C. SET GLOBAL STATE (No Session Manager)
            state.partyName = `${me.body.display_name}'s Jukebox`;
            state.startedAt = Date.now();
            // Future: state.hostId = me.body.id;

            console.log(`✅ Auth System: Handshake successful. Party '${state.partyName}' online.`);

            // D. CRITICAL FIX: Populate the Queue IMMEDIATELY
            // This ensures the dashboard is not empty when you land
            try {
                console.log("⏳ Auth System: Initializing Shuffle Bag...");
                const count = await spotifyCtrl.refreshShuffleBag();
                console.log(`🎉 Auth System: Bag populated with ${count} tracks.`);
            } catch (bagErr) {
                console.error("⚠️ Auth System: Failed to populate initial bag:", bagErr.message);
            }

            sm.saveSettings();

            // UX IMPROVEMENT: Button to return to app
            // Defaults to production URL if ENV is missing, but respects localhost for dev
            const frontendUrl = process.env.FRONTEND_URL || 'https://jukebox.boldron.info';

            res.send(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Jukebox Connected</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { background: #121212; color: white; font-family: 'Helvetica Neue', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                            .card { background: #181818; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 400px; width: 90%; border: 1px solid #333; }
                            h1 { color: #1DB954; margin-bottom: 15px; font-size: 2rem; }
                            p { color: #b3b3b3; margin-bottom: 35px; line-height: 1.6; font-size: 1.1rem; }
                            .btn { background: #1DB954; color: #000; text-decoration: none; padding: 16px 36px; border-radius: 50px; font-weight: 800; letter-spacing: 0.5px; transition: transform 0.2s, background 0.2s; display: inline-block; font-size: 1rem; text-transform: uppercase; }
                            .btn:hover { background: #1ed760; transform: scale(1.05); }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Success!</h1>
                            <p><strong>${state.partyName}</strong> is online.</p>
                            <a href="${frontendUrl}" class="btn">Return to Jukebox</a>
                        </div>
                    </body>
                </html>
            `);
        }
    } catch (err) {
        console.error("❌ Auth System Error:", err.message);
        res.status(500).send("Auth failed. Check server logs.");
    }
};

/**
 * 3. TOKEN ACCESSOR (FIX: Resolves 404 on /token)
 * Provides the current access token to the frontend.
 */
const getToken = (req, res) => {
    const token = spotifyApi.getAccessToken();
    res.json({ access_token: token || null });
};

router.get('/token', getToken);
router.get('/api/token', getToken); // Alias for modular compatibility

// 4. REGISTER CALLBACK PATHS (Catch any Nginx/Express prefixing differences)
router.get('/callback', handleCallback);
router.get('/api/callback', handleCallback);

// 5. HOST PIN SECURITY (FIX: Support both local and proxied paths)
const verifyPin = (req, res) => {
    const { pin } = req.body;
    // Default to '1234' if ENV not set, but now it's server-side controlled
    const serverPin = process.env.HOST_PIN || '1234';
    
    if (pin === serverPin) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
};

// Register the handler for both the direct path and the API-prefixed path
router.post('/verify-pin', verifyPin);
router.post('/api/verify-pin', verifyPin);

/**
 * 6. LOGOUT / SESSION CLEAR
 * Wipes memory and disk credentials for a full reset.
 */
const logout = (req, res) => {
    console.log("🛑 Auth System: Logout requested. Clearing all session data.");
    
    // Clear Memory Tokens
    spotifyApi.setAccessToken(null);
    spotifyApi.setRefreshToken(null);
    
    // Clear Global State (Replacing session logic)
    state.shuffleBag = [];
    state.partyQueue = [];
    if (state.playedHistory instanceof Set) state.playedHistory.clear();
    
    // Delete tokens.json from disk
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            fs.unlinkSync(TOKEN_PATH);
            console.log("💾 Auth System: tokens.json deleted.");
        } catch (e) {
            console.error("❌ Auth System: Failed to delete tokens.json", e.message);
        }
    }

    res.json({ success: true, message: "Logged out successfully" });
};

router.post('/logout', logout);
router.post('/api/logout', logout);

module.exports = router;