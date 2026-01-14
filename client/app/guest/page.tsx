'use client';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config'; 
import { styles } from './guest_ui';
import { GuestHeader } from './GuestHeader'; 
import { GuestSearch } from './GuestSearch';
import { ReactionLayer } from './ReactionLayer'; 

export default function GuestPage() {
  const [guestId, setGuestId] = useState('');
  const [guestName, setGuestName] = useState(''); // Default empty to trigger modal
  const [isEditingName, setIsEditingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [votedUris, setVotedUris] = useState<string[]>([]);
  const [partyName, setPartyName] = useState('Jukbox');
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [karaokeQueue, setKaraokeQueue] = useState<any[]>([]);
  const [tokensEnabled, setTokensEnabled] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [nextInSeconds, setNextInSeconds] = useState(0);
  
  // LYRICS & PREFERENCES
  const [showMetadata, setShowMetadata] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [syncedLyrics, setSyncedLyrics] = useState<any[]>([]); 
  const [plainLyrics, setPlainLyrics] = useState(""); 
  const [activeReactions, setActiveReactions] = useState<any[]>([]);

  // --- NEW: SYNC STATE ---
  const [lyricsDelayMs, setLyricsDelayMs] = useState(0);
  
  // --- NEW: WELCOME MODAL STATE ---
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);

  // Ref for SSE Connection to prevent duplicate listeners
  const eventSourceRef = useRef<EventSource | null>(null);

  // --- HELPER: FETCH QUEUE DATA ---
  const refreshData = () => {
    fetch(`${API_URL}/queue`).then(res => res.json()).then(setQueue);
    fetch(`${API_URL}/name`).then(res => res.json()).then(d => setPartyName(d.name));
    
    // Refresh Tokens if we have an ID
    const gid = localStorage.getItem('jukebox_guest_id');
    if (gid) {
        fetch(`${API_URL}/tokens?guestId=${gid}`).then(res => res.json()).then(d => {
            setTokensEnabled(d.enabled); 
            setTokenBalance(d.balance); 
            setNextInSeconds(d.nextIn);
        });
    }
  };

  // --- AUTO-PRUNE VOTED URIS ---
  useEffect(() => {
    setVotedUris(prev => {
        const nextSet = new Set(prev);
        const currentQueueUris = new Set(queue.map(t => t.uri || t.id));
        const currentKaraokeIds = new Set(karaokeQueue.map(t => t.id));

        // 1. Remove votes for songs that are no longer in either queue
        prev.forEach(uri => {
            const stillExists = currentQueueUris.has(uri) || currentKaraokeIds.has(uri);
            if (!stillExists) {
                nextSet.delete(uri);
            }
        });

        // 2. Add votes if the server explicitly says we voted
        queue.forEach(t => {
            if (t.votedBy?.includes(guestId)) nextSet.add(t.uri);
            // NEW: Also check downvotes to disable buttons
            if (t.downvotedBy?.includes(guestId)) nextSet.add(t.uri);
        });

        return Array.from(nextSet);
    });
  }, [queue, karaokeQueue, guestId]);


  // 1. SYNC LOGIC (Hybrid: SSE + Polling)
  useEffect(() => {
    // A. Guest Initialization
    let gid = localStorage.getItem('jukebox_guest_id') || 'g-' + Math.random().toString(36).substr(2, 9);
    let gname = localStorage.getItem('jukebox_guest_name');
    
    if (gname && gname !== 'Guest') {
        setGuestName(gname);
        setShowWelcomeModal(false);
    } else {
        setGuestName('');
        setShowWelcomeModal(true);
    }

    localStorage.setItem('jukebox_guest_id', gid);
    setGuestId(gid); 

    // B. SSE Connection
    const connectSSE = () => {
        if (eventSourceRef.current) eventSourceRef.current.close();
        const es = new EventSource(`${API_URL}/events`);
        eventSourceRef.current = es;

        es.onmessage = (e) => {
            try {
                const { type, payload } = JSON.parse(e.data);

                // INIT: Load everything
                if (type === 'INIT') {
                    if (payload.isKaraokeMode !== undefined) setIsKaraokeMode(!!payload.isKaraokeMode);
                    if (payload.karaokeQueue) setKaraokeQueue(payload.karaokeQueue);
                    if (payload.lyricsDelayMs !== undefined) setLyricsDelayMs(payload.lyricsDelayMs);

                    // --- LYRICS LOGIC ---
                    const l = payload.currentLyrics;
                    if (l) {
                        if (l.synced && l.synced.length > 0) {
                             setSyncedLyrics(l.synced);
                             setPlainLyrics("");
                        } else if (l.plain) {
                             setSyncedLyrics([]);
                             setPlainLyrics(l.plain);
                        } else {
                             setSyncedLyrics([]);
                             setPlainLyrics("Lyrics not available for this song");
                        }
                    } else if (payload.currentTrack) {
                        // Track exists but no lyrics data sent
                        setSyncedLyrics([]);
                        setPlainLyrics("Lyrics not available for this song");
                    }
                }

                if (type === 'NAME_UPDATE') setPartyName(payload.name);
                if (type === 'THEME_UPDATE') {
                      if (payload.isKaraokeMode !== undefined) setIsKaraokeMode(!!payload.isKaraokeMode);
                      if (payload.karaokeQueue) setKaraokeQueue(payload.karaokeQueue);
                      if (payload.lyricsDelayMs !== undefined) setLyricsDelayMs(payload.lyricsDelayMs);
                }
                if (type === 'KARAOKE_MODE') setIsKaraokeMode(!!payload.isKaraokeMode);
                if (type === 'KARAOKE_QUEUE') setKaraokeQueue(payload.karaokeQueue || []);
                
                // --- NEW: RESET ON TRACK CHANGE ---
                if (type === 'CURRENT_TRACK') {
                    // Temporarily clear or show loading state while backend fetches
                    setSyncedLyrics([]);
                    setPlainLyrics("Searching for lyrics..."); 
                }

                if (type === 'REACTION') {
                    const id = payload.id || Date.now();
                    setActiveReactions(prev => [...prev, { id, emoji: payload.emoji, left: Math.random() * 80 + 10 }]);
                    setTimeout(() => setActiveReactions(prev => prev.filter(r => r.id !== id)), 4000);
                }

                // --- LYRICS UPDATE ---
                if (type === 'LYRICS_UPDATE') {
                    const l = payload.lyrics || payload; // Handle wrapper or direct
                    
                    if (l && l.synced && l.synced.length > 0) {
                        setSyncedLyrics(l.synced);
                        setPlainLyrics("");
                    } else if (l && l.plain) {
                        setSyncedLyrics([]);
                        setPlainLyrics(l.plain);
                    } else {
                        // FALLBACK MESSAGE AS REQUESTED
                        setSyncedLyrics([]);
                        setPlainLyrics("Lyrics not available for this song");
                    }
                }
            } catch (err) { console.error("SSE Error:", err); }
        };
    };
    
    // Attempt connection
    try { connectSSE(); } catch (e) {}

    // C. Polling
    refreshData(); // Initial Fetch
    const interval = setInterval(refreshData, 10000); 

    return () => {
        clearInterval(interval);
        if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  // 2. HANDLERS
  const handleJoinParty = () => {
      const nameToSave = guestName.trim() || "Guest";
      setGuestName(nameToSave);
      setShowWelcomeModal(false);
      localStorage.setItem('jukebox_guest_name', nameToSave);
      fetch(`${API_URL}/join`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ guestId, name: nameToSave }) 
      });
  };

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
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data);
  };

  const handleRequest = async (track: any) => {
    if (isKaraokeMode && (!guestName || guestName === "Guest")) {
        alert("Please set your name first!");
        setIsEditingName(true);
        return;
    }

    const isKaraokeRequest = isKaraokeMode || track.isKaraoke;
    const targetEndpoint = isKaraokeRequest ? 'karaoke-queue' : 'queue';
    
    const payload = {
        id: track.id,
        uri: track.uri,
        name: track.name || track.title, 
        artist: track.artist || track.displayArtist || "Unknown Artist",
        album: track.album || "Single",
        albumArt: track.albumArt || track.thumb,
        title: track.title || track.name,
        thumb: track.thumb || track.albumArt,
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
        setTimeout(refreshData, 200); 
    }
  };

  // --- NEW: Handle Veto / Downvote ---
  const handleVote = async (track: any, type: 'UP' | 'DOWN') => {
    if (!guestId) return;
    
    const res = await fetch(`${API_URL}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            uri: track.uri || track.id, 
            guestId, 
            type 
        })
    });

    const data = await res.json();
    if (data.success) {
        // Mark as voted so buttons disable
        setVotedUris(prev => [...prev, track.uri || track.id]);
        setTimeout(refreshData, 200);
    }
  };

  const triggerReaction = (emoji: string) => {
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

  const nextTokenMinutes = Math.ceil(nextInSeconds / 60);

  // --- RENDER ---
  return (
    <div style={{...styles.masterContainer, position: 'relative', overflowX: 'hidden'}}>
      <style dangerouslySetInnerHTML={{__html: styles.globalStyles}} />
      
      {/* 3. WELCOME MODAL OVERLAY */}
      {showWelcomeModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <h1 style={{ color: '#1DB954', fontSize: '2rem', marginBottom: '20px' }}>Join the Party</h1>
            <p style={{ color: '#aaa', marginBottom: '30px', textAlign: 'center' }}>
                Enter your name to start voting and requesting songs.
            </p>
            <input 
                type="text" 
                name="guest_nickname"
                autoComplete="nickname"
                placeholder="Your Name (e.g. Craig)" 
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                autoFocus
                style={{
                    padding: '15px', borderRadius: '30px', border: '2px solid #333',
                    background: '#222', color: 'white', fontSize: '1.2rem', 
                    textAlign: 'center', width: '100%', maxWidth: '300px',
                    marginBottom: '20px', outline: 'none'
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinParty()}
            />
            <button 
                onClick={handleJoinParty}
                disabled={!guestName.trim()}
                style={{
                    padding: '15px 40px', borderRadius: '30px', border: 'none',
                    background: guestName.trim() ? '#1DB954' : '#444',
                    color: guestName.trim() ? 'white' : '#888',
                    fontSize: '1rem', fontWeight: 'bold', cursor: guestName.trim() ? 'pointer' : 'not-allowed'
                }}
            >
                LET'S GO
            </button>
        </div>
      )}

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
        syncedLyrics={syncedLyrics} 
        plainLyrics={plainLyrics}
        lyricsDelayMs={lyricsDelayMs}
        
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
        nextTokenMinutes={nextTokenMinutes}
        handleSearch={handleSearch}
        handleRequest={handleRequest}
        // --- PASSING DOWN THE NEW HANDLER ---
        handleVote={handleVote}
      />

      <div style={styles.reactionBar}>
        {['🔥', '🙌', '💃', '🍻', '❤️', '🕶️', '🎤','🐏','🐑','🌳'].map(e => (
            <button key={e} style={styles.reactionIcon} onClick={() => triggerReaction(e)}>{e}</button>
        ))}
      </div>
    </div>
  );
}