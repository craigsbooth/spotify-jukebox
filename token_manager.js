// token_manager.js - Dedicated Spotify Token Heartbeat & Persistence
const fs = require('fs');
const path = require('path');
const spotifyApi = require('./spotify_instance');

const TOKEN_FILE = path.join(__dirname, 'tokens.json');

const tokenManager = {
    /**
     * Silent Refresh: Attempts to use the refresh_token to get a new access_token.
     * Persists the new token immediately to disk.
     */
    handleExpiredToken: async () => {
        console.log("🔄 Token System: Attempting silent refresh...");
        const refreshToken = spotifyApi.getRefreshToken();

        if (!refreshToken || refreshToken === "null") {
            console.error("❌ Token System: No Refresh Token found. Manual login required.");
            throw new Error("NO_REFRESH_TOKEN");
        }

        try {
            const data = await spotifyApi.refreshAccessToken();
            const newAccess = data.body['access_token'];
            
            spotifyApi.setAccessToken(newAccess);
            await tokenManager.saveTokens(newAccess, refreshToken);
            
            console.log("✅ Token System: Silent refresh successful and persisted.");
            return newAccess;
        } catch (err) {
            console.error("❌ Token System: Automatic refresh failed:", err.message);
            throw err;
        }
    },

    /**
     * Persists tokens to tokens.json. 
     * Hardened to ensure we don't overwrite a good refresh token with "null".
     */
    saveTokens: async (access, refresh) => {
        let cleanAccess = typeof access === 'string' ? access : access?.accessToken;
        let cleanRefresh = typeof refresh === 'string' ? refresh : refresh?.refreshToken;
        const activeRefresh = cleanRefresh || spotifyApi.getRefreshToken();

        if (cleanAccess && cleanAccess !== "null") spotifyApi.setAccessToken(cleanAccess);
        if (activeRefresh && activeRefresh !== "null") spotifyApi.setRefreshToken(activeRefresh);
        
        if (cleanAccess || activeRefresh) {
            const tokenData = { 
                access_token: cleanAccess || null, 
                refresh_token: activeRefresh || null,
                updatedAt: new Date().toISOString()
            };

            try {
                fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
                console.log("💾 Token System: tokens.json updated.");
            } catch (err) {
                console.error("❌ Token System: Disk write failed:", err.message);
            }
        }
    }
};

/**
 * BUG 2 FIX: Proactive Refresh Heartbeat
 * Refreshes the token every 20 minutes (Spotify tokens expire in 60).
 */
setInterval(async () => {
    if (spotifyApi.getRefreshToken()) {
        try {
            await tokenManager.handleExpiredToken();
        } catch (err) {
            console.error("⚠️ Heartbeat Refresh Failed. System will retry on next activity.");
        }
    }
}, 20 * 60 * 1000);

// Startup recovery
setTimeout(() => {
    if (spotifyApi.getRefreshToken()) {
        tokenManager.handleExpiredToken().catch(() => {});
    }
}, 5000);

module.exports = tokenManager;