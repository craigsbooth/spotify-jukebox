import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

export const useJukeboxState = (isAuthorized: boolean) => {
  const [token, setToken] = useState('');
  const [queue, setQueue] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState('standard');
  const [partyName, setPartyName] = useState('Station Alpha');
  const [isDjMode, setIsDjMode] = useState(false);
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  
  // RESTORED: Needed for "Performance Active" logic
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  
  // RESTORED: Needed for Crossfader
  const [crossfadeSec, setCrossfadeSec] = useState(0);

  const [karaokeQueue, setKaraokeQueue] = useState<any[]>([]);
  const [karaokeSuggestions, setKaraokeSuggestions] = useState<any[]>([]);
  const [djStatus, setDjStatus] = useState<any>({ message: 'Initializing...' });
  const [tokensEnabled, setTokensEnabled] = useState(false);
  
  const [tokensInitial, setTokensInitial] = useState(5);
  const [tokensPerHour, setTokensPerHour] = useState(2);
  const [tokensMax, setTokensMax] = useState(10);
  
  const [showLyrics, setShowLyrics] = useState(false);

  const [playlistQuery, setPlaylistQuery] = useState('');
  const [playlistResults, setPlaylistResults] = useState<any[]>([]);
  const [fallbackName, setFallbackName] = useState('Viva Latino');
  
  const lastActionRef = useRef<number>(0);
  const pendingChanges = useRef<{ [key: string]: number }>({});
  const isStable = (key: string) => (Date.now() - (pendingChanges.current[key] || 0)) > 4000;

  const fetchMetadata = async () => {
    const tRes = await fetch(`${API_URL}/token`);
    const tData = await tRes.json();
    setToken(tData.access_token);

    const themeRes = await fetch(`${API_URL}/theme`);
    const d = await themeRes.json();
    if (isStable('viewMode')) setViewMode(d.theme);
    if (isStable('karaokeMode')) setIsKaraokeMode(!!d.isKaraokeMode);
    
    // Sync restored states from backend
    if (d.showLyrics !== undefined) setShowLyrics(!!d.showLyrics);
    if (d.youtubeId !== undefined) setYoutubeId(d.youtubeId);
    if (d.crossfadeSec !== undefined) setCrossfadeSec(d.crossfadeSec);
    
    setKaraokeQueue(d.karaokeQueue || []);
    setTokensEnabled(!!d.tokensEnabled);

    if (isStable('tokens')) {
        setTokensInitial(d.tokensInitial || 5);
        setTokensPerHour(d.tokensPerHour || 2);
        setTokensMax(d.tokensMax || 10);
    }
    
    if (d.fallbackPlaylist) setFallbackName(d.fallbackPlaylist.name);

    fetch(`${API_URL}/name`).then(res => res.json()).then(n => setPartyName(n.name));
    fetch(`${API_URL}/current`).then(res => res.json()).then(t => setCurrentTrack(t || null));
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchMetadata();
    // REDUCED FREQUENCY: 10s is plenty since SSE handles high-priority updates
    const interval = setInterval(() => {
      if (Date.now() - lastActionRef.current > 3000) {
        fetch(`${API_URL}/queue`).then(res => res.json()).then(setQueue);
        fetch(`${API_URL}/theme`).then(res => res.json()).then(d => {
             setKaraokeQueue(d.karaokeQueue || []);
             // Sync live changes to performance state
             if(d.youtubeId !== undefined) setYoutubeId(d.youtubeId);
        });
      }
      fetch(`${API_URL}/dj-status`).then(res => res.json()).then(setDjStatus);
    }, 10000); // Updated to 10 seconds
    return () => clearInterval(interval);
  }, [isAuthorized]);

  return {
    token, setToken,
    queue, setQueue,
    currentTrack, setCurrentTrack,
    viewMode, setViewMode,
    partyName, setPartyName,
    isDjMode, setIsDjMode,
    isKaraokeMode, setIsKaraokeMode,
    youtubeId, setYoutubeId,     // Exported
    crossfadeSec, setCrossfadeSec, // Exported
    karaokeQueue, setKaraokeQueue,
    karaokeSuggestions, setKaraokeSuggestions,
    djStatus, setDjStatus,
    tokensEnabled, setTokensEnabled,
    tokensInitial, setTokensInitial,
    tokensPerHour, setTokensPerHour,
    tokensMax, setTokensMax,
    showLyrics, setShowLyrics,
    playlistQuery, setPlaylistQuery,
    playlistResults, setPlaylistResults,
    fallbackName, setFallbackName,
    pendingChanges, lastActionRef, fetchMetadata
  };
};