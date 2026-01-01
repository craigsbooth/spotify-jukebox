import React from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { styles, MetricBar } from './dashboard_ui';
import pkg from '../package.json';

interface DashboardProps { state: any; handlers: any; }

// --- SUB-COMPONENT: LOGISTICS (COLUMN 1) ---
const LogisticsPanel = ({ state, handlers }: DashboardProps) => (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <div style={styles.card}>
            <span style={styles.label}>Priority Queue ({state.queue.length})</span>
            <div style={{ maxHeight: '450px', overflowY: 'auto' }} className="no-scrollbar">
                {state.queue.map((t: any, i: number) => (
                    <div key={i} style={styles.qItem(!!t.isFallback)}>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{t.name}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{t.artist}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {!t.isFallback && (
                                <>
                                    <button onClick={() => handlers.reorder(i, 'up')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🔼</button>
                                    <button onClick={() => handlers.reorder(i, 'down')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🔽</button>
                                </>
                            )}
                            <button onClick={() => handlers.removeItem(t.uri)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Fallback Pool moved to Column 3 (Configuration) */}
    </section>
);

// --- SUB-COMPONENT: COMMAND DECK (COLUMN 2) ---
const CommandDeck = ({ state, handlers }: DashboardProps) => {
    const dj = state.djStatus || {};
    const isScanning = dj.publisher?.includes('Scanning') || dj.bpm === '--';

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={styles.card}>
                <span style={styles.label}>Playback Console</span>
                <div style={{ background: '#000', borderRadius: '20px', padding: '20px', marginBottom: '25px', border: '1px solid #D4AF3722' }}>
                    <title>Playback Control</title>
                    <SpotifyPlayer token={state.token} uris={state.currentTrack ? [state.currentTrack] : []} play={true} callback={handlers.onPlayerCallback} styles={{ activeColor: '#D4AF37', bgColor: '#000', color: '#fff' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    <button style={styles.btn(true)} onClick={handlers.skipTrack}>Skip Track ⏩</button>
                    {/* Projector Button moved to Column 3 (Configuration) */}
                </div>
            </div>

            <div style={styles.djCard(state.isDjMode)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span style={styles.label}>Digital DJ Engine</span>
                    <span style={{ color: state.isDjMode ? '#2ecc71' : '#444', fontWeight: 900 }}>{state.isDjMode ? '● ACTIVE' : '○ STANDBY'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '25px' }}>
                    <img src={dj.albumArtwork || '/placeholder.png'} alt="Album Art" style={{ width: '140px', height: '140px', borderRadius: '15px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 950 }}>{dj.message}</div>
                    </div>
                </div>

                {/* CONDITIONAL RENDER: INTELLIGENCE SECTION (Only when DJ is Active) */}
                {state.isDjMode && (
                    <div style={{ marginTop: '25px', borderTop: '1px solid #D4AF3722', paddingTop: '25px' }}>
                        <div style={styles.intelHeader}>
                            <div style={{ fontSize: '0.55rem', color: '#D4AF37', fontWeight: 900, marginBottom: '4px', letterSpacing: '1px' }}>VERIFIED RECORD DATA</div>
                            <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {dj.researchTitle || 'Scanning...'}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D4AF37', marginTop: '2px' }}>{dj.researchArtist || '--'}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#666', marginTop: '8px', borderTop: '1px solid #222', paddingTop: '6px' }}>{dj.researchAlbum || '--'}</div>
                        </div>

                        <div style={styles.lcdGrid}>
                            <div style={styles.lcdCell} className={isScanning ? 'pulse' : ''}>
                                <div style={{ fontSize: '0.55rem', color: '#666', marginBottom: '2px', fontWeight: 900 }}>BPM</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 950, color: '#fff', fontFamily: 'monospace' }}>{dj.bpm || '--'}</div>
                            </div>
                            <div style={styles.lcdCell} className={isScanning ? 'pulse' : ''}>
                                <div style={{ fontSize: '0.55rem', color: '#666', marginBottom: '2px', fontWeight: 900 }}>KEY</div>
                                <div style={{ fontSize: '1.0rem', fontWeight: 950, color: '#D4AF37', fontFamily: 'monospace' }}>{dj.key || 'N/A'}</div>
                            </div>
                        </div>

                        <div style={styles.registryBox} className={isScanning ? 'pulse' : ''}>
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 900 }}>PUBLISHER</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dj.publisher || 'Independent'}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 900 }}>ISRC REGISTRY</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 950, color: '#D4AF37', fontFamily: 'monospace' }}>{dj.isrc || '--'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 900 }}>RELEASE DATE</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#eee' }}>{dj.releaseDate || '--'}</div>
                                </div>
                            </div>
                        </div>
                        <MetricBar label="Vibe Intensity" value={dj.valence} color="#2ecc71" />
                    </div>
                )}

                <button style={{ ...styles.btn(state.isDjMode), width: '100%', marginTop: '25px', height: '60px' }} onClick={handlers.toggleDJ}>
                    {state.isDjMode ? 'DISABLE DJ ENGINE' : 'ENABLE DIGITAL DJ'}
                </button>
            </div>
        </section>
    );
};

// --- SUB-COMPONENT: STATION CONFIG & FALLBACK (COLUMN 3) ---
const IntelligencePanel = ({ state, handlers }: DashboardProps) => {
    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {/* MOVED: STATION CONFIGURATION */}
            <div style={styles.configCard}>
                <span style={styles.label}>STATION CONFIGURATION</span>
                
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: 900, marginBottom: '8px' }}>PROJECTOR ACTIVE VIEW</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        {['standard', 'monitor', 'carousel'].map(m => ( 
                            <button 
                                key={m} 
                                style={{ ...styles.btn(state.viewMode === m), fontSize: '0.6rem', padding: '8px' }} 
                                onClick={() => handlers.changeView(m)}
                            >
                                {m.toUpperCase()}
                            </button> 
                        ))}
                    </div>
                    {/* MOVED: PROJECTOR BUTTON */}
                    <button 
                        style={{ ...styles.outlineBtn, width: '100%', height: '35px', fontSize: '0.7rem' }} 
                        onClick={() => window.open('/projector', '_blank')}
                    >
                        OPEN PROJECTOR 📺
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#888', fontWeight: 900 }}>PROJECTOR LYRICS</label>
                            <span style={{ fontSize: '0.6rem', color: state.showLyrics ? '#2ecc71' : '#666', fontWeight: 900 }}>
                                {state.showLyrics ? 'VISIBLE' : 'HIDDEN'}
                            </span>
                        </div>
                        <button 
                            style={{ ...styles.btn(state.showLyrics), width: '100%', height: '35px', fontSize: '0.7rem' }} 
                            onClick={handlers.toggleLyrics}
                        >
                            {state.showLyrics ? 'DISABLE LYRICS' : 'ENABLE LYRICS'}
                        </button>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.6rem', color: '#888', fontWeight: 900 }}>STATION IDENTITY</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                            <input style={{ ...styles.input, height: '35px', fontSize: '0.8rem' }} value={state.nameInput} onChange={e => handlers.setNameInput(e.target.value)} />
                            <button style={{ ...styles.btn(true), height: '35px', padding: '0 15px', fontSize: '0.7rem' }} onClick={handlers.saveStationName}>SAVE</button>
                        </div>
                    </div>
                    
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#888', fontWeight: 900 }}>AUTO-CROSSFADE</label>
                            <span style={{ fontSize: '0.6rem', color: '#D4AF37', fontWeight: 900 }}>{state.crossfadeSec}s</span>
                        </div>
                        <input type="range" min="2" max="15" style={{ width: '100%' }} value={state.crossfadeSec} onChange={e => handlers.updateMixer(parseInt(e.target.value))} />
                    </div>
                </div>
            </div>

            {/* MOVED: FALLBACK POOL SETTINGS */}
            <div style={styles.card}>
                <span style={styles.label}>FALLBACK POOL: {state.fallbackName}</span>
                <form onSubmit={handlers.searchPlaylists} style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                    <input style={styles.input} value={state.playlistQuery} onChange={e => handlers.setPlaylistQuery(e.target.value)} placeholder="Search playlists..." />
                    <button type="submit" style={{ ...styles.btn(true), padding: '0 15px' }}>SEARCH</button>
                </form>
                <div style={styles.playlistGrid}>
                    {state.playlistResults.map((p: any) => (
                        <div key={p.id} onClick={() => handlers.setFallback(p)} style={styles.playlistItem} className="playlist-item">
                            <img src={p.image} alt="" style={styles.playlistArt} />
                            <div style={{ fontSize: '0.65rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden' }}>{p.name}</div>
                        </div>
                    ))}
                </div>
                <button 
                    onClick={() => handlers.setFallback({ id: 'refresh', name: state.fallbackName })}
                    style={{ ...styles.outlineBtn, width: '100%', marginTop: '15px', fontSize: '0.65rem' }}
                >
                    🔄 PURGE & SHUFFLE POOL
                </button>
            </div>
        </section>
    );
};

// --- MAIN VIEW ---
export const DashboardView: React.FC<DashboardProps> = ({ state, handlers }) => {
    return (
        <div style={styles.master}>
            <style dangerouslySetInnerHTML={{ __html: styles.global }} />
            
            {state.isLocked && ( 
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(15px)' }}>
                    <form onSubmit={handlers.handleUnlock} style={{textAlign:'center'}}>
                        <div style={{fontSize:'3rem', marginBottom:'10px'}}>🔒</div>
                        <h3 style={{color:'#D4AF37', letterSpacing:'2px', marginBottom:'20px'}}>CONSOLE LOCKED</h3>
                        <input type="password" autoFocus style={{...styles.input, fontSize:'2rem', textAlign:'center', width:'180px'}} value={state.pinInput} onChange={e => handlers.setPinInput(e.target.value)} placeholder="••••" />
                    </form>
                </div> 
            )}

            <header style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                    <div>
                        <h1 style={{ margin: 0, color: '#D4AF37', fontSize: '1.4rem', fontWeight: 950 }}>{state.partyName}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                            <small style={{ opacity: 0.5, fontWeight: 800 }}>v{pkg.version}</small>
                            <div style={{ padding: '4px 12px', background: state.isWakeLocked ? '#2ecc71' : '#333', color: state.isWakeLocked ? '#000' : '#888', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 950 }}>
                                {state.isWakeLocked ? '● STATION ACTIVE' : 'STATION IDLE'}
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button style={styles.outlineBtn} onClick={() => handlers.setIsLocked(true)}>LOCK CONSOLE</button>
                    <button style={styles.btn(true)} onClick={() => window.location.reload()}>RE-SYNC</button>
                </div>
            </header>

            <main style={styles.grid}>
                <LogisticsPanel state={state} handlers={handlers} />
                <CommandDeck state={state} handlers={handlers} />
                <IntelligencePanel state={state} handlers={handlers} />
            </main>
        </div>
    );
};