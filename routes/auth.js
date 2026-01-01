// routes/auth.js - Flexible Auth Handshake
const express = require('express');
const router = express.Router();
const spotifyApi = require('../spotify_instance');
const spotifyCtrl = require('../spotify_ctrl');

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
            await spotifyCtrl.saveTokens(accessToken, refreshToken);
            console.log("✅ Auth System: Handshake successful. tokens.json created.");
            
            res.send(`
                <html>
                    <body style="background: #121212; color: #1DB954; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                        <div style="text-align: center; border: 2px solid #1DB954; padding: 3rem; border-radius: 15px;">
                            <h1>Authentication Success!</h1>
                            <p style="color: white;">The Pinfold is now live. You can close this window.</p>
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

// 3. REGISTER BOTH PATHS (Catch any Nginx/Express prefixing differences)
router.get('/callback', handleCallback);
router.get('/api/callback', handleCallback);

module.exports = router;