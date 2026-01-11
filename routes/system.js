// routes/system.js - Modular Jukebox Engine
const express = require('express');
const router = express.Router();
const state = require('../state');
const sm = require('../state_manager');
const spotifyApi = require('../spotify_instance');
const sse = require('../sse'); 
const spotifyCtrl = require('../spotify_ctrl'); 
const karaokeEngine = require('../karaoke_engine'); 
const karaokeManager = require('../karaoke_manager'); 

// --- REAL-TIME EVENT STREAM (SSE) ---
router.get('/events', (req, res) => {
    sse.addClient(req, res);
});

// --- 1. AUTH & TOKEN ACCESS ---
router.get('/token', (req, res) => {
    const token = spotifyApi.getAccessToken();
    res.json({ access_token: token || null });
});

// --- 2. DJ ENGINE CONTROL ---
router.post('/dj-mode', (req, res) => {
    const result = sm.setDjMode(req.body.enabled);
    sse.send('DJ_MODE', { isDjMode: state.isDjMode });
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
        crossfadeSec: state.crossfadeSec,
        youtubeId: state.youtubeId,
        isKaraokeMode: state.isKaraokeMode,
        karaokeQueue: state.karaokeQueue,
        karaokeAnnouncement: state.karaokeAnnouncement,
        tokensEnabled: state.tokensEnabled,
        tokensInitial: state.tokensInitial,
        tokensPerHour: state.tokensPerHour,
        tokensMax: state.tokensMax
    });
});

router.post('/theme', (req, res) => {
    const result = sm.setTheme(req.body);
    sse.send('THEME_UPDATE', { 
        theme: state.currentTheme,
        youtubeId: state.youtubeId,
        showLyrics: state.showLyrics,
        karaokeAnnouncement: state.karaokeAnnouncement,
        isKaraokeMode: state.isKaraokeMode 
    });
    res.json(result);
});

// --- 4. KARAOKE MODE CONTROL ---
router.post('/karaoke-mode', (req, res) => {
    const result = sm.setKaraokeMode(req.body.enabled);
    sse.send('KARAOKE_MODE', { isKaraokeMode: state.isKaraokeMode });
    res.json(result);
});

router.get('/search-karaoke', async (req, res) => {
    const results = await karaokeEngine.search(req.query.q);
    res.json(results);
});

router.get('/karaoke-suggestions', async (req, res) => {
    const results = await karaokeManager.getSuggestions(req.query.genre);
    res.json(results);
});

router.post('/karaoke-queue', (req, res) => {
    const { id, title, thumb, guestId, singer } = req.body;
    const result = sm.processKaraokeRequest({ id, title, thumb, singer }, guestId);
    sse.send('KARAOKE_QUEUE', { karaokeQueue: state.karaokeQueue });
    res.json(result);
});

// --- 5. ATOMIC POP LOGIC ---
router.post('/pop-karaoke', (req, res) => {
    const nextSinger = state.karaokeQueue[0];

    if (nextSinger) {
        console.log(`🎤 Server: Popping singer ${nextSinger.singer} (ID: ${nextSinger.id})`);
        state.youtubeId = nextSinger.id;
        state.karaokeQueue.shift();
        sm.saveSettings();
        sse.send('THEME_UPDATE', { youtubeId: state.youtubeId }); 
        sse.send('KARAOKE_QUEUE', { karaokeQueue: state.karaokeQueue });
        res.json({ success: true, youtubeId: state.youtubeId });
    } else {
        res.json({ success: false, message: "Queue empty" });
    }
});

router.post('/remove-karaoke', (req, res) => {
    const { index } = req.body;
    if (state.karaokeQueue[index]) {
        state.karaokeQueue.splice(index, 1);
        sm.saveSettings();
    }
    sse.send('KARAOKE_QUEUE', { karaokeQueue: state.karaokeQueue });
    res.json({ success: true });
});

// --- 6. LYRICS DATA PROXY ---
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

// --- 7. PARTY IDENTITY & GUESTS ---
router.get('/name', (req, res) => res.json({ name: state.partyName }));

router.post('/name', (req, res) => {
    state.partyName = req.body.name || "The Pinfold";
    sm.saveSettings();
    res.json({ success: true });
});

router.post('/join', (req, res) => {
    if (req.body.guestId && req.body.name) {
        sm.registerGuest(req.body.guestId, req.body.name);
        sm.saveSettings();
        const tokenInfo = sm.syncGuestTokens(req.body.guestId);
        return res.json({ success: true, tokens: tokenInfo?.balance || 0 });
    }
    res.json({ success: true });
});

router.get('/join-event', (req, res) => res.json({ name: state.latestJoiner }));

// --- 8. REACTIONS ---
router.post('/reaction-event', (req, res) => {
    if (req.body.emoji) state.reactionEvent = { id: Date.now(), emoji: req.body.emoji };
    sse.send('REACTION', state.reactionEvent);
    res.json(state.reactionEvent);
});

router.get('/reaction-event', (req, res) => res.json(state.reactionEvent));

// --- 9. SEARCH & FALLBACK POOL ---
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        if (state.isKaraokeMode) {
            const results = await karaokeEngine.search(`${query} karaoke`);
            const mapped = results.map(v => ({
                id: v.id,
                name: v.title,
                artist: 'YouTube Video',
                albumArt: v.thumb,
                isKaraoke: true,
                uri: `youtube:${v.id}`
            }));
            res.json(mapped);
        } else {
            const rawResults = await spotifyCtrl.searchTracks(query); 
            const sanitizedResults = rawResults.map(t => sm.sanitizeTrack(t));
            res.json(sanitizedResults);
        }
    } catch (e) {
        console.error("Search failed:", e);
        res.status(500).json({ error: "Search failed" });
    }
});

router.get('/search-playlists', async (req, res) => {
    try {
        const data = await spotifyApi.searchPlaylists(req.query.q);
        res.json(data.body.playlists.items.filter(p => p).map(p => {
            const sanitized = sm.sanitizeTrack({ name: p.name, artist: '' });
            return { 
                id: p.id, 
                name: p.name, 
                displayName: sanitized.displayName,
                image: p.images[0]?.url, 
                total: p.tracks.total 
            };
        }));
    } catch (e) { 
        res.status(500).json({ error: "Playlist search failed" }); 
    }
});

router.get('/fallback', (req, res) => res.json(state.fallbackPlaylist));

router.post('/fallback', async (req, res) => {
    try {
        if (req.body.id !== 'refresh') {
            state.fallbackPlaylist = { id: req.body.id, name: req.body.name };
            sm.saveSettings();
        }
        const count = await spotifyCtrl.refreshShuffleBag();
        res.json({ success: true, count });
    } catch (e) {
        res.status(500).json({ error: "Fallback update failed" });
    }
});

// --- 10. CURRENT TRACK ---
router.get('/current', (req, res) => {
    res.json(state.currentPlayingTrack || null);
});

// --- 11. TOKEN ECONOMY ---
router.get('/tokens', (req, res) => {
    const { guestId } = req.query;
    if (!guestId) return res.status(400).json({ error: "Missing guestId" });
    const info = sm.syncGuestTokens(guestId);
    if (!info) return res.status(404).json({ error: "Guest not found" });
    res.json({
        enabled: state.tokensEnabled,
        balance: info.balance,
        nextIn: info.nextIn,
        max: state.tokensMax
    });
});

// --- 12. LYRICS SYNC ---
router.post('/sync-offset', (req, res) => {
    const { offset } = req.body;
    if (offset !== undefined) {
        state.lyricsDelayMs = offset;
        sse.send('THEME_UPDATE', { lyricsDelayMs: state.lyricsDelayMs });
    }
    res.json({ success: true, offset: state.lyricsDelayMs });
});

module.exports = router;