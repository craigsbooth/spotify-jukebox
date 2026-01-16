// test_helpers.js - Testing the production QuizHelpers logic
const QuizHelpers = require('./routes/quiz_helpers');
const tokenManager = require('./token_manager');

async function testProductionLogic() {
    try {
        console.log("--- 🛠️  Testing Production QuizHelpers Logic ---");
        
        // 1. Initialize tokens (Required for the Spotify API calls inside Helpers)
        await tokenManager.handleExpiredToken();

        // 2. Define tracks to test (Correcting for the "Unknown Album" issue)
        const testTracks = [
            { name: "Wonderwall", artist: "Oasis" },
            { name: "Mr. Brightside", artist: "The Killers" },
            { name: "I Feel Love", artist: "Donna Summer" },
            { name: "Cross Road Blues", artist: "Robert Johnson" }
        ];

        for (const trackData of testTracks) {
            console.log(`\n🧪 Testing Helper for: "${trackData.name}" by ${trackData.artist}`);
            
            // This calls the EXACT function used in your main app
            const result = await QuizHelpers.getAlbumData(trackData);

            if (result) {
                console.log("✅ HELPER SUCCESS:");
                console.log(`   - Album Found: ${result.albumName}`);
                console.log(`   - Popularity:  ${result.popularity}`);
                console.log(`   - Image URL:   ${result.image ? "Present" : "Missing"}`);
                
                // Double check for generic placeholders just in case
                if (result.albumName.toLowerCase().includes("unknown")) {
                    console.log("❌ CRITICAL: Sanitization failed! Helper returned 'Unknown'.");
                }
            } else {
                console.log("⚠️  HELPER SKIPPED: Logic correctly identified this as generic or search failed.");
            }
        }

        console.log("\n--- Helper Test Complete ---");
    } catch (e) {
        console.error("\n❌ TEST CRASHED:", e.message);
    }
}

testProductionLogic();