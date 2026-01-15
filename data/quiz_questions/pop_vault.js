module.exports = {
  tracks: [
    {
      name: "Billie Jean",
      artist: "Michael Jackson",
      genre: "Pop",
      decade: "80s",
      questions: [
        { type: "HISTORY", text: "At which anniversary special did MJ first perform the Moonwalk?", options: ["Motown 25", "Grammys 1984", "MTV VMAs", "Super Bowl XXVII"], correct: "Motown 25", difficulty: "Medium", points: 1000 },
        { type: "PRODUCTION", text: "How many times was this track mixed before MJ was satisfied?", options: ["91 times", "5 times", "20 times", "12 times"], correct: "91 times", difficulty: "Extreme", points: 5000 }
      ]
    },
    {
      name: "Bad Guy",
      artist: "Billie Eilish",
      genre: "Pop",
      decade: "10s",
      questions: [
        { type: "PRODUCTION", text: "The 'click' sound in the chorus is actually a sample of what?", options: ["An Australian crosswalk signal", "Billie snapping her fingers", "A stapler", "A computer mouse"], correct: "An Australian crosswalk signal", difficulty: "Extreme", points: 5000 }
      ]
    },
    {
        name: "Toxic",
        artist: "Britney Spears",
        genre: "Pop",
        decade: "00s",
        questions: [
          { type: "TRIVIA", text: "Which artist was this song originally offered to?", options: ["Kylie Minogue", "Madonna", "Janet Jackson", "Christina Aguilera"], correct: "Kylie Minogue", difficulty: "Hard", points: 2000 },
          { type: "GEAR", text: "The iconic high-pitched string sound is a sample from which country's cinema?", options: ["India (Bollywood)", "Japan", "Italy", "France"], correct: "India (Bollywood)", difficulty: "Extreme", points: 5000 }
        ]
    }
  ]
};