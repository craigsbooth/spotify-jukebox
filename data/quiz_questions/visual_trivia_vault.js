module.exports = {
  tracks: [
    {
      name: "The Dark Side of the Moon",
      artist: "Pink Floyd",
      questions: [
        { 
          type: "PICTURE", 
          text: "Identify this iconic album cover from the refracted light prism.", 
          imagePath: "/assets/images/quiz/floyd_prism.jpg",
          options: ["Dark Side of the Moon", "The Wall", "Meddle", "Animals"], 
          correct: "Dark Side of the Moon", 
          difficulty: "Easy", 
          points: 500 
        }
      ]
    },
    {
      name: "Abbey Road",
      artist: "The Beatles",
      questions: [
        { 
          type: "PICTURE_DETAIL", 
          text: "In this zoomed-in detail of the Abbey Road cover, which Beatle is walking barefoot?", 
          imagePath: "/assets/images/quiz/beatles_feet.jpg",
          options: ["Paul McCartney", "John Lennon", "George Harrison", "Ringo Starr"], 
          correct: "Paul McCartney", 
          difficulty: "Medium", 
          points: 1000 
        }
      ]
    },
    {
      name: "Ziggy Stardust",
      artist: "David Bowie",
      questions: [
        {
          type: "PICTURE_SILHOUETTE",
          text: "Identify the artist from this legendary 'lightning bolt' face-paint silhouette.",
          imagePath: "/assets/images/quiz/bowie_bolt.jpg",
          options: ["David Bowie", "Prince", "Mick Jagger", "Boy George"],
          correct: "David Bowie", 
          difficulty: "Easy", 
          points: 500
        }
      ]
    },
    {
      name: "30",
      artist: "Adele",
      questions: [
        {
          type: "PICTURE",
          text: "This monochromatic profile became the best-selling album of its year. Name the artist.",
          imagePath: "/assets/images/quiz/adele_30.jpg",
          options: ["Adele", "Amy Winehouse", "Lana Del Rey", "Sia"],
          correct: "Adele",
          difficulty: "Easy",
          points: 500
        }
      ]
    }
  ]
};