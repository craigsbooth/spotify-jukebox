module.exports = {
  tracks: [
    // --- THE BIG FOUR & THRASH ---
    {
      name: "Master of Puppets",
      artist: "Metallica",
      genre: "Thrash Metal",
      decade: "80s",
      questions: [
        { type: "TRIVIA", text: "Which iconic bassist played on this track and died tragically during the subsequent tour?", options: ["Cliff Burton", "Jason Newsted", "Robert Trujillo", "Dave Mustaine"], correct: "Cliff Burton", difficulty: "Medium", points: 1000 },
        { type: "PRODUCTION", text: "James Hetfield famously refuses to play what during the recording of this track's rhythm guitars?", options: ["Up-strokes", "Down-strokes", "Palm mutes", "Power chords"], correct: "Up-strokes", difficulty: "Hard", points: 2000 },
        { type: "HISTORY", text: "In 2022, this song saw a massive chart resurgence after being featured in which TV show?", options: ["Stranger Things", "The Bear", "The Boys", "Breaking Bad"], correct: "Stranger Things", difficulty: "Easy", points: 500 }
      ]
    },
    {
      name: "Raining Blood",
      artist: "Slayer",
      genre: "Thrash Metal",
      decade: "80s",
      questions: [
        { type: "GEAR", text: "The 'rain' sound at the end of the track was created using which effect pedal?", options: ["None (it was feedback)", "Boss Heavy Metal HM-2", "Crybaby Wah", "Electro-Harmonix Big Muff"], correct: "None (it was feedback)", difficulty: "Extreme", points: 5000 }
      ]
    },

    // --- NEW WAVE OF BRITISH HEAVY METAL (NWOBHM) ---
    {
      name: "The Trooper",
      artist: "Iron Maiden",
      genre: "Heavy Metal",
      decade: "80s",
      questions: [
        { type: "HISTORY", text: "The song is based on the Charge of the Light Brigade during which war?", options: ["Crimean War", "WWI", "WWII", "Napoleonic Wars"], correct: "Crimean War", difficulty: "Hard", points: 2000 },
        { type: "TRIVIA", text: "What is the name of Iron Maiden's legendary skeletal mascot featured on the single cover?", options: ["Eddie", "Vic Rattlehead", "Murray", "Snaggletooth"], correct: "Eddie", difficulty: "Easy", points: 500 }
      ]
    },
    {
      name: "Breaking the Law",
      artist: "Judas Priest",
      genre: "Heavy Metal",
      decade: "80s",
      questions: [
        { type: "PRODUCTION", text: "To simulate the sound of breaking glass in the song, what did the band actually use in the studio?", options: ["Milk bottles", "Sample library", "Recording of a car crash", "A lightbulb"], correct: "Milk bottles", difficulty: "Extreme", points: 5000 }
      ]
    },

    // --- THE ORIGINATORS ---
    {
      name: "War Pigs",
      artist: "Black Sabbath",
      genre: "Heavy Metal",
      decade: "70s",
      questions: [
        { type: "TRIVIA", text: "What was the original title of this song before the record label forced a change?", options: ["Walpurgis", "Iron Man", "Electric Funeral", "Hand of Doom"], correct: "Walpurgis", difficulty: "Hard", points: 2000 },
        { type: "GEAR", text: "Guitarist Tony Iommi famously plays with plastic thimbles on his fingers due to an accident where?", options: ["In a sheet metal factory", "On a motorcycle", "In a kitchen", "At a concert"], correct: "In a sheet metal factory", difficulty: "Medium", points: 1000 }
      ]
    },

    // --- 90s GROOVE & NU-METAL ---
    {
      name: "Walk",
      artist: "Pantera",
      genre: "Groove Metal",
      decade: "90s",
      questions: [
        { type: "GEAR", text: "Dimebag Darrell was famous for his signature 'Lightning Bolt' guitar made by which company?", options: ["Dean", "Washburn", "Jackson", "BC Rich"], correct: "Dean", difficulty: "Medium", points: 1000 }
      ]
    },
    {
      name: "Wait and Bleed",
      artist: "Slipknot",
      genre: "Nu-Metal",
      decade: "90s",
      questions: [
        { type: "TRIVIA", text: "How many official members are in the classic Slipknot lineup?", options: ["Nine", "Seven", "Five", "Twelve"], correct: "Nine", difficulty: "Easy", points: 500 }
      ]
    },

    // --- HARD ROCK ANTHEMS ---
    {
      name: "Ace of Spades",
      artist: "Motörhead",
      genre: "Hard Rock",
      decade: "80s",
      questions: [
        { type: "HISTORY", text: "Lemmy Kilmister was famously a roadie for which 1960s guitar legend before forming Motörhead?", options: ["Jimi Hendrix", "Eric Clapton", "Keith Richards", "Jimmy Page"], correct: "Jimi Hendrix", difficulty: "Hard", points: 2000 }
      ]
    },
    {
      name: "Thunderstruck",
      artist: "AC/DC",
      genre: "Hard Rock",
      decade: "90s",
      questions: [
        { type: "TRIVIA", text: "The opening guitar part is played using a technique where the strings are never actually strummed. What is it called?", options: ["Hammer-ons/Pull-offs", "Sweep picking", "Tapping", "Slide"], correct: "Hammer-ons/Pull-offs", difficulty: "Medium", points: 1000 }
      ]
    }
  ]
};