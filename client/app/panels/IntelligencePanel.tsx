import React from 'react';
import { styles } from '../dashboard_ui'; 

interface PanelProps { state: any; handlers: any; }

export const IntelligencePanel = ({ state, handlers }: PanelProps) => {
    const [localTokens, setLocalTokens] = React.useState({
        tokensEnabled: state.tokensEnabled,
        tokensInitial: state.tokensInitial,
        tokensPerHour: state.tokensPerHour,
        tokensMax: state.tokensMax
    });

    // RESTORED: Identity State
    const [identityName, setIdentityName] = React.useState(state.partyName || 'The Pinfold');

    React.useEffect(() => {
        setLocalTokens({
            tokensEnabled: state.tokensEnabled,
            tokensInitial: state.tokensInitial,
            tokensPerHour: state.tokensPerHour,
            tokensMax: state.tokensMax
        });
        // Sync local identity state if server updates it
        if (state.partyName) setIdentityName(state.partyName);
    }, [state.tokensEnabled, state.tokensInitial, state.tokensPerHour, state.tokensMax, state.partyName]);

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
            
            {/* RESTORED: STATION IDENTITY CARD */}
            <div style={styles.configCard}>
                <span style={styles.label}>STATION IDENTITY</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        style={{ ...styles.input, height: '40px' }} 
                        value={identityName} 
                        onChange={(e) => setIdentityName(e.target.value)}
                        placeholder="Enter Party Name..."
                    />
                    <button 
                        style={{ ...styles.btn(true), width: '80px', height: '40px', fontSize: '0.8rem' }}
                        onClick={() => handlers.updatePartyName(identityName)}
                    >
                        SAVE
                    </button>
                </div>
            </div>

            {/* 3A. KARAOKE MASTER CONTROL */}
            <div style={styles.configCard}>
                <span style={styles.label}>Karaoke Mode</span>
                <button 
                    style={{ ...styles.btn(state.isKaraokeMode), height: '50px', background: state.isKaraokeMode ? '#D4AF37' : '#111', color: state.isKaraokeMode ? '#000' : '#fff' }}
                    onClick={() => handlers.toggleKaraokeMode(!state.isKaraokeMode)}
                >
                    {state.isKaraokeMode ? '🎤 EXIT KARAOKE' : '🎵 ENTER KARAOKE MODE'}
                </button>
            </div>

            {/* 3C. STATION CONFIGURATION */}
            <div style={styles.configCard}>
                <span style={styles.label}>STATION CONFIG</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {['standard', 'monitor', 'carousel'].map(m => ( 
                            <button key={m} style={{ ...styles.btn(state.viewMode === m), fontSize: '0.7rem', padding: '10px' }} onClick={() => handlers.changeView(m)}>{m.toUpperCase()}</button> 
                        ))}
                    </div>
                    <button style={{ ...styles.outlineBtn, width: '100%', height: '40px', fontSize: '0.8rem' }} onClick={() => window.open('/projector', '_blank')}>LAUNCH PROJECTOR 📺</button>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <label style={{ fontSize: '0.7rem', color: '#888', fontWeight: 900 }}>LYRICS</label>
                            <span style={{ fontSize: '0.7rem', color: state.showLyrics ? '#2ecc71' : '#666', fontWeight: 900 }}>{state.showLyrics ? 'ON' : 'OFF'}</span>
                        </div>
                        <button style={{ ...styles.btn(state.showLyrics), width: '100%', height: '40px', fontSize: '0.8rem' }} onClick={() => handlers.toggleLyrics()}>
                            {state.showLyrics ? 'DISABLE' : 'ENABLE'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 3D. TOKEN ECONOMY */}
            <div style={styles.card}>
                <span style={styles.label}>TOKEN ECONOMY</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button style={{ ...styles.btn(localTokens.tokensEnabled), height: '40px', fontSize: '0.8rem' }} onClick={() => handlers.saveTokenSettings({ ...localTokens, tokensEnabled: !localTokens.tokensEnabled })}>
                        {localTokens.tokensEnabled ? 'DEACTIVATE' : 'ACTIVATE'}
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', opacity: localTokens.tokensEnabled ? 1 : 0.4 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.65rem', color: '#888', fontWeight: 900 }}>START</label>
                            <input type="number" style={{ ...styles.input, height: '35px', fontSize: '0.8rem' }} value={localTokens.tokensInitial || 0} onChange={e => setLocalTokens({...localTokens, tokensInitial: parseInt(e.target.value) || 0})} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.65rem', color: '#888', fontWeight: 900 }}>RATE/HR</label>
                            <input type="number" style={{ ...styles.input, height: '35px', fontSize: '0.8rem' }} value={localTokens.tokensPerHour || 0} onChange={e => setLocalTokens({...localTokens, tokensPerHour: parseInt(e.target.value) || 0})} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.65rem', color: '#888', fontWeight: 900 }}>MAX</label>
                            <input type="number" style={{ ...styles.input, height: '35px', fontSize: '0.8rem' }} value={localTokens.tokensMax || 0} onChange={e => setLocalTokens({...localTokens, tokensMax: parseInt(e.target.value) || 0})} />
                        </div>
                    </div>
                    <button style={{ ...styles.btn(true), height: '35px', fontSize: '0.8rem' }} onClick={() => handlers.saveTokenSettings(localTokens)} disabled={!localTokens.tokensEnabled}>APPLY SETTINGS</button>
                </div>
            </div>

            {/* 3E. FALLBACK POOL */}
            <div style={styles.card}>
                {/* RESTORED: Header with Refresh Button */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span style={styles.label}>FALLBACK POOL</span>
                    <button onClick={handlers.refreshFallback} style={{background:'transparent', border:'none', color:'#f39c12', fontSize:'0.7rem', fontWeight:900, cursor:'pointer'}}>
                        ↻ RE-SHUFFLE
                    </button>
                </div>
                <div style={{fontSize:'0.8rem', color:'#888', marginBottom:'10px', fontWeight:700}}>
                    CURRENT SOURCE: <span style={{color:'#fff'}}>{state.fallbackName}</span>
                </div>

                <form onSubmit={handlers.searchPlaylists} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input style={{...styles.input, height:'35px'}} value={state.playlistQuery || ''} onChange={e => handlers.setPlaylistQuery(e.target.value)} placeholder="Search..." />
                    <button type="submit" style={{ ...styles.btn(true), width: '80px', height:'35px', fontSize:'0.7rem' }}>SEARCH</button>
                </form>
                <div style={styles.playlistGrid}>
                    {state.playlistResults?.slice(0, 4).map((p: any) => (
                        <div 
                            key={p.id} 
                            onClick={() => handlers.setFallback(p)} 
                            style={{ ...styles.playlistItem, cursor: 'pointer', position: 'relative' }}
                        >
                            <img src={p.image} alt="playlist art" style={styles.playlistArt} />
                            <div style={{ fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden' }}>{p.displayName ?? p.name}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};