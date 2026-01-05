import React from 'react';

// Premium glowing metric bars for Track Intel
export const MetricBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div style={{ marginBottom: '24px' }}> {/* Increased spacing */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 900, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span>{label}</span>
            <span style={{ color, textShadow: `0 0 10px ${color}` }}>{value || 0}%</span>
        </div>
        <div style={{ height: '10px', background: '#111', borderRadius: '10px', overflow: 'hidden', border: '1px solid #222' }}>
            <div style={{ height: '100%', width: `${value || 0}%`, background: color, boxShadow: `0 0 15px ${color}66`, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </div>
    </div>
);

export const styles: any = {
    // Main Container Styling
    master: { 
        minHeight: '100vh', 
        background: '#050505', 
        color: '#fff', 
        fontFamily: "'Inter', sans-serif", 
        paddingBottom: '50px' 
    },
    
    // Responsive Sticky Header
    header: { 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        background: 'rgba(10,10,10,0.9)', 
        backdropFilter: 'blur(20px)', 
        borderBottom: '1px solid #D4AF3744', 
        padding: '20px 5%', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
    },
    
    // FLUID GRID: Automatically switches from 3 columns to 1 column on mobile
    grid: { 
        maxWidth: '1800px', 
        margin: '30px auto', 
        padding: '0 20px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '25px' 
    },
    
    // Standard Card - Enhanced Padding
    card: { 
        background: 'rgba(20,20,20,0.5)', 
        borderRadius: '28px', 
        padding: '35px', 
        border: '1px solid #222', 
        boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        height: 'fit-content'
    },
    
    // Intelligence Report Specialized Blocks
    intelHeader: { 
        marginBottom: '20px', 
        background: '#000', 
        padding: '20px', 
        borderRadius: '16px', 
        border: '1px solid #333' 
    },
    lcdGrid: { 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '15px', 
        marginBottom: '20px' 
    },
    lcdCell: { 
        background: '#111', 
        padding: '18px', 
        borderRadius: '14px', 
        border: '1px solid #333', 
        textAlign: 'center' 
    },
    registryBox: { 
        background: 'rgba(212, 175, 55, 0.05)', 
        border: '1px solid rgba(212, 175, 55, 0.15)', 
        borderRadius: '16px', 
        padding: '20px', 
        marginBottom: '20px' 
    },

    // Configuration Card (Tinted for Setup)
    configCard: { 
        background: 'rgba(212, 175, 55, 0.03)', 
        borderRadius: '28px', 
        padding: '35px', 
        border: '1px solid rgba(212, 175, 55, 0.2)', 
        boxShadow: '0 20px 50px rgba(0,0,0,0.4)' 
    },

    // Dynamic DJ Engine Card
    djCard: (active: boolean) => ({
        background: active ? 'linear-gradient(145deg, #1a1a1a, #0a0a0a)' : 'rgba(20,20,20,0.5)',
        borderRadius: '28px', 
        padding: '35px', 
        border: active ? '2px solid #2ecc71' : '1px solid #222',
        boxShadow: active ? '0 0 50px rgba(46, 204, 113, 0.1)' : 'none', 
        transition: 'all 0.4s ease'
    }),

    // Multi-state Buttons
    btn: (active: boolean = false) => ({ 
        background: active ? '#D4AF37' : '#222', 
        color: active ? '#000' : '#fff', 
        border: 'none', 
        borderRadius: '16px', 
        padding: '16px 24px', 
        fontWeight: 900, 
        fontSize: '0.9rem',
        cursor: 'pointer', 
        transition: '0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
    }),

    outlineBtn: { 
        background: 'transparent', 
        color: '#D4AF37', 
        border: '2px solid #D4AF37', 
        borderRadius: '16px', 
        padding: '12px 20px', 
        fontWeight: 800, 
        cursor: 'pointer',
        fontSize: '0.85rem'
    },
    
    // Fallback Playlist Search UI
    playlistGrid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
        gap: '15px', 
        marginTop: '20px', 
        maxHeight: '400px', 
        overflowY: 'auto', 
        paddingRight: '10px' 
    },
    playlistItem: { 
        background: '#111', 
        borderRadius: '20px', 
        padding: '15px', 
        cursor: 'pointer', 
        border: '1px solid #222', 
        textAlign: 'center', 
        transition: '0.2s'
    },
    playlistArt: { 
        width: '100%', 
        aspectRatio: '1/1', 
        borderRadius: '12px', 
        marginBottom: '10px', 
        objectFit: 'cover'
    },

    // Form Elements - Larger for Touch/Laptop
    input: { 
        width: '100%', 
        padding: '16px 20px', 
        background: '#000', 
        border: '1px solid #333', 
        borderRadius: '14px', 
        color: '#fff',
        fontSize: '1rem',
        boxSizing: 'border-box'
    },
    label: { 
        fontSize: '0.85rem', 
        fontWeight: 900, 
        color: '#D4AF37', 
        letterSpacing: '2.5px', 
        textTransform: 'uppercase', 
        marginBottom: '20px', 
        display: 'block' 
    },
    
    // Queue Item Row
    qItem: (isFallback: boolean) => ({
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '18px',
        background: isFallback ? 'rgba(255,255,255,0.02)' : 'rgba(212, 175, 55, 0.08)', 
        borderRadius: '16px', 
        marginBottom: '12px', 
        border: '1px solid rgba(255,255,255,0.05)'
    }),

    // Global Animations & CSS Overrides
    global: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .playlist-item:hover { border-color: #D4AF37; transform: translateY(-3px); box-shadow: 0 10px 20px rgba(212, 175, 55, 0.15); }
        button:active { transform: scale(0.97); }
        input[type="range"] { accent-color: #D4AF37; cursor: pointer; width: 100%; height: 8px; border-radius: 5px; }
        .pulse { animation: pulse-anim 2s infinite ease-in-out; }
        @keyframes pulse-anim {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.995); }
            100% { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 768px) {
            h1 { font-size: 1.2rem !important; }
            .grid { grid-template-columns: 1fr !important; padding: 10px !important; }
            .header { padding: 15px 20px !important; }
        }
    `
};