'use client';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config'; 

interface Track { 
    name: string; 
    artist: string; 
    album?: string; 
    albumArt?: string; 
    uri?: string; 
    startedAt?: number; 
    duration?: number; 
}
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
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [lyricStatus, setLyricStatus] = useState("Idle");
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const lastReactionIdRef = useRef(0); 
  const prevUriRef = useRef<string | null>(null);

  // --- HELPERS ---
  const normalize = (str: string) => str.toLowerCase().replace(/\(.*\)/g, '').replace(/\[.*\]/g, '').replace(/ - .*/g, '').replace(/[^a-z0-9 ]/g, '').trim();
  const getSimilarity = (s1: string, s2: string) => {
      let l = s1.length > s2.length ? s1 : s2; let s = s1.length > s2.length ? s2 : s1;
      if (l.length === 0) return 1.0;
      const costs = [];
      for (let i = 0; i <= l.length; i++) {
          let last = i;
          for (let j = 0; j <= s.length; j++) {
              if (i === 0) costs[j] = j;
              else if (j > 0) {
                  let v = costs[j - 1]; if (l[i - 1] !== s[j - 1]) v = Math.min(Math.min(v, last), costs[j]) + 1;
                  costs[j - 1] = last; last = v;
              }
          }
          if (i > 0) costs[s.length] = last;
      }
      return (l.length - costs[s.length]) / l.length;
  };

  // --- 1. REACTION ENGINE (Continuous Polling) ---
  useEffect(() => {
    const reactionInterval = setInterval(() => {
        fetch(`${API_URL}/reaction-event`)
            .then(res => res.json())
            .then((data: any) => {
                if (data?.id && data.id > lastReactionIdRef.current && data.emoji) {
                    lastReactionIdRef.current = data.id;
                    const newReaction: Reaction = { 
                        id: data.id, 
                        emoji: data.emoji, 
                        left: Math.floor(Math.random() * 80) + 10 
                    };
                    setActiveReactions(prev => [...prev, newReaction]);
                    setTimeout(() => {
                        setActiveReactions(current => current.filter(r => r.id !== newReaction.id));
                    }, 7000);
                }
            }).catch(() => {});
    }, 500);
    return () => clearInterval(reactionInterval);
  }, []);

  // --- 2. DATA ENGINE ---
  useEffect(() => {
    const fetchData = () => {
      fetch(`${API_URL}/current`).then(res => res.json()).then(data => {
          if (data?.uri !== prevUriRef.current) { 
              if (nowPlaying) setHistory(prev => [...prev.slice(-3), nowPlaying]); 
              setNowPlaying(data?.name ? data : null); 
              prevUriRef.current = data?.uri || null;
          }
      });
      fetch(`${API_URL}/queue`).then(res => res.json()).then(data => { if (Array.isArray(data)) setQueue(data); });
      fetch(`${API_URL}/name`).then(res => res.json()).then(d => setPartyName(d.name || 'Pinfold'));
      fetch(`${API_URL}/theme`).then(res => res.json()).then(d => {
          setViewMode(d.theme || 'standard');
          setShowLyrics(!!d.showLyrics);
          setShowDebug(!!d.showDebug);
      });
      fetch(`${API_URL}/join-event`).then(res => res.json()).then(data => {
            if (data.name && data.name !== joinNotification) {
                setJoinNotification(data.name);
                setTimeout(() => setJoinNotification(null), 5000);
            }
      });
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);

    const progInterval = setInterval(() => {
        if (!nowPlaying?.startedAt) return;
        const elapsed = Date.now() - nowPlaying.startedAt;
        setCurrentTimeMs(elapsed);
        setProgress(Math.min((elapsed / (nowPlaying.duration || 1)) * 100, 100));
    }, 50);

    return () => { 
        clearInterval(interval); 
        clearInterval(progInterval); 
    };
  }, [nowPlaying?.uri]); 

  // --- 3. LYRICS ENGINE ---
  useEffect(() => {
    if (nowPlaying && showLyrics) {
        setLyricStatus("Searching...");
        fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(nowPlaying.artist + ' ' + nowPlaying.name)}`)
            .then(res => res.json()).then(data => {
                const match = data?.find((i:any) => getSimilarity(normalize(i.trackName), normalize(nowPlaying.name)) > 0.7);
                if (match?.syncedLyrics) {
                    const lines = match.syncedLyrics.split('\n').map((l: string) => {
                        const m = l.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
                        return m ? { time: parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3].padEnd(3, '0')) / 1000, text: l.replace(/\[.*\]/, '').trim() } : null;
                    }).filter((x: any) => x && x.text !== "");
                    setSyncedLyrics(lines); setPlainLyrics(""); setLyricStatus("Synced");
                } else { setSyncedLyrics([]); setPlainLyrics(match?.plainLyrics || "Lyrics not found"); setLyricStatus("No Sync"); }
            }).catch(() => setLyricStatus("Error"));
    } else { setSyncedLyrics([]); setPlainLyrics(""); setLyricStatus("Idle"); }
  }, [nowPlaying?.uri, showLyrics]);

  useEffect(() => {
      const idx = syncedLyrics.findLastIndex(l => l.time <= (currentTimeMs / 1000));
      if (idx !== -1 && idx !== activeLineIndex) {
          setActiveLineIndex(idx);
          document.getElementById(`line-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [currentTimeMs, syncedLyrics]);

  const currentArt = nowPlaying?.albumArt || RECORD_PLACEHOLDER;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', color: 'white', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes meshDrift { 0% { transform: scale(1); } 50% { transform: scale(1.1) rotate(1deg); } 100% { transform: scale(1); } }
        
        @keyframes emojiDrop { 
            0% { transform: translateY(-20vh) rotate(0deg); opacity: 0; } 
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(110vh) rotate(360deg); opacity: 0; } 
        }

        @keyframes slideDown { from { transform: translateY(-200%); } to { transform: translateY(0); } }
        .lyric-line { transition: all 0.6s cubic-bezier(0.2, 1, 0.2, 1); margin: 2.5rem 0; text-align: center; }
        .active { font-size: 3.5rem; font-weight: 950; opacity: 1; }
        .inactive { font-size: 2rem; font-weight: 700; opacity: 0.2; transform: scale(0.9); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .reflect-image { -webkit-box-reflect: below 4px linear-gradient(transparent, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.25) 100%); object-fit: cover; }
        .cover-container { transition: all 1.2s cubic-bezier(0.22, 1, 0.36, 1); transform-style: preserve-3d; backface-visibility: hidden; }
        .pill { background: rgba(255,255,255,0.12); padding: 10px 25px; border-radius: 100px; backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.25); }
        .qr-pill { background: white; padding: 15px 30px; border-radius: 30px; display: flex; alignItems: center; gap: 15px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
      `}} />

      {/* --- BACKGROUND --- */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {viewMode === 'monitor' ? (
              <>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${currentArt})`, backgroundSize: 'cover', backgroundPosition: 'center', transition: 'background-image 2s ease' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)' }} />
              </>
          ) : (
            <div style={{ position: 'absolute', inset: '-10%', animation: 'meshDrift 40s infinite ease-in-out' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${currentArt})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(80px) brightness(0.12)', opacity: 0.8, transition: 'background-image 2s ease' }} />
            </div>
          )}
      </div>

      {/* --- EMOJI LAYER --- */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 250 }}>
          {activeReactions.map(r => ( 
              <div key={r.id} style={{ position: 'absolute', left: `${r.left}%`, fontSize: '8rem', animation: 'emojiDrop 7s linear forwards', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}>
                {r.emoji}
              </div> 
          ))}
      </div>

      {/* --- BRANDING --- */}
      <div style={{ position: 'absolute', top: '3vh', left: '3vw', zIndex: 100 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '8px', textTransform: 'uppercase', opacity: 0.5, margin: 0 }}>{partyName}</h1>
      </div>

      {/* --- NOTIFICATIONS --- */}
      {joinNotification && (
          <div style={{ position: 'absolute', top: '10vh', left: '50%', transform: 'translateX(-50%)', zIndex: 200, animation: 'slideDown 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div className="pill" style={{ background: 'rgba(255,255,255,0.3)', padding: '20px 60px' }}><h2 style={{ margin: 0, fontWeight: 900, fontSize: '2rem' }}>👋 {joinNotification} joined!</h2></div>
          </div>
      )}

      {/* --- 1. CAROUSEL VIEW --- */}
      {viewMode === 'carousel' && (
        <div style={{ position: 'relative', height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '1500px' }}>
          <div style={{ position: 'relative', width: '100%', height: '70vh', marginTop: '-10vh', display: 'flex', alignItems: 'center', justifyContent: 'center', transformStyle: 'preserve-3d' }}>
            {[...history.slice(-3), nowPlaying, ...queue.slice(0, 5)].map((track, index) => {
              if (!track) return null;
              const nowPlayingIndex = Math.min(history.length, 3);
              const relIndex = index - nowPlayingIndex;
              const isCenter = relIndex === 0;
              const absIndex = Math.abs(relIndex);
              
              let translateX = relIndex * 12 + 'vw'; 
              if (relIndex < 0) translateX = `calc(${relIndex * 12}vw - 12vw)`; 
              if (relIndex > 0) translateX = `calc(${relIndex * 12}vw + 12vw)`;

              let translateZ = (relIndex === 0) ? '10vw' : `calc(5vw - ${absIndex * 6}vw)`; 
              let translateY = absIndex * 1.5 + 'vh';
              let rotateY = relIndex * -10; if (relIndex < 0) rotateY = 60; if (relIndex > 0) rotateY = -60;

              return (
                <div key={`${track.uri}-${index}`} className="cover-container" style={{ position: 'absolute', width: (relIndex === 0) ? '22vw' : '16vw', zIndex: 100 - absIndex, transform: `translateX(${translateX}) translateY(${translateY}) translateZ(${translateZ}) rotateY(${rotateY}deg)`, opacity: 1, textAlign: 'center' }}>
                  <img src={track.albumArt || RECORD_PLACEHOLDER} className="reflect-image" style={{ width: '100%', aspectRatio: '1/1', borderRadius: '10px', boxShadow: (relIndex === 0) ? '0 5vh 10vh rgba(0,0,0,0.8)' : '0 2vh 5vh rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  {isCenter && (
                    <div style={{ marginTop: '6vh', width: '140%', marginLeft: '-20%' }}>
                      <h1 style={{ fontSize: '3.5vw', margin: 0, fontWeight: 950, lineHeight: 1 }}>{track.name}</h1>
                      <h2 style={{ fontSize: '1.8vw', color: '#D4AF37', fontWeight: 800, marginTop: '0.5vh' }}>{track.artist}</h2>
                      <h3 style={{ fontSize: '1vw', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '3px' }}>{track.album}</h3>
                      <div style={{ width: '25vw', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', margin: '2vh auto 0 auto', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #fff, #D4AF37)', transition: 'width 0.5s linear' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 2. STANDARD VIEW --- */}
      {viewMode === 'standard' && (
          <div style={{ position: 'relative', zIndex: 10, height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6vw' }}>
              <div style={{ position: 'absolute', top: '4vh', right: '4vw' }}>
                  {queue[0] && (
                    <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src={queue[0].albumArt || RECORD_PLACEHOLDER} style={{ width: '60px', height: '60px', borderRadius: '10px' }} />
                        <div><div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 900 }}>UP NEXT</div><div style={{ fontSize: '1.2rem', fontWeight: 950 }}>{queue[0].name}</div></div>
                    </div>
                  )}
              </div>
              {showLyrics && (
                  <div className="no-scrollbar" style={{ height: '40vh', overflowY: 'auto', maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)' }}>
                      <div style={{ height: '10vh' }} />
                      {syncedLyrics.length > 0 ? syncedLyrics.map((l, i) => <div key={i} id={`line-${i}`} className={`lyric-line ${i === activeLineIndex ? 'active' : 'inactive'}`}>{l.text}</div>) : <div style={{textAlign:'center', fontSize:'2.5rem', opacity:0.3, fontWeight:900}}>{plainLyrics || lyricStatus}</div>}
                      <div style={{ height: '10vh' }} />
                  </div>
              )}
              <div style={{ position: 'absolute', bottom: '6vh', left: '4vw', right: '4vw', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '3vw', alignItems: 'center' }}>
                      <img src={currentArt} className="reflect-image" style={{ width: '20vw', height: '20vw', borderRadius: '30px' }} />
                      <div><h1 style={{ fontSize: '4vw', fontWeight: 950, margin: '0' }}>{nowPlaying?.name}</h1><h3 style={{ fontSize: '2vw', opacity: 0.8 }}>{nowPlaying?.artist}</h3><div style={{ width: '30vw', height: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', marginTop: '3vh', overflow:'hidden' }}><div style={{ width: `${progress}%`, height: '100%', background: 'white', transition: 'width 0.5s linear' }} /></div></div>
                  </div>
                  <div style={{ background: 'white', padding: '2vw', borderRadius: '40px', textAlign: 'center', width: '20vw' }}>
                      <img alt="JOIN PARTY" src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://jukebox.boldron.info/guest')}`} style={{ width: '100%' }} />
                      <div style={{ color: 'black', fontWeight: 950, fontSize: '1rem', marginTop: '1vh' }}>JOIN THE PARTY</div>
                  </div>
              </div>
          </div>
      )}

      {/* --- 3. MONITOR VIEW --- */}
      {viewMode === 'monitor' && (
          <div style={{ position: 'relative', zIndex: 10, height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10vh 8vw' }}>
              <div style={{ position: 'absolute', top: '4vh', right: '4vw' }}>
                  {queue[0] && (
                    <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src={queue[0].albumArt || RECORD_PLACEHOLDER} style={{ width: '60px', height: '60px', borderRadius: '10px' }} />
                        <div><div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 900 }}>UP NEXT</div><div style={{ fontSize: '1.2rem', fontWeight: 950 }}>{queue[0].name}</div></div>
                    </div>
                  )}
              </div>
              <div style={{ maxWidth: '80vw' }}>
                  <h1 style={{ fontSize: '7vw', margin: 0, fontWeight: 950, lineHeight: 1 }}>{nowPlaying?.name}</h1>
                  <h2 style={{ fontSize: '3.5vw', opacity: 0.9, color: '#D4AF37', marginTop: '1vh' }}>{nowPlaying?.artist}</h2>
                  <div style={{ width: '100%', height: '15px', background: 'rgba(255,255,255,0.15)', borderRadius: '30px', marginTop: '4vh', overflow:'hidden' }}><div style={{ width: `${progress}%`, height: '100%', background: 'white', transition: 'width 0.5s linear' }} /></div>
              </div>
              <div className="qr-pill" style={{ position: 'absolute', bottom: '6vh', right: '5vw' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent('https://jukebox.boldron.info/guest')}`} style={{ width: '70px', height: '70px' }} />
                  <div style={{ color: 'black', fontWeight: 900, fontSize: '0.8rem', lineHeight: 1.2 }}>SCAN TO<br/>REQUEST</div>
              </div>
          </div>
      )}

      {/* --- RESTORED DEBUG OVERLAY --- */}
      {showDebug && ( 
        <div style={{ position: 'fixed', bottom: '2vh', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'rgba(0,0,0,0.85)', padding: '8px 25px', borderRadius: '50px', color: '#0f0', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #0f0', boxShadow: '0 0 20px rgba(0,255,0,0.2)', pointerEvents: 'none', letterSpacing: '1px' }}>
          🛠️ v2.0.0 | Q: {queue.length} | {viewMode.toUpperCase()} | LYRICS: {syncedLyrics.length > 0 ? 'SYNC' : plainLyrics ? 'PLAIN' : 'OFF'}
        </div> 
      )}
    </div>
  );
}