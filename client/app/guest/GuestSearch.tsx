'use client';
import React from 'react';
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
  handleSearch: (q: string) => void;
  handleRequest: (track: any) => void;
}

export const GuestSearch = (props: SearchProps) => {
  const { searchQuery, results, queue, karaokeQueue, isKaraokeMode, showMetadata, votedUris, tokensEnabled, tokenBalance } = props;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={styles.searchSection}>
        <input 
            style={styles.inputField} 
            placeholder={isKaraokeMode ? "Search for Karaoke songs..." : "Tap to search music..."} 
            value={searchQuery} 
            onChange={e => props.handleSearch(e.target.value)} 
        />
      </div>

      {/* REMOVED: "Lyrics Engine Active" Notification Box */}

      <div style={{ flex: 1, paddingBottom: '100px' }}>
        <h3 style={styles.sectionTitle}>
            {searchQuery ? 'SEARCH RESULTS' : (isKaraokeMode ? 'SINGERS LIST' : 'STATION QUEUE')}
        </h3>
        
        {(searchQuery ? results : (isKaraokeMode ? karaokeQueue : queue)).map((t, i) => {
            const trackUri = t.uri || t.id;
            const hasVoted = votedUris.includes(trackUri);
            const isPriority = !t.isFallback; 
            const showTrending = !isKaraokeMode && isPriority && !searchQuery;

            return (
                <div key={`${trackUri}-${i}`} style={{ ...styles.trackRow(hasVoted), borderLeft: showTrending ? '4px solid #D4AF37' : styles.trackRow(hasVoted).borderLeft }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                        <img src={t.albumArt || t.thumb || '/placeholder.png'} style={{ width: '45px', height: '45px', borderRadius: '10px' }} alt="" />
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isKaraokeMode && t.singer ? `🎤 ${t.singer}` : (t.displayName || t.name || t.title)}
                                {showTrending && <span style={{ color: '#D4AF37', fontSize: '0.55rem', marginLeft: '6px' }}>🔥 TRENDING</span>}
                            </div>
                            {/* Always show Artist Name if Metadata is toggled on (default state logic handled in parent) */}
                            {showMetadata && (
                                <div style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 600 }}>
                                    {isKaraokeMode && t.singer ? t.title : (t.displayArtist || t.artist)} 
                                    {t.addedBy && isPriority && !isKaraokeMode && <span style={{ fontSize: '0.6rem' }}> • via {t.addedBy}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={() => props.handleRequest(t)} 
                        disabled={!hasVoted && tokensEnabled && tokenBalance <= 0}
                        style={{
                            ...styles.voteBtn(hasVoted),
                            background: (isKaraokeMode && !hasVoted) ? '#D4AF37' : styles.voteBtn(hasVoted).background,
                            color: (isKaraokeMode && !hasVoted) ? '#000' : styles.voteBtn(hasVoted).color,
                        }}
                    >
                        {hasVoted ? 'VOTED' : (isKaraokeMode ? 'SING' : (searchQuery ? 'ADD' : `▲ ${t.votes || 1}`))}
                    </button>
                </div>
            );
        })}
      </div>
    </div>
  );
};