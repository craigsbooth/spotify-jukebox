module.exports = {
  tracks: [
    // --- THE JAZZ INNOVATORS ---
    {
      name: "So What",
      artist: "Miles Davis",
      genre: "Modal Jazz",
      decade: "50s",
      questions: [
        { type: "HISTORY", text: "This track is the opener for which 1959 album, the best-selling jazz record of all time?", options: ["Kind of Blue", "Bitches Brew", "A Love Supreme", "Blue Train"], correct: "Kind of Blue", difficulty: "Easy", points: 500 },
        { type: "THEORY", text: "The song is a primary example of 'Modal Jazz.' What two scales (modes) does the structure alternate between?", options: ["D Dorian and Eb Dorian", "C Major and G Major", "A Minor and E Minor", "Bb Mixolydian and F Mixolydian"], correct: "D Dorian and Eb Dorian", difficulty: "Extreme", points: 5000 },
        { type: "HISTORY", text: "Which legendary saxophonist played the tenor solo on this track?", options: ["John Coltrane", "Charlie Parker", "Cannonball Adderley", "Stan Getz"], correct: "John Coltrane", difficulty: "Hard", points: 2000 }
      ]
    },
    {
      name: "Take Five",
      artist: "The Dave Brubeck Quartet",
      genre: "Cool Jazz",
      decade: "50s",
      questions: [
        { type: "THEORY", text: "The song is famous for its unusual time signature, as indicated by the title. What is it?", options: ["5/4", "3/4", "7/8", "9/4"], correct: "5/4", difficulty: "Medium", points: 1000 },
        { type: "HISTORY", text: "Who actually wrote this track, which became the first jazz instrumental to sell a million copies?", options: ["Paul Desmond", "Dave Brubeck", "Joe Morello", "Eugene Wright"], correct: "Paul Desmond", difficulty: "Hard", points: 2000 }
      ]
    },

    // --- DELTA & CHICAGO BLUES ---
    {
      name: "Cross Road Blues",
      artist: "Robert Johnson",
      genre: "Delta Blues",
      decade: "30s",
      questions: [
        { type: "CULTURE", text: "Legend says Johnson sold his soul to the devil at a crossroads in which state to master the guitar?", options: ["Mississippi", "Louisiana", "Tennessee", "Alabama"], correct: "Mississippi", difficulty: "Easy", points: 500 },
        { type: "HISTORY", text: "Johnson only participated in two recording sessions in his life. How many songs did he leave behind in total?", options: ["29", "10", "50", "12"], correct: "29", difficulty: "Extreme", points: 5000 }
      ]
    },
    {
      name: "The Thrill Is Gone",
      artist: "B.B. King",
      genre: "Blues",
      decade: "60s",
      questions: [
        { type: "GEAR", text: "B.B. King famously gave what name to all of his Gibson ES-355 guitars?", options: ["Lucille", "Layla", "Roxanne", "Eleanor"], correct: "Lucille", difficulty: "Easy", points: 500 },
        { type: "PRODUCTION", text: "What unique addition to the 1969 production of this track helped it 'cross over' to pop charts?", options: ["A string orchestra", "A synthesizer", "A drum machine", "A gospel choir"], correct: "A string orchestra", difficulty: "Hard", points: 2000 }
      ]
    },

    // --- THE JAZZ DIVAS ---
    {
      name: "Strange Fruit",
      artist: "Billie Holiday",
      genre: "Jazz / Torch Song",
      decade: "30s",
      questions: [
        { type: "HISTORY", text: "This haunting protest song was based on a poem about what social atrocity?", options: ["Lynching in the American South", "The Great Depression", "Child Labor", "World War I"], correct: "Lynching in the American South", difficulty: "Medium", points: 1000 }
      ]
    },
    {
      name: "At Last",
      artist: "Etta James",
      genre: "Blues / Soul",
      decade: "60s",
      questions: [
        { type: "TRIVIA", text: "Which modern pop star portrayed Etta James in the 2008 film 'Cadillac Records'?", options: ["Beyoncé", "Alicia Keys", "Jennifer Hudson", "Janelle Monáe"], correct: "Beyoncé", difficulty: "Medium", points: 1000 }
      ]
    }
  ]
};