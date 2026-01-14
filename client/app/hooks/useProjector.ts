import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { Track, LyricLine, Reaction } from '../projector/types';

// Helper for parsing lyrics (extracted from original page)
const parseLrcString = (lrcString: string): LyricLine[] => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const msDivisor = match[3].length === 2 ? 100 : 1000;
      const time = minutes * 60 + seconds + (milliseconds / msDivisor);
      const text = line.replace(timeRegex, '').trim();
      if (text) result.push({ time, text });
    }
  }
  return result;
};

export const useProjector = () => {
  const [partyName, setPartyName] = useState('The Pinfold');
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);
  const [karaokeQueue, setKaraokeQueue] = useState<any[]>([]);
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [lyricsDelayMs, setLyricsDelayMs] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  
  // FIX 1: Store the full track object to handle History transitions properly
  const prevTrackRef = useRef<Track | null>(null);

  const nextUpItem = (() => {
      if (isKaraokeMode) return karaokeQueue.length > 0 ? karaokeQueue[0] : null;
      if (!queue || queue.length === 0) return null;
      const first = queue[0];
      if (nowPlaying && first.uri === nowPlaying.uri) return queue.length > 1 ? queue[1] : null;
      return first;
  })();

  const handleSkip = async () => {
    const endpoint = isKaraokeMode ? 'pop-karaoke' : 'pop';
    try { await fetch(`${API_URL}/${endpoint}`, { method: 'POST' }); } catch (e) {}
  };

  useEffect(() => {
    // FIX 2: Initialize History from Local Storage (prevents loss on refresh)
    const savedHistory = localStorage.getItem('jukebox_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    }

    // Helper to process track updates and manage history
    const processTrackUpdate = (newTrack: Track | null) => {
        if (!newTrack) return;

        // If the track ID has changed since the last update...
        if (prevTrackRef.current && prevTrackRef.current.uri !== newTrack.uri) {
            // FIX 3: Add the *previous* track to history (not the current one)
            setHistory(prev => {
                const updated = [...prev, prevTrackRef.current!].slice(-5);
                localStorage.setItem('jukebox_history', JSON.stringify(updated));
                return updated;
            });
        }

        // Update the reference and state
        if (!prevTrackRef.current || prevTrackRef.current.uri !== newTrack.uri) {
            prevTrackRef.current = newTrack;
            setNowPlaying(newTrack);
        }
    };

    const fetchData = async () => {
        try {
            // Removed the invalid karaoke-queue GET call
            const [qRes, cRes, tRes, nRes] = await Promise.all([
                fetch(`${API_URL}/queue`),
                fetch(`${API_URL}/current`),
                fetch(`${API_URL}/theme`),
                fetch(`${API_URL}/name`)
            ]);
            
            setQueue(await qRes.json());
            
            const curr = await cRes.json();
            processTrackUpdate(curr); // Use the helper

            if (curr?.lyrics?.synced) {
                setSyncedLyrics(parseLrcString(curr.lyrics.synced));
            } else {
                setSyncedLyrics([]);
            }

            const themeData = await tRes.json();
            const nameData = await nRes.json();
            
            setIsKaraokeMode(!!themeData.isKaraokeMode);
            setYoutubeId(themeData.youtubeId || null);
            setShowLyrics(!!themeData.showLyrics);
            if (themeData.lyricsDelayMs !== undefined) setLyricsDelayMs(themeData.lyricsDelayMs);
            
            // Extract karaokeQueue from theme data instead of separate fetch
            setKaraokeQueue(themeData.karaokeQueue || []);
            
            if (nameData.name) setPartyName(nameData.name);
        } catch (e) { console.error("Fetch failed", e); }
    };
    
    fetchData();

    // FIX 4: Add Polling Heartbeat (5 seconds)
    // Ensures "Up Next" and "History" stay fresh even if a socket event is missed
    const pollInterval = setInterval(fetchData, 5000);

    const connectSSE = () => {
        if (eventSourceRef.current) eventSourceRef.current.close();
        const es = new EventSource(`${API_URL}/events`);
        eventSourceRef.current = es;

        es.onmessage = (e) => {
            try {
                const parsed = JSON.parse(e.data);
                const { type, payload } = parsed;
                
                if (type === 'INIT') {
                    if (payload.isKaraokeMode !== undefined) setIsKaraokeMode(payload.isKaraokeMode);
                    if (payload.youtubeId !== undefined) setYoutubeId(payload.youtubeId);
                    if (payload.karaokeQueue) setKaraokeQueue(payload.karaokeQueue);
                    if (payload.lyricsDelayMs !== undefined) setLyricsDelayMs(payload.lyricsDelayMs);
                    
                    if (payload.currentLyrics?.synced) {
                        setSyncedLyrics(parseLrcString(payload.currentLyrics.synced));
                    } else {
                        setSyncedLyrics([]);
                    }
                    if (payload.currentTrack) processTrackUpdate(payload.currentTrack);
                }

                if (type === 'QUEUE_UPDATE') setQueue(payload);
                if (type === 'NAME_UPDATE') setPartyName(payload.name);
                
                if (type === 'CURRENT_TRACK') {
                    const newTrack = payload;
                    processTrackUpdate(newTrack);
                    setSyncedLyrics([]);
                    setActiveLineIndex(-1);
                }
                
                if (type === 'THEME_UPDATE') {
                    if(payload.isKaraokeMode !== undefined) setIsKaraokeMode(payload.isKaraokeMode);
                    if(payload.youtubeId !== undefined) setYoutubeId(payload.youtubeId);
                    if(payload.showLyrics !== undefined) setShowLyrics(payload.showLyrics);
                    if(payload.lyricsDelayMs !== undefined) setLyricsDelayMs(payload.lyricsDelayMs);
                }
                
                if (type === 'KARAOKE_QUEUE') setKaraokeQueue(payload.karaokeQueue || []);
                if (type === 'REACTION') setActiveReactions(prev => [...prev, { id: payload.id, emoji: payload.emoji, left: Math.floor(Math.random() * 80) + 10 }]);

                if (type === 'LYRICS_UPDATE') {
                    const raw = payload.lyrics || payload; 
                    if (raw && raw.synced) {
                        setSyncedLyrics(parseLrcString(raw.synced));
                    } else {
                        setSyncedLyrics([]);
                    }
                }
            } catch (err) {}
        };
    };
    connectSSE();

    return () => {
        clearInterval(pollInterval);
        if(eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  useEffect(() => {
    const pInterval = setInterval(() => {
       const duration = nowPlaying?.duration_ms || nowPlaying?.duration;
       const start = nowPlaying?.startedAt;
       if(duration && start) {
           const el = Date.now() - start;
           setProgress(Math.min(100, (el / duration) * 100));
       } else {
           setProgress(0);
       }
    }, 1000);
    return () => clearInterval(pInterval);
  }, [nowPlaying]);

  useEffect(() => {
    if(!nowPlaying || typeof nowPlaying.startedAt !== 'number' || syncedLyrics.length === 0) return;
    const start = nowPlaying.startedAt; 

    const interval = setInterval(() => {
        const elapsedSec = (Date.now() - start - lyricsDelayMs) / 1000;
        let activeIdx = -1;
        for (let i = syncedLyrics.length - 1; i >= 0; i--) {
            if (syncedLyrics[i].time <= elapsedSec) {
                activeIdx = i;
                break;
            }
        }
        if(activeIdx !== activeLineIndex) {
            setActiveLineIndex(activeIdx);
        }
    }, 100);
    
    return () => clearInterval(interval);
  }, [nowPlaying, syncedLyrics, lyricsDelayMs]);

  useEffect(() => {
    const handleYoutubeMessage = (event: MessageEvent) => {
        if (event.origin !== "https://www.youtube.com") return;
        try {
            const data = JSON.parse(event.data);
            if (data.event === "infoDelivery" && data.info?.playerState === 0) handleSkip();
        } catch (e) {}
    };
    window.addEventListener("message", handleYoutubeMessage);
    return () => window.removeEventListener("message", handleYoutubeMessage);
  }, [isKaraokeMode]);

  return {
    partyName,
    queue,
    history,
    nowPlaying,
    karaokeQueue,
    isKaraokeMode,
    youtubeId,
    showLyrics,
    activeReactions,
    syncedLyrics,
    activeLineIndex,
    progress,
    lyricsDelayMs,
    nextUpItem,
    handleSkip,
    showUpNext: !!nextUpItem
  };
};