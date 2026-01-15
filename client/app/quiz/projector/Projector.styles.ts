import React from 'react';

export const styles: Record<string, React.CSSProperties> = {
  stage: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', transition: 'background 0.8s ease', position: 'relative', overflow: 'hidden' },
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontSize: '1.5rem' },
  audioPrompt: { position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', zIndex: 100, color:'#fff' },
  
  // Header
  header: { padding: '40px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: '1.8rem', fontWeight: 900, color: '#fff', letterSpacing: 4 },
  liveStatus: { display: 'flex', alignItems: 'center', gap: 15, color: '#fff', fontWeight: 700, opacity: 0.8, letterSpacing: 2 },
  pulseDot: { width: 12, height: 12, borderRadius: '50%', boxShadow: '0 0 10px rgba(255,255,255,0.5)' },
  
  mainContent: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 80px', position: 'relative' },
  
  // Question Card
  qCard: { background: '#fff', width: '100%', borderRadius: 40, padding: 60, boxShadow: '0 40px 100px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' },
  qImageContainer: { width: '400px', height: '400px', borderRadius: 20, overflow: 'hidden', border: '5px solid #eee', flexShrink: 0 },
  qImage: { width: '100%', height: '100%', objectFit: 'cover' },
  qMeta: { color: '#46178f', fontWeight: 900, letterSpacing: 4, marginBottom: 20 },
  qTitle: { color: '#111', fontWeight: 900, margin: '0 0 40px 0', lineHeight: 1.1 },
  optionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  optItem: { background: '#f5f5f5', padding: 30, borderRadius: 20, fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center' },
  timerTrack: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: 15, background: '#eee' },
  timerFill: { height: '100%', background: '#ffa600', animationName: 'timer', animationTimingFunction: 'linear', animationFillMode: 'forwards' },
  
  // Results & Leaderboard
  resultsReveal: { textAlign: 'center', width: '100%', maxWidth: 1000 },
  revealLabel: { color: '#fff', fontSize: '1.2rem', marginBottom: 20, fontWeight: 700, letterSpacing: 3 },
  answerBanner: { padding: '40px 60px', borderRadius: 25, color: '#fff', fontSize: '3rem', fontWeight: 900, marginBottom: 40, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  leaderboardBox: { background: 'rgba(255,255,255,0.05)', padding: 40, borderRadius: 30, backdropFilter: 'blur(20px)', textAlign: 'left' },
  leaderRow: { display: 'flex', color: '#fff', fontSize: '2rem', padding: '15px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', justifyContent: 'space-between', alignItems: 'center' },
  roundPoints: { fontSize: '1.2rem', color: '#2ecc71', fontWeight: 900, background: 'rgba(46, 204, 113, 0.2)', padding: '5px 15px', borderRadius: 20 },

  // Podium
  podiumContainer: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  podiumTitle: { fontSize: '6rem', fontWeight: 900, color: '#f1c40f', marginBottom: 20, textShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  podiumStage: { display: 'flex', alignItems: 'flex-end', gap: 20, height: '500px' },
  podiumColumn: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' },
  podiumBar: { width: '100%', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '30px', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
  podiumName: { color: '#fff', fontSize: '2rem', fontWeight: 900, marginBottom: 20, textAlign: 'center' },
  podiumRank: { fontSize: '5rem', fontWeight: 900, opacity: 0.5, color: '#000' },
  podiumScore: { fontSize: '1.8rem', fontWeight: 900, marginTop: 'auto', marginBottom: '30px', color: '#000' },
  
  // Listen / Lobby Center Stage
  centerStage: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  // New Listen Wrapper for perfect centering
  listenWrapper: { position: 'relative', width: 600, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pulseContainer: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 },
  listenTextContent: { position: 'relative', zIndex: 10, textAlign: 'center', textShadow: '0 10px 30px #000' },
  
  bigListen: { fontSize: '10rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: -5, lineHeight: 1 },
  subListen: { fontSize: '2.5rem', color: 'rgba(255,255,255,0.8)', marginTop: 20, fontWeight: 700 },
  
  // Lobby Specifics
  lobbyView: { display: 'flex', alignItems: 'center', gap: 80, color: '#fff', background: 'rgba(255,255,255,0.05)', padding: 60, borderRadius: 40, backdropFilter: 'blur(10px)' },
  qrSide: { padding: 20, background: '#fff', borderRadius: 30 },
  qr: { width: 300, height: 300, display: 'block' },
  joinText: { textAlign: 'left' },
  playerCount: { marginTop: 30, background: '#fff', color: '#000', padding: '10px 20px', borderRadius: 10, display: 'inline-block', fontWeight: 900, fontSize: '1.2rem' },
  
  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' },
  tickerLabel: { background: '#ffa600', color: '#000', height: '100%', padding: '0 40px', display: 'flex', alignItems: 'center', fontWeight: 900, letterSpacing: 2, fontSize: '1.2rem', marginRight: 40 },
  tickerScroll: { display: 'flex', gap: 80, overflow: 'hidden', alignItems: 'center', flex: 1 },
  tickerItem: { color: '#fff', fontSize: '1.5rem', fontWeight: 500, whiteSpace: 'nowrap' }
};