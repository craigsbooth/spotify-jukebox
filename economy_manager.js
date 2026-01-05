// economy_manager.js - Guest Credit & Token Logic
const state = require('./state');

const economyManager = {
    /**
     * BUG 1 FIX: Enforce Global Token Cap
     * Iterates through all registered guests and trims their balance 
     * if it exceeds the current tokensMax setting.
     */
    enforceGlobalTokenCap: () => {
        const max = state.tokensMax || 10;
        let count = 0;
        Object.keys(state.tokenRegistry).forEach(guestId => {
            if (state.tokenRegistry[guestId].balance > max) {
                state.tokenRegistry[guestId].balance = max;
                count++;
            }
        });
        if (count > 0) console.log(`🪙 Economy: Trimmed ${count} guest(s) to new global cap of ${max}`);
    },

    /**
     * SYNC GUEST TOKENS
     * Calculates accruals based on time passed since last check.
     * Restored: Detailed time math and precision accrual.
     */
    syncGuestTokens: (guestId) => {
        const guest = state.tokenRegistry[guestId];
        if (!guest) return null;

        const now = Date.now();
        const tokensPerHour = state.tokensPerHour || 1;
        const maxTokens = state.tokensMax || 10;
        
        // Calculate milliseconds required per token earned
        const msPerToken = (60 * 60 * 1000) / tokensPerHour;
        const msSinceLast = now - guest.lastAccrual;

        // Determine how many tokens were earned in the elapsed time
        const earned = Math.floor(msSinceLast / msPerToken);
        
        if (earned > 0) {
            const oldBalance = guest.balance;
            guest.balance = Math.min(maxTokens, guest.balance + earned);
            // Move the lastAccrual forward by exactly the amount of time "spent" on earned tokens
            guest.lastAccrual = guest.lastAccrual + (earned * msPerToken);
            
            if (guest.balance > oldBalance) {
                console.log(`🪙 Accrual: Guest ${guestId} earned ${earned} tokens (Total: ${guest.balance})`);
            }
        }

        const msToNext = msPerToken - (now - guest.lastAccrual);
        return {
            balance: guest.balance,
            nextIn: Math.ceil(msToNext / 1000),
            msPerToken: msPerToken
        };
    },

    /**
     * SPEND TOKEN
     * Validates and deducts credit for requests.
     * Restored: Strict token check and formatted countdown messaging.
     */
    spendToken: (guestId) => {
        // If the economy is globally disabled, everything is free
        if (state.tokensEnabled === false) return { success: true, balance: 999 };
        
        if (!guestId) return { success: false, message: "Guest identification required for request." };

        const sync = economyManager.syncGuestTokens(guestId);
        if (!sync) return { success: false, message: "Guest session not found. Please refresh." };

        if (sync.balance > 0) {
            state.tokenRegistry[guestId].balance -= 1;
            console.log(`🪙 Spend: Guest ${guestId} used 1 token. Remaining: ${state.tokenRegistry[guestId].balance}`);
            return { 
                success: true, 
                balance: state.tokenRegistry[guestId].balance,
                nextIn: sync.nextIn 
            };
        } else {
            // Restore the "Out of tokens" formatted countdown message
            const mins = Math.floor(sync.nextIn / 60);
            const secs = sync.nextIn % 60;
            const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;
            
            console.log(`⚠️ Blocked: Guest ${guestId} has 0 tokens. Next in ${timeString}`);
            return { 
                success: false, 
                message: `Out of tokens! Next in ${timeString}`,
                nextIn: sync.nextIn 
            };
        }
    }
};

module.exports = economyManager;