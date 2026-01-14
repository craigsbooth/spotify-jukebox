'use client';
import React, { useState } from 'react';
import { styles } from './guest_ui'; 

interface SearchProps {
  searchQuery: string;
  results: any[];
  queue: any[];
  karaokeQueue: any[];
  isKaraokeMode: boolean;
  showMetadata: boolean;
  showLyrics: boolean;
  votedUris: string[];
  tokensEnabled: boolean;
  tokenBalance: number;
  nextTokenMinutes?: number; 
  handleSearch: (q: string) => void;
  handleRequest: (track: any) => void;
  // --- NEW: Veto Handler ---
  handleVote?: (track: any, type: 'UP' | 'DOWN') => void;
}

export const GuestSearch = (props: SearchProps) => {
  const { searchQuery, results, queue, karaokeQueue, isKaraokeMode, showMetadata, votedUris, tokensEnabled, tokenBalance, nextTokenMinutes, handleVote } = props;

  // Global check: Is the user completely out of tokens?
  const isWalletEmpty = tokensEnabled && tokenBalance <= 0;

  // Local state for "Optimistic" feedback (buttons disable instantly on click)
  const [localProcessing, setLocalProcessing] = useState<Set<string>>(new Set());

  const onVoteClick = (track: any, type: 'UP' | 'DOWN') => {
      const uri = track.uri || track.id;
      setLocalProcessing(prev => new Set(prev).add(uri));
      
      // Call parent handler
      if (type === 'DOWN' && handleVote) handleVote(track, 'DOWN');
      else if (type === 'UP') props.handleRequest(track);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={styles.searchSection}>
        <input 
            name="search_query"
            autoComplete="off"
            style={styles.inputField} 
            placeholder={isKaraokeMode ? "Search for Karaoke songs..." : "Tap to search music..."} 
            value={searchQuery} 
            onChange={e => props.handleSearch(e.target.value)} 
        />
      </div>

      {/* WALLET EMPTY BANNER */}
      {isWalletEmpty && (
        <div style={{
            background: 'rgba(212, 175, 55, 0.1)', // Low opacity Gold
            borderBottom: '1px solid #D4AF37',
            padding: '12px 15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: '#D4AF37',
            fontSize: '0.85rem',
            fontWeight: 800,
            animation: 'fadeIn 0.5s ease'
        }}>
            <span style={{ fontSize: '1.2rem' }}>⏳</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span>OUT OF TOKENS</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 600 }}>
                    Next coin arriving in {nextTokenMinutes ?? '--'} minutes
                </span>
            </div>
        </div>
      )}

      <div style={{ flex: 1, paddingBottom: '100px' }}>
        <h3 style={styles.sectionTitle}>
            {searchQuery ? 'SEARCH RESULTS' : (isKaraokeMode ? 'SINGERS LIST' : 'STATION QUEUE')}
        </h3>
        
        {(searchQuery ? results : (isKaraokeMode ? karaokeQueue : queue)).map((t, i) => {
            const trackUri = t.uri || t.id;
            const hasVoted = votedUris.includes(trackUri);
            const isProcessing = localProcessing.has(trackUri);
            
            // Priority logic for border styling
            const isPriority = !t.isFallback; 
            const showTrending = !isKaraokeMode && isPriority && !searchQuery;
            
            // LOGIC: System (Radio) vs Human (User)
            const isSystem = t.isFallback || t.addedBy === 'Fallback Track';

            // --- UX REFRESH: BUTTON STATE LOGIC ---
            let btnText = '';
            let btnStyle = {};
            
            // Disable if already voted OR processing a click
            const isDisabled = hasVoted || isProcessing || (!hasVoted && isWalletEmpty);

            if (isKaraokeMode) {
                 btnText = hasVoted ? 'SIGNED UP' : '🎤 SING';
                 btnStyle = hasVoted 
                    ? { background: '#333', color: '#888', border: '1px solid #444' } 
                    : { background: '#D4AF37', color: '#000', fontWeight: '900' };
            
            } else if (hasVoted) {
                 btnText = '✓ VOTED';
                 btnStyle = { background: '#2ecc71', color: '#000', fontWeight: '900', border: 'none' };
            
            } else if (isDisabled && !hasVoted && !isProcessing) {
                 // DYNAMIC WAIT MESSAGE (Only if disabled due to wallet)
                 btnText = `⏳ ${nextTokenMinutes ?? '?'}m`;
                 btnStyle = { opacity: 0.6, cursor: 'not-allowed', background: '#222', color: '#D4AF37', border: '1px solid #333' };
            
            } else if (isProcessing) {
                 btnText = '...';
                 btnStyle = { background: '#333', color: '#888' };

            } else if (searchQuery || isSystem) {
                 btnText = 'ADD +';
                 btnStyle = { background: 'transparent', border: '1px solid #D4AF37', color: '#D4AF37' };
            
            } else {
                 btnText = `▲ UPVOTE (${t.votes || 1})`;
                 btnStyle = { background: '#333', border: '1px solid #666', color: '#fff' };
            }

            // FIX: Construct style object without shorthand conflicts
            const rowStyle = { ...styles.trackRow(hasVoted) };
            if (showTrending) {
                // Use specific properties to avoid 'borderColor' vs 'borderLeft' conflict
                rowStyle.borderLeftColor = '#D4AF37';
                rowStyle.borderLeftWidth = '4px';
                rowStyle.borderLeftStyle = 'solid';
            }

            // --- VETO BUTTON LOGIC ---
            // Only show Veto if:
            // 1. We are in the Queue View (not Search, not Karaoke)
            // 2. The user hasn't voted yet
            // 3. The function exists
            // 4. We are not currently processing a click
            const showVeto = !searchQuery && !isKaraokeMode && !hasVoted && !isProcessing && handleVote;

            return (
                <div key={`${trackUri}-${i}`} style={rowStyle}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                        <img src={t.albumArt || t.thumb || '/placeholder.png'} style={{ width: '45px', height: '45px', borderRadius: '10px' }} alt="" />
                        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isKaraokeMode && t.singer ? `🎤 ${t.singer}` : (t.displayName || t.name || t.title)}
                                {showTrending && <span style={{ color: '#D4AF37', fontSize: '0.55rem', marginLeft: '6px' }}>🔥 TRENDING</span>}
                            </div>
                            
                            {/* ARTIST NAME */}
                            <div style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 600 }}>
                                {isKaraokeMode && t.singer ? t.title : (t.displayArtist || t.artist)}
                            </div>

                            {/* ADDED BY BADGE */}
                            {!searchQuery && !isKaraokeMode && (t.addedBy || isSystem) && (
                                <div style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px',
                                    marginTop: '2px',
                                    background: 'rgba(255,255,255,0.15)', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px',
                                    fontSize: '0.6rem',
                                    color: '#ccc',
                                    width: 'fit-content'
                                }}>
                                    <span>{isSystem ? '📻' : '👤'}</span>
                                    <span>{isSystem ? 'Fallback Track' : t.addedBy}</span>
                                </div>
                            )}

                            {/* EXTRA METADATA */}
                            {showMetadata && (
                                <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '2px' }}>
                                    {t.album || 'Single'} • {t.year || '202X'}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* VETO BUTTON */}
                        {showVeto && (
                            <button
                                onClick={() => onVoteClick(t, 'DOWN')}
                                disabled={isDisabled}
                                style={{
                                    background: 'rgba(255, 50, 50, 0.1)',
                                    border: '1px solid rgba(255, 50, 50, 0.3)',
                                    color: '#ff5555',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    fontSize: '0.8rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                👎
                            </button>
                        )}

                        <button 
                            onClick={() => onVoteClick(t, 'UP')} 
                            disabled={isDisabled}
                            style={{
                                ...styles.voteBtn(hasVoted), 
                                ...btnStyle,                
                                minWidth: '80px',            
                                padding: '0 12px'
                            }}
                        >
                            {btnText}
                        </button>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};