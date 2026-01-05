import React from 'react';
import { styles } from '../dashboard_ui';

interface PanelProps { state: any; handlers: any; }

export const LogisticsPanel = ({ state, handlers }: PanelProps) => {
    const karaokeItems = state.karaokeQueue || [];
    const spotifyItems = state.queue || [];

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            {/* BUG 3 FIX: Only show Singers section when Karaoke Mode is active */}
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
                                        {/* Defensive Hardening: Ensure we only render strings */}
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

            {/* 1B. STANDARD MUSIC QUEUE SECTION */}
            <div style={{ ...styles.card, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={styles.label}>Priority Queue ({spotifyItems.length})</span>
                {/* FIX: Expanded height to fill column and show more items (approx 15) */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', minHeight: '500px' }} className="no-scrollbar">
                    {spotifyItems.length === 0 ? (
                        <div style={{ textAlign: 'center', opacity: 0.3, padding: '60px 0', fontWeight: 800, fontSize: '1.1rem' }}>
                            QUEUE IS EMPTY
                        </div>
                    ) : (
                        spotifyItems.map((t: any, i: number) => (
                            <div key={`s-${i}`} style={styles.qItem(!!t.isFallback)}>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 900, fontSize: '1.1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginBottom: '2px' }}>
                                        {String(t.displayName ?? t.name ?? 'Untitled')}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 700 }}>
                                        {String(t.displayArtist ?? t.artist ?? 'Unknown Artist')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ 
                                        background: '#D4AF37', 
                                        color: '#000', 
                                        padding: '4px 8px', 
                                        borderRadius: '6px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 950 
                                    }}>
                                        {t.votes || 1}v
                                    </div>
                                    {!t.isFallback && (
                                        <>
                                            <button onClick={() => handlers.reorder(i, 'up')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🔼</button>
                                            <button onClick={() => handlers.reorder(i, 'down')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🔽</button>
                                        </>
                                    )}
                                    <button onClick={() => handlers.removeItem(t.uri)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};