// session_manager.js - The Traffic Controller for Multi-Host Support
const state = require('./state'); // The Singleton (Restored from disk)
const { Party } = require('./state'); // The Class Definition

// V1 Architecture: Adopt the restored state immediately as the active party
// This prevents 503 errors on server restart by using the persisted session.
let activeParty = state;

if (activeParty) {
    console.log(`🔌 Session Manager: Adopted restored session for '${activeParty.partyName}'`);
}

module.exports = {
    /**
     * Creates a new Party instance for a specific host.
     * This replaces the old global state reset.
     * @param {Object} hostProfile - Spotify user profile object
     * @param {Object} tokens - Initial access/refresh tokens
     */
    createParty: (hostProfile, tokens) => {
        // Use the Host's Spotify ID as the unique Party ID
        const partyId = hostProfile.id;
        const hostName = hostProfile.display_name || "Host";
        
        console.log(`🎉 Session Manager: Creating new party for ${hostName} (${partyId})`);
        
        // Instantiate the Party Class (defined in state.js)
        activeParty = new Party(partyId, `${hostName}'s Jukebox`);
        
        // Store auth details directly on the instance
        activeParty.host = hostProfile;
        activeParty.tokens = tokens;
        activeParty.startedAt = Date.now();
        
        return activeParty;
    },

    /**
     * Returns the currently active party.
     * If no party is active, returns null.
     */
    getActiveParty: () => {
        return activeParty;
    },

    /**
     * Checks if a party is currently running.
     */
    hasActiveParty: () => {
        return activeParty !== null;
    },

    /**
     * Gracefully shuts down the current party.
     */
    endParty: () => {
        if (activeParty) {
            console.log(`🛑 Session Manager: Ending party '${activeParty.partyName}'`);
            activeParty = null;
        }
    }
};