// spotify_instance.js - The Auth Singleton (Hardened & Environment Aware)
const fs = require('fs');
const path = require('path');
const os = require('os');
// Ensure .env is loaded from the current directory where the file lives
require('dotenv').config({ path: path.join(__dirname, '.env') });
const SpotifyWebApi = require('spotify-web-api-node');

// Define the absolute path for the token file
const TOKEN_PATH = path.join(__dirname, 'tokens.json');

/**
 * ENVIRONMENT DETECTION
 * If the hostname matches your local machine or is 'localhost', 
 * we override the redirect URI to prevent breaking Production Auth.
 */
const isLocal = os.hostname().includes('craig') || 
                process.env.NODE_ENV === 'development' || 
                !process.env.APP_VERSION;

// FIX: Prioritize explicit Environment Variable first, then fallback to auto-detection
const REDIRECT_URI = process.env.REDIRECT_URI || (isLocal 
    ? 'http://127.0.0.1:8888/callback' 
    : 'https://jukebox.boldron.info/api/callback');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: REDIRECT_URI
});

console.log(`🌐 Auth System: Initialized for ${isLocal ? 'LOCAL' : 'PRODUCTION'}`);
console.log(`🔗 Redirect Target: ${REDIRECT_URI}`);

/**
 * MULTI-HOST DYNAMIC SESSION RECOVERY
 * We still check for tokens.json on disk to maintain a session after a server restart,
 * but we no longer rely on hardcoded defaults.
 */
try {
    if (fs.existsSync(TOKEN_PATH)) {
        const rawData = fs.readFileSync(TOKEN_PATH, 'utf8');
        const tokens = JSON.parse(rawData);
        
        const access = tokens.access_token || tokens.accessToken || tokens.access;
        const refresh = tokens.refresh_token || tokens.refreshToken || tokens.refresh;

        if (access && access !== "null") {
            spotifyApi.setAccessToken(access);
            if (refresh) spotifyApi.setRefreshToken(refresh);
            console.log("✅ Auth System: Existing host session restored from disk.");
        } else {
            console.log("ℹ️ Auth System: No active session. Waiting for host login.");
        }
    } else {
        console.log("ℹ️ Auth System: Fresh start. Host login required at /login.");
    }
} catch (err) {
    console.error("❌ Auth System: Session recovery error:", err.message);
}

module.exports = spotifyApi;