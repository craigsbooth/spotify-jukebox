'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../config'; 

// --- TYPES ---
interface Track {
  id?: string;
  name: string;
  artist: string;
  uri: string;
  albumArt?: string;
  votes: number;
  addedBy?: string;
  votedBy: string[];
}

interface NameResponse {
  name: string;
}

interface QueueResponse {
  success: boolean;
  message: string;
}

export default function Guest() {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [guestId, setGuestId] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [guestName, setGuestName] = useState<string>('Guest');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [partyName, setPartyName] = useState<string>('Pinfold');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    document.title = "Pinfold Guest";

    if (typeof window !== 'undefined') {
      let storedId = localStorage.getItem('jukebox_guest_id');
      if (!storedId) {
        storedId = 'guest_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('jukebox_guest_id', storedId);
      }
      setGuestId(storedId);

      const storedName = localStorage.getItem('jukebox_guest_name');
      if (storedName) {
        setGuestName(storedName);
      } else {
        setTimeout(() => setShowHint(true), 1000);
      }
    }

    fetchQueue();
    fetch(`${API_URL}/name`)
      .then((res) => res.json())
      .then((d: NameResponse) => setPartyName(d.name || 'Pinfold'))
      .catch(() => {});

    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- DATA FETCHING ---
  const fetchQueue = () => {
    fetch(`${API_URL}/queue`)
      .then((res) => res.json())
      .then((data) => {
        setQueue(Array.isArray(data) ? data : []);
      })
      .catch(() => setQueue([]));
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sendReaction = async (emoji: string) => {
    showToast(`Sent ${emoji}!`);
    try {
      await fetch(`${API_URL}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
    } catch (e) {
      console.error("Reaction failed", e);
    }
  };

  // --- SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim()) {
        setIsSearching(true);
        try {
          const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } catch (e) {
          setResults([]);
        }
      } else {
        setIsSearching(false);
        setResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // --- ACTIONS ---
  const saveName = async () => {
    const finalName = tempName.trim() || "Guest";
    setGuestName(finalName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jukebox_guest_name', finalName);
    }
    setIsEditingName(false);
    setShowHint(false);
    try {
      await fetch(`${API_URL}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, name: finalName }),
      });
    } catch (e) {
      console.error("Join event failed", e);
    }
  };

  const handleVoteOrAdd = async (track: Track) => {
    if (!guestId) return;

    try {
      const res = await fetch(`${API_URL}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: track.uri,
          name: track.name,
          artist: track.artist,
          albumArt: track.albumArt,
          guestId,
        }),
      });
      const data: QueueResponse = await res.json();
      if (data.success) {
        setQuery('');
        fetchQueue();
        showToast(data.message || 'Added!', 'success');
      } else {
        showToast(data.message || 'Error', 'error');
      }
    } catch (e) {
      showToast('Connection error', 'error');
    }
  };

  const getButtonStatus = (track: Track) => {
    if (track.votedBy?.includes(guestId)) {
      return { disabled: true, text: "✓ Voted", color: "#1cb954" };
    }
    return { disabled: false, text: "▲ Vote", color: "#D4AF37" };
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', background: '#121212', minHeight: '100vh', color: 'white', paddingBottom: '140px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#000', padding: '15px 15px 10px', borderBottom: '1px solid #333', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h1 style={{ margin: 0, color: '#D4AF37', fontSize: '1.1rem', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '800' }}>{partyName} JukeBox</h1>
          
          {isEditingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                autoFocus 
                placeholder="Name" 
                value={tempName} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempName(e.target.value)} 
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && saveName()} 
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D4AF37', background: '#222', color: 'white', width: '100px', fontSize: '0.9rem' }} 
              />
              <button onClick={saveName} style={{ background: '#D4AF37', border: 'none', borderRadius: '6px', padding: '6px 10px', fontWeight: 'bold', fontSize: '0.8rem', color: 'black', cursor: 'pointer' }}>OK</button>
            </div>
          ) : (
            <div onClick={() => { setTempName(guestName === 'Guest' ? '' : guestName); setIsEditingName(true); }} style={{ display: 'flex', alignItems: 'center', background: '#222', padding: '4px 12px 4px 6px', borderRadius: '30px', cursor: 'pointer', border: '1px solid #333' }}>
              <div style={{ width: '28px', height: '28px', background: '#D4AF37', borderRadius: '50%', color: 'black', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', marginRight: '8px' }}>{guestName.charAt(0).toUpperCase()}</div>
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#ccc' }}>{guestName}</span>
            </div>
          )}
        </div>

        {showHint && !isEditingName && (
          <div style={{ background: 'linear-gradient(90deg, #222, #333)', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', color: '#ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #D4AF37' }}>
            <span>💡 <strong>Tip:</strong> Tap your icon above to add your name!</span>
            <button onClick={() => setShowHint(false)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '1.2rem', padding: '0 0 0 10px', cursor: 'pointer' }}>×</button>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            value={query} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} 
            placeholder="🔍   Search for a song..." 
            data-testid="search-input"
            style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: 'none', background: '#222', color: 'white', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} 
          />
          {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#999', fontSize: '18px', padding: '10px', cursor: 'pointer' }}>✕</button>}
        </div>
      </div>

      {/* CONTENT LIST */}
      <div style={{ padding: '10px' }}>
        <h3 style={{ marginLeft: '10px', color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {isSearching ? 'Search Results' : 'Coming Up Next'}
        </h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {(isSearching ? results : queue).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
              {isSearching ? 'No songs found...' : <><p style={{ fontSize: '1.2rem' }}>The queue is empty.</p><p>Be the DJ! Search above to start the party.</p></>}
            </div>
          ) : (
            (isSearching ? results : queue).map((track, i) => {
              const status = getButtonStatus(track);
              return (
                <li key={track.uri + i} data-testid="track-item" style={{ display: 'flex', alignItems: 'center', background: '#222', marginBottom: '10px', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  {track.albumArt && <img src={track.albumArt} alt="" style={{ width: '50px', height: '50px', borderRadius: '8px', marginRight: '15px', objectFit: 'cover' }} />}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                    <div style={{ color: '#aaa', fontSize: '0.85rem' }}>{track.artist}</div>
                    {!isSearching && (
                      <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'space-between', paddingRight: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#D4AF37' }}>🔥 {track.votes || 0} Votes</span>
                        {track.addedBy && track.addedBy !== 'Guest' && <span style={{ fontSize: '0.7rem', color: '#666' }}>Added by {track.addedBy}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ marginLeft: '10px' }}>
                    {isSearching ? (
                      <button onClick={() => handleVoteOrAdd(track)} style={{ background: '#D4AF37', color: 'black', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', cursor: 'pointer' }}>+</button>
                    ) : (
                      <button onClick={() => !status.disabled && handleVoteOrAdd(track)} disabled={status.disabled} style={{ background: status.disabled ? 'transparent' : '#333', border: status.disabled ? '1px solid transparent' : '1px solid #D4AF37', color: status.color, padding: '8px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', minWidth: '70px', cursor: status.disabled ? 'default' : 'pointer' }}>{status.text}</button>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* REACTION BAR */}
      <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(30,30,30,0.95)', backdropFilter: 'blur(10px)', padding: '10px 15px', borderRadius: '30px', display: 'flex', gap: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid #444', zIndex: 900, overflowX: 'auto', maxWidth: '95vw', whiteSpace: 'nowrap' }}>
        {['🔥', '❤️', '💃', '🕺', '🤘', '🎵', '🎶', '🎤', '🎧', '🍻', '🍹', '🍾', '🥳', '🎉', '✨', '😎'].map((emoji) => (
          <button 
            key={emoji} 
            onClick={() => sendReaction(emoji)} 
            style={{ background: 'transparent', border: 'none', fontSize: '1.8rem', cursor: 'pointer', transition: 'transform 0.1s', padding: '0 5px' }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* TOAST SYSTEM */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#ef5350' : '#333', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 1000, fontWeight: 'bold', fontSize: '0.9rem' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}