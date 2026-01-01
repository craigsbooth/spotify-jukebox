// spotify_instance.js - The Auth Singleton (Final Hardened Version)
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const SpotifyWebApi = require('spotify-web-api-node');

// Define the absolute path for the token file
const TOKEN_PATH = path.join(__dirname, 'tokens.json');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI
});

// --- 1. THE TOKEN MONITOR ---
// Wraps the standard setAccessToken to provide safe console feedback
const originalSetAccessToken = spotifyApi.setAccessToken;
spotifyApi.setAccessToken = function(token) {
    if (token && token !== "null") {
        console.log(`🔑 Token System: Access Token updated.`);
    } else {
        console.warn("⚠️ Token System: Received null or invalid token.");
    }
    return originalSetAccessToken.apply(this, arguments);
};

// --- 2. STARTUP RECOVERY LOGIC ---
console.log(`📂 Token System: Checking path: ${TOKEN_PATH}`);

try {
    if (fs.existsSync(TOKEN_PATH)) {
        const rawData = fs.readFileSync(TOKEN_PATH, 'utf8');
        console.log(`📄 Token System: File found. Content length: ${rawData.length} bytes`);
        
        const tokens = JSON.parse(rawData);
        
        // Use all possible naming variations to ensure it catches the data
        const access = tokens.access_token || tokens.accessToken || tokens.access;
        const refresh = tokens.refresh_token || tokens.refreshToken || tokens.refresh;

        // CRITICAL CHECK: Only restore if access is a valid string, 
        // otherwise let the system trigger a refresh/re-auth.
        if (access && access !== "null") {
            spotifyApi.setAccessToken(access);
            if (refresh) spotifyApi.setRefreshToken(refresh);
            console.log("✅ Station Session: RESTORED successfully from disk.");
        } else if (refresh && refresh !== "null") {
            // We have a refresh token but no access token - inject refresh so spotify_ctrl can use it
            spotifyApi.setRefreshToken(refresh);
            console.warn("🔄 Station Session: Refresh token found, but Access token is missing. Background recovery pending...");
        } else {
            console.warn("⚠️ Token System: File exists but no usable tokens found.");
            console.log("DEBUG Keys found in file:", Object.keys(tokens));
        }
    } else {
        console.warn(`ℹ️ No tokens.json found at ${TOKEN_PATH}. Waiting for first login.`);
    }
} catch (err) {
    console.error("❌ Token System: Recovery Crash during boot:", err.message);
}

module.exports = spotifyApi;