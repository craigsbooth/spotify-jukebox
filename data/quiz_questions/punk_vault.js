module.exports = {
  tracks: [
    // --- 70s PUNK ORIGINATORS ---
    {
      name: "Blitzkrieg Bop",
      artist: "Ramones",
      genre: "Punk Rock",
      decade: "70s",
      questions: [
        { type: "LYRIC", text: "Finish the opening chant: 'Hey! Ho! ...'", options: ["Let's go!", "Don't go!", "Here we go!", "On we go!"], correct: "Let's go!", difficulty: "Easy", points: 500 },
        { type: "HISTORY", text: "The Ramones are famously associated with which legendary New York City club?", options: ["CBGB", "Studio 54", "The Roxy", "Whisky a Go Go"], correct: "CBGB", difficulty: "Medium", points: 1000 },
        { type: "TRIVIA", text: "Despite their stage names, how many members of the original Ramones were actually related?", options: ["None", "All of them", "Two", "Three"], correct: "None", difficulty: "Hard", points: 2000 }
      ]
    },
    {
      name: "God Save the Queen",
      artist: "Sex Pistols",
      genre: "Punk Rock",
      decade: "70s",
      questions: [
        { type: "HISTORY", text: "During the Queen's Silver Jubilee in 1977, the band famously performed this song where?", options: ["On a boat on the River Thames", "In front of Buckingham Palace", "On top of a double-decker bus", "In a high-security prison"], correct: "On a boat on the River Thames", difficulty: "Hard", points: 2000 }
      ]
    },

    // --- 90s SKA & POP-PUNK REVIVAL ---
    {
      name: "Basket Case",
      artist: "Green Day",
      genre: "Pop-Punk",
      decade: "90s",
      questions: [
        { type: "HISTORY", text: "Which 1994 breakout album is this track from?", options: ["Dookie", "American Idiot", "Insomniac", "Nimrod"], correct: "Dookie", difficulty: "Easy", points: 500 },
        { type: "TRIVIA", text: "The music video was filmed in a real abandoned mental institution in which state?", options: ["California", "New Jersey", "Washington", "Texas"], correct: "California", difficulty: "Hard", points: 2000 }
      ]
    },
    {
      name: "Don't Speak",
      artist: "No Doubt",
      genre: "Ska / Alt-Rock",
      decade: "90s",
      questions: [
        { type: "HISTORY", text: "Gwen Stefani wrote this song about her breakup with which fellow band member?", options: ["Tony Kanal", "Tom Dumont", "Adrian Young", "Eric Stefani"], correct: "Tony Kanal", difficulty: "Medium", points: 1000 }
      ]
    },

    // --- 2000s POP-PUNK DOMINANCE ---
    {
      name: "All The Small Things",
      artist: "blink-182",
      genre: "Pop-Punk",
      decade: "90s", // Peaked 2000
      questions: [
        { type: "TRIVIA", text: "The music video for this song is a famous parody of which music trend?", options: ["Boy bands and pop princesses", "Heavy metal concerts", "Gangsta rap videos", "Grunge aesthetic"], correct: "Boy bands and pop princesses", difficulty: "Easy", points: 500 },
        { type: "PRODUCTION", text: "Who was the producer known as the 'Architect of Pop-Punk' who worked on this track?", options: ["Jerry Finn", "Butch Vig", "Rick Rubin", "Steve Albini"], correct: "Jerry Finn", difficulty: "Extreme", points: 5000 }
      ]
    },
    {
      name: "Misery Business",
      artist: "Paramore",
      genre: "Pop-Punk",
      decade: "00s",
      questions: [
        { type: "HISTORY", text: "Hayley Williams was famously signed as a solo artist before she insisted on forming a band with her friends. What was her age when she signed?", options: ["14", "16", "18", "21"], correct: "14", difficulty: "Extreme", points: 5000 }
      ]
    },
    {
      name: "Sugar, We're Goin Down",
      artist: "Fall Out Boy",
      genre: "Emo / Pop-Punk",
      decade: "00s",
      questions: [
        { type: "TRIVIA", text: "The music video features a boy who grows what animalistic feature?", options: ["Deer antlers", "Wolf ears", "A lion's mane", "Eagle wings"], correct: "Deer antlers", difficulty: "Medium", points: 1000 }
      ]
    },

    // --- HARDCORE & POST-PUNK ---
    {
      name: "Holiday in Cambodia",
      artist: "Dead Kennedys",
      genre: "Hardcore Punk",
      decade: "80s",
      questions: [
        { type: "HISTORY", text: "Who was the outspoken, politically charged lead singer of the Dead Kennedys?", options: ["Jello Biafra", "Henry Rollins", "Ian MacKaye", "Iggy Pop"], correct: "Jello Biafra", difficulty: "Medium", points: 1000 }
      ]
    },
    {
      name: "Ever Fallen in Love (With Someone You Shouldn't've)",
      artist: "Buzzcocks",
      genre: "Punk / Power Pop",
      decade: "70s",
      questions: [
        { type: "TRIVIA", text: "This song is famous for blending punk energy with 'perfect' pop songwriting. Which city was the band from?", options: ["Manchester", "London", "Liverpool", "Birmingham"], correct: "Manchester", difficulty: "Hard", points: 2000 }
      ]
    }
  ]
};