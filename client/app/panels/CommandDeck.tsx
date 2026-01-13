import React, { useMemo } from 'react'; // <--- IMPORT useMemo
import SpotifyPlayer from 'react-spotify-web-playback';
import { styles } from '../dashboard_ui'; 

interface PanelProps { state: any; handlers: any; }

// Helper for search results
const SearchResult = ({ track, onAdd }: { track: any, onAdd: () => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }}>
        <img src={track.albumArt || '/placeholder.png'} style={{ width: '40px', height: '40px', borderRadius: '4px' }} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#888' }}>{track.artist}</div>
        </div>
        <button onClick={onAdd} style={{ background: '#D4AF37', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 900 }}>+</button>
    </div>
);

export const CommandDeck = ({ state, handlers }: PanelProps) => {
    const dj = state.djStatus || {};
    const isScanning = String(dj.publisher || '').includes('Scanning') || dj.bpm === '--';
    const isPerformanceActive = !!state.youtubeId;

    // NEW: Destructure search state
    const { hostSearchQuery, hostSearchResults } = state;

    // --- FIX: MEMOIZE URIS TO PREVENT RESTARTS ---
    // This ensures the player only reloads if the song ID actually changes.
    // Without this, every UI refresh triggers a reload, confusing the auto-skip logic.
    const playerUris = useMemo(() => {
        return state.currentTrack?.uri ? [state.currentTrack.uri] : [];
    }, [state.currentTrack?.uri]);
    // ---------------------------------------------

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 2A. PLAYBACK CONSOLE */}
            <div style={styles.card}>
                <span style={styles.label}>Playback Console</span>
                <div style={{ 
                    background: '#000', 
                    borderRadius: '24px', 
                    padding: '20px', 
                    marginBottom: '20px', 
                    border: '1px solid #D4AF3733',
                    opacity: 1, 
                    pointerEvents: 'auto'
                }}>
                    <SpotifyPlayer 
                        token={state.token} 
                        uris={playerUris} // <--- Use the memoized variable
                        play={true} 
                        callback={handlers.onPlayerCallback} 
                        styles={{ activeColor: '#D4AF37', bgColor: '#000', color: '#fff', trackNameColor: '#fff', sliderColor: '#D4AF37', height: 60 }} 
                    />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: state.isKaraokeMode ? '1fr 1fr' : '1fr', gap: '15px' }}>
                        <button style={{ ...styles.btn(true), height: '70px', fontSize: '1.1rem' }} onClick={handlers.skipTrack}>
                            SKIP MUSIC ⏩
                        </button>
                        {state.isKaraokeMode && (
                            <button 
                                style={{ ...styles.btn(true), height: '70px', fontSize: '1.1rem', background: '#D4AF37', color: '#000' }} 
                                onClick={handlers.popKaraoke}
                            >
                                POP SINGER 🎤
                            </button>
                        )}
                    </div>
                    {state.isKaraokeMode && isPerformanceActive && (
                        <button 
                            style={{ ...styles.outlineBtn, height: '45px', border: '1px solid #f39c12', color: '#f39c12', fontWeight: 900, fontSize: '0.8rem' }}
                            onClick={handlers.stopPerformance}
                        >
                            FINISH PERFORMANCE & RESUME MUSIC 🎵
                        </button>
                    )}
                </div>
            </div>

            {/* DIGITAL DJ ENGINE CARD */}
            <div style={styles.djCard(state.isDjMode)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={styles.label}>Digital DJ Engine</span>
                    <span style={{ color: state.isDjMode ? '#2ecc71' : '#444', fontWeight: 950, fontSize: '0.9rem', letterSpacing: '1px' }}>
                        {state.isDjMode ? '● ONLINE' : '○ STANDBY'}
                    </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '25px', marginBottom: '15px' }}>
                    <img src={dj.albumArtwork || '/placeholder.png'} alt="Art" style={{ width: '150px', height: '150px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 950, lineHeight: 1.1, color: '#fff' }}>{String(dj.message || 'Initializing...')}</div>
                    </div>
                </div>

                {/* ALWAYS VISIBLE CROSSFADER */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #D4AF3722', paddingTop: '20px' }}>
                    <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.7rem', color: '#D4AF37', fontWeight: 900 }}>SMART CROSSFADE</label>
                            <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 900 }}>{state.crossfadeSec || 0} SEC</span>
                        </div>
                        <input 
                            type="range" min="0" max="12" step="1" 
                            value={state.crossfadeSec || 0}
                            onChange={(e) => handlers.setCrossfade(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: '#D4AF37' }}
                        />
                    </div>
                </div>

                {state.isDjMode && (
                    <div>
                        {/* --- NEW: HOST QUICK ADD --- */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                            <span style={{ ...styles.label, marginBottom: '10px' }}>QUICK REQUEST</span>
                            <input 
                                style={{ ...styles.input, height: '40px', marginBottom: '10px', fontSize: '0.85rem' }} 
                                placeholder="Search track..." 
                                value={hostSearchQuery || ''}
                                onChange={(e) => handlers.searchTracks(e.target.value)}
                            />
                            {hostSearchResults && hostSearchResults.length > 0 && (
                                <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }} className="no-scrollbar">
                                    {hostSearchResults.slice(0, 10).map((track: any) => (
                                        <SearchResult 
                                            key={track.uri} 
                                            track={track} 
                                            onAdd={() => {
                                                handlers.addTrack(track);
                                                handlers.searchTracks(''); // Clear after add
                                            }} 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={styles.intelHeader}>
                            <div style={{ fontSize: '0.7rem', color: '#D4AF37', fontWeight: 900, marginBottom: '4px', letterSpacing: '2px' }}>DATA VERIFICATION</div>
                            <div style={{ fontWeight: 950, fontSize: '1.2rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {String(dj.researchTitle || 'Scanning...')}
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#D4AF37' }}>{String(dj.researchArtist || '--')}</div>
                        </div>

                        <div style={styles.lcdGrid}>
                            <div style={styles.lcdCell} className={isScanning ? 'pulse' : ''}>
                                <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 900 }}>BPM</div>
                                <div style={{ fontSize: '2rem', fontWeight: 950, color: '#fff', fontFamily: 'monospace' }}>{dj.bpm || '--'}</div>
                            </div>
                            <div style={styles.lcdCell} className={isScanning ? 'pulse' : ''}>
                                <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 900 }}>KEY</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#D4AF37', fontFamily: 'monospace' }}>{dj.key || 'N/A'}</div>
                            </div>
                        </div>

                        <div style={styles.registryBox} className={isScanning ? 'pulse' : ''}>
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 900 }}>PUBLISHER / LABEL</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#eee' }}>{String(dj.publisher || 'Independent')}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 900 }}>ISRC REGISTRY</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 950, color: '#D4AF37', fontFamily: 'monospace' }}>{String(dj.isrc || '--')}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 900 }}>RELEASE DATE</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#eee' }}>{String(dj.releaseDate || '--')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <button style={{ ...styles.btn(state.isDjMode), width: '100%', marginTop: '25px', height: '60px', fontSize: '1rem' }} onClick={handlers.toggleDJ}>
                    {state.isDjMode ? 'TERMINATE DJ ENGINE' : 'ACTIVATE DIGITAL DJ'}
                </button>
            </div>
        </section>
    );
};