'use client';
import { useState, useEffect, useRef } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { API_URL } from './config'; 
import pkg from '../package.json';

const HOST_PIN = "1234"; 

interface Track { name: string; artist: string; uri: string; votes: number; addedBy?: string; isFallback?: boolean; }
interface Playlist { id: string; name: string; image: string; owner: string; total: number; }

export default function Home() {
  const [token, setToken] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [fallbackName, setFallbackName] = useState('Loading...');
  const [fallbackTotal, setFallbackTotal] = useState<number>(0);
  const [playlistQuery, setPlaylistQuery] = useState('');
  const [playlistResults, setPlaylistResults] = useState<Playlist[]>([]);
  const [viewMode, setViewMode] = useState('standard'); 
  const [partyName, setPartyName] = useState('The Pinfold');
  const [nameInput, setNameInput] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const [showDebug, setShowDebug] = useState(false); 
  const [isLocked, setIsLocked] = useState(false); 
  const [isShuffling, setIsShuffling] = useState(false); // Feedback for reshuffle
  
  const isFetchingNext = useRef(false);
  const hasPlayedRef = useRef(false); 
  const wakeLock = useRef<any>(null); 
  const lastActionRef = useRef<number>(0); 

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === HOST_PIN) { 
      setIsAuthorized(true); 
      localStorage.setItem('jukebox_host_auth', 'true'); 
      setPinInput(''); 
    } else { 
      alert('Incorrect PIN'); 
      setPinInput(''); 
    }
  };

  const engageLock = () => { setPinInput(''); setIsLocked(true); };
  const handleUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      if (pinInput === HOST_PIN) { 
        setIsLocked(false); 
        setPinInput(''); 
      } else { 
        alert('Incorrect PIN'); 
        setPinInput(''); 
      }
  };

  const fetchQueue = () => {
    if (Date.now() - lastActionRef.current < 3000) return;
    fetch(`${API_URL}/queue`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setQueue(data); })
      .catch(err => console.error("Queue fetch error:", err));
  };

  const handleManualShuffle = async () => {
    setIsShuffling(true);
    try {
      await fetch(`${API_URL}/shuffle`, { method: 'POST' });
      fetchQueue();
      setTimeout(() => setIsShuffling(false), 2000);
    } catch (e) {
      setIsShuffling(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('jukebox_host_auth') === 'true') setIsAuthorized(true);
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    const reqWL = async () => { try { if ('wakeLock' in navigator) wakeLock.current = await (navigator as any).wakeLock.request('screen'); } catch (e) {} };
    reqWL();
    fetchToken();
    fetchCurrentState();
    const tokenInterval = setInterval(fetchToken, 1000 * 60 * 30);
    const queueInterval = setInterval(fetchQueue, 2000);
    return () => { 
      clearInterval(tokenInterval); 
      clearInterval(queueInterval); 
      if (wakeLock.current) wakeLock.current.release(); 
    };
  }, [isAuthorized]);

  const fetchToken = () => fetch(`${API_URL}/token`).then(res => res.json()).then(d => setToken(d.access_token));

  const fetchCurrentState = () => {
      fetch(`${API_URL}/fallback`).then(res => res.json()).then(d => {
          setFallbackName(d.name);
          setFallbackTotal(d.total || 0);
      });
      fetch(`${API_URL}/theme`).then(res => res.json()).then(d => { 
        setViewMode(d.theme || 'standard'); 
        setShowLyrics(!!d.showLyrics); 
        setShowDebug(!!d.showDebug); 
      });
      fetch(`${API_URL}/name`).then(res => res.json()).then(d => { 
        setPartyName(d.name); 
        setNameInput(d.name); 
      });
      fetch(`${API_URL}/current`).then(res => res.json()).then(track => { if (track?.uri) setCurrentTrack(track.uri); });
  };

  const playNextSong = async () => {
    if (isFetchingNext.current) return;
    isFetchingNext.current = true;
    try {
      const res = await fetch(`${API_URL}/pop`, { method: 'POST' });
      const track = await res.json();
      if (track?.uri) { setCurrentTrack(track.uri); hasPlayedRef.current = false; }
    } catch (e) {} finally { setTimeout(() => { isFetchingNext.current = false; }, 2000); }
  };

  const reorderQueue = async (index: number, direction: 'up' | 'down') => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= queue.length || queue[index].isFallback || queue[newIndex].isFallback) return;
      
      lastActionRef.current = Date.now();
      const newQueue = [...queue];
      const temp = newQueue[index];
      newQueue[index] = newQueue[newIndex];
      newQueue[newIndex] = temp;
      setQueue(newQueue);

      await fetch(`${API_URL}/reorder`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ queue: newQueue }) 
      });
  };

  const toggleOverlay = async (key: string, currentVal: boolean) => {
      const newVal = !currentVal;
      if (key === 'showLyrics') setShowLyrics(newVal);
      if (key === 'showDebug') setShowDebug(newVal);
      await fetch(`${API_URL}/theme`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ [key]: newVal }) });
  };

  const searchPlaylists = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(`${API_URL}/search-playlists?q=${encodeURIComponent(playlistQuery)}`).then(res => res.json()).then(setPlaylistResults);
  };

  const setFallback = (playlist: Playlist) => {
    fetch(`${API_URL}/fallback`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ id: playlist.id, name: playlist.name, total: playlist.total }) 
    });
    setFallbackName(playlist.name);
    setFallbackTotal(playlist.total);
    setPlaylistResults([]);
  };

  if (!isAuthorized) return (
    <div style={{ background: '#0a0a0a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <form onSubmit={handlePinSubmit} style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#D4AF37', marginBottom: '20px', letterSpacing: '2px' }}>HOST ACCESS</h2>
        <input type="password" autoFocus value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="PIN" style={{ padding: '20px', fontSize: '2rem', width: '160px', textAlign: 'center', background: '#1a1a1a', border: '2px solid #D4AF37', color: 'white', borderRadius: '12px' }} />
      </form>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: '100px' }}>
      {isLocked && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', backdropFilter: 'blur(15px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
                  <h2 style={{ color: '#D4AF37', marginBottom: '30px' }}>CONSOLE LOCKED</h2>
                  <form onSubmit={handleUnlock}><input type="password" autoFocus value={pinInput} onChange={e => setPinInput(e.target.value)} style={{ padding: '15px', fontSize: '1.5rem', background: '#111', border: '2px solid #333', color: 'white', textAlign: 'center', borderRadius: '8px' }} /></form>
              </div>
          </div>
      )}

      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: '#121212', borderBottom: '1px solid #D4AF37', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div>
            <h1 style={{ margin: 0, color: '#D4AF37', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{partyName} Dashboard</h1>
            <div style={{ display: 'flex', gap: '15px', marginTop: '4px' }}>
                <div style={{ color: '#2ecc71', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ height: '8px', width: '8px', background: '#2ecc71', borderRadius: '50%', boxShadow: '0 0 10px #2ecc71' }}></span> AWAKE</div>
                <div style={{ color: '#666', fontSize: '0.7rem', fontWeight: 800 }}>v{pkg.version}</div>
            </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { fetchToken(); fetchCurrentState(); }} style={{ background: 'transparent', color: '#fff', border: '1px solid #444', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>SYNC</button>
            <button onClick={engageLock} style={{ background: '#D4AF37', color: '#000', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 800 }}>LOCK</button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
        
        <section style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ background: '#181818', borderRadius: '20px', padding: '30px', border: '1px solid #333' }}>
                <SpotifyPlayer token={token} uris={currentTrack ? [currentTrack] : []} play={true} callback={(s) => { if (!s.isPlaying && hasPlayedRef.current && s.progressMs === 0) playNextSong(); if (s.isPlaying) hasPlayedRef.current = true; }} styles={{ activeColor: '#D4AF37', bgColor: '#181818', color: '#fff', loaderColor: '#D4AF37', sliderColor: '#D4AF37', trackArtistColor: '#aaa', trackNameColor: '#fff' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '25px' }}>
                    <button onClick={playNextSong} style={{ padding: '18px', background: '#D4AF37', color: '#000', fontWeight: 900, border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1rem' }}>Next Song ⏩</button>
                    <button onClick={() => window.open('/projector', '_blank')} style={{ padding: '18px', background: '#000', color: '#D4AF37', fontWeight: 900, border: '2px solid #D4AF37', cursor: 'pointer', borderRadius: '12px', fontSize: '1rem' }}>Open Projector 📺</button>
                </div>
            </div>

            <div style={{ background: '#181818', borderRadius: '20px', padding: '30px', border: '1px solid #333', minHeight: '400px' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>PRIORITY QUEUE</span>
                    <span style={{ color: '#D4AF37', fontSize: '0.9rem', background: '#252525', padding: '4px 12px', borderRadius: '20px' }}>{queue.length} Tracks</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {queue.length === 0 ? <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>Queue empty. Searching Fallback...</p> : queue.map((t, i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems: 'center', padding: '15px', background: t.isFallback ? '#111' : '#222', borderRadius: '12px', border: t.isFallback ? '1px dashed #444' : '1px solid #2a2a2a', opacity: t.isFallback ? 0.5 : 1 }}>
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: t.isFallback ? '#888' : '#fff' }}>{t.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>{t.artist} {!t.isFallback && `• ${t.votes} Votes`}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {!t.isFallback ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <button onClick={() => reorderQueue(i, 'up')} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '0.7rem' }}>🔼</button>
                                        <button onClick={() => reorderQueue(i, 'down')} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '0.7rem' }}>🔽</button>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '0.6rem', color: '#D4AF37', border: '1px solid #D4AF37', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, marginRight: '10px' }}>BUFFER</span>
                                )}
                                <button onClick={() => { fetch(`${API_URL}/remove`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ uri: t.uri }) }); fetchQueue(); }} style={{ background: '#331111', color: '#ff4444', border: 'none', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ background: '#181818', borderRadius: '20px', padding: '25px', border: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#888', letterSpacing: '1px' }}>PROJECTOR VIEW MODE</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['standard', 'monitor', 'carousel'].map(m => (
                        <button key={m} onClick={() => { setViewMode(m); fetch(`${API_URL}/theme`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ theme: m }) }); }} style={{ flex: 1, padding: '12px', background: viewMode === m ? '#D4AF37' : '#222', color: viewMode === m ? '#000' : '#fff', border: 'none', fontWeight: 800, borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem' }}>{m.toUpperCase()}</button>
                    ))}
                </div>

                <h3 style={{ margin: '25px 0 15px 0', fontSize: '0.9rem', color: '#888', letterSpacing: '1px' }}>OVERLAYS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '15px' }}>
                    <button onClick={() => toggleOverlay('showLyrics', showLyrics)} style={{ padding: '12px', background: showLyrics ? '#2ecc71' : '#222', color: showLyrics ? '#000' : '#fff', border: 'none', fontWeight: 800, borderRadius: '8px', cursor: 'pointer' }}>LYRICS: {showLyrics ? 'ON' : 'OFF'}</button>
                    <label style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'0.85rem', color: '#aaa', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showDebug} onChange={() => toggleOverlay('showDebug', showDebug)} style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }} /> Show Console Debug
                    </label>
                </div>
            </div>

            <div style={{ background: '#181818', borderRadius: '20px', padding: '25px', border: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#888' }}>PARTY BRANDING</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)} style={{ flex: 1, padding: '12px', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px' }} />
                    <button onClick={() => { fetch(`${API_URL}/name`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: nameInput }) }); setPartyName(nameInput); }} style={{ padding: '12px 25px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                </div>
            </div>

            <div style={{ background: '#181818', borderRadius: '20px', padding: '25px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#888' }}>FALLBACK POOL</h3>
                    <button 
                        onClick={handleManualShuffle}
                        disabled={isShuffling}
                        style={{ 
                            background: isShuffling ? '#2ecc71' : '#333', 
                            color: '#fff', 
                            border: 'none', 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            fontSize: '0.7rem', 
                            fontWeight: 800, 
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        {isShuffling ? 'SHUFFLED! ✅' : '🔄 PURGE & RESHUFFLE'}
                    </button>
                </div>
                <form onSubmit={searchPlaylists} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input placeholder="Search Spotify..." value={playlistQuery} onChange={e => setPlaylistQuery(e.target.value)} style={{ flex: 1, padding: '12px', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px' }} />
                    <button type="submit" style={{ padding: '12px 20px', background: '#D4AF37', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 800 }}>Find</button>
                </form>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px', maxHeight: '450px', overflowY: 'auto', padding: '5px' }} className="no-scrollbar">
                    {playlistResults.map(p => (
                        <div key={p.id} onClick={() => setFallback(p)} style={{ 
                            background: '#222', 
                            padding: '12px', 
                            borderRadius: '12px', 
                            cursor: 'pointer', 
                            textAlign: 'center', 
                            border: '1px solid #2a2a2a',
                            transition: 'transform 0.2s, background 0.2s' 
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#282828'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#222'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <img src={p.image} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            <div style={{ fontSize: '0.65rem', color: '#D4AF37', marginTop: '4px', fontWeight: 800 }}>{p.total} TRACKS</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input:focus { border-color: #D4AF37 !important; }
        button:active { transform: scale(0.98); }
        button:disabled { cursor: not-allowed; opacity: 0.8; }
      `}} />
    </div>
  );
}