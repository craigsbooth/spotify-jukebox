// routes/system.js - Modular Jukebox Engine
const express = require('express');
const router = express.Router();
const state = require('../state');
const sm = require('../state_manager');
const spotifyApi = require('../spotify_instance');
const spotifyCtrl = require('../spotify_ctrl');

// --- 1. AUTH & TOKEN ACCESS ---
// Frontend calls: https://jukebox.boldron.info/api/system/token
router.get('/token', (req, res) => {
    const token = spotifyApi.getAccessToken();
    res.json({ access_token: token || null });
});

// --- 2. DJ ENGINE CONTROL ---
router.post('/dj-mode', (req, res) => {
    const result = sm.setDjMode(req.body.enabled);
    res.json(result);
});

router.get('/dj-status', (req, res) => {
    res.json({ 
        ...state.djStatus,
        isDjMode: state.isDjMode, 
        crossfadeSec: state.crossfadeSec 
    });
});

// --- 3. THEME & SETTINGS ---
router.get('/theme', (req, res) => {
    res.json({ 
        theme: state.currentTheme, 
        showLyrics: state.showLyrics,
        crossfadeSec: state.crossfadeSec 
    });
});

router.post('/theme', (req, res) => {
    if (req.body.crossfadeSec !== undefined) {
        return res.json(sm.setCrossfade(req.body.crossfadeSec));
    }
    res.json(sm.setTheme(req.body.theme));
});

// --- 4. LYRICS DATA PROXY ---
router.get('/lyrics', async (req, res) => {
    const { track, artist } = req.query;
    if (!track || !artist) return res.status(400).json({ error: "Missing track or artist info" });
    try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        res.json({ 
            syncedLyrics: data.syncedLyrics || null, 
            plainLyrics: data.plainLyrics || "Lyrics not found." 
        });
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch lyrics" });
    }
});

// --- 5. PARTY IDENTITY & GUESTS ---
router.get('/name', (req, res) => res.json({ name: state.partyName }));

router.post('/name', (req, res) => {
    state.partyName = req.body.name || "The Pinfold";
    sm.saveSettings();
    res.json({ success: true });
});

router.post('/join', (req, res) => {
    if (req.body.guestId && req.body.name) {
        sm.registerGuest(req.body.guestId, req.body.name);
    }
    res.json({ success: true });
});

router.get('/join-event', (req, res) => res.json({ name: state.latestJoiner }));

// --- 6. REACTIONS ---
router.post('/reaction-event', (req, res) => {
    if (req.body.emoji) state.reactionEvent = { id: Date.now(), emoji: req.body.emoji };
    res.json(state.reactionEvent);
});

router.get('/reaction-event', (req, res) => res.json(state.reactionEvent));

// --- 7. SEARCH & FALLBACK POOL ---
router.get('/search', async (req, res) => {
    try {
        const results = await spotifyCtrl.searchTracks(req.query.q); 
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: "Search failed" });
    }
});

router.get('/search-playlists', async (req, res) => {
    try {
        const data = await spotifyApi.searchPlaylists(req.query.q);
        res.json(data.body.playlists.items.filter(p => p).map(p => ({ 
            id: p.id, name: p.name, image: p.images[0]?.url, total: p.tracks.total 
        })));
    } catch (e) { 
        res.status(500).json({ error: "Playlist search failed" }); 
    }
});

router.get('/fallback', (req, res) => res.json(state.fallbackPlaylist));

router.post('/fallback', async (req, res) => {
    try {
        if (req.body.id === 'refresh') {
            console.log(`♻️ System: Manual Refresh triggered for ${state.fallbackPlaylist.name}`);
        } else {
            console.log(`📡 System: Changing Fallback to ${req.body.name} (${req.body.id})`);
            state.fallbackPlaylist = { id: req.body.id, name: req.body.name };
            sm.saveSettings();
        }
        const count = await spotifyCtrl.refreshShuffleBag();
        res.json({ success: true, count });
    } catch (e) {
        console.error("❌ System: Fallback Refresh Crash:", e.message);
        res.status(500).json({ error: "Fallback update failed" });
    }
});

module.exports = router;