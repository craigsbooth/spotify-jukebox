'use client';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config'; 
import { styles } from './guest_ui';
import { GuestHeader } from './GuestHeader'; 
import { GuestSearch } from './GuestSearch';
import { ReactionLayer } from './ReactionLayer'; 

export default function GuestPage() {
  const [guestId, setGuestId] = useState('');
  const [guestName, setGuestName] = useState('Guest');
  const [isEditingName, setIsEditingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [votedUris, setVotedUris] = useState<string[]>([]);
  const [partyName, setPartyName] = useState('The Pinfold');
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [karaokeQueue, setKaraokeQueue] = useState<any[]>([]);
  const [tokensEnabled, setTokensEnabled] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [nextInSeconds, setNextInSeconds] = useState(0);
  
  // PREFERENCES & REACTION STATE
  const [showMetadata, setShowMetadata] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [activeReactions, setActiveReactions] = useState<any[]>([]);

  // Ref for SSE Connection to prevent duplicate listeners
  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. SYNC LOGIC (Hybrid: SSE + Polling)
  useEffect(() => {
    // A. Guest Initialization
    let gid = localStorage.getItem('jukebox_guest_id') || 'g-' + Math.random().toString(36).substr(2, 9);
    let gname = localStorage.getItem('jukebox_guest_name') || 'Guest';
    localStorage.setItem('jukebox_guest_id', gid);
    setGuestId(gid); 
    setGuestName(gname);

    // B. SSE Connection (The "Fast Path" for Mode/Queue/Reactions)
    const connectSSE = () => {
        if (eventSourceRef.current) eventSourceRef.current.close();
        const es = new EventSource(`${API_URL}/events`);
        eventSourceRef.current = es;

        es.onmessage = (e) => {
            try {
                const { type, payload } = JSON.parse(e.data);

                // Handle Mode & Queue Swaps Instantly
                if (type === 'INIT' || type === 'THEME_UPDATE') {
                    if (payload.isKaraokeMode !== undefined) setIsKaraokeMode(!!payload.isKaraokeMode);
                    if (payload.karaokeQueue) setKaraokeQueue(payload.karaokeQueue);
                }
                if (type === 'KARAOKE_MODE') setIsKaraokeMode(!!payload.isKaraokeMode);
                if (type === 'KARAOKE_QUEUE') setKaraokeQueue(payload.karaokeQueue || []);
                
                // Show Global Reactions
                if (type === 'REACTION') {
                    const id = payload.id || Date.now();
                    setActiveReactions(prev => [...prev, { id, emoji: payload.emoji, left: Math.random() * 80 + 10 }]);
                    setTimeout(() => setActiveReactions(prev => prev.filter(r => r.id !== id)), 4000);
                }
            } catch (err) { console.error("SSE Error:", err); }
        };
    };
    
    // Attempt connection
    try { connectSSE(); } catch (e) {}

    // C. Polling (The "Slow Path" for Tokens/Standard Queue)
    // We keep this because token math and Spotify queue shifts happen independently of our events
    const interval = setInterval(() => {
        fetch(`${API_URL}/queue`).then(res => res.json()).then(setQueue);
        fetch(`${API_URL}/name`).then(res => res.json()).then(d => setPartyName(d.name));
        fetch(`${API_URL}/tokens?guestId=${gid}`).then(res => res.json()).then(d => {
            setTokensEnabled(d.enabled); 
            setTokenBalance(d.balance); 
            setNextInSeconds(d.nextIn);
        });
    }, 3000);

    return () => {
        clearInterval(interval);
        if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  // 2. HANDLERS
  const handleNameUpdate = () => {
    setIsEditingName(false);
    localStorage.setItem('jukebox_guest_name', guestName);
    fetch(`${API_URL}/join`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ guestId, name: guestName }) 
    });
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
        setResults([]);
        return;
    }
    // Context-aware search: Spotify vs YouTube based on mode
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data);
  };

  const handleRequest = async (track: any) => {
    // Force name entry if in Karaoke Mode
    if (isKaraokeMode && (guestName === "Guest" || !guestName)) {
        alert("Please enter your name to sign up for Karaoke!");
        setIsEditingName(true);
        return;
    }

    const isKaraokeRequest = isKaraokeMode || track.isKaraoke;
    const targetEndpoint = isKaraokeRequest ? 'karaoke-queue' : 'queue';
    
    // FIX: Send comprehensive data for both engines (Spotify & Karaoke)
    const payload = {
        id: track.id,
        uri: track.uri,
        
        // STANDARD QUEUE DATA (Required for Spotify)
        name: track.name || track.title, 
        artist: track.artist || track.displayArtist || "Unknown Artist",
        album: track.album || "Single",
        albumArt: track.albumArt || track.thumb,

        // KARAOKE DATA (Required for YouTube)
        title: track.title || track.name,
        thumb: track.thumb || track.albumArt,
        
        // Context
        guestId,
        singer: isKaraokeRequest ? guestName : undefined
    };

    const res = await fetch(`${API_URL}/${targetEndpoint}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
        setVotedUris(prev => [...prev, track.uri || track.id]);
        setResults([]); 
        setSearchQuery(''); 
        if (data.tokens !== undefined) setTokenBalance(data.tokens);
    }
  };

  const triggerReaction = (emoji: string) => {
    // Optimistic UI update (shows immediately for sender)
    const id = Date.now();
    setActiveReactions(prev => [...prev, { id, emoji, left: Math.random() * 80 + 10 }]);
    setTimeout(() => setActiveReactions(prev => prev.filter(r => r.id !== id)), 4000);
    
    fetch(`${API_URL}/reaction-event`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ emoji }) 
    });
  };

  const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = (s % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
  };

  // Helper for Search Component to display "Wait 3m" button
  const nextTokenMinutes = Math.ceil(nextInSeconds / 60);

  return (
    <div style={{...styles.masterContainer, position: 'relative', overflowX: 'hidden'}}>
      <style dangerouslySetInnerHTML={{__html: styles.globalStyles}} />
      <ReactionLayer activeReactions={activeReactions} />
      
      <GuestHeader 
        partyName={partyName}
        guestName={guestName}
        isEditingName={isEditingName}
        tokensEnabled={tokensEnabled}
        tokenBalance={tokenBalance}
        nextInSeconds={nextInSeconds}
        showMetadata={showMetadata}
        showLyrics={showLyrics}
        setIsEditingName={setIsEditingName}
        setGuestName={setGuestName}
        setShowMetadata={setShowMetadata}
        setShowLyrics={setShowLyrics}
        handleNameUpdate={handleNameUpdate}
        formatTime={formatTime}
      />

      <GuestSearch 
        searchQuery={searchQuery}
        results={results}
        queue={queue}
        karaokeQueue={karaokeQueue}
        isKaraokeMode={isKaraokeMode}
        showMetadata={showMetadata}
        showLyrics={showLyrics}
        votedUris={votedUris}
        tokensEnabled={tokensEnabled}
        tokenBalance={tokenBalance}
        nextTokenMinutes={nextTokenMinutes} // Passed Down Here
        handleSearch={handleSearch}
        handleRequest={handleRequest}
      />

      <div style={styles.reactionBar}>
        {['🔥', '🙌', '💃', '🍻', '❤️', '🕶️', '🎤','🐏','🐑','🌳'].map(e => (
            <button key={e} style={styles.reactionIcon} onClick={() => triggerReaction(e)}>{e}</button>
        ))}
      </div>
    </div>
  );
}