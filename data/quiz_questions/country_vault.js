module.exports = {
  tracks: [
    // --- THE LEGENDS ---
    {
      name: "I Walk the Line",
      artist: "Johnny Cash",
      genre: "Country",
      decade: "50s",
      questions: [
        { type: "HISTORY", text: "Johnny Cash famously performed a live album at which California prison in 1968?", options: ["Folsom State Prison", "San Quentin", "Alcatraz", "Pelican Bay"], correct: "Folsom State Prison", difficulty: "Easy", points: 500 },
        { type: "TRIVIA", text: "What was Johnny Cash's famous nickname, based on his stage attire?", options: ["The Man in Black", "The Highwayman", "The Midnight Rider", "The Outlaw"], correct: "The Man in Black", difficulty: "Easy", points: 500 }
      ]
    },
    {
      name: "Jolene",
      artist: "Dolly Parton",
      genre: "Country",
      decade: "70s",
      questions: [
        { type: "HISTORY", text: "Dolly Parton wrote 'Jolene' and which other massive hit on the exact same day?", options: ["I Will Always Love You", "9 to 5", "Coat of Many Colors", "Here You Come Again"], correct: "I Will Always Love You", difficulty: "Hard", points: 2000 },
        { type: "LYRIC", text: "'Jolene, Jolene, Jolene, Jolene, I'm begging of you please don't...'", options: ["Take my man", "Break my heart", "Walk away", "Leave me be"], correct: "Take my man", difficulty: "Easy", points: 500 }
      ]
    },

    // --- 90s COUNTRY EXPLOSION ---
    {
      name: "Friends in Low Places",
      artist: "Garth Brooks",
      genre: "Country",
      decade: "90s",
      questions: [
        { type: "TRIVIA", text: "In the live version of this song, Garth Brooks famously adds a 'Third Verse' that wasn't on the original record.", options: ["True", "False"], correct: "True", difficulty: "Medium", points: 1000 }
      ]
    },
    {
      name: "Man! I Feel Like a Woman!",
      artist: "Shania Twain",
      genre: "Country Pop",
      decade: "90s",
      questions: [
        { type: "PRODUCTION", text: "Which legendary rock producer (and then-husband) produced Shania's 'Come On Over' album?", options: ["Robert John 'Mutt' Lange", "Rick Rubin", "Brendan O'Brien", "Max Martin"], correct: "Robert John 'Mutt' Lange", difficulty: "Hard", points: 2000 }
      ]
    },

    // --- MODERN COUNTRY ---
    {
      name: "Before He Cheats",
      artist: "Carrie Underwood",
      genre: "Country",
      decade: "00s",
      questions: [
        { type: "HISTORY", text: "Carrie Underwood rose to fame after winning the fourth season of which show?", options: ["American Idol", "The Voice", "Nashville Star", "The X Factor"], correct: "American Idol", difficulty: "Easy", points: 500 }
      ]
    },
    {
      name: "Tennessee Whiskey",
      artist: "Chris Stapleton",
      genre: "Country / Soul",
      decade: "10s",
      questions: [
        { type: "HISTORY", text: "Although Stapleton's 2015 version is the most famous, who originally recorded this song in 1981?", options: ["David Allan Coe", "George Jones", "Waylon Jennings", "Willie Nelson"], correct: "David Allan Coe", difficulty: "Extreme", points: 5000 }
      ]
    }
  ]
};