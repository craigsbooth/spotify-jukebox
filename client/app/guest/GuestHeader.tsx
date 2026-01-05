'use client';
import React, { useState, useEffect, useRef } from 'react';
import { styles } from './guest_ui';
import { API_URL } from '../config';

interface HeaderProps {
  partyName: string;
  guestName: string;
  isEditingName: boolean;
  tokensEnabled: boolean;
  tokenBalance: number;
  nextInSeconds: number;
  showMetadata: boolean;
  showLyrics: boolean;
  setShowMetadata: (val: boolean) => void;
  setShowLyrics: (val: boolean) => void;
  setIsEditingName: (val: boolean) => void;
  setGuestName: (val: string) => void;
  handleNameUpdate: (e?: React.FormEvent) => void;
  formatTime: (sec: number) => string;
}

export const GuestHeader = (props: HeaderProps) => {
  const [track, setTrack] = useState<any>(null);
  const [djMode, setDjMode] = useState<any>({});
  
  // LYRICS STATE
  const [rawLyrics, setRawLyrics] = useState<any>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<any[]>([]); 
  const [activeLineIndex, setActiveLineIndex] = useState(-1); // Tracks which line is active
  
  // 1. DATA SYNC: Poll Server for Track & DJ Data
  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const [resTrack, resDj] = await Promise.all([
            fetch(`${API_URL}/current`),
            fetch(`${API_URL}/dj-status`)
        ]);
        const trackData = await resTrack.json();
        const djData = await resDj.json();
        
        // Reset lyrics if track changes
        setTrack((prev: any) => {
            if (prev?.uri !== trackData?.uri) {
                setSyncedLyrics([]);
                setActiveLineIndex(-1);
            }
            return trackData;
        });
        setDjMode(djData);
      } catch (e) { console.error("Header Sync Error", e); }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 2000); // Matched Projector poll rate
    return () => clearInterval(interval);
  }, []);

  // 2. LYRICS FETCH & PARSE (Exact Projector Logic)
  useEffect(() => {
    if (props.showLyrics && track?.name) {
        const artistName = track.artists?.[0]?.name || track.artist;
        if (artistName) {
            fetch(`${API_URL}/lyrics?track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(artistName)}`)
                .then(res => res.json())
                .then(data => {
                    setRawLyrics(data);
                    
                    if (data.syncedLyrics && typeof data.syncedLyrics === 'string') {
                        // PROJECTOR PARSING LOGIC
                        const lines = data.syncedLyrics.split('\n').map((l: string) => {
                            const m = l.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
                            return m ? { 
                                time: parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3].padEnd(3, '0')) / 1000, 
                                text: l.replace(/\[.*\]/, '').trim() 
                            } : null;
                        }).filter((x: any) => x && x.text !== "");
                        
                        setSyncedLyrics(lines);
                    } else {
                         setSyncedLyrics([]); 
                    }
                })
                .catch(() => {
                    setRawLyrics(null);
                    setSyncedLyrics([]);
                });
        }
    }
  }, [props.showLyrics, track?.uri, track?.name]);

  // 3. HIGH-FREQUENCY SYNC TIMER (Exact Projector Logic)
  useEffect(() => {
    const progInt = setInterval(() => {
      if (!track?.startedAt || syncedLyrics.length === 0) return;
      
      // Calculate exact seconds elapsed since the song started (Server Time)
      const elapsed = Date.now() - track.startedAt;
      const secondsElapsed = elapsed / 1000;

      // Find the last line that has passed
      const idx = syncedLyrics.findLastIndex((l: any) => l.time <= secondsElapsed);
      
      if (idx !== -1 && idx !== activeLineIndex) {
        setActiveLineIndex(idx);
      }
    }, 50); // Updates 20 times a second for smooth sync

    return () => clearInterval(progInt);
  }, [track?.startedAt, syncedLyrics, activeLineIndex]);

  // 4. WINDOW LOGIC: Show Previous 1, Current, Next 2
  const getWindowedLines = () => {
      if (syncedLyrics.length === 0) return null;

      const activeIdx = activeLineIndex;
      
      // Handle edge cases (Intro/Outro)
      const displayIdx = activeIdx === -1 ? 0 : activeIdx;

      // Define Window
      const start = Math.max(0, displayIdx - 1);
      const end = Math.min(syncedLyrics.length, displayIdx + 3);
      
      return {
          lines: syncedLyrics.slice(start, end),
          activeId: activeIdx >= 0 ? syncedLyrics[activeIdx]?.time : -999
      };
  };

  const windowView = getWindowedLines();

  return (
    <header style={{...styles.header, flexDirection: 'column', gap: '15px', padding: '20px', background: 'linear-gradient(180deg, #000 0%, #111 100%)', borderBottom: '1px solid #333'}}>
      {/* TOP ROW */}
      <div style={{display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={styles.partyName}>{props.partyName}</div>
        
        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            {props.tokensEnabled && (
                <div style={{
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid #D4AF37',
                    padding: '6px 12px',
                    borderRadius: '30px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '60px'
                }}>
                    <div style={{fontSize: '0.8rem', fontWeight: 900, color: '#D4AF37'}}>🪙 {props.tokenBalance}</div>
                    {props.tokenBalance < 10 && (
                        <div style={{fontSize: '0.5rem', opacity: 0.7, fontWeight: 700}}>+{props.formatTime(props.nextInSeconds)}</div>
                    )}
                </div>
            )}

            {props.isEditingName ? (
                <form onSubmit={(e) => { e.preventDefault(); props.handleNameUpdate(e); }}>
                    <input 
                        style={{...styles.inputField, padding: '8px 15px', width: '90px', marginBottom: 0, fontSize: '0.8rem', borderRadius: '30px'}}
                        value={props.guestName}
                        autoFocus
                        onBlur={() => props.handleNameUpdate()}
                        onChange={(e) => props.setGuestName(e.target.value)}
                    />
                </form>
            ) : (
                <div style={styles.guestPill} onClick={() => props.setIsEditingName(true)}>👤 {props.guestName}</div>
            )}
        </div>
      </div>

      {/* NOW PLAYING CARD */}
      {track && (
          <div style={{ width: '100%', background: '#222', borderRadius: '12px', padding: '15px', border: '1px solid #444', display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                 <img 
                    src={track.album?.images?.[0]?.url || track.albumArt || track.image || '/placeholder.png'} 
                    style={{ width: '50px', height: '50px', borderRadius: '8px' }} 
                    alt="Album Art" 
                 />
                 <div style={{ flex: 1, overflow: 'hidden' }}>
                     <div style={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                     <div style={{ color: '#D4AF37', fontSize: '0.9rem' }}>{track.artists?.[0]?.name || track.artist}</div>
                 </div>
             </div>

             {/* EXPANDED METADATA */}
             {props.showMetadata && (
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '10px', borderTop: '1px solid #333', fontSize: '0.75rem' }}>
                     <div><span style={{color:'#888'}}>BPM:</span> <span style={{color:'#fff'}}>{djMode.bpm || '--'}</span></div>
                     <div><span style={{color:'#888'}}>KEY:</span> <span style={{color:'#fff'}}>{djMode.key || '--'}</span></div>
                     <div><span style={{color:'#888'}}>LABEL:</span> <span style={{color:'#fff'}}>{djMode.publisher || '--'}</span></div>
                     <div><span style={{color:'#888'}}>RELEASED:</span> <span style={{color:'#fff'}}>{djMode.releaseDate || '--'}</span></div>
                 </div>
             )}

             {/* LIVE SYNCED LYRICS VIEW */}
             {props.showLyrics && (
                 <div style={{ paddingTop: '15px', borderTop: '1px solid #333', minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                     {windowView ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center', width: '100%' }}>
                            {windowView.lines.map((line: any, idx: number) => {
                                const isActive = line.time === windowView.activeId;
                                return (
                                    <div key={line.time + '-' + idx} style={{ 
                                        color: isActive ? '#D4AF37' : '#555', 
                                        fontSize: isActive ? '1.1rem' : '0.85rem',
                                        fontWeight: isActive ? 900 : 400,
                                        transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                        opacity: isActive ? 1 : 0.6,
                                        transition: 'all 0.2s ease', // Faster transition for snappier feel
                                        minHeight: '20px'
                                    }}>
                                        {line.text}
                                    </div>
                                );
                            })}
                        </div>
                     ) : (
                        <div style={{ width: '100%' }}>
                             <div style={{ fontSize: '0.65rem', color: '#555', textAlign: 'center', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                 Sync Unavailable
                             </div>
                             <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#aaa', lineHeight: '1.4', maxHeight: '180px', overflowY: 'auto' }} className="no-scrollbar">
                                {rawLyrics?.plainLyrics || "No lyrics available."}
                             </div>
                        </div>
                     )}
                 </div>
             )}
          </div>
      )}

      {/* BUTTON ROW */}
      <div style={{display: 'flex', gap: '10px', width: '100%', justifyContent: 'center'}}>
          <button 
            onClick={() => props.setShowMetadata(!props.showMetadata)}
            style={{
                background: props.showMetadata ? '#D4AF37' : 'rgba(255,255,255,0.05)',
                color: props.showMetadata ? '#000' : '#fff',
                border: 'none', padding: '8px 20px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', flex: 1
            }}>INFO / DATA</button>
          <button 
            onClick={() => props.setShowLyrics(!props.showLyrics)}
            style={{
                background: props.showLyrics ? '#D4AF37' : 'rgba(255,255,255,0.05)',
                color: props.showLyrics ? '#000' : '#fff',
                border: 'none', padding: '8px 20px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', flex: 1
            }}>LYRICS</button>
      </div>
    </header>
  );
};