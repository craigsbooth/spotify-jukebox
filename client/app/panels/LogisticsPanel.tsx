import React from 'react';
import { styles } from '../dashboard_ui';

interface PanelProps { state: any; handlers: any; }

export const LogisticsPanel = ({ state, handlers }: PanelProps) => {
    // FIX: Type Guard to prevent crash if backend returns an error object instead of an array
    const karaokeItems = Array.isArray(state.karaokeQueue) ? state.karaokeQueue : [];
    const spotifyItems = Array.isArray(state.queue) ? state.queue : [];

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            {/* KARAOKE SECTION */}
            {state.isKaraokeMode && (
                <div style={{ ...styles.card, border: '2px solid #D4AF37', flexShrink: 0 }}>
                    <span style={styles.label}>🎤 SINGERS LIST ({karaokeItems.length})</span>
                    <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }} className="no-scrollbar">
                        {karaokeItems.length === 0 ? (
                            <div style={{ textAlign: 'center', opacity: 0.3, padding: '30px 0', fontWeight: 800, fontSize: '0.9rem' }}>
                                NO SINGERS QUEUED
                            </div>
                        ) : (
                            karaokeItems.map((t: any, i: number) => (
                                <div key={`k-${i}`} style={styles.qItem(false)}>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#D4AF37' }}>{String(t.singer || 'Unknown Singer')}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{String(t.title || 'Unknown Track')}</div>
                                    </div>
                                    <button onClick={() => handlers.removeKaraokeItem(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* PRIORITY QUEUE SECTION */}
            <div style={{ ...styles.card, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={styles.label}>Priority Queue ({spotifyItems.length})</span>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', minHeight: '500px' }} className="no-scrollbar">
                    {spotifyItems.length === 0 ? (
                        <div style={{ textAlign: 'center', opacity: 0.3, padding: '60px 0', fontWeight: 800, fontSize: '1.1rem' }}>
                            QUEUE IS EMPTY
                        </div>
                    ) : (
                        spotifyItems.map((t: any, i: number) => {
                            // LOGIC: Is this a "System" track (Fallback or Promoted Fallback) or a "Human" track?
                            const isSystem = t.isFallback || t.addedBy === 'Fallback Track';

                            return (
                                <div key={`s-${i}`} style={styles.qItem(!!t.isFallback)}>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 900, fontSize: '1.1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginBottom: '2px' }}>
                                            {String(t.displayName ?? t.name ?? 'Untitled')}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 700 }}>
                                            {String(t.displayArtist ?? t.artist ?? 'Unknown Artist')}
                                        </div>
                                        
                                        {/* BADGE LOGIC */}
                                        <div style={{ 
                                            marginTop: '6px', 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            gap: '6px',
                                            background: 'rgba(255,255,255,0.1)', 
                                            padding: '2px 8px', 
                                            borderRadius: '12px',
                                            fontSize: '0.7rem',
                                            color: '#aaa',
                                            fontWeight: 600
                                        }}>
                                            <span>{isSystem ? '📻' : '👤'}</span>
                                            <span>{isSystem ? 'Fallback Track' : `Added by ${t.addedBy || 'Guest'}`}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* VOTE COUNT / SYSTEM ICON */}
                                        <div style={{ 
                                            background: isSystem ? '#444' : '#D4AF37', 
                                            color: isSystem ? '#aaa' : '#000', 
                                            padding: '4px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 950,
                                            minWidth: '30px',
                                            textAlign: 'center'
                                        }}>
                                            {isSystem ? '📻' : `${t.votes || 1}v`}
                                        </div>
                                        
                                        <button onClick={() => handlers.reorder(i, 'up')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🔼</button>
                                        <button onClick={() => handlers.reorder(i, 'down')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🔽</button>
                                        
                                        <button onClick={() => handlers.removeItem(t.uri)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </section>
    );
};