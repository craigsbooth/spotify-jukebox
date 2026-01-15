module.exports = {
  tracks: [
    {
      name: "Bohemian Rhapsody",
      artist: "Queen",
      genre: "Rock",
      decade: "70s",
      questions: [
        { type: "LYRIC", text: "Finish the line: 'I sometimes wish I'd never been born...'", options: ["At all!", "Anyway", "To this world", "Right now"], correct: "At all!", difficulty: "Easy", points: 500 },
        { type: "HISTORY", text: "Which legendary artist did Freddie Mercury once roadie for?", options: ["David Bowie", "Jimi Hendrix", "Mick Jagger", "Robert Plant"], correct: "Jimi Hendrix", difficulty: "Hard", points: 2000 },
        { type: "PRODUCTION", text: "How many vocal tracks were layered for the 'operatic' section?", options: ["Over 180", "45", "12", "90"], correct: "Over 180", difficulty: "Extreme", points: 5000 }
      ]
    },
    {
      name: "Enter Sandman",
      artist: "Metallica",
      genre: "Metal",
      decade: "90s",
      questions: [
        { type: "GEAR", text: "Which guitar brand is James Hetfield most famous for using?", options: ["ESP", "Gibson", "Fender", "Jackson"], correct: "ESP", difficulty: "Medium", points: 1000 },
        { type: "TRIVIA", text: "What was the original subject of the lyrics?", options: ["SIDS (Crib Death)", "The Vietnam War", "A plane crash", "A bad dream"], correct: "SIDS (Crib Death)", difficulty: "Extreme", points: 5000 }
      ]
    },
    {
      name: "Back in Black",
      artist: "AC/DC",
      genre: "Rock",
      decade: "80s",
      questions: [
        { type: "HISTORY", text: "This album was a tribute to which former lead singer?", options: ["Bon Scott", "Brian Johnson", "Angus Young", "Dave Evans"], correct: "Bon Scott", difficulty: "Medium", points: 1000 },
        { type: "GEAR", text: "What iconic guitar does Angus Young play?", options: ["Gibson SG", "Fender Stratocaster", "Gibson Les Paul", "Gretsch Jet"], correct: "Gibson SG", difficulty: "Hard", points: 2000 }
      ]
    },
    {
      name: "Purple Haze",
      artist: "Jimi Hendrix",
      genre: "Psych Rock",
      decade: "60s",
      questions: [
        { type: "GEAR", text: "What effect pedal is famous for its use in this track?", options: ["Octavia", "Wah-wah", "Phaser", "Flanger"], correct: "Octavia", difficulty: "Extreme", points: 5000 },
        { type: "TRIVIA", text: "Hendrix famously played what kind of guitar 'upside down'?", options: ["Fender Stratocaster", "Gibson SG", "Fender Telecaster", "Gretsch"], correct: "Fender Stratocaster", difficulty: "Medium", points: 1000 }
      ]
    },
    {
        name: "Hotel California",
        artist: "Eagles",
        genre: "Rock",
        decade: "70s",
        questions: [
          { type: "LYRIC", text: "'You can check out any time you like, but...'", options: ["You can never leave", "The door is locked", "You have to stay", "The night is young"], correct: "You can never leave", difficulty: "Easy", points: 500 },
          { type: "TRIVIA", text: "The dual guitar solo is shared between Don Felder and who?", options: ["Joe Walsh", "Glenn Frey", "Don Henley", "Randy Meisner"], correct: "Joe Walsh", difficulty: "Hard", points: 2000 }
        ]
    },
    {
        name: "London Calling",
        artist: "The Clash",
        genre: "Punk",
        decade: "70s",
        questions: [
          { type: "HISTORY", text: "The title refers to a station identification used by which broadcaster during WWII?", options: ["BBC World Service", "Radio Luxembourg", "Voice of America", "Radio Free Europe"], correct: "BBC World Service", difficulty: "Hard", points: 2000 },
          { type: "CULTURE", text: "The album cover design is a tribute to which artist's debut album?", options: ["Elvis Presley", "Little Richard", "Chuck Berry", "The Beatles"], correct: "Elvis Presley", difficulty: "Hard", points: 2000 }
        ]
    }
  ]
};