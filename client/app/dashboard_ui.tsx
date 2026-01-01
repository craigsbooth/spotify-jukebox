import React from 'react';

// Premium glowing metric bars for Track Intel
export const MetricBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 900, color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>
            <span>{label}</span>
            <span style={{ color, textShadow: `0 0 10px ${color}` }}>{value || 0}%</span>
        </div>
        <div style={{ height: '6px', background: '#111', borderRadius: '10px', overflow: 'hidden', border: '1px solid #222' }}>
            <div style={{ height: '100%', width: `${value || 0}%`, background: color, boxShadow: `0 0 15px ${color}44`, transition: 'width 1.5s ease' }} />
        </div>
    </div>
);

export const styles: any = {
    // Main Container Styling
    master: { minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif', paddingBottom: '100px' },
    
    // Glassmorphic Header
    header: { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #D4AF3744', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    
    // 3-Column Command Grid
    grid: { maxWidth: '1600px', margin: '30px auto', padding: '0 25px', display: 'grid', gridTemplateColumns: '400px 1fr 400px', gap: '25px' },
    
    // Standard Card
    card: { background: 'rgba(20,20,20,0.5)', borderRadius: '24px', padding: '25px', border: '1px solid #222', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' },
    
    // Intelligence Report Specialized Blocks
    intelHeader: { marginBottom: '15px', background: '#000', padding: '15px', borderRadius: '12px', border: '1px solid #222' },
    lcdGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' },
    lcdCell: { background: '#111', padding: '12px', borderRadius: '10px', border: '1px solid #333', textAlign: 'center' },
    registryBox: { background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.1)', borderRadius: '12px', padding: '15px', marginBottom: '15px' },

    // Configuration Card (Tinted for Setup)
    configCard: { background: 'rgba(212, 175, 55, 0.03)', borderRadius: '24px', padding: '25px', border: '1px solid rgba(212, 175, 55, 0.15)', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' },

    // Dynamic DJ Engine Card
    djCard: (active: boolean) => ({
        background: active ? 'linear-gradient(145deg, #1a1a1a, #0a0a0a)' : 'rgba(20,20,20,0.5)',
        borderRadius: '24px', padding: '25px', border: active ? '2px solid #2ecc71' : '1px solid #222',
        boxShadow: active ? '0 0 40px #2ecc7111' : 'none', transition: 'all 0.4s ease'
    }),

    // Multi-state Buttons (Standard / Active)
    btn: (active: boolean = false) => ({ 
        background: active ? '#D4AF37' : '#222', 
        color: active ? '#000' : '#fff', 
        border: 'none', borderRadius: '12px', padding: '12px 20px', fontWeight: 900, cursor: 'pointer', transition: '0.2s'
    }),

    // Secondary Outline Buttons
    outlineBtn: { 
        background: 'transparent', color: '#D4AF37', border: '1px solid #D4AF37', borderRadius: '12px', padding: '12px 20px', fontWeight: 700, cursor: 'pointer' 
    },
    
    // Fallback Playlist Search UI
    playlistGrid: { 
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '15px', maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' 
    },
    playlistItem: { 
        background: '#111', borderRadius: '16px', padding: '12px', cursor: 'pointer', border: '1px solid #222', textAlign: 'center', transition: '0.2s', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center'
    },
    playlistArt: { 
        width: '100%', height: 'auto', aspectRatio: '1/1', borderRadius: '10px', marginBottom: '8px', objectFit: 'cover', border: '1px solid #333', display: 'block'
    },

    // Form Elements
    input: { width: '100%', padding: '12px 15px', background: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff' },
    label: { fontSize: '0.7rem', fontWeight: 900, color: '#D4AF37', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '15px', display: 'block' },
    
    // Queue Item Row
    qItem: (isFallback: boolean) => ({
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px',
        background: isFallback ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', 
        borderRadius: '12px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.05)'
    }),

    // Small Badges (BPM, Key, Genre)
    badge: { 
        fontSize: '0.65rem', padding: '4px 8px', background: '#333', borderRadius: '6px', color: '#D4AF37', fontWeight: 800, border: '1px solid #444' 
    },
    
    // Global Animations & CSS Overrides
    global: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .playlist-item:hover { border-color: #D4AF37; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(212, 175, 55, 0.1); }
        button:active { transform: scale(0.96); }
        input[type="range"] { accent-color: #D4AF37; cursor: pointer; }
        .pulse { animation: pulse-anim 2s infinite ease-in-out; }
        @keyframes pulse-anim {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.99); }
            100% { opacity: 1; transform: scale(1); }
        }
    `
};