'use client';
import { useState, useEffect, useRef } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { API_URL } from './config'; // Imports the dynamic URL
import pkg from '../package.json';

interface Track { 
    name: string; 
    artist: string; 
    uri: string; 
    votes: number; 
    addedBy?: string; 
}

interface Playlist { id: string; name: string; image: string; owner: string; total: number; }

export default function Home() {
  const [token, setToken] = useState<string>('');
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [fallbackName, setFallbackName] = useState('Loading...');
  const [playlistQuery, setPlaylistQuery] = useState('');
  const [playlistResults, setPlaylistResults] = useState<Playlist[]>([]);
  const [theme, setTheme] = useState('none');
  const [partyName, setPartyName] = useState('The Pinfold');
  const [nameInput, setNameInput] = useState('');
  
  const isFetchingNext = useRef(false);
  const hasPlayedRef = useRef(false); 
  const wakeLock = useRef<any>(null); // Reference for the Screen Wake Lock

  // --- SCREEN WAKE LOCK LOGIC (Prevents Sleep) ---
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
          console.log('✅ Wake Lock is active');
        }
      } catch (err) {
        console.error('❌ Wake Lock failed:', err);
      }
    };

    requestWakeLock();

    // Re-request lock if window becomes visible again (prevents sleep after tabbing back)
    const handleVisibilityChange = () => {
      if (wakeLock.current !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock.current) wakeLock.current.release();
    };
  }, []);

  // --- DATA INITIALIZATION ---
  useEffect(() => {
    document.title = "JukeBox Host";
    
    fetch(`${API_URL}/token`).then(res => res.json()).then(d => setToken(d.access_token));
    fetch(`${API_URL}/fallback`).then(res => res.json()).then(d => setFallbackName(d.name));
    fetch(`${API_URL}/theme`).then(res => res.json()).then(d => setTheme(d.theme));
    
    fetch(`${API_URL}/name`).then(res => res.json()).then(d => {
        setPartyName(d.name);
        setNameInput(d.name);
    });

    const interval = setInterval(() => {
        fetch(`${API_URL}/queue`).then(res => res.json()).then(setQueue);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const playNextSong = async () => {
    if (isFetchingNext.current) return;
    isFetchingNext.current = true;
    try {
      const res = await fetch(`${API_URL}/pop`, { method: 'POST' });
      const track = await res.json();
      if (track?.uri) {
          setCurrentTrack(track.uri);
          hasPlayedRef.current = false; 
      }
    } catch (e) { console.error("Error", e); } 
    finally { setTimeout(() => { isFetchingNext.current = false; }, 2000); }
  };

  const removeTrack = async (uri: string) => {
      setQueue(prev => prev.filter(t => t.uri !== uri));
      await fetch(`${API_URL}/remove`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ uri })
      });
  };

  const moveTrack = async (index: number, direction: number) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= queue.length) return;

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

  const savePartyName = async () => {
      const res = await fetch(`${API_URL}/name`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name: nameInput })
      });
      const data = await res.json();
      setPartyName(data.name);
      alert('Party Name Updated!');
  };

  const searchPlaylists = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!playlistQuery) return;
    try {
        const res = await fetch(`${API_URL}/search-playlists?q=${playlistQuery}`);
        const data = await res.json();
        if (Array.isArray(data)) setPlaylistResults(data);
        else setPlaylistResults([]); 
    } catch (err) { console.error("Network Error:", err); setPlaylistResults([]); }
  };

  const setFallback = async (playlist: Playlist) => {
      await fetch(`${API_URL}/fallback`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ id: playlist.id, name: playlist.name })
      });
      setFallbackName(playlist.name);
      setPlaylistResults([]); setPlaylistQuery('');
      alert(`Fallback updated to: ${playlist.name}`);
  };

  const changeTheme = async (newTheme: string) => {
      setTheme(newTheme);
      await fetch(`${API_URL}/theme`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ theme: newTheme })
      });
  };

  if (!token) return <div style={{padding: 40, textAlign:'center', color:'#666', fontFamily:'sans-serif'}}>Connecting to Server...</div>;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', background: '#f4f4f4', minHeight: '100vh', paddingBottom: '80px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ background: '#121212', padding: '20px', borderBottom: '4px solid #D4AF37', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h1 style={{ margin: 0, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.5rem' }}>{partyName} JukeBox</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '5px' }}>
                    <div style={{ color: '#888', fontSize: '0.9rem' }}>Dashboard</div>
                    
                    {/* STAY AWAKE INDICATOR */}
                    <div style={{ color: '#2ecc71', fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ height: '6px', width: '6px', background: '#2ecc71', borderRadius: '50%' }}></span>
                        AWAKE
                    </div>

                    {/* VERSION BADGE */}
                    <div key={pkg.version} style={{ 
                        color: '#D4AF37', 
                        fontSize: '0.7rem', 
                        background: 'rgba(212, 175, 55, 0.1)', 
                        padding: '2px 8px', 
                        borderRadius: '10px', 
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        fontWeight: 'bold'
                    }}>
                        v{pkg.version}
                    </div>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', color: '#666', fontSize: '0.8rem', textTransform: 'uppercase' }}>Backup Playlist</span>
                <span style={{ color: 'white', fontWeight: 'bold' }}>{fallbackName}</span>
            </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '30px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* PLAYER SECTION */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 15px', fontSize: '1.1rem', color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>Now Playing</h2>
            <div style={{ background: '#222', borderRadius: '8px', padding: '10px', overflow: 'hidden' }}>
                <SpotifyPlayer
                    token={token} 
                    uris={currentTrack ? [currentTrack] : []} 
                    play={true}
                    callback={(state) => {
                        if (state.isPlaying) hasPlayedRef.current = true;
                        if (!state.isPlaying && hasPlayedRef.current && state.progressMs === 0 && state.status === 'READY') playNextSong();
                        if (!state.isPlaying && hasPlayedRef.current && state.status === 'IDLE') playNextSong();
                    }}
                    styles={{ activeColor: '#D4AF37', bgColor: '#222', color: '#fff', loaderColor: '#fff', sliderColor: '#D4AF37', trackNameColor: '#fff' }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <button 
                    onClick={playNextSong} 
                    style={{ padding: '15px', background: '#D4AF37', color: 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem', textTransform: 'uppercase', boxShadow: '0 4px 6px rgba(212, 175, 55, 0.3)' }}
                >
                    Force Next Track ⏩
                </button>
                
                <button 
                    onClick={() => window.open('/projector', '_blank')} 
                    style={{ padding: '15px', background: '#121212', color: '#D4AF37', fontWeight: 'bold', border: '2px solid #D4AF37', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem', textTransform: 'uppercase' }}
                >
                    Open Projector 📺
                </button>
            </div>
        </div>

        {/* QUEUE SECTION */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#222' }}>Up Next</h2>
                <span style={{ background: '#eee', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>{queue.length} Songs</span>
            </div>
            {queue.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#888', fontStyle: 'italic', background: '#f9f9f9', borderRadius: '8px' }}>The queue is empty. Next track will come from <strong>{fallbackName}</strong>.</div>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {queue.map((song, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', background: '#fcfcfc', border: '1px solid #eee', borderRadius: '8px', padding: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '15px', minWidth: '40px' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#D4AF37' }}>{song.votes}</span>
                            <span style={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase' }}>Votes</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#222' }}>{song.name}</div>
                            <div style={{ color: '#666', fontSize: '0.9rem' }}>{song.artist}</div>
                            <div style={{ marginTop: '3px' }}><span style={{ fontSize: '0.7rem', background: '#eef', color: '#446', padding: '2px 6px', borderRadius: '4px', border: '1px solid #dde' }}>👤 Added by {song.addedBy || 'Guest'}</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => moveTrack(i, -1)} disabled={i === 0} style={{ background: '#eee', color: 'black', border: 'none', borderRadius: '4px', padding: '8px', cursor: 'pointer', opacity: i===0 ? 0.3 : 1 }}>▲</button>
                            <button onClick={() => moveTrack(i, 1)} disabled={i === queue.length - 1} style={{ background: '#eee', color: 'black', border: 'none', borderRadius: '4px', padding: '8px', cursor: 'pointer', opacity: i===queue.length-1 ? 0.3 : 1 }}>▼</button>
                            <button onClick={() => { if(window.confirm('Remove this track?')) removeTrack(song.uri); }} style={{ background: '#ffebee', color: '#d32f2f', border: '1px solid #ffcdd2', borderRadius: '4px', padding: '8px', cursor: 'pointer', marginLeft: '10px' }}>🗑️</button>
                        </div>
                    </li>
                    ))}
                </ul>
            )}
        </div>

        {/* SETTINGS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 15px', fontSize: '1rem', color: '#888', textTransform: 'uppercase' }}>Party Name</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} style={{ padding: '10px', flex: 1, border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', color: '#333', background: 'white' }} />
                    <button onClick={savePartyName} style={{ padding: '10px 15px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                </div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 15px', fontSize: '1rem', color: '#888', textTransform: 'uppercase' }}>Visual Theme</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {['none', 'winter', 'party', 'summer'].map(t => (
                        <button key={t} onClick={() => changeTheme(t)} style={{ padding: '12px', border: '2px solid', borderColor: theme === t ? '#D4AF37' : '#eee', background: theme === t ? '#fff8e1' : '#fff', color: theme === t ? '#b38f00' : '#444', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
                    ))}
                </div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 15px', fontSize: '1rem', color: '#888', textTransform: 'uppercase' }}>Change Backup Playlist</h3>
                <form onSubmit={searchPlaylists} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                    <input value={playlistQuery} onChange={(e) => setPlaylistQuery(e.target.value)} placeholder="e.g. '80s Rock'" style={{ padding: '10px', flex: 1, border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', color: '#333', background: 'white' }} />
                    <button type="submit" style={{ padding: '10px 15px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Search</button>
                </form>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {Array.isArray(playlistResults) && playlistResults.slice(0, 4).map(p => (
                        <div key={p.id} onClick={() => setFallback(p)} style={{ cursor: 'pointer', border: '1px solid #eee', padding: '8px', borderRadius: '6px', textAlign: 'center', background: '#fafafa', fontSize: '0.8rem' }}>
                            <img src={p.image || 'https://placehold.co/150x150'} style={{ width: '100%', borderRadius: '4px', marginBottom: '5px' }} />
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold', color: '#333' }}>{p.name}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}