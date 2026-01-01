'use client';
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    document.title = `${partyName} Guest`;
  }, [partyName]);

  // 1. GUEST AUTH & CONTINUOUS SYNC
  useEffect(() => {
    let gid = localStorage.getItem('jukebox_guest_id');
    const gname = localStorage.getItem('jukebox_guest_name') || 'Guest';
    
    if (!gid) { 
        gid = 'g-' + Math.random().toString(36).substr(2, 9); 
        localStorage.setItem('jukebox_guest_id', gid); 
    }
    
    setGuestId(gid);
    setGuestName(gname);

    const interval = setInterval(() => {
        fetch(`${API_URL}/dj-status`).then(res => res.json()).then(setNowPlaying);
        fetch(`${API_URL}/queue`).then(res => res.json()).then(setQueue);
        fetch(`${API_URL}/name`).then(res => res.json()).then(d => setPartyName(d.name));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    if (!votedUris.includes(track.uri)) {
        setVotedUris(prev => [...prev, track.uri]);
    }
    const res = await fetch(`${API_URL}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...track, guestId })
    });
    const data = await res.json();
    if (data.success && searchQuery) {
        setResults([]);
        setSearchQuery('');
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

  return (
    <div style={styles.masterContainer}>
      <style dangerouslySetInnerHTML={{__html: styles.globalStyles}} />
      
      {/* 1. IDENTITY HEADER */}
      <header style={styles.header}>
        <div style={styles.partyName}>{partyName}</div>
        {isEditingName ? (
            <form onSubmit={handleNameUpdate}>
                <input 
                    style={{...styles.inputField, padding: '8px 15px', width: '120px', marginBottom: 0, fontSize: '0.8rem', borderRadius: '30px'}}
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
      </header>

      {/* 2. NOW PLAYING - PRO MOBILE DISPLAY */}
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

      {/* 3. SEARCH - THE PRIMARY ACTION */}
      <div style={styles.searchSection}>
        <input 
            style={styles.inputField} 
            placeholder="Tap to search music..." 
            value={searchQuery} 
            onChange={e => handleSearch(e.target.value)} 
        />
      </div>

      {/* 4. DYNAMIC INTERACTION ZONE (QUEUE vs SEARCH) */}
      <div style={{flex: 1}}>
        <h3 style={styles.sectionTitle}>{searchQuery ? 'SEARCH RESULTS' : 'STATION QUEUE'}</h3>
        
        {(searchQuery ? results : queue).map((t, i) => {
            const hasVoted = votedUris.includes(t.uri);
            const isPriority = !t.isFallback; 
            const showTrending = isPriority && !searchQuery;

            return (
                <div 
                    key={t.uri + i} 
                    style={{
                        ...styles.trackRow(hasVoted),
                        // FIXED: Using longhand properties to avoid shorthand conflict
                        borderLeftWidth: showTrending ? '4px' : '1px',
                        borderLeftColor: showTrending ? '#D4AF37' : styles.trackRow(hasVoted).borderColor,
                        background: showTrending ? 'rgba(212, 175, 55, 0.08)' : styles.trackRow(hasVoted).background,
                    }}
                >
                    <div style={{display: 'flex', gap: '14px', alignItems: 'center', flex: 1, overflow: 'hidden'}}>
                        <img src={t.albumArt} style={{width: '45px', height: '45px', borderRadius: '10px'}} />
                        <div style={{overflow: 'hidden'}}>
                            <div style={{fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                {t.name}
                                {showTrending && <span style={{color: '#D4AF37', fontSize: '0.55rem', marginLeft: '6px', verticalAlign: 'middle'}}>🔥 TRENDING</span>}
                            </div>
                            <div style={{fontSize: '0.75rem', opacity: 0.5, fontWeight: 600}}>
                                {t.artist} {t.addedBy && isPriority && <span style={{fontSize: '0.6rem', opacity: 0.4}}>• via {t.addedBy}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => handleRequest(t)} style={styles.voteBtn(hasVoted)}>
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