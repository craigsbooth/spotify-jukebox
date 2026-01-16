// test_year_logic_v3.js
const QuizHelpers = require('./routes/quiz_helpers');

async function testDeepYearV3() {
    console.log("--- 🕰️  Testing Deep Year Accuracy (Round 3: The Classics) ---");

    const testCases = [
        // --- 1950s ---
        // Risk: Often found on "Best of the 50s" compilations from 1999/2000
        { name: "Jailhouse Rock", artist: "Elvis Presley", expected: "1957" },
        { name: "Johnny B. Goode", artist: "Chuck Berry", expected: "1958" },
        { name: "La Bamba", artist: "Ritchie Valens", expected: "1958" }, 
        // Note: La Bamba risk is the Los Lobos version (1987)

        // --- 1960s ---
        // Risk: 2009 Remasters (Beatles) or Movie Soundtracks
        { name: "Respect", artist: "Aretha Franklin", expected: "1967" },
        { name: "Paint It, Black", artist: "The Rolling Stones", expected: "1966" },
        { name: "Space Oddity", artist: "David Bowie", expected: "1969" },
        // Space Oddity is tricky: Released '69, huge hit again in '75.

        // --- 1970s ---
        // Risk: Disco compilations from the 90s
        { name: "Stayin' Alive", artist: "Bee Gees", expected: "1977" },
        { name: "Imagine", artist: "John Lennon", expected: "1971" },
        { name: "Hotel California", artist: "Eagles", expected: "1976" },
        // Hotel California risk: Live version (Hell Freezes Over, 1994)
        { name: "Dancing Queen", artist: "ABBA", expected: "1976" }
    ];

    for (const track of testCases) {
        console.log(`\n🔎 Searching: "${track.name}" by ${track.artist}...`);
        
        const trackObj = { name: track.name, artist: track.artist };
        
        const start = Date.now();
        const year = await QuizHelpers.getOriginalYear(trackObj);
        const duration = Date.now() - start;

        if (year) {
            const isMatch = year === track.expected;
            const icon = isMatch ? "✅" : "⚠️";
            console.log(`${icon} Result: ${year} (Expected: ${track.expected}) [${duration}ms]`);
            
            if (!isMatch) console.log(`   -> Note: API found a different release date.`);
        } else {
            console.log(`❌ Failed to fetch year.`);
        }
    }
    console.log("\n--- Test Complete ---");
}

testDeepYearV3();