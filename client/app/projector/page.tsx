'use client';
import { useState, useEffect, useRef } from 'react';
import { StandardView } from './StandardView';
import { MonitorView } from './MonitorView';
import { CarouselView } from './CarouselView';
import { Background } from './Background';
import { API_URL } from '../config';
import { styles, keyframes } from './styles';
import { Track, LyricLine, Reaction } from './types';

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

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

export default function ProjectorPage() {
  const [viewMode, setViewMode] = useState('standard');
  const [partyName, setPartyName] = useState('The Pinfold'); 
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);
  const [karaokeQueue, setKaraokeQueue] = useState<any[]>([]);
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  
  const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [progress, setProgress] = useState(0); 
  const [showUpNext, setShowUpNext] = useState(true);
  const [lyricsDelayMs, setLyricsDelayMs] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  
  // FIX 1: Use a Ref to hold the *full* current track object for history archival
  const nowPlayingRef = useRef<Track | null>(null);

  const nextUpItem = (() => {
      if (isKaraokeMode) return karaokeQueue.length > 0 ? karaokeQueue[0] : null;
      if (!queue || queue.length === 0) return null;
      const first = queue[0];
      if (nowPlaying && first.uri === nowPlaying.uri) return queue.length > 1 ? queue[1] : null;
      return first;
  })();

  useEffect(() => { setShowUpNext(!!nextUpItem); }, [nextUpItem]);

  const handleSkip = async () => {
    const endpoint = isKaraokeMode ? 'pop-karaoke' : 'pop';
    try { await fetch(`${API_URL}/${endpoint}`, { method: 'POST' }); } catch (e) {}
  };

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [qRes, cRes, tRes, kRes, nRes] = await Promise.all([
                fetch(`${API_URL}/queue`),
                fetch(`${API_URL}/current`),
                fetch(`${API_URL}/theme`),
                fetch(`${API_URL}/karaoke-queue`),
                fetch(`${API_URL}/name`)
            ]);
            
            setQueue(await qRes.json());
            const curr = await cRes.json();
            
            setNowPlaying(curr);
            // FIX 2: Initialize the ref, but DO NOT add current track to history yet
            nowPlayingRef.current = curr; 
            // Removed: if (curr?.name) setHistory([curr]);

            if (curr?.lyrics?.synced) {
                setSyncedLyrics(parseLrcString(curr.lyrics.synced));
            } else {
                setSyncedLyrics([]);
            }

            const themeData = await tRes.json();
            const nameData = await nRes.json();
            
            setViewMode(themeData.theme || 'standard');
            setIsKaraokeMode(!!themeData.isKaraokeMode);
            setYoutubeId(themeData.youtubeId || null);
            setShowLyrics(!!themeData.showLyrics);
            if (themeData.lyricsDelayMs !== undefined) setLyricsDelayMs(themeData.lyricsDelayMs);
            
            setKaraokeQueue(await kRes.json());
            if (nameData.name) setPartyName(nameData.name);
        } catch (e) { console.error("Fetch failed", e); }
    };
    fetchData();

    const connectSSE = () => {
        if (eventSourceRef.current) eventSourceRef.current.close();
        const es = new EventSource(`${API_URL}/events`);
        eventSourceRef.current = es;

        es.onmessage = (e) => {
            try {
                const parsed = JSON.parse(e.data);
                const { type, payload } = parsed;
                
                if (type === 'INIT') {
                    if (payload.theme) setViewMode(payload.theme);
                    if (payload.isKaraokeMode !== undefined) setIsKaraokeMode(payload.isKaraokeMode);
                    if (payload.youtubeId !== undefined) setYoutubeId(payload.youtubeId);
                    if (payload.karaokeQueue) setKaraokeQueue(payload.karaokeQueue);
                    if (payload.lyricsDelayMs !== undefined) setLyricsDelayMs(payload.lyricsDelayMs);
                    
                    if (payload.currentLyrics?.synced) {
                        setSyncedLyrics(parseLrcString(payload.currentLyrics.synced));
                    } else {
                        setSyncedLyrics([]);
                    }
                    if (payload.currentTrack) {
                        setNowPlaying(payload.currentTrack);
                        nowPlayingRef.current = payload.currentTrack;
                    }
                }

                if (type === 'QUEUE_UPDATE') setQueue(payload);
                if (type === 'NAME_UPDATE') setPartyName(payload.name);
                
                if (type === 'CURRENT_TRACK') {
                    const newTrack = payload;
                    
                    // FIX 3: Detect change using Ref, archive OLD track to history
                    if (newTrack && newTrack.uri !== nowPlayingRef.current?.uri) {
                        if (nowPlayingRef.current) {
                            const oldTrack = nowPlayingRef.current;
                            setHistory(prev => [...prev, oldTrack].slice(-5));
                        }
                        nowPlayingRef.current = newTrack;
                    }

                    setNowPlaying(newTrack);
                    setSyncedLyrics([]);
                    setActiveLineIndex(-1);
                }
                
                if (type === 'THEME_UPDATE') {
                    if(payload.theme) setViewMode(payload.theme);
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

  const activeVideoId = youtubeId || (nowPlaying as any)?.youtubeId || null;
  const currentArt = nowPlaying?.albumArt || RECORD_PLACEHOLDER;
  const startTime = nowPlaying?.startedAt || 0; 

  return (
    <div style={styles.masterWrapper}>
      <style dangerouslySetInnerHTML={{__html: keyframes}} />
      <Background viewMode={viewMode} isKaraokeMode={isKaraokeMode} youtubeId={activeVideoId} currentArt={currentArt} startedAt={startTime} />
      <div style={styles.emojiLayer}>{activeReactions.map(r => <div key={r.id} style={{ ...styles.emoji, left: `${r.left}%` }}>{r.emoji}</div>)}</div>
      
      <div style={styles.brandingHeader}><h1>{partyName || 'The Pinfold'}</h1></div>
      
      {joinNotification && (<div style={styles.notificationWrapper}><div className="pill" style={styles.joinPill}><h2>👋 {joinNotification} joined!</h2></div></div>)}

      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
        {viewMode === 'standard' && !isKaraokeMode && (
          <StandardView 
             queue={queue} 
             nowPlaying={nowPlaying} 
             showUpNext={showUpNext}
             showLyrics={showLyrics}
             syncedLyrics={syncedLyrics} 
             activeLineIndex={activeLineIndex}
             progress={progress}
             currentArt={currentArt}
          />
        )}
        {(viewMode === 'monitor' || isKaraokeMode) && (
           <MonitorView showUpNext={showUpNext} nextUpItem={nextUpItem} isKaraokeMode={isKaraokeMode} nowPlaying={nowPlaying} progress={progress} />
        )}
        {viewMode === 'carousel' && !isKaraokeMode && (
           <CarouselView history={history} nowPlaying={nowPlaying} queue={queue} progress={progress} partyName={partyName} />
        )}
      </div>
      {showDebug && (<div style={styles.debugOverlay}>🛠️ Q: {queue.length}</div>)}
    </div>
  );
}