import React from 'react';
import { styles } from './dashboard_ui';
import pkg from '../package.json';

import { LogisticsPanel } from './panels/LogisticsPanel';
import { CommandDeck } from './panels/CommandDeck';
import { IntelligencePanel } from './panels/IntelligencePanel';

interface DashboardProps { state: any; handlers: any; }

export const DashboardView: React.FC<DashboardProps> = ({ state, handlers }) => {
    return (
        <div style={styles.master}>
            <style dangerouslySetInnerHTML={{ __html: styles.global }} />

            {/* 1. PIN LOCK OVERLAY */}
            {state.isLocked && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}>
                    <form onSubmit={handlers.handleUnlock} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🔒</div>
                        <h2 style={{ color: '#D4AF37', letterSpacing: '4px', marginBottom: '30px', fontWeight: 900 }}>STATION LOCKED</h2>
                        <input
                            type="password"
                            autoFocus
                            style={{ ...styles.input, fontSize: '3rem', textAlign: 'center', width: '300px', border: '2px solid #D4AF37' }}
                            value={state.pinInput || ''}
                            onChange={e => handlers.setPinInput(e.target.value)}
                            placeholder="••••"
                        />
                    </form>
                </div>
            )}

            {/* 2. HEADER SECTION */}
            <header style={{ ...styles.header, padding: '15px 40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0, color: '#D4AF37', fontSize: '1.8rem', fontWeight: 950, letterSpacing: '1px' }}>{state.partyName}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                            <small style={{ opacity: 0.6, fontWeight: 900 }}>v{pkg.version}</small>
                            <div style={{
                                padding: '4px 14px',
                                background: state.isKaraokeMode ? '#D4AF37' : (state.isWakeLocked ? '#2ecc71' : '#333'),
                                color: '#000',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 950
                            }}>
                                {state.isKaraokeMode ? '🎤 PERFORMANCE MODE' : (state.isWakeLocked ? '● STATION ACTIVE' : 'STATION ASLEEP')}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    
                    {/* --- VIEW CONTROLS (PROJECTOR & DEBUG) --- */}
                    <div style={{ display: 'flex', gap: '10px', marginRight: '15px', paddingRight: '15px', borderRight: '1px solid #333' }}>
                        <button 
                            style={{ ...styles.outlineBtn, height: '40px', padding: '0 15px', fontSize: '0.85rem' }} 
                            onClick={() => window.open('/projector', '_blank')}
                            title="Launch Projector View"
                        >
                            🎥 PROJECTOR
                        </button>
                        <button 
                            style={{ ...styles.outlineBtn, height: '40px', padding: '0 15px', fontSize: '0.85rem' }} 
                            onClick={() => window.open('/test-lyrics', '_blank')}
                            title="Open Lyrics Debugger"
                        >
                            🕵️ DEBUG
                        </button>
                    </div>

                    {/* --- SYSTEM ACTIONS --- */}
                    <button style={{ ...styles.outlineBtn, height: '40px', padding: '0 20px', borderColor: '#e74c3c', color: '#e74c3c' }} onClick={handlers.handleLogout}>LOGOUT</button>
                    <button style={{ ...styles.outlineBtn, height: '40px', padding: '0 20px' }} onClick={() => handlers.setIsLocked(true)}>LOCK</button>
                    <button
                        style={{ ...styles.btn(true), width: '120px', height: '40px' }}
                        onClick={handlers.handleMaintenanceSync}
                    >
                        RE-SYNC
                    </button>
                </div>
            </header>

            {/* 3. THREE-PANEL GRID SYSTEM */}
            <main style={{
                ...styles.grid,
                gridTemplateColumns: '30% 40% 30%',
                padding: '20px',
                height: 'calc(100vh - 100px)',
                overflowY: 'auto',
                overflowX: 'hidden'
            }} className="no-scrollbar">
                <LogisticsPanel state={state} handlers={handlers} />
                <CommandDeck state={state} handlers={handlers} />
                <IntelligencePanel state={state} handlers={handlers} />
            </main>
        </div>
    );
};