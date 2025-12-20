require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8888;

app.use(express.json());
app.use(cors({ origin: true })); 

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

// --- PERSISTENCE ---
const TOKEN_FILE = 'tokens.json';
const SETTINGS_FILE = 'settings.json';

// DEFAULTS
let fallbackPlaylist = { id: '37i9dQZF1DX10zKzsJ2j87', name: 'Viva Latino' };
let currentTheme = 'none';
let partyName = "The Pinfold"; 

if (fs.existsSync(SETTINGS_FILE)) {
    try {
        const savedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE));
        if (savedSettings.fallbackPlaylist) fallbackPlaylist = savedSettings.fallbackPlaylist;
        if (savedSettings.currentTheme) currentTheme = savedSettings.currentTheme;
        if (savedSettings.partyName) partyName = savedSettings.partyName;
    } catch (e) { console.error("Error loading settings:", e); }
}

function saveSettings() {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ fallbackPlaylist, currentTheme, partyName }));
}

function saveTokens(access, refresh) {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: access, refresh_token: refresh }));
}

function loadTokens() {
    if (fs.existsSync(TOKEN_FILE)) {
        try {
            const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE));
            spotifyApi.setAccessToken(tokens.access_token);
            spotifyApi.setRefreshToken(tokens.refresh_token);
            return true;
        } catch (e) { console.error("Error loading tokens:", e); }
    }
    return false;
}

function startTokenRefresh() {
    setInterval(() => {
        spotifyApi.refreshAccessToken().then(data => {
            const newAccess = data.body['access_token'];
            const newRefresh = data.body['refresh_token'] || spotifyApi.getRefreshToken();
            spotifyApi.setAccessToken(newAccess);
            if(data.body['refresh_token']) spotifyApi.setRefreshToken(newRefresh);
            saveTokens(newAccess, newRefresh);
        }).catch(err => console.error("❌ Auto-Refresh Failed:", err));
    }, 1000 * 60 * 45); 
}

if (loadTokens()) {
    spotifyApi.refreshAccessToken().then(data => {
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log("✅ Session restored!");
        startTokenRefresh();
    }).catch(() => console.log("⚠️ Token expired."));
}

// --- MEMORY ---
let partyQueue = []; 
let currentPlayingTrack = null; 
let guestNames = {}; 
let latestJoiner = null;

// NEW: Store reaction with an ID (Timestamp)
let reactionEvent = { id: 0, emoji: null }; 

// --- ROUTES ---

// 1. REACTION SYSTEM (FIXED)
app.post('/react', (req, res) => {
    const { emoji } = req.body;
    if (emoji) {
        // Assign a unique ID (Date.now) so the client knows it's new
        reactionEvent = { id: Date.now(), emoji };
    }
    res.json({ success: true });
});

app.get('/reaction-event', (req, res) => res.json(reactionEvent));

// 2. NAME & SETTINGS
app.get('/name', (req, res) => res.json({ name: partyName }));
app.post('/name', (req, res) => {
    partyName = req.body.name || "The Pinfold";
    saveSettings(); 
    res.json({ success: true, name: partyName });
});

app.post('/remove', (req, res) => {
    const { uri } = req.body;
    partyQueue = partyQueue.filter(track => track.uri !== uri);
    res.json({ success: true, queue: partyQueue });
});

app.post('/reorder', (req, res) => {
    const { queue } = req.body;
    if (Array.isArray(queue)) partyQueue = queue;
    res.json({ success: true });
});

app.post('/join', (req, res) => {
    const { guestId, name } = req.body;
    if (guestId && name) {
        guestNames[guestId] = name;
        latestJoiner = name; 
        setTimeout(() => { if(latestJoiner === name) latestJoiner = null; }, 5000);
    }
    res.json({ success: true });
});

app.get('/join-event', (req, res) => res.json({ name: latestJoiner }));

app.get('/theme', (req, res) => res.json({ theme: currentTheme }));
app.post('/theme', (req, res) => {
    currentTheme = req.body.theme;
    saveSettings(); 
    res.json({ success: true });
});

app.get('/current', (req, res) => res.json(currentPlayingTrack));

app.get('/login', (req, res) => {
  const scopes = ['streaming', 'user-read-email', 'user-read-private', 'user-modify-playback-state', 'playlist-read-private', 'playlist-read-collaborative'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (req, res) => {
  const code = req.query.code;
  if (!code) return res.send(`Error: No code provided`);
  spotifyApi.authorizationCodeGrant(code).then(data => {
    const access = data.body['access_token'];
    const refresh = data.body['refresh_token'];
    spotifyApi.setAccessToken(access);
    spotifyApi.setRefreshToken(refresh);
    saveTokens(access, refresh);
    startTokenRefresh();
    res.send('Login Successful! You can close this tab.');
  }).catch(err => res.send(`Login Error: ${err}`));
});

app.get('/token', (req, res) => res.json({ access_token: spotifyApi.getAccessToken() }));

app.get('/search', async (req, res) => {
  if (!req.query.q) return res.json([]);
  try {
    const data = await spotifyApi.searchTracks(req.query.q);
    res.json(data.body.tracks.items.map(t => ({
      name: t.name, artist: t.artists[0].name, uri: t.uri, albumArt: t.album.images[0]?.url, id: t.id
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/search-playlists', async (req, res) => {
    if (!req.query.q) return res.json([]);
    try {
      const data = await spotifyApi.searchPlaylists(req.query.q);
      const cleanPlaylists = data.body.playlists.items
        .filter(p => p !== null) 
        .map(p => ({
            id: p.id, name: p.name, 
            image: (p.images && p.images.length > 0) ? p.images[0].url : 'https://placehold.co/150', 
            owner: p.owner ? p.owner.display_name : 'Unknown', total: p.tracks ? p.tracks.total : 0
        }));
      res.json(cleanPlaylists);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/queue', (req, res) => res.json(partyQueue));

app.post('/queue', (req, res) => {
  const { uri, name, artist, albumArt, guestId } = req.body; 
  if (!guestId) return res.status(400).json({ error: "No Guest ID" });
  
  const existingIndex = partyQueue.findIndex(t => t.uri === uri);
  if (existingIndex !== -1) {
    const song = partyQueue[existingIndex];
    if (song.addedBy === guestId) return res.json({ success: false, message: "You added this song!" });
    if (song.votedBy.includes(guestId)) return res.json({ success: false, message: "You already voted!" });

    partyQueue[existingIndex].votes += 1;
    partyQueue[existingIndex].votedBy.push(guestId);
    partyQueue.sort((a, b) => b.votes - a.votes);
    return res.json({ success: true, message: "Upvoted!" });
  } else {
    const realName = guestNames[guestId] || "Guest";
    partyQueue.push({ 
        uri, name, artist, albumArt, 
        votes: 1, addedBy: realName, 
        votedBy: [guestId] 
    });
    partyQueue.sort((a, b) => b.votes - a.votes);
    return res.json({ success: true, message: "Song Added!" });
  }
});

app.get('/fallback', (req, res) => res.json(fallbackPlaylist));

app.post('/fallback', (req, res) => {
    fallbackPlaylist = { id: req.body.id, name: req.body.name };
    saveSettings(); 
    res.json({ success: true });
});

app.post('/pop', async (req, res) => {
  if (partyQueue.length > 0) {
    const nextTrack = partyQueue.shift();
    // Save duration for progress bar
    currentPlayingTrack = { ...nextTrack, startedAt: Date.now(), duration: 180000 }; // Default 3 mins if fetch fails
    
    // Attempt to get real duration
    try {
        const info = await spotifyApi.getTrack(nextTrack.uri.split(':')[2]);
        currentPlayingTrack.duration = info.body.duration_ms;
    } catch(e) { }

    return res.json(currentPlayingTrack);
  }
  
  try {
    const trackData = await spotifyApi.getPlaylistTracks(fallbackPlaylist.id, { limit: 50, offset: 0, market: 'from_token' });
    const items = trackData.body.items;
    if (!items || items.length === 0) throw new Error("Playlist appears empty");
    const validItems = items.filter(i => i.track && i.track.uri);
    if (validItems.length === 0) throw new Error("No playable tracks found");

    const randomIdx = Math.floor(Math.random() * validItems.length);
    const item = validItems[randomIdx];

    const fallbackTrack = { 
        uri: item.track.uri, 
        name: item.track.name, 
        artist: item.track.artists[0].name, 
        albumArt: item.track.album.images[0]?.url,
        startedAt: Date.now(),
        duration: item.track.duration_ms 
    };
    currentPlayingTrack = fallbackTrack; 
    res.json(fallbackTrack);

  } catch (err) {
    res.json({ uri: null });
  }
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));