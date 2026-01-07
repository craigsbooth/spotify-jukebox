'use client';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config'; 
import { styles, getCarouselStyle, keyframes } from './styles';

interface Track { 
  name: string; 
  artist: string; 
  displayName?: string; 
  displayArtist?: string;
  album?: string; 
  albumArt?: string; 
  uri?: string; 
  startedAt?: number; 
  duration?: number;
  is_playing?: boolean; 
  addedBy?: string; 
  singer?: string; 
  title?: string; 
  thumb?: string;
  isFallback?: boolean;
  lyrics?: { synced: any; plain: string } | null; 
}

interface LyricLine { time: number; text: string; }
interface Reaction { id: number; emoji: string; left: number; }

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

// HELPER: Parse LRC String to Array
const parseLrc = (lrc: string): LyricLine[] => {
    if (!lrc || typeof lrc !== 'string') return [];
    return lrc.split('\n').map(line => {
        const m = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
        if (!m) return null;
        const minutes = parseInt(m[1]);
        const seconds = parseInt(m[2]);
        const ms = parseInt(m[3].padEnd(3, '0'));
        return {
            time: minutes * 60 + seconds + ms / 1000,
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
  
  const [showDebug, setShowDebug] = useState(false);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  // KARAOKE SPECIFIC STATE
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [karaokeQueue, setKaraokeQueue] = useState<any[]>([]);

  // BANNER ANIMATION STATE
  const [showUpNext, setShowUpNext] = useState(false);
  
  const prevUriRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => { document.title = `${partyName} Display`; }, [partyName]);

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
                
                // INIT: Load everything including lyrics if they exist
                if (type === 'INIT') {
                    if (payload.theme) setViewMode(payload.theme);
                    if (payload.youtubeId !== undefined) setYoutubeId(payload.youtubeId);
                    if (payload.isKaraokeMode !== undefined) setIsKaraokeMode(payload.isKaraokeMode);
                    if (payload.karaokeQueue) setKaraokeQueue(payload.karaokeQueue);
                    
                    // Pre-load lyrics if server has them
                    if (payload.currentLyrics) {
                         const l = payload.currentLyrics;
                         if (l.synced) setSyncedLyrics(parseLrc(l.synced));
                         else { setSyncedLyrics([]); setPlainLyrics(l.plain || ""); }
                    }
                }

                // UPDATES
                if (type === 'THEME_UPDATE') {
                    if (payload.theme) setViewMode(payload.theme);
                    if (payload.youtubeId !== undefined) setYoutubeId(payload.youtubeId);
                    if (payload.isKaraokeMode !== undefined) setIsKaraokeMode(payload.isKaraokeMode);
                    if (payload.karaokeQueue) setKaraokeQueue(payload.karaokeQueue);
                    if (payload.showLyrics !== undefined) setShowLyrics(payload.showLyrics);
                }
                if (type === 'KARAOKE_QUEUE') setKaraokeQueue(payload.karaokeQueue || []);
                if (type === 'KARAOKE_MODE') setIsKaraokeMode(payload.isKaraokeMode);
                if (type === 'REACTION') setActiveReactions(prev => [...prev, { id: payload.id, emoji: payload.emoji, left: Math.floor(Math.random() * 80) + 10 }]);

                // --- NEW: INSTANT LYRICS UPDATE (FIXED: PARSING ADDED) ---
                if (type === 'LYRICS_UPDATE') {
                    const l = payload.lyrics;
                    if (l && l.synced) {
                        setSyncedLyrics(parseLrc(l.synced)); // <--- FIXED HERE
                        setPlainLyrics("");
                    } else if (l && l.plain) {
                        setSyncedLyrics([]);
                        setPlainLyrics(l.plain);
                    } else {
                        setSyncedLyrics([]);
                        setPlainLyrics("No lyrics found.");
                    }
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
              // Reset lyrics on track change (wait for server to push new ones)
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

  // --- 3. ANIMATION & TIMING ENGINE ---
  useEffect(() => {
    const int = setInterval(() => {
      if (!nowPlaying?.startedAt) { setProgress(0); return; }
      const elapsed = Date.now() - nowPlaying.startedAt;
      setCurrentTimeMs(elapsed);
      setProgress(Math.min((elapsed / (nowPlaying.duration || 1)) * 100, 100));
      
      // Calculate Active Lyric Line
      if (syncedLyrics.length > 0) {
        const sec = elapsed / 1000;
        const idx = syncedLyrics.findLastIndex(l => l.time <= sec);
        if (idx !== -1 && idx !== activeLineIndex) {
            setActiveLineIndex(idx);
        }
      }
    }, 50);
    return () => clearInterval(int);
  }, [nowPlaying?.startedAt, syncedLyrics, activeLineIndex]);

  // --- 4. SMOOTH SCROLLING ENGINE ---
  useEffect(() => {
    if (activeLineIndex >= 0 && scrollContainerRef.current) {
        const activeEl = document.getElementById(`line-${activeLineIndex}`);
        if (activeEl) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [activeLineIndex]);

  // --- 5. BANNER LOGIC ---
  const nextUpItem = isKaraokeMode ? karaokeQueue[0] : queue[0];
  const nextUpId = nextUpItem?.uri || nextUpItem?.id || 'empty';

  useEffect(() => {
    setShowUpNext(nextUpId !== 'empty');
  }, [nextUpId]);

  const currentArt = nowPlaying?.albumArt || RECORD_PLACEHOLDER;
  const showVideo = !!youtubeId;
  const shouldUnmuteVideo = isKaraokeMode && !!youtubeId;
  const showTextOverlay = !isKaraokeMode;

  const getAddedByLabel = (item: any) => {
      if (isKaraokeMode) return null;
      if (!item) return null;
      const isSystem = item.isFallback || item.addedBy === 'Fallback Track';
      if (isSystem) return { icon: '📻', text: 'Fallback Track' };
      if (item.addedBy) return { icon: '👤', text: `Added by ${item.addedBy}` };
      return null;
  };
  
  const addedByInfo = getAddedByLabel(queue[0]);
  const nextAddedByInfo = getAddedByLabel(nextUpItem);

  return (
    <div style={styles.masterWrapper}>
      <style dangerouslySetInnerHTML={{__html: keyframes}} />
      <div style={styles.backgroundContainer}>
        {viewMode === 'monitor' || isKaraokeMode ? (
          <>
            {showVideo ? (
              <div key={youtubeId} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: -1 }}>
                <iframe
                  key={`${youtubeId}-${shouldUnmuteVideo ? 'LOUD' : 'SILENT'}`}
                  style={{ 
                    width: '100vw', height: '56.25vw', 
                    minHeight: '100vh', minWidth: '177.77vh',
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%) scale(1.05)',
                    pointerEvents: 'none' 
                  }}
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${shouldUnmuteVideo ? '0' : '1'}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&vq=hd1080`}
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                  loading="eager"
                />
              </div>
            ) : (
              <div style={{ ...styles.bgImage, backgroundImage: `url(${currentArt})` }} />
            )}
            <div style={styles.monitorOverlay} />
          </>
        ) : (
          <div style={styles.meshAnimation}><div style={{ ...styles.bgImage, backgroundImage: `url(${currentArt})`, filter: 'blur(80px) brightness(0.12)' }} /></div>
        )}
      </div>

      <div style={styles.emojiLayer}>{activeReactions.map(r => <div key={r.id} style={{ ...styles.emoji, left: `${r.left}%` }}>{r.emoji}</div>)}</div>
      <div style={styles.brandingHeader}><h1>{partyName}</h1></div>
      {joinNotification && (<div style={styles.notificationWrapper}><div className="pill" style={styles.joinPill}><h2>👋 {joinNotification} joined!</h2></div></div>)}

      {viewMode === 'carousel' && !isKaraokeMode && (
        <div style={styles.carouselPerspective}><div style={styles.carouselContainer}>
            {[...history.slice(-3), nowPlaying, ...queue.slice(0, 5)].map((track, index) => {
              if (!track) return null;
              const relIndex = index - Math.min(history.length, 3);
              return (
                <div key={`${track.uri}-${index}`} className="cover-container" style={getCarouselStyle(relIndex, Math.abs(relIndex))}>
                  <img src={track.albumArt || RECORD_PLACEHOLDER} className="reflect-image" style={styles.carouselArt} />
                  {relIndex === 0 && (
                    <div style={styles.carouselInfo}>
                      <h1 style={styles.carouselTitle}>{track.displayName ?? track.name}</h1>
                      <h2 style={styles.carouselArtist}>{track.displayArtist ?? track.artist}</h2>
                      <div style={styles.progressBarBase}><div style={{ ...styles.progressBarFill, width: `${progress}%` }} /></div>
                    </div>
                  )}
                </div>
              );
            })}
        </div></div>
      )}

      {viewMode === 'standard' && !isKaraokeMode && (
        <div style={styles.standardContainer}>
           {/* UP NEXT PILL */}
           <div style={{
               ...styles.upNextPosition, 
               transition: 'transform 0.5s', 
               transform: showUpNext ? 'translateY(0)' : 'translateY(-100px)',
               opacity: showUpNext ? 1 : 0
            }}>
            {queue[0] && (
              <div className="pill" style={styles.upNextPill}>
                <img src={queue[0].albumArt || RECORD_PLACEHOLDER} style={styles.upNextArt} />
                <div>
                    <small>UP NEXT</small>
                    <div style={{ fontWeight: 900 }}>{queue[0].displayName ?? queue[0].name}</div>
                    {addedByInfo && (
                        <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '2px' }}>
                           {addedByInfo.icon} {addedByInfo.text}
                        </div>
                    )}
                </div>
              </div>
            )}
          </div>
          
          {/* LYRICS WINDOW */}
          {showLyrics && (
            <div ref={scrollContainerRef} className="no-scrollbar" style={styles.lyricsWindow}>
              <div style={{ height: '20vh' }} /> {/* Spacer */}
              {syncedLyrics.length > 0 ? syncedLyrics.map((l, i) => (
                  <div 
                    key={i} 
                    id={`line-${i}`} 
                    className={`lyric-line ${i === activeLineIndex ? 'active' : 'inactive'}`}
                    style={{
                        transform: i === activeLineIndex ? 'scale(1.05)' : 'scale(1)',
                        transition: 'transform 0.2s ease, opacity 0.2s ease',
                        opacity: i === activeLineIndex ? 1 : 0.5
                    }}
                  >
                    {l.text}
                  </div>
              )) : (
                <div style={styles.plainLyricsText}>
                    {plainLyrics || (nowPlaying ? "Searching for lyrics..." : "")}
                </div>
              )}
              <div style={{ height: '20vh' }} /> {/* Spacer */}
            </div>
          )}

          <div style={styles.standardFooter}>
            <div style={styles.footerFlex}>
              <img src={currentArt} className="reflect-image" style={styles.footerArt} />
              <div>
                <h1 style={styles.footerTitle}>{nowPlaying?.displayName ?? nowPlaying?.name}</h1>
                <h3 style={styles.footerArtist}>{nowPlaying?.displayArtist ?? nowPlaying?.artist}</h3>
                <div style={styles.footerProgressBase}><div style={{ ...styles.footerProgressFill, width: `${progress}%` }} /></div>
              </div>
            </div>
            <div style={styles.qrContainer}><img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://jukebox.boldron.info/guest')}`} style={{ width: '100%' }} /><div style={styles.qrText}>JOIN THE PARTY</div></div>
          </div>
        </div>
      )}

      {(viewMode === 'monitor' || isKaraokeMode) && (
        <div style={styles.monitorContainer}>
          <div style={{ 
              position: 'absolute', top: '4vh', right: '4vw',
              transition: 'transform 0.8s ease-in-out, opacity 0.8s',
              transform: showUpNext ? 'translateY(0)' : 'translateY(-200%)',
              opacity: showUpNext ? 1 : 0
          }}>
            {nextUpItem && (
              <div className="pill" style={styles.upNextPill}>
                <img src={nextUpItem.albumArt || nextUpItem.thumb || RECORD_PLACEHOLDER} style={styles.upNextArt} />
                <div>
                  <small style={{opacity:0.5, fontSize:'0.6rem'}}>{isKaraokeMode ? 'NEXT SINGER' : 'UP NEXT'}</small>
                  <div style={{fontWeight:900, fontSize:'1rem'}}>
                      {isKaraokeMode ? (nextUpItem.singer || 'Guest') : (nextUpItem.displayName ?? nextUpItem.name)}
                  </div>
                  {isKaraokeMode ? (
                      <div style={{fontSize:'0.7rem', opacity:0.8}}>Performing: {nextUpItem.title}</div>
                  ) : (
                      nextAddedByInfo && (
                          <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '2px' }}>
                             {nextAddedByInfo.icon} {nextAddedByInfo.text}
                          </div>
                      )
                  )}
                </div>
              </div>
            )}
          </div>
          
          {showTextOverlay && (
            <div style={{textAlign: 'center', position: 'absolute', bottom: '10vh', left: 0, width: '100%'}}>
                <h1 style={styles.monitorTitle}>{nowPlaying?.displayName ?? nowPlaying?.name}</h1>
                <h2 style={styles.monitorArtist}>{nowPlaying?.displayArtist ?? nowPlaying?.artist}</h2>
                <div style={styles.footerProgressBase}><div style={{ ...styles.footerProgressFill, width: `${progress}%` }} /></div>
            </div>
          )}
        </div>
      )}

      {showDebug && (<div style={styles.debugOverlay}>🛠️ Q: {queue.length} | KQ: {karaokeQueue.length} | {viewMode.toUpperCase()} | MODE: {isKaraokeMode ? 'KARAOKE' : 'MUSIC'}</div>)}
    </div>
  );
}