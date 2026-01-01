'use client';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config'; 
import { styles, getCarouselStyle, keyframes } from './styles';

interface Track { name: string; artist: string; album?: string; albumArt?: string; uri?: string; startedAt?: number; duration?: number; }
interface LyricLine { time: number; text: string; }
interface Reaction { id: number; emoji: string; left: number; }

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

export default function Projector() {
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);
  const [history, setHistory] = useState<Track[]>([]); 
  const [queue, setQueue] = useState<Track[]>([]);
  const [viewMode, setViewMode] = useState('standard');
  const [partyName, setPartyName] = useState('Pinfold');
  const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState("");
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const lastReactionIdRef = useRef(0); 
  const prevUriRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // SYNC BROWSER TAB TITLE
  useEffect(() => {
    document.title = `${partyName} Display`;
  }, [partyName]);

  useEffect(() => {
    const fetchData = () => {
      fetch(`${API_URL}/current`).then(res => res.json()).then(data => {
        if (data?.uri !== prevUriRef.current) {
          if (nowPlaying) setHistory(prev => [...prev.slice(-3), nowPlaying]);
          setNowPlaying(data?.name ? data : null);
          prevUriRef.current = data?.uri || null;
          setActiveLineIndex(-1);
        }
      });
      fetch(`${API_URL}/queue`).then(res => res.json()).then(setQueue);
      fetch(`${API_URL}/theme`).then(res => res.json()).then(d => {
        setViewMode(d.theme || 'standard');
        setShowLyrics(!!d.showLyrics);
        setShowDebug(!!d.showDebug);
      });
      fetch(`${API_URL}/name`).then(res => res.json()).then(d => setPartyName(d.name || 'Pinfold'));
      fetch(`${API_URL}/join-event`).then(res => res.json()).then(d => {
        if (d.name && d.name !== joinNotification) {
          setJoinNotification(d.name);
          setTimeout(() => setJoinNotification(null), 5000);
        }
      });
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);
    const progInt = setInterval(() => {
      if (!nowPlaying?.startedAt) return;
      const elapsed = Date.now() - nowPlaying.startedAt;
      setCurrentTimeMs(elapsed);
      setProgress(Math.min((elapsed / (nowPlaying.duration || 1)) * 100, 100));
      if (syncedLyrics.length > 0) {
        const idx = syncedLyrics.findLastIndex(l => l.time <= (elapsed / 1000));
        if (idx !== -1 && idx !== activeLineIndex) setActiveLineIndex(idx);
      }
    }, 50);
    return () => { clearInterval(interval); clearInterval(progInt); };
  }, [nowPlaying?.uri, syncedLyrics, activeLineIndex, joinNotification]);

  // Reactions
  useEffect(() => {
    const rInt = setInterval(() => {
      fetch(`${API_URL}/reaction-event`).then(res => res.json()).then((data: any) => {
        if (data?.id && data.id > lastReactionIdRef.current) {
          lastReactionIdRef.current = data.id;
          const newR = { id: data.id, emoji: data.emoji, left: Math.floor(Math.random() * 80) + 10 };
          setActiveReactions(prev => [...prev, newR]);
          setTimeout(() => setActiveReactions(curr => curr.filter(r => r.id !== newR.id)), 7000);
        }
      });
    }, 500);
    return () => clearInterval(rInt);
  }, []);

  // Lyrics
  useEffect(() => {
    if (nowPlaying && showLyrics) {
      fetch(`${API_URL}/lyrics?track=${encodeURIComponent(nowPlaying.name)}&artist=${encodeURIComponent(nowPlaying.artist)}`)
        .then(res => res.json()).then(data => {
          if (data.syncedLyrics) {
            const lines = data.syncedLyrics.split('\n').map((l: string) => {
              const m = l.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
              return m ? { time: parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3].padEnd(3, '0')) / 1000, text: l.replace(/\[.*\]/, '').trim() } : null;
            }).filter((x: any) => x && x.text !== "");
            setSyncedLyrics(lines); setPlainLyrics("");
          } else {
            setSyncedLyrics([]); setPlainLyrics(data.plainLyrics || "No lyrics found");
          }
        });
    }
  }, [nowPlaying?.uri, showLyrics]);

  useEffect(() => {
    const el = document.getElementById(`line-${activeLineIndex}`);
    if (el && scrollContainerRef.current) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLineIndex]);

  const currentArt = nowPlaying?.albumArt || RECORD_PLACEHOLDER;

  return (
    <div style={styles.masterWrapper}>
      <style dangerouslySetInnerHTML={{__html: keyframes}} />
      <div style={styles.backgroundContainer}>
        {viewMode === 'monitor' ? (
          <><div style={{ ...styles.bgImage, backgroundImage: `url(${currentArt})` }} /><div style={styles.monitorOverlay} /></>
        ) : (
          <div style={styles.meshAnimation}><div style={{ ...styles.bgImage, backgroundImage: `url(${currentArt})`, filter: 'blur(80px) brightness(0.12)' }} /></div>
        )}
      </div>
      <div style={styles.emojiLayer}>{activeReactions.map(r => <div key={r.id} style={{ ...styles.emoji, left: `${r.left}%` }}>{r.emoji}</div>)}</div>
      <div style={styles.brandingHeader}><h1>{partyName}</h1></div>
      {joinNotification && (<div style={styles.notificationWrapper}><div className="pill" style={styles.joinPill}><h2>👋 {joinNotification} joined!</h2></div></div>)}

      {viewMode === 'carousel' && (
        <div style={styles.carouselPerspective}><div style={styles.carouselContainer}>
            {[...history.slice(-3), nowPlaying, ...queue.slice(0, 5)].map((track, index) => {
              if (!track) return null;
              const relIndex = index - Math.min(history.length, 3);
              return (
                <div key={`${track.uri}-${index}`} className="cover-container" style={getCarouselStyle(relIndex, Math.abs(relIndex))}>
                  <img src={track.albumArt || RECORD_PLACEHOLDER} className="reflect-image" style={styles.carouselArt} />
                  {relIndex === 0 && (
                    <div style={styles.carouselInfo}><h1 style={styles.carouselTitle}>{track.name}</h1><h2 style={styles.carouselArtist}>{track.artist}</h2><div style={styles.progressBarBase}><div style={{ ...styles.progressBarFill, width: `${progress}%` }} /></div></div>
                  )}
                </div>
              );
            })}
        </div></div>
      )}

      {viewMode === 'standard' && (
        <div style={styles.standardContainer}>
          <div style={styles.upNextPosition}>{queue[0] && (<div className="pill" style={styles.upNextPill}><img src={queue[0].albumArt || RECORD_PLACEHOLDER} style={styles.upNextArt} /><div><small>UP NEXT</small><div>{queue[0].name}</div></div></div>)}</div>
          {showLyrics && (<div ref={scrollContainerRef} className="no-scrollbar" style={styles.lyricsWindow}><div style={{ height: '15vh' }} />{syncedLyrics.length > 0 ? syncedLyrics.map((l, i) => (<div key={i} id={`line-${i}`} className={`lyric-line ${i === activeLineIndex ? 'active' : 'inactive'}`}>{l.text}</div>)) : <div style={styles.plainLyricsText}>{plainLyrics || "Searching..."}</div>}<div style={{ height: '15vh' }} /></div>)}
          <div style={styles.standardFooter}><div style={styles.footerFlex}><img src={currentArt} className="reflect-image" style={styles.footerArt} /><div><h1 style={styles.footerTitle}>{nowPlaying?.name}</h1><h3 style={styles.footerArtist}>{nowPlaying?.artist}</h3><div style={styles.footerProgressBase}><div style={{ ...styles.footerProgressFill, width: `${progress}%` }} /></div></div></div><div style={styles.qrContainer}><img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://jukebox.boldron.info/guest')}`} style={{ width: '100%' }} /><div style={styles.qrText}>JOIN THE PARTY</div></div></div>
        </div>
      )}

      {viewMode === 'monitor' && (
        <div style={styles.monitorContainer}>
          {/* Bug 7 Fixed: Restore Up Next in Monitor View */}
          <div style={{ position: 'absolute', top: '4vh', right: '4vw' }}>
            {queue[0] && (<div className="pill" style={styles.upNextPill}><img src={queue[0].albumArt || RECORD_PLACEHOLDER} style={styles.upNextArt} /><div><small style={{opacity:0.5, fontSize:'0.6rem'}}>UP NEXT</small><div style={{fontWeight:900, fontSize:'1rem'}}>{queue[0].name}</div></div></div>)}
          </div>
          <h1 style={styles.monitorTitle}>{nowPlaying?.name}</h1>
          <h2 style={styles.monitorArtist}>{nowPlaying?.artist}</h2>
          <div style={styles.footerProgressBase}><div style={{ ...styles.footerProgressFill, width: `${progress}%` }} /></div>
        </div>
      )}

      {showDebug && (<div style={styles.debugOverlay}>🛠️ Q: {queue.length} | {viewMode.toUpperCase()} | LYRICS: {syncedLyrics.length > 0 ? 'SYNC' : 'PLAIN'}</div>)}
    </div>
  );
}