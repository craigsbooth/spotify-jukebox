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

const TOKEN_FILE = 'tokens.json';
const SETTINGS_FILE = 'settings.json';

// --- STATE MANAGEMENT ---
let fallbackPlaylist = { id: '37i9dQZF1DX10zKzsJ2j87', name: 'Viva Latino' };
let currentTheme = 'standard';
let partyName = "The Pinfold"; 
let showLyrics = false; 
let showDebug = false;
let partyQueue = []; 
let currentPlayingTrack = null; 
let guestNames = {}; 
let latestJoiner = null;
let reactionEvent = { id: 0, emoji: null }; 

// --- SMART SHUFFLE ENGINE STATE ---
let shuffleBag = []; // The randomized pool of all tracks
let playedHistory = new Set(); // Tracks already played in the current cycle

// Load Settings
if (fs.existsSync(SETTINGS_FILE)) {
    try {
        const savedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE));
        if (savedSettings.fallbackPlaylist) fallbackPlaylist = savedSettings.fallbackPlaylist;
        if (savedSettings.currentTheme) currentTheme = savedSettings.currentTheme;
        if (savedSettings.partyName) partyName = savedSettings.partyName;
        if (savedSettings.showLyrics !== undefined) showLyrics = savedSettings.showLyrics;
        if (savedSettings.showDebug !== undefined) showDebug = savedSettings.showDebug;
    } catch (e) { console.error("Error loading settings:", e); }
}

function saveSettings() {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ fallbackPlaylist, currentTheme, partyName, showLyrics, showDebug }));
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

// Fisher-Yates Shuffle Utility
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Initializing the Shuffle Bag (Fetches ENTIRE Playlist & Album Names)
async function refreshShuffleBag() {
    console.log(`♻️ Rebuilding Full Shuffle Bag for: ${fallbackPlaylist.name}`);
    try {
        let allTracks = [];
        let offset = 0;
        let limit = 100;
        let total = 1;

        while (offset < total) {
            const data = await spotifyApi.getPlaylistTracks(fallbackPlaylist.id, { offset, limit });
            const items = data.body.items;
            total = data.body.total;
            
            const batch = items
                .filter(i => i.track && i.track.uri)
                .map(i => ({
                    uri: i.track.uri,
                    name: i.track.name,
                    artist: i.track.artists[0].name,
                    album: i.track.album.name, // NEW: Include Album Name
                    albumArt: i.track.album.images[0]?.url,
                    duration: i.track.duration_ms,
                    isFallback: true,
                    votes: 0
                }));
            
            allTracks = [...allTracks, ...batch];
            offset += limit;
        }

        shuffleBag = shuffleArray(allTracks);
        playedHistory.clear();
        console.log(`✅ ${shuffleBag.length} tracks loaded (with album names). Shuffle Bag is fresh.`);
    } catch (err) {
        console.error("❌ Full Playlist Load Failed:", err.message);
    }
}

function startTokenRefresh() {
    setInterval(() => {
        spotifyApi.refreshAccessToken().then(data => {
            const newAccess = data.body['access_token'];
            spotifyApi.setAccessToken(newAccess);
            saveTokens(newAccess, spotifyApi.getRefreshToken());
        }).catch(err => console.error("❌ Refresh Failed:", err));
    }, 1000 * 60 * 45); 
}

if (loadTokens()) {
    spotifyApi.refreshAccessToken().then(data => {
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log("✅ Session restored!");
        startTokenRefresh();
        refreshShuffleBag(); 
    }).catch(() => console.log("⚠️ Token expired."));
}

// --- ROUTES ---

app.get('/theme', (req, res) => res.json({ theme: currentTheme, showLyrics, showDebug }));
app.post('/theme', (req, res) => {
    if (req.body.theme !== undefined) currentTheme = req.body.theme;
    if (req.body.showLyrics !== undefined) showLyrics = req.body.showLyrics;
    if (req.body.showDebug !== undefined) showDebug = req.body.showDebug;
    saveSettings(); 
    res.json({ success: true });
});

app.post('/react', (req, res) => {
    if (req.body.emoji) reactionEvent = { id: Date.now(), emoji: req.body.emoji };
    res.json({ success: true });
});
app.get('/reaction-event', (req, res) => res.json(reactionEvent));

app.get('/name', (req, res) => res.json({ name: partyName }));
app.post('/name', (req, res) => {
    partyName = req.body.name || "The Pinfold";
    saveSettings(); 
    res.json({ success: true });
});

app.post('/remove', (req, res) => {
    partyQueue = partyQueue.filter(track => track.uri !== req.body.uri);
    res.json({ success: true });
});

app.post('/reorder', (req, res) => {
    const { queue } = req.body;
    if (Array.isArray(queue)) {
        partyQueue = queue.filter(t => !t.isFallback);
        console.log("🛠️ Host Manual Priority Saved.");
    }
    res.json({ success: true });
});

app.post('/shuffle', async (req, res) => {
    await refreshShuffleBag();
    res.json({ success: true, count: shuffleBag.length });
});

app.post('/join', (req, res) => {
    const { guestId, name } = req.body;
    if (guestId && name) {
        guestNames[guestId] = name;
        latestJoiner = name; 
        setTimeout(() => { latestJoiner = null; }, 5000);
    }
    res.json({ success: true });
});

app.get('/join-event', (req, res) => res.json({ name: latestJoiner }));
app.get('/current', (req, res) => res.json(currentPlayingTrack));
app.get('/token', (req, res) => res.json({ access_token: spotifyApi.getAccessToken() }));

// --- QUEUE LOGIC (Smart Buffer Selection for Carousel) ---
app.get('/queue', (req, res) => {
    const guestTracks = partyQueue; 
    
    // Select the next 10 tracks from the shuffle bag to support Coverflow depth
    const buffer = shuffleBag
        .filter(t => !playedHistory.has(t.uri))
        .slice(0, 10);

    res.json([...guestTracks, ...buffer]);
});

app.post('/queue', (req, res) => {
    const { uri, name, artist, albumArt, album, guestId } = req.body;
    if (!guestId) return res.status(400).json({ error: "No Guest ID" });

    const existingIndex = partyQueue.findIndex(t => t.uri === uri);
    if (existingIndex !== -1) {
        const song = partyQueue[existingIndex];
        if (song.votedBy.includes(guestId)) return res.json({ success: false, message: "Already voted!" });
        partyQueue[existingIndex].votes += 1;
        partyQueue[existingIndex].votedBy.push(guestId);
        partyQueue.sort((a, b) => b.votes - a.votes);
        return res.json({ success: true, message: "Upvoted!" });
    } else {
        partyQueue.push({ 
            uri, name, artist, albumArt, album, // Added album
            votes: 1, addedBy: guestNames[guestId] || "Guest", 
            votedBy: [guestId], isFallback: false 
        });
        partyQueue.sort((a, b) => b.votes - a.votes);
        return res.json({ success: true, message: "Added!" });
    }
});

app.get('/fallback', (req, res) => res.json(fallbackPlaylist));
app.post('/fallback', async (req, res) => {
    fallbackPlaylist = { id: req.body.id, name: req.body.name };
    saveSettings(); 
    await refreshShuffleBag(); 
    res.json({ success: true });
});

app.get('/search', async (req, res) => {
    try {
        const data = await spotifyApi.searchTracks(req.query.q);
        res.json(data.body.tracks.items.map(t => ({
            name: t.name, artist: t.artists[0].name, album: t.album.name, uri: t.uri, albumArt: t.album.images[0]?.url, id: t.id
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/search-playlists', async (req, res) => {
    try {
        const data = await spotifyApi.searchPlaylists(req.query.q);
        res.json(data.body.playlists.items.filter(p => p).map(p => ({
            id: p.id, name: p.name, image: p.images[0]?.url, total: p.tracks.total
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/pop', async (req, res) => {
    if (partyQueue.length > 0) {
        const nextTrack = partyQueue.shift();
        currentPlayingTrack = { ...nextTrack, startedAt: Date.now() };
    } else {
        let available = shuffleBag.filter(t => !playedHistory.has(t.uri));
        if (available.length === 0) {
            await refreshShuffleBag(); 
            available = shuffleBag;
        }
        const fallbackTrack = available[0];
        playedHistory.add(fallbackTrack.uri);
        currentPlayingTrack = { ...fallbackTrack, startedAt: Date.now() };
    }
    res.json(currentPlayingTrack);
});

// Auth Routes
app.get('/login', (req, res) => {
  const scopes = ['streaming', 'user-read-email', 'user-read-private', 'user-modify-playback-state', 'playlist-read-private', 'playlist-read-collaborative'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (req, res) => {
  spotifyApi.authorizationCodeGrant(req.query.code).then(data => {
    saveTokens(data.body['access_token'], data.body['refresh_token']);
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);
    refreshShuffleBag();
    res.send('Login Successful!');
  });
});

app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));