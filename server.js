require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8888;

const isTest = process.env.NODE_ENV === 'test';

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
let crossfadeSec = 8; 
let partyQueue = []; 
let currentPlayingTrack = null; 
let guestNames = {}; 
let latestJoiner = null;
let reactionEvent = { id: 0, emoji: null }; 

// DJ & Metadata State Object
let isDjMode = false;
let djStatus = { 
    message: "DJ Idle", 
    bpm: null, 
    key: null, 
    scale: null, 
    mood: null, 
    year: null,
    label: "Loading...", 
    singleArtwork: null,
    albumArtwork: null,
    source: 'none',
    // New Advanced Metadata
    valence: null,
    danceability: null,
    acousticness: null,
    instrumentalness: null,
    speechiness: null,
    popularity: null,
    lineup: null,
    location: null,
    genres: [],
    timbre: null
}; 

// --- SMART SHUFFLE ENGINE STATE ---
let shuffleBag = []; 
let playedHistory = new Set(); 

// Load Settings
if (fs.existsSync(SETTINGS_FILE)) {
    try {
        const savedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE));
        if (savedSettings.fallbackPlaylist) fallbackPlaylist = savedSettings.fallbackPlaylist;
        if (savedSettings.currentTheme) currentTheme = savedSettings.currentTheme;
        if (savedSettings.partyName) partyName = savedSettings.partyName;
        if (savedSettings.showLyrics !== undefined) showLyrics = savedSettings.showLyrics;
        if (savedSettings.showDebug !== undefined) showDebug = savedSettings.showDebug;
        if (savedSettings.crossfadeSec !== undefined) crossfadeSec = savedSettings.crossfadeSec;
    } catch (e) { console.error("Error loading settings:", e); }
}

function saveSettings() {
    if (isTest) return; 
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ fallbackPlaylist, currentTheme, partyName, showLyrics, showDebug, crossfadeSec }));
}

function saveTokens(access, refresh) {
    if (isTest) return;
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function refreshShuffleBag() {
    if (isTest) return; 
    if (!spotifyApi.getAccessToken()) return;
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
                .filter(i => i && i.track && i.track.uri)
                .map(i => ({
                    uri: i.track.uri,
                    name: i.track.name,
                    artist: i.track.artists[0].name,
                    album: i.track.album.name,
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
        console.log(`✅ ${shuffleBag.length} tracks loaded.`);
    } catch (err) {
        console.error("❌ Full Playlist Load Failed:", err.message);
    }
}

// --- INTELLIGENT BPM & DATA FALLBACK ---

function cleanTitleForSearch(title) {
    return title.split(' - ')[0].split(' (')[0].split(' [')[0].replace(/remastered|version|radio edit|live/gi, '').trim();
}

async function fetchExternalMetadata(artist, title) {
    const cleanTitle = cleanTitleForSearch(title);
    const headers = { 'User-Agent': 'boldron-jukebox/4.0 ( craigbooth@outlook.com )' };

    try {
        // Updated MusicBrainz query to include relations for Lineup and Place/Studio
        const query = encodeURIComponent(`artist:"${artist}" AND recording:"${cleanTitle}"`);
        const searchUrl = `https://musicbrainz.org/ws/2/recording/?query=${query}&fmt=json&inc=releases+artist-rels+place-rels+tags`;
        
        const searchRes = await fetch(searchUrl, { headers });
        if (!searchRes.ok) return null;
        const searchData = await searchRes.json();
        if (!searchData.recordings || searchData.recordings.length === 0) return null;

        const recording = searchData.recordings[0];
        const mbid = recording.id;
        const releaseYear = recording['first-release-date'] ? recording['first-release-date'].split('-')[0] : null;

        // Extract Member Lineup
        const lineup = recording.relations?.filter(r => r['target-type'] === 'artist').map(r => `${r.artist.name} (${r.type})`).join(', ') || null;
        
        // Extract Studio/Location
        const location = recording.relations?.find(r => r['target-type'] === 'place')?.place?.name || null;

        // Extract Detailed Genres/Tags
        const genres = recording.tags?.sort((a, b) => b.count - a.count).slice(0, 3).map(t => t.name) || [];

        // Fetch deep technical data from AcousticBrainz
        const abUrl = `https://acousticbrainz.org/api/v1/${mbid}/low-level`;
        const abRes = await fetch(abUrl);
        let technical = { timbre: null };

        if (abRes.ok) {
            try {
                const abData = await abRes.json();
                technical.timbre = abData.low_level?.average_loudness > 0.5 ? "Bright / Compressed" : "Dynamic / Warm";
                technical.bpm = Math.round(abData.rhythm?.bpm || 0);
                technical.key = abData.tonal?.key_key;
                technical.scale = abData.tonal?.key_scale;
                technical.mood = (abData.tonal?.key_scale === 'major' && (abData.rhythm?.bpm || 0) > 110) ? 'Happy' : 
                                (abData.tonal?.key_scale === 'minor' && (abData.rhythm?.bpm || 0) < 100) ? 'Chill' : 'Energetic';
            } catch (e) { }
        }
        
        return { 
            bpm: technical.bpm || parseInt(recording.bpm) || null, 
            year: releaseYear, 
            lineup, 
            location, 
            genres, 
            timbre: technical.timbre,
            key: technical.key,
            scale: technical.scale,
            mood: technical.mood
        };

    } catch (e) { console.error("External DB fetch error:", e.message); }
    return null;
}

async function analyzeTrack(track) {
    try {
        const trackId = track.uri.split(':').pop();
        console.log(`📡 Analyzing: ${track.name} by ${track.artist}`);
        
        // --- 1. CORE DATA & LABEL (SEQUENTIAL FETCH FOR AWS STABILITY) ---
        const fullTrack = await spotifyApi.getTrack(trackId);
        const features = await spotifyApi.getAudioFeaturesForTrack(trackId);
        
        // Label logic fix: fetch direct from Spotify Album API
        let finalLabel = "Independent";
        try {
            const albumDetails = await spotifyApi.getAlbum(fullTrack.body.album.id);
            finalLabel = albumDetails.body.label || "Independent";
            console.log(`🏷️ Label Verified: ${finalLabel}`);
        } catch (e) { console.error("Spotify Label Lookup Failed"); }

        // --- 2. FORCED ARTWORK ---
        let albumArt = fullTrack.body.album.images[0]?.url;
        let singleArt = albumArt;
        try {
            const searchAlt = await spotifyApi.searchTracks(`track:${track.name} artist:${track.artist}`, { limit: 5 });
            const singleEntry = searchAlt.body.tracks.items.find(t => t.album.album_type === 'single' || t.album.album_type === 'ep');
            if (singleEntry) singleArt = singleEntry.album.images[0]?.url;
        } catch (e) { }

        // --- 3. EXTERNAL INTEL ---
        const meta = await fetchExternalMetadata(track.artist, track.name);

        if (features && features.body && features.body.tempo) {
            djStatus = { 
                message: `Playing: ${track.name}`, 
                bpm: Math.round(features.body.tempo), 
                key: ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"][features.body.key] || "C", 
                scale: features.body.mode === 1 ? "major" : "minor", 
                mood: meta?.mood || 'Spotify Live',
                year: fullTrack.body.album.release_date.split('-')[0] || meta?.year,
                label: finalLabel, 
                singleArtwork: singleArt,
                albumArtwork: albumArt,
                source: 'spotify+deep',
                valence: Math.round(features.body.valence * 100),
                danceability: Math.round(features.body.danceability * 100),
                acousticness: Math.round(features.body.acousticness * 100),
                instrumentalness: Math.round(features.body.instrumentalness * 100),
                speechiness: Math.round(features.body.speechiness * 100),
                popularity: fullTrack.body.popularity,
                lineup: meta?.lineup,
                location: meta?.location,
                genres: meta?.genres || [],
                timbre: meta?.timbre
            };
            console.log("✅ Analysis State Populated Successfully");
            return true;
        }
    } catch (e) {
        console.error(`❌ Metadata Error for ${track.name}:`, e.message);
    }
    return false;
}

// --- ROUTES ---

app.get('/theme', (req, res) => res.json({ theme: currentTheme, showLyrics, showDebug, crossfadeSec }));
app.post('/theme', (req, res) => {
    if (req.body.theme !== undefined) currentTheme = req.body.theme;
    if (req.body.showLyrics !== undefined) showLyrics = req.body.showLyrics;
    if (req.body.showDebug !== undefined) showDebug = req.body.showDebug;
    if (req.body.crossfadeSec !== undefined) crossfadeSec = req.body.crossfadeSec;
    saveSettings(); 
    res.json({ success: true });
});

app.post('/reaction-event', (req, res) => {
    if (req.body.emoji) reactionEvent = { id: Date.now(), emoji: req.body.emoji };
    res.json(reactionEvent);
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
    if (Array.isArray(queue)) partyQueue = queue.filter(t => !t.isFallback);
    res.json({ success: true });
});

app.post('/shuffle', async (req, res) => {
    await refreshShuffleBag();
    res.json({ success: true, count: shuffleBag.length });
});

app.post('/join', (req, res) => {
    if (req.body.guestId && req.body.name) {
        guestNames[req.body.guestId] = req.body.name;
        latestJoiner = req.body.name; 
        setTimeout(() => { latestJoiner = null; }, 5000);
    }
    res.json({ success: true });
});

app.get('/join-event', (req, res) => res.json({ name: latestJoiner }));
app.get('/current', (req, res) => res.json(currentPlayingTrack));
app.get('/token', (req, res) => res.json({ access_token: spotifyApi.getAccessToken() }));

app.get('/queue', (req, res) => {
    const buffer = (shuffleBag || []).filter(t => !playedHistory.has(t.uri)).slice(0, 10);
    res.json([...partyQueue, ...buffer]);
});

app.post('/queue', (req, res) => {
    const { uri, name, artist, albumArt, album, guestId } = req.body;
    if (!guestId) return res.status(400).json({ error: "No Guest ID" });
    const existingIndex = partyQueue.findIndex(t => t.uri === uri);
    if (existingIndex !== -1) {
        if (partyQueue[existingIndex].votedBy.includes(guestId)) return res.json({ success: false, message: "Already voted!" });
        partyQueue[existingIndex].votes += 1;
        partyQueue[existingIndex].votedBy.push(guestId);
        partyQueue.sort((a, b) => b.votes - a.votes);
        return res.json({ success: true, message: "Upvoted!" });
    } else {
        partyQueue.push({ uri, name, artist, albumArt, album, votes: 1, addedBy: guestNames[guestId] || "Guest", votedBy: [guestId], isFallback: false });
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
        res.json(data.body.tracks.items.map(t => ({ name: t.name, artist: t.artists[0].name, album: t.album.name, uri: t.uri, albumArt: t.album.images[0]?.url, id: t.id })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/search-playlists', async (req, res) => {
    try {
        const data = await spotifyApi.searchPlaylists(req.query.q);
        res.json(data.body.playlists.items.filter(p => p).map(p => ({ id: p.id, name: p.name, image: p.images[0]?.url, total: p.tracks.total })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- DIGITAL DJ ENGINE ---

app.post('/dj-mode', (req, res) => {
    if (req.body.enabled !== undefined) isDjMode = req.body.enabled;
    res.json({ success: true, isDjMode });
});

app.get('/dj-status', (req, res) => res.json({ ...djStatus, isDjMode, crossfadeSec }));

app.post('/pop', async (req, res) => {
    let nextTrack;
    if (partyQueue.length > 0) {
        nextTrack = partyQueue.shift();
    } else {
        let available = shuffleBag.filter(t => !playedHistory.has(t.uri));
        if (available.length === 0) { await refreshShuffleBag(); available = shuffleBag; }
        nextTrack = available[0];
        playedHistory.add(nextTrack.uri);
    }
    // Fire analysis before returning track to dashboard
    await analyzeTrack(nextTrack);
    currentPlayingTrack = { ...nextTrack, startedAt: Date.now() };
    res.json(currentPlayingTrack);
});

if (!isTest) {
    setInterval(async () => {
        if (!isDjMode || !currentPlayingTrack) return;
        const elapsed = Date.now() - currentPlayingTrack.startedAt;
        const remaining = currentPlayingTrack.duration - elapsed;

        if (remaining <= (crossfadeSec * 1000) && !djStatus.message.includes("Mixing")) {
            djStatus.message = "🎧 DJ: Mixing now!";
            try {
                const popRes = await fetch(`http://localhost:${port}/pop`, { method: 'POST' });
                const nextData = await popRes.json();
                await spotifyApi.play({ uris: [nextData.uri] });
                setTimeout(() => { djStatus.message = `✅ Mixed into ${nextData.name}`; }, 1500);
            } catch (e) { djStatus.message = "DJ Error - Auto-mix failed"; }
        }
    }, 1000);
}

// --- AUTH ---

app.get('/login', (req, res) => {
  const scopes = ['streaming', 'user-read-email', 'user-read-private', 'user-read-playback-state', 'user-modify-playback-state', 'playlist-read-private', 'playlist-read-collaborative'];
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

function startTokenRefresh() {
    setInterval(() => {
        spotifyApi.refreshAccessToken().then(data => {
            const newAccess = data.body['access_token'];
            spotifyApi.setAccessToken(newAccess);
            saveTokens(newAccess, spotifyApi.getRefreshToken());
            console.log("🔄 Spotify Token Refreshed (30m Interval)");
        }).catch(err => console.error("❌ Refresh Failed:", err));
    }, 1000 * 60 * 30); // 30 Minute Interval restored
}

if (!isTest && loadTokens()) {
    spotifyApi.refreshAccessToken().then(data => {
        spotifyApi.setAccessToken(data.body['access_token']);
        startTokenRefresh();
        refreshShuffleBag(); 
    }).catch(() => console.log("⚠️ Token expired."));
}

if (require.main === module) {
    app.listen(port, () => console.log(`🚀 Jukebox Backend is live on port ${port}`));
}

module.exports = app;