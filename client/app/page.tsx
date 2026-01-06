'use client';
import { useState, useEffect, useRef } from 'react';
import { useJukeboxState } from './hooks/useJukeboxState';
import { useJukeboxHandlers } from './hooks/useJukeboxHandlers';
import { DashboardView } from './DashboardView'; 
import { styles } from './dashboard_ui';
import { API_URL } from './config';

export default function Home() {
  // 1. AUTHENTICATION STATE
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // 2. MODULAR STATE HOOK
  const jukeboxState = useJukeboxState(isAuthorized);

  // 3. WAKE LOCK MANAGEMENT
  const requestWakeLock = async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    try { 
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); 
      setIsWakeLocked(true); 
    } catch (err) { setIsWakeLocked(false); }
  };

  useEffect(() => {
    if (localStorage.getItem('jukebox_host_auth') === 'true') setIsAuthorized(true);
    const handleVis = () => { if (document.visibilityState === 'visible' && isAuthorized) requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) requestWakeLock();
  }, [isAuthorized]);

  // 4. MODULAR HANDLERS HOOK
  const setters = {
    setCurrentTrack: jukeboxState.setCurrentTrack,
    setQueue: jukeboxState.setQueue,
    setIsDjMode: jukeboxState.setIsDjMode,
    setIsKaraokeMode: jukeboxState.setIsKaraokeMode,
    setKaraokeQueue: jukeboxState.setKaraokeQueue,
    setKaraokeSuggestions: jukeboxState.setKaraokeSuggestions,
    setTokensEnabled: jukeboxState.setTokensEnabled,
    setTokensInitial: jukeboxState.setTokensInitial, 
    setTokensPerHour: jukeboxState.setTokensPerHour, 
    setTokensMax: jukeboxState.setTokensMax,
    setPlaylistQuery: jukeboxState.setPlaylistQuery,
    setPlaylistResults: jukeboxState.setPlaylistResults,
    setFallbackName: jukeboxState.setFallbackName,
    setShowLyrics: jukeboxState.setShowLyrics,
    setViewMode: jukeboxState.setViewMode,

    // RESTORED: Connecting the new state setters to the handlers
    setPartyName: jukeboxState.setPartyName,
    setCrossfadeSec: jukeboxState.setCrossfadeSec,
    setYoutubeId: jukeboxState.setYoutubeId
  };
  
  const jukeboxHandlers = useJukeboxHandlers(jukeboxState, setters);

  // Helper: Verify PIN against Server
  const verifyPin = async (pin: string) => {
      try {
          // Construct the auth URL by stripping '/api' from the standard API_URL 
          // because auth routes are mounted at root '/'
          const authBase = API_URL.replace(/\/api$/, '');
          const res = await fetch(`${authBase}/verify-pin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin })
          });
          const data = await res.json();
          return data.success;
      } catch (e) {
          console.error("Auth Check Failed:", e);
          return false;
      }
  };

  // 5. LOCAL UI HANDLERS
  const localHandlers = {
    ...jukeboxHandlers,
    handlePinSubmit: async (e: any) => { 
      e.preventDefault(); 
      const isValid = await verifyPin(pinInput);
      if (isValid) { 
        setIsAuthorized(true); 
        localStorage.setItem('jukebox_host_auth', 'true'); 
        setPinInput('');
      } else {
        alert("ACCESS DENIED: Incorrect PIN");
        setPinInput('');
      }
    },
    handleUnlock: async (e: any) => { 
      e.preventDefault(); 
      const isValid = await verifyPin(pinInput);
      if (isValid) { 
          setIsLocked(false); 
          setPinInput(''); 
      } else {
          alert("Incorrect PIN");
          setPinInput('');
      }
    },
    setIsLocked,
    setPinInput
  };

  // 6. RENDER LOGIC
  if (!isAuthorized) return (
    <div style={{ ...styles.master, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={localHandlers.handlePinSubmit} style={{ textAlign: 'center' }}>
        <div style={{fontSize: '4rem', marginBottom: '20px'}}>🔐</div>
        <h2 style={{ color: '#D4AF37', letterSpacing: '4px', fontWeight: 900 }}>SYSTEM ENCRYPTED</h2>
        <input 
          type="password" 
          style={{ ...styles.input, fontSize: '3rem', textAlign: 'center', width: '220px', border: '2px solid #D4AF37' }} 
          value={pinInput} 
          onChange={e => setPinInput(e.target.value)} 
          autoFocus 
          placeholder="PIN" 
        />
      </form>
    </div>
  );

  return (
    <DashboardView 
      state={{ 
        ...jukeboxState, 
        isLocked, 
        isWakeLocked, 
        pinInput 
      }} 
      handlers={localHandlers} 
    />
  );
}