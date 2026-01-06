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

// FIX: Using 127.0.0.1 to match your Spotify Dashboard settings exactly
const REDIRECT_URI = isLocal 
    ? 'http://127.0.0.1:8888/callback' 
    : (process.env.REDIRECT_URI || 'https://jukebox.boldron.info/api/callback');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: REDIRECT_URI
});

console.log(`🌐 Auth System: Initialized for ${isLocal ? 'LOCAL' : 'PRODUCTION'}`);
console.log(`🔗 Redirect Target: ${REDIRECT_URI}`);

// --- STARTUP RECOVERY LOGIC ---
console.log(`📂 Token System: Checking path: ${TOKEN_PATH}`);

try {
    if (fs.existsSync(TOKEN_PATH)) {
        const rawData = fs.readFileSync(TOKEN_PATH, 'utf8');
        console.log(`📄 Token System: File found. Content length: ${rawData.length} bytes`);
        
        const tokens = JSON.parse(rawData);
        
        // Use all possible naming variations to ensure it catches the data
        const access = tokens.access_token || tokens.accessToken || tokens.access;
        const refresh = tokens.refresh_token || tokens.refreshToken || tokens.refresh;

        // CRITICAL CHECK: Only restore if access is a valid string
        if (access && access !== "null") {
            spotifyApi.setAccessToken(access);
            if (refresh) spotifyApi.setRefreshToken(refresh);
            console.log("✅ Station Session: RESTORED successfully from disk.");
        } else if (refresh && refresh !== "null") {
            spotifyApi.setRefreshToken(refresh);
            console.warn("🔄 Station Session: Refresh token found, but Access token is missing. Background recovery pending...");
        } else {
            console.warn("⚠️ Token System: File exists but no usable tokens found.");
        }
    } else {
        console.warn(`ℹ️ No tokens.json found. Waiting for first login.`);
    }
} catch (err) {
    console.error("❌ Token System: Recovery Crash during boot:", err.message);
}

module.exports = spotifyApi;