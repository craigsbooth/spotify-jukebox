'use client';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config'; 
import { styles } from './guest_ui';

export default function GuestPage() {
  const [guestId, setGuestId] = useState('');
  const [guestName, setGuestName] = useState('Guest');
  const [isEditingName, setIsEditingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [votedUris, setVotedUris] = useState<string[]>([]);
  const [partyName, setPartyName] = useState('The Pinfold');
  
  // TOKEN SYSTEM STATE
  const [tokensEnabled, setTokensEnabled] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [nextInSeconds, setNextInSeconds] = useState(0);

  useEffect(() => {
    document.title = `${partyName} Guest`;
  }, [partyName]);

  // 1. GUEST AUTH, AUTO-REGISTRATION & CONTINUOUS SYNC
  useEffect(() => {
    let gid = localStorage.getItem('jukebox_guest_id');
    let gname = localStorage.getItem('jukebox_guest_name') || 'Guest';
    
    if (!gid) { 
        gid = 'g-' + Math.random().toString(36).substr(2, 9); 
        localStorage.setItem('jukebox_guest_id', gid); 
    }
    
    setGuestId(gid);
    setGuestName(gname);

    // AUTO-REGISTRATION
    fetch(`${API_URL}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId: gid, name: gname })
    }).then(res => res.json()).then(data => {
        if (data.tokens !== undefined) setTokenBalance(data.tokens);
    }).catch(err => console.error("Auto-join failed:", err));

    const interval = setInterval(() => {
        fetch(`${API_URL}/dj-status`).then(res => res.json()).then(setNowPlaying);
        fetch(`${API_URL}/queue`).then(res => res.json()).then(setQueue);
        fetch(`${API_URL}/name`).then(res => res.json()).then(d => setPartyName(d.name));
        
        // SYNC TOKENS
        fetch(`${API_URL}/tokens?guestId=${gid}`)
            .then(res => res.json())
            .then(data => {
                setTokensEnabled(data.enabled);
                setTokenBalance(data.balance);
                setNextInSeconds(data.nextIn);
            });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. LIVE COUNTDOWN TICKER
  useEffect(() => {
    if (!tokensEnabled || nextInSeconds <= 0) return;
    const timer = setInterval(() => {
        setNextInSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [tokensEnabled, nextInSeconds]);

  const handleNameUpdate = (e: React.FormEvent) => {
    e.preventDefault();
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
    if (q.length < 2) { setResults([]); return; }
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data);
  };

  const handleRequest = async (track: any) => {
    const res = await fetch(`${API_URL}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...track, guestId })
    });
    const data = await res.json();

    if (data.success) {
        if (!votedUris.includes(track.uri)) {
            setVotedUris(prev => [...prev, track.uri]);
        }
        if (searchQuery) {
            setResults([]);
            setSearchQuery('');
        }
        if (data.tokens !== undefined) setTokenBalance(data.tokens);
    } else {
        alert(data.message);
    }
  };

  const sendReaction = (emoji: string) => {
    if (window.navigator.vibrate) window.navigator.vibrate(10); 
    fetch(`${API_URL}/reaction-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
    });
  };

  const formatTime = (totalSeconds: number) => {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.masterContainer}>
      <style dangerouslySetInnerHTML={{__html: styles.globalStyles}} />
      
      {/* 1. IDENTITY HEADER */}
      <header style={styles.header}>
        <div style={styles.partyName}>{partyName}</div>
        
        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            {tokensEnabled && (
                <div style={{
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid #D4AF37',
                    padding: '6px 12px',
                    borderRadius: '30px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '70px'
                }}>
                    <div style={{fontSize: '0.8rem', fontWeight: 900, color: '#D4AF37'}}>
                        🪙 {tokenBalance}
                    </div>
                    {tokenBalance < 10 && (
                        <div style={{fontSize: '0.5rem', opacity: 0.7, fontWeight: 700}}>
                            +{formatTime(nextInSeconds)}
                        </div>
                    )}
                </div>
            )}

            {isEditingName ? (
                <form onSubmit={handleNameUpdate}>
                    <input 
                        style={{...styles.inputField, padding: '8px 15px', width: '100px', marginBottom: 0, fontSize: '0.8rem', borderRadius: '30px'}}
                        value={guestName}
                        autoFocus
                        onBlur={handleNameUpdate}
                        onChange={(e) => setGuestName(e.target.value)}
                    />
                </form>
            ) : (
                <div style={styles.guestPill} onClick={() => setIsEditingName(true)}>
                    👤 {guestName}
                </div>
            )}
        </div>
      </header>

      {/* 2. NOW PLAYING */}
      {nowPlaying && nowPlaying.researchTitle && (
        <div style={styles.nowPlayingSlim}>
            <img src={nowPlaying.albumArtwork || '/placeholder.png'} style={{width: '55px', height: '55px', borderRadius: '15px'}} />
            <div style={{overflow: 'hidden', flex: 1}}>
                <div style={{fontSize: '0.6rem', color: '#D4AF37', fontWeight: 950, marginBottom: '2px'}}>
                    {nowPlaying.bpm} BPM • {nowPlaying.key}
                </div>
                <div style={{fontWeight: 900, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {nowPlaying.researchTitle}
                </div>
                <div style={{fontSize: '0.75rem', opacity: 0.5, fontWeight: 700}}>
                    {nowPlaying.researchArtist}
                </div>
            </div>
        </div>
      )}

      {/* 3. SEARCH */}
      <div style={styles.searchSection}>
        <input 
            style={styles.inputField} 
            placeholder="Tap to search music..." 
            value={searchQuery} 
            onChange={e => handleSearch(e.target.value)} 
        />
      </div>

      {/* 4. TRACK LISTS */}
      <div style={{flex: 1, paddingBottom: '80px'}}>
        <h3 style={styles.sectionTitle}>{searchQuery ? 'SEARCH RESULTS' : 'STATION QUEUE'}</h3>
        
        {(searchQuery ? results : queue).map((t, i) => {
            const hasVoted = votedUris.includes(t.uri);
            const isPriority = !t.isFallback; 
            const showTrending = isPriority && !searchQuery;

            // FIX: Destructure styles to separate shorthand 'borderColor' from specific 'borderLeftColor'
            const baseRowStyle = styles.trackRow(hasVoted);
            const { borderColor, ...otherStyles } = baseRowStyle;

            return (
                <div 
                    key={t.uri + i} 
                    style={{
                        ...otherStyles,
                        borderTopColor: borderColor,
                        borderRightColor: borderColor,
                        borderBottomColor: borderColor,
                        borderLeftWidth: showTrending ? '4px' : '1px',
                        borderLeftColor: showTrending ? '#D4AF37' : borderColor,
                        background: showTrending ? 'rgba(212, 175, 55, 0.08)' : baseRowStyle.background,
                    }}
                >
                    <div style={{display: 'flex', gap: '14px', alignItems: 'center', flex: 1, overflow: 'hidden'}}>
                        <img src={t.albumArt} style={{width: '45px', height: '45px', borderRadius: '10px'}} />
                        <div style={{overflow: 'hidden'}}>
                            <div style={{fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                {t.displayName || t.name}
                                {showTrending && <span style={{color: '#D4AF37', fontSize: '0.55rem', marginLeft: '6px', verticalAlign: 'middle'}}>🔥 TRENDING</span>}
                            </div>
                            <div style={{fontSize: '0.75rem', opacity: 0.5, fontWeight: 600}}>
                                {t.displayArtist || t.artist} {t.addedBy && isPriority && <span style={{fontSize: '0.6rem', opacity: 0.4}}>• via {t.addedBy}</span>}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleRequest(t)} 
                        style={{
                            ...styles.voteBtn(hasVoted),
                            opacity: (!hasVoted && tokensEnabled && tokenBalance <= 0) ? 0.5 : 1
                        }}
                    >
                        {hasVoted ? 'VOTED' : (searchQuery ? 'ADD' : `▲ ${t.votes || 1}`)}
                    </button>
                </div>
            );
        })}
        
        {!searchQuery && queue.length === 0 && (
            <div style={{textAlign: 'center', color: '#333', marginTop: '40px', fontWeight: 800, fontSize: '0.8rem'}}>The queue is ready for requests.</div>
        )}
      </div>

      {/* 5. STICKY REACTION BAR */}
      <div style={styles.reactionBar}>
        {['🔥', '🙌', '💃', '🍻', '❤️', '🕶️', '🌳', '🐑', '🐏','🎶','🎵','🎷','🎤'].map(e => (
            <button key={e} style={styles.reactionIcon} onClick={() => sendReaction(e)}>{e}</button>
        ))}
      </div>
    </div>
  );
}