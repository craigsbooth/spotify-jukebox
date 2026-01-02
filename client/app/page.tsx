'use client';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from './config'; 
import { DashboardView } from './DashboardView';
import { styles } from './dashboard_ui'; 

const HOST_PIN = "1234";

export default function Home() {
  const [token, setToken] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [queue, setQueue] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any | null>(null); // UPDATED: Changed from string to object to support metadata/displayName
  const [fallbackName, setFallbackName] = useState('Loading...');
  const [playlistQuery, setPlaylistQuery] = useState('');
  const [playlistResults, setPlaylistResults] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState('standard'); 
  const [partyName, setPartyName] = useState('Station Alpha');
  const [nameInput, setNameInput] = useState('');
  const [crossfadeSec, setCrossfadeSec] = useState(8);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isLocked, setIsLocked] = useState(false); 
  const [isDjMode, setIsDjMode] = useState(false);
  const [isWakeLocked, setIsWakeLocked] = useState(false); 
  const [djStatus, setDjStatus] = useState<any>({ 
    message: 'Initializing...', 
    genres: [], 
    valence: 0,
    publisher: '--',
    isrc: '--' 
  });
  
  const isFetchingNext = useRef(false);
  const hasPlayedRef = useRef(false); 
  const pendingChanges = useRef<{ [key: string]: number }>({});
  const lastActionRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  const setStability = (key: string) => { pendingChanges.current[key] = Date.now(); };
  const isStable = (key: string) => (Date.now() - (pendingChanges.current[key] || 0)) > 4000;

  const requestWakeLock = async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    try { 
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); 
      setIsWakeLocked(true); 
    } catch (err) { setIsWakeLocked(false); }
  };

  useEffect(() => {
    document.title = `${partyName} Host`;
  }, [partyName]);

  useEffect(() => {
    if (localStorage.getItem('jukebox_host_auth') === 'true') setIsAuthorized(true);
    const handleVis = () => { if (document.visibilityState === 'visible' && isAuthorized) requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    requestWakeLock();
    const fetchMetadata = () => {
        fetch(`${API_URL}/token`).then(res => res.json()).then(d => setToken(d.access_token));
        // Properly sync view mode and lyrics status from the unified theme endpoint
        fetch(`${API_URL}/theme`).then(res => res.json()).then(d => { 
            if (isStable('viewMode')) setViewMode(d.theme); 
            if (isStable('lyrics')) setShowLyrics(!!d.showLyrics); 
        });
        fetch(`${API_URL}/fallback`).then(res => res.json()).then(d => setFallbackName(d.name));
        fetch(`${API_URL}/name`).then(res => res.json()).then(d => { setPartyName(d.name); setNameInput(d.name); });
        
        // UPDATED: fetch current track object to get displayName/displayArtist
        fetch(`${API_URL}/current`).then(res => res.json()).then(t => setCurrentTrack(t || null));
    };
    fetchMetadata();
    const interval = setInterval(() => {
        if (Date.now() - lastActionRef.current > 3000) fetch(`${API_URL}/queue`).then(res => res.json()).then(setQueue);
        fetch(`${API_URL}/dj-status`).then(res => res.json()).then(data => {
            setDjStatus(data); 
            if (isStable('djMode')) setIsDjMode(!!data.isDjMode);
            if (isStable('crossfade')) setCrossfadeSec(data.crossfadeSec || 8);
        });
    }, 2000);
    return () => { clearInterval(interval); if (wakeLockRef.current) wakeLockRef.current.release(); };
  }, [isAuthorized]);

  const handlers = {
    handlePinSubmit: (e: any) => { e.preventDefault(); if (pinInput === HOST_PIN) { setIsAuthorized(true); localStorage.setItem('jukebox_host_auth', 'true'); requestWakeLock(); } },
    handleUnlock: (e: any) => { e.preventDefault(); if (pinInput === HOST_PIN) { setIsLocked(false); setPinInput(''); requestWakeLock(); } },
    skipTrack: async () => { if (isFetchingNext.current) return; isFetchingNext.current = true; try { const res = await fetch(`${API_URL}/pop`, { method: 'POST' }); const track = await res.json(); if (track?.uri) setCurrentTrack(track); } finally { setTimeout(() => isFetchingNext.current = false, 2000); } },
    reorder: async (idx: number, dir: string) => { lastActionRef.current = Date.now(); const newIdx = dir === 'up' ? idx - 1 : idx + 1; if (newIdx < 0 || newIdx >= queue.length) return; const newQ = [...queue]; const t = newQ[idx]; newQ[idx] = newQ[newIdx]; newQ[newIdx] = t; setQueue(newQ); await fetch(`${API_URL}/reorder`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ queue: newQ }) }); },
    removeItem: async (uri: string) => { lastActionRef.current = Date.now(); setQueue(prev => prev.filter(t => t.uri !== uri)); await fetch(`${API_URL}/remove`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ uri }) }); },
    toggleDJ: () => { const nv = !isDjMode; setIsDjMode(nv); setStability('djMode'); fetch(`${API_URL}/dj-mode`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ enabled: nv }) }); },
    updateMixer: (val: number) => { setCrossfadeSec(val); setStability('crossfade'); fetch(`${API_URL}/theme`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ crossfadeSec: val }) }); },
    toggleLyrics: () => { 
        const nv = !showLyrics; 
        setShowLyrics(nv); 
        setStability('lyrics'); 
        fetch(`${API_URL}/theme`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ showLyrics: nv }) 
        }); 
    },
    changeView: (m: string) => { setViewMode(m); setStability('viewMode'); fetch(`${API_URL}/theme`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ theme: m }) }); },
    saveStationName: () => { fetch(`${API_URL}/name`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: nameInput }) }); setPartyName(nameInput); },
    searchPlaylists: (e: any) => { e.preventDefault(); fetch(`${API_URL}/search-playlists?q=${playlistQuery}`).then(res=>res.json()).then(setPlaylistResults); },
    onPlayerCallback: (s: any) => { if (!s.isPlaying && hasPlayedRef.current && s.progressMs === 0) handlers.skipTrack(); if (s.isPlaying) hasPlayedRef.current = true; },
    setFallback: (p: any) => { fetch(`${API_URL}/fallback`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(p) }); setFallbackName(p.name); setPlaylistResults([]); },
    setPinInput, setPlaylistQuery, setNameInput, setIsLocked
  };

  if (!isAuthorized) return (
    <div style={{ ...styles.master, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handlers.handlePinSubmit} style={{ textAlign: 'center' }}>
        <div style={{fontSize: '4rem', marginBottom: '20px'}}>🔐</div>
        <h2 style={{ color: '#D4AF37', letterSpacing: '4px' }}>SYSTEM ENCRYPTED</h2>
        <input type="password" style={{ ...styles.input, fontSize: '3rem', textAlign: 'center', width: '220px', border: '2px solid #D4AF37' }} value={pinInput} onChange={e => setPinInput(e.target.value)} autoFocus placeholder="PIN" />
      </form>
    </div>
  );

  return <DashboardView state={{ token, queue, currentTrack: currentTrack?.uri || null, trackData: currentTrack, fallbackName, playlistQuery, playlistResults, viewMode, partyName, nameInput, crossfadeSec, showLyrics, isLocked, isDjMode, isWakeLocked, djStatus, pinInput }} handlers={handlers} />;
}