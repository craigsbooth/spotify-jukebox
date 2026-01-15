module.exports = {
  tracks: [
    // --- THE BRITISH INVASION & PSYCHEDELIA ---
    {
      name: "A Day in the Life",
      artist: "The Beatles",
      genre: "Psychedelic Rock",
      decade: "60s",
      questions: [
        { type: "HISTORY", text: "Which album does this track serve as the grand finale for?", options: ["Sgt. Pepper's Lonely Hearts Club Band", "Revolver", "The White Album", "Abbey Road"], correct: "Sgt. Pepper's Lonely Hearts Club Band", difficulty: "Medium", points: 1000 },
        { type: "PRODUCTION", text: "The final, long-decaying piano chord was played by four people on how many pianos?", options: ["Three pianos", "One piano", "Five pianos", "Two pianos"], correct: "Three pianos", difficulty: "Extreme", points: 5000 },
        { type: "TRIVIA", text: "Who provided the middle 'Woke up, fell out of bed' section of the song?", options: ["Paul McCartney", "John Lennon", "George Harrison", "Ringo Starr"], correct: "Paul McCartney", difficulty: "Easy", points: 500 }
      ]
    },
    {
      name: "Gimme Shelter",
      artist: "The Rolling Stones",
      genre: "Rock",
      decade: "60s",
      questions: [
        { type: "PRODUCTION", text: "The backing vocalist Merry Clayton famously recorded her verse in her pajamas. What happened to her voice during the 'Murder!' line?", options: ["It cracked due to the strain", "She started crying", "She missed the note", "She whispered it"], correct: "It cracked due to the strain", difficulty: "Hard", points: 2000 }
      ]
    },

    // --- THE GUITAR GODS & HARD ROCK ORIGINS ---
    {
      name: "Stairway to Heaven",
      artist: "Led Zeppelin",
      genre: "Hard Rock",
      decade: "70s",
      questions: [
        { type: "GEAR", text: "Jimmy Page famously recorded the iconic solo using which guitar?", options: ["1959 Fender Telecaster", "Gibson Les Paul", "Gibson Double-Neck", "Fender Stratocaster"], correct: "1959 Fender Telecaster", difficulty: "Extreme", points: 5000 },
        { type: "HISTORY", text: "Where was the 'Headley Grange' estate located where the band wrote much of this track?", options: ["Hampshire, England", "London", "Wales", "California"], correct: "Hampshire, England", difficulty: "Hard", points: 2000 }
      ]
    },
    {
      name: "All Along the Watchtower",
      artist: "Jimi Hendrix",
      genre: "Psychedelic Rock",
      decade: "60s",
      questions: [
        { type: "HISTORY", text: "Who originally wrote and recorded this song, later stating that Hendrix's version was better?", options: ["Bob Dylan", "Neil Young", "Eric Clapton", "John Lennon"], correct: "Bob Dylan", difficulty: "Medium", points: 1000 },
        { type: "GEAR", text: "Hendrix used what household object to play the slide guitar section of the solo?", options: ["A cigarette lighter", "A glass bottle", "A metal pipe", "A knife"], correct: "A cigarette lighter", difficulty: "Hard", points: 2000 }
      ]
    },

    // --- PROG & ART ROCK ---
    {
      name: "Money",
      artist: "Pink Floyd",
      genre: "Prog Rock",
      decade: "70s",
      questions: [
        { type: "PRODUCTION", text: "The song is famous for its unusual time signature. What is it for most of the track?", options: ["7/4", "4/4", "3/4", "5/4"], correct: "7/4", difficulty: "Hard", points: 2000 },
        { type: "TRIVIA", text: "The 'cash register' sound loop at the start was created by Roger Waters using what?", options: ["Physical coins and bags in a bowl", "A sample from a bank", "A synthesizer preset", "A tape recording of a grocery store"], correct: "Physical coins and bags in a bowl", difficulty: "Medium", points: 1000 }
      ]
    },
    {
      name: "Go Your Own Way",
      artist: "Fleetwood Mac",
      genre: "Rock",
      decade: "70s",
      questions: [
        { type: "HISTORY", text: "This song was written by Lindsey Buckingham as a 'message' to which band member during their breakup?", options: ["Stevie Nicks", "Christine McVie", "Mick Fleetwood", "John McVie"], correct: "Stevie Nicks", difficulty: "Easy", points: 500 }
      ]
    },

    // --- 70s AMERICAN ROCK ---
    {
      name: "Born to Run",
      artist: "Bruce Springsteen",
      genre: "Rock",
      decade: "70s",
      questions: [
        { type: "PRODUCTION", text: "How long did it take Springsteen to record and perfect this single track?", options: ["Six months", "Two days", "One week", "One year"], correct: "Six months", difficulty: "Hard", points: 2000 }
      ]
    },
    {
      name: "American Girl",
      artist: "Tom Petty and the Heartbreakers",
      genre: "Rock",
      decade: "70s",
      questions: [
        { type: "TRIVIA", text: "Because of its jangly guitar sound, many people originally thought this song was by which other band?", options: ["The Byrds", "The Beatles", "The Eagles", "The Kinks"], correct: "The Byrds", difficulty: "Medium", points: 1000 }
      ]
    },

    // --- GLAM & PUNK ORIGINS ---
    {
      name: "Life on Mars?",
      artist: "David Bowie",
      genre: "Glam Rock",
      decade: "70s",
      questions: [
        { type: "HISTORY", text: "Bowie wrote this song as a parody/reaction to which Frank Sinatra hit?", options: ["My Way", "Fly Me to the Moon", "New York, New York", "Strangers in the Night"], correct: "My Way", difficulty: "Extreme", points: 5000 }
      ]
    },
    {
      name: "Anarchy in the UK",
      artist: "Sex Pistols",
      genre: "Punk Rock",
      decade: "70s",
      questions: [
        { type: "HISTORY", text: "Which legendary producer, famous for his 'Wall of Sound', was originally considered to produce the band?", options: ["Phil Spector", "George Martin", "Brian Eno", "Rick Rubin"], correct: "Phil Spector", difficulty: "Extreme", points: 5000 }
      ]
    }
  ]
};