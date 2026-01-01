// guest_ui.tsx - Ultra-Premium Mobile Design System (Longhand Border Fix)
import React from 'react';

export const styles: any = {
    masterContainer: { 
        minHeight: '100vh', 
        background: '#050505', 
        color: '#fff', 
        fontFamily: "'Inter', sans-serif", 
        padding: 'env(safe-area-inset-top) 16px 120px 16px', 
        display: 'flex',
        flexDirection: 'column',
        WebkitUserSelect: 'none', 
    },
    
    header: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px 0',
        marginBottom: '20px'
    },
    partyName: { color: '#D4AF37', fontSize: '0.9rem', fontWeight: 950, letterSpacing: '1px', textTransform: 'uppercase' },
    guestPill: { 
        background: 'rgba(255,255,255,0.05)', 
        padding: '8px 14px', 
        borderRadius: '30px', 
        fontSize: '0.75rem', 
        fontWeight: 800, 
        color: '#eee',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)'
    },

    nowPlayingSlim: {
        background: 'linear-gradient(145deg, #161616, #0a0a0a)',
        borderRadius: '24px',
        padding: '14px',
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        border: '1px solid #222',
        marginBottom: '24px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
    },
    
    searchSection: { 
        position: 'sticky', 
        top: '10px', 
        zIndex: 100,
        marginBottom: '30px' 
    },
    inputField: { 
        width: '100%', 
        padding: '18px', 
        background: '#111', 
        border: '1px solid #333', 
        borderRadius: '20px', 
        color: '#fff', 
        fontSize: '1rem',
        fontWeight: 600,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    },

    sectionTitle: { fontSize: '0.7rem', fontWeight: 950, color: '#444', letterSpacing: '2px', marginBottom: '16px', textTransform: 'uppercase' },
    
    // DECOMPOSED BORDER: Prevents conflict with conditional borderLeft overrides
    trackRow: (voted: boolean) => ({ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '14px', 
        background: voted ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255,255,255,0.03)', 
        borderRadius: '20px', 
        marginBottom: '10px', 
        
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: voted ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.05)',
        
        transition: '0.2s ease'
    }),
    
    voteBtn: (active: boolean) => ({
        padding: '10px 20px',
        background: active ? '#D4AF37' : 'rgba(255,255,255,0.05)',
        color: active ? '#000' : '#fff',
        border: 'none',
        borderRadius: '14px',
        fontWeight: 900,
        fontSize: '0.75rem',
        minWidth: '75px',
        textAlign: 'center'
    }),

    reactionBar: {
        position: 'fixed',
        bottom: 'min(30px, env(safe-area-inset-bottom))',
        left: '20px',
        right: '20px',
        background: 'rgba(20, 20, 20, 0.7)',
        backdropFilter: 'blur(30px) saturate(180%)',
        borderRadius: '30px',
        padding: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        zIndex: 1000,
    },
    reactionIcon: { 
        flex: 1,
        fontSize: '1.5rem', 
        background: 'transparent', 
        border: 'none', 
        padding: '12px 0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },

    globalStyles: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;950&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #050505; overscroll-behavior: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input:focus { border-color: #D4AF37 !important; transform: translateY(-2px); }
        button:active { transform: scale(0.92); }
    `
};