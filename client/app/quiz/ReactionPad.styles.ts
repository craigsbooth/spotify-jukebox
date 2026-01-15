import React from 'react';

export const styles: Record<string, React.CSSProperties> = {
  lobby: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#46178f', padding: 20 },
  lobbyTitle: { fontSize: '3.5rem', fontWeight: 900, marginBottom: 40, textAlign: 'center' },
  input: { width: '100%', padding: 25, borderRadius: 12, border: 'none', fontSize: '1.8rem', textAlign: 'center', marginBottom: 20, fontWeight: 900, textTransform: 'uppercase' },
  joinBtn: { width: '100%', padding: 25, background: '#333', color: '#fff', borderRadius: 12, border: 'none', fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer' },
  container: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#000' },
  hud: { padding: '20px', display: 'flex', justifyContent: 'space-between', background: '#111', borderBottom: '1px solid #222' },
  hudTeam: { fontWeight: 900, fontSize: '1.4rem' },
  hudScore: { fontWeight: 900, fontSize: '1.4rem', color: '#ffa600' },
  pad: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  questionView: { width: '100%', height: '100%', display: 'flex', padding: 10 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', flex: 1, gap: 15 },
  answerBtn: { border: 'none', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s', padding: 20 },
  btnIcon: { color: 'white', fontSize: '4rem', marginBottom: 10 },
  optText: { color: 'white', fontSize: '1.2rem', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase' },
  standingsView: { width: '100%', padding: 20, textAlign: 'center' },
  standingsTitle: { color: '#ffa600', fontSize: '2.5rem', fontWeight: 900, marginBottom: 25 },
  standingsList: { display: 'flex', flexDirection: 'column', gap: 12 },
  standingRow: { display: 'flex', justifyContent: 'space-between', padding: '20px 25px', borderRadius: 15, border: '1px solid rgba(255,255,255,0.1)', fontSize: '1.2rem' },
  resultsScreen: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  resultIcon: { fontSize: '8rem', fontWeight: 900, marginBottom: 10 },
  resultTitle: { fontSize: '3.5rem', fontWeight: 900, marginBottom: 10 },
  resultPoints: { fontSize: '1.8rem', fontWeight: 900, opacity: 0.9 },
  waitView: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  waitText: { fontSize: '2rem', fontWeight: 900, marginTop: 50, letterSpacing: 3 },
  statusFooter: { padding: 25, textAlign: 'center', fontWeight: 900, letterSpacing: 2, color: '#444', fontSize: '0.8rem', background: '#080808' }
};