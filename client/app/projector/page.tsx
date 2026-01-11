'use client';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config'; 
import { styles, keyframes } from './styles';
import { Track, LyricLine, Reaction } from './types';

// Sub-Components
import { Background } from './Background';
import { StandardView } from './StandardView';
import { CarouselView } from './CarouselView';
import { MonitorView } from './MonitorView';

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

// HELPER: Parse LRC String to Array
const parseLrc = (lrc: string): LyricLine[] => {
    if (!lrc || typeof lrc !== 'string') return [];
    return lrc.split('\n').map(line => {
        const m = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
        if (!m) return null;
        return {
            time: parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3].padEnd(3, '0')) / 1000,
            text: line.replace(/\[.*?\]/, '').trim()
        };
    }).filter((x): x is LyricLine => x !== null && x.text !== "");
};

export default function Projector() {
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);
  const [history, setHistory] = useState<Track[]>([]); 
  const [queue, setQueue] = useState<Track[]>([]);
  const [viewMode, setViewMode] = useState('standard');
  const [partyName, setPartyName] = useState('Pinfold');
  
  // LYRICS STATE
  const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState("");
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [showLyrics, setShowLyrics] = useState(false);
  
  // --- SYNC STATE ---
  const [lyricsDelayMs, setLyricsDelayMs] = useState(0); 

  const [showDebug, setShowDebug] = useState(false);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [progress, setProgress] = useState(0);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  // KARAOKE SPECIFIC STATE
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [karaokeQueue, setKaraokeQueue] = useState<any[]>([]);
  const [showUpNext, setShowUpNext] = useState(false);
  
  const prevUriRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => { document.title = `${partyName} Display`; }, [partyName]);

  // --- HELPER: ADVANCE QUEUE ---
  const handleSkip = async () => {
    console.log("⏭️ Projector: Performance ended. Requesting next track...");
    const endpoint = isKaraokeMode ? 'pop-karaoke' : 'pop';
    try {
        await fetch(`${API_URL}/${endpoint}`, { method: 'POST' });
    } catch (e) {
        console.error("Failed to auto-advance queue", e);
    }
  };

  // --- YOUTUBE END DETECTOR ---
  useEffect(() => {
    const handleYoutubeMessage = (event: MessageEvent) => {
        // Detect if the message is from the YouTube iframe
        if (event.origin !== "https://www.youtube.com") return;
        
        try {
            const data = JSON.parse(event.data);
            // infoDelivery is the event type for state changes
            // state 0 = Ended
            if (data.event === "infoDelivery" && data.info?.playerState === 0) {
                handleSkip();
            }
        } catch (e) {
            // Ignore non-JSON messages
        }
    };

    window.addEventListener("message", handleYoutubeMessage);
    return () => window.removeEventListener("message", handleYoutubeMessage);
  }, [isKaraokeMode]);

  // --- 1. HYBRID SYNC (SSE + POLLING) ---
  useEffect(() => {
    const fetchInitial = () => {
        fetch(`${API_URL}/theme`).then(res => res.json()).then(d => {
            setViewMode(d.theme || 'standard');
            setShowLyrics(!!d.showLyrics);
            setShowDebug(!!d.showDebug);
            setIsKaraokeMode(!!d.isKaraokeMode);
            if (d.youtubeId !== undefined) setYoutubeId(d.youtubeId || null);
            setKaraokeQueue(d.karaokeQueue || []);
            if (d.lyricsDelayMs !== undefined) setLyricsDelayMs(d.lyricsDelayMs);
        });
        fetch(`${API_URL}/name`).then(res => res.json()).then(d => setPartyName(d.name || 'Pinfold'));
    };
    fetchInitial();

    const connectSSE = () => {
        if (eventSourceRef.current) eventSourceRef.current.close();
        const es = new EventSource(`${API_URL}/events`);
        eventSourceRef.current = es;
        es.onmessage = (e) => {
            try {
                const { type, payload } = JSON.parse(e.data);
                
                if (type === 'INIT' || type === 'THEME_UPDATE') {
                    if (payload.theme) setViewMode(payload.theme);
                    if (payload.youtubeId !== undefined) setYoutubeId(payload.youtubeId);
                    if (payload.isKaraokeMode !== undefined) setIsKaraokeMode(payload.isKaraokeMode);
                    if (payload.karaokeQueue) setKaraokeQueue(payload.karaokeQueue);
                    if (payload.showLyrics !== undefined) setShowLyrics(payload.showLyrics);
                    if (payload.lyricsDelayMs !== undefined) setLyricsDelayMs(payload.lyricsDelayMs);
                    
                    if (type === 'INIT' && payload.currentLyrics) {
                         const l = payload.currentLyrics;
                         if (l.synced) setSyncedLyrics(parseLrc(l.synced));
                         else { setSyncedLyrics([]); setPlainLyrics(l.plain || ""); }
                    }
                }
                
                if (type === 'KARAOKE_QUEUE') setKaraokeQueue(payload.karaokeQueue || []);
                if (type === 'KARAOKE_MODE') setIsKaraokeMode(payload.isKaraokeMode);
                if (type === 'REACTION') setActiveReactions(prev => [...prev, { id: payload.id, emoji: payload.emoji, left: Math.floor(Math.random() * 80) + 10 }]);

                if (type === 'LYRICS_UPDATE') {
                    const l = payload.lyrics;
                    if (l && l.synced) { setSyncedLyrics(parseLrc(l.synced)); setPlainLyrics(""); } 
                    else if (l && l.plain) { setSyncedLyrics([]); setPlainLyrics(l.plain); } 
                    else { setSyncedLyrics([]); setPlainLyrics("No lyrics found."); }
                }
            } catch (err) {}
        };
    };
    try { connectSSE(); } catch (e) {}

    const pollInt = setInterval(fetchInitial, 3000); 
    return () => { clearInterval(pollInt); if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, []);

  // --- 2. SPOTIFY POLLING ---
  useEffect(() => {
    const fetchSpotify = () => {
      fetch(`${API_URL}/current`).then(res => res.json()).then(data => {
        const isPlayingChanged = data?.is_playing !== nowPlaying?.is_playing;
        const uriChanged = data?.uri !== prevUriRef.current;
        
        if (uriChanged || isPlayingChanged) {
          if (uriChanged && nowPlaying) setHistory(prev => [...prev.slice(-3), nowPlaying]);
          setNowPlaying(data?.name ? data : null);
          
          if (uriChanged) { 
              prevUriRef.current = data?.uri || null; 
              setActiveLineIndex(-1);
              setSyncedLyrics([]); 
              setPlainLyrics("Loading..."); 
          }
        }
      });
      fetch(`${API_URL}/queue`).then(res => res.json()).then(setQueue);
    };
    fetchSpotify();
    const interval = setInterval(fetchSpotify, 1000);
    return () => clearInterval(interval);
  }, [nowPlaying]);

  // --- 3. ANIMATION & SYNC ENGINE ---
  useEffect(() => {
    const int = setInterval(() => {
      if (!nowPlaying?.startedAt) { setProgress(0); return; }
      
      const elapsed = Date.now() - nowPlaying.startedAt;
      setProgress(Math.min((elapsed / (nowPlaying.duration || 1)) * 100, 100));
      
      if (syncedLyrics.length > 0) {
        const sec = (elapsed - lyricsDelayMs) / 1000;
        const idx = syncedLyrics.findLastIndex(l => l.time <= sec);
        if (idx !== -1 && idx !== activeLineIndex) {
            setActiveLineIndex(idx);
        }
      }
    }, 50);
    return () => clearInterval(int);
  }, [nowPlaying?.startedAt, syncedLyrics, activeLineIndex, lyricsDelayMs]);

  // --- 4. VIEW LOGIC ---
  const nextUpItem = isKaraokeMode ? karaokeQueue[0] : queue[0];
  const nextUpId = nextUpItem?.uri || nextUpItem?.id || 'empty';
  useEffect(() => { setShowUpNext(nextUpId !== 'empty'); }, [nextUpId]);
  
  const currentArt = nowPlaying?.albumArt || RECORD_PLACEHOLDER;
  const activeVideoId = youtubeId || (nowPlaying as any)?.youtubeId || null;

  return (
    <div style={styles.masterWrapper}>
      <style dangerouslySetInnerHTML={{__html: keyframes}} />
      
      {/* 1. BACKGROUND LAYER */}
      <Background 
        viewMode={viewMode} 
        isKaraokeMode={isKaraokeMode} 
        youtubeId={activeVideoId} 
        currentArt={currentArt} 
      />

      {/* 2. REACTION LAYER */}
      <div style={styles.emojiLayer}>{activeReactions.map(r => <div key={r.id} style={{ ...styles.emoji, left: `${r.left}%` }}>{r.emoji}</div>)}</div>
      
      {/* 3. HEADER */}
      <div style={styles.brandingHeader}><h1>{partyName}</h1></div>
      {joinNotification && (<div style={styles.notificationWrapper}><div className="pill" style={styles.joinPill}><h2>👋 {joinNotification} joined!</h2></div></div>)}

      {/* 4. MAIN CONTENT SWITCHER */}
      {viewMode === 'carousel' && !isKaraokeMode && (
         <CarouselView history={history} nowPlaying={nowPlaying} queue={queue} progress={progress} />
      )}

      {viewMode === 'standard' && !isKaraokeMode && (
         <StandardView 
            queue={queue} 
            nowPlaying={nowPlaying} 
            showUpNext={showUpNext}
            showLyrics={showLyrics}
            syncedLyrics={syncedLyrics}
            plainLyrics={plainLyrics}
            activeLineIndex={activeLineIndex}
            progress={progress}
            currentArt={currentArt}
         />
      )}

      {(viewMode === 'monitor' || isKaraokeMode) && (
         <MonitorView 
            showUpNext={showUpNext}
            nextUpItem={nextUpItem}
            isKaraokeMode={isKaraokeMode}
            nowPlaying={nowPlaying}
            progress={progress}
         />
      )}

      {showDebug && (<div style={styles.debugOverlay}>🛠️ Q: {queue.length} | KQ: {karaokeQueue.length} | {viewMode.toUpperCase()} | MODE: {isKaraokeMode ? 'KARAOKE' : 'MUSIC'} | OFFSET: {lyricsDelayMs}ms</div>)}
    </div>
  );
}