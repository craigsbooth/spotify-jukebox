export const API_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://jukebox.boldron.info/api'
  : 'http://localhost:8888';