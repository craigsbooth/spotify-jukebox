'use client';

import React, { useState, useEffect } from 'react';

// --- STYLES & ANIMATIONS ---
const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    width: '100vw',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'background 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  ambientGlow: {
    position: 'absolute',
    width: '80vw',
    height: '80vw',
    borderRadius: '50%',
    filter: 'blur(120px)',
    zIndex: 0,
    pointerEvents: 'none',
    transition: 'all 2s ease-in-out',
  },
  header: {
    padding: '50px 80px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: { 
    fontSize: '2rem', 
    fontWeight: 900, 
    color: '#fff', 
    letterSpacing: '6px', 
    textTransform: 'uppercase' 
  },
  statusBadge: { 
    background: 'rgba(255,255,255,0.15)', 
    backdropFilter: 'blur(10px)',
    padding: '12px 30px', 
    borderRadius: '50px', 
    color: '#fff', 
    fontWeight: 700, 
    fontSize: '1.1rem',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  mainStage: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    padding: '0 100px',
  },
  qCard: {
    background: '#fff',
    width: '100%',
    maxWidth: '1200px',
    padding: '60px',
    borderRadius: '50px',
    boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px'
  },
  qHeaderWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '40px',
    width: '100%'
  },
  qTitle: { 
    fontSize: '4.5rem', 
    color: '#111', 
    margin: 0, 
    fontWeight: 900, 
    lineHeight: 1.1,
    letterSpacing: '-2px'
  },
  timerCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '8px solid #f1f2f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#46178f'
  },
  visualClue: {
    width: '300px',
    height: '300px',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    objectFit: 'cover',
    marginBottom: '20px',
    border: '8px solid #f1f2f6'
  },
  listeningView: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  bigListen: { 
    fontSize: '12rem', 
    fontWeight: 900, 
    color: '#fff', 
    margin: 0, 
    letterSpacing: '-5px',
    textShadow: '0 20px 50px rgba(0,0,0,0.3)'
  },
  subListen: { 
    fontSize: '2.5rem', 
    color: 'rgba(255,255,255,0.8)', 
    fontWeight: 700,
    marginTop: -20
  },
  footer: {
    height: '160px',
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(30px)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 80px',
    gap: '40px',
    zIndex: 10,
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },
  teamPill: {
    background: 'rgba(255,255,255,0.08)',
    padding: '12px 30px 12px 12px',
    borderRadius: '100px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    minWidth: '240px'
  },
  rankIcon: { 
    width: '55px', 
    height: '55px', 
    borderRadius: '50%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontWeight: 900, 
    color: '#fff', 
    fontSize: '1.4rem',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
  },
  resultsStage: {
    textAlign: 'center',
    width: '100%',
    color: '#fff'
  },
  revealBanner: {
    padding: '40px 100px',
    borderRadius: '30px',
    fontSize: '5rem',
    fontWeight: 900,
    marginBottom: '50px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
    display: 'inline-block'
  }
};

export default function ProjectorScene({ gameState }: { gameState: any }) {
  const [pulse, setPulse] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p === 1 ? 1.08 : 1));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Sync and Countdown Logic
  useEffect(() => {
    if (gameState?.status === 'QUESTION_ACTIVE' && gameState?.currentQuestion) {
      setTimeLeft(gameState.currentQuestion.duration || 20);
    }
  }, [gameState?.currentQuestion]);

  useEffect(() => {
    if (gameState?.status === 'QUESTION_ACTIVE' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, gameState?.status]);

  if (!gameState) return null;

  const { status, teams, currentQuestion, isPlaying, currentTrack } = gameState;
  const isQuestion = status === 'QUESTION_ACTIVE' && currentQuestion;
  const isResults = status === 'SHOW_RESULTS' && currentQuestion;
  const leaderboard = [...teams].sort((a, b) => b.score - a.score).slice(0, 5);

  const bgGradient = isQuestion 
    ? 'linear-gradient(135deg, #46178f 0%, #240b4a 100%)' 
    : isResults 
    ? 'linear-gradient(135deg, #1368ce 0%, #0a2e5c 100%)'
    : 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)';

  return (
    <div style={{ ...styles.container, background: bgGradient }}>
      
      <div style={{ ...styles.ambientGlow, transform: `scale(${pulse})`, left: '-10%', top: '-10%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ ...styles.ambientGlow, transform: `scale(${pulse * 0.9}) translate(10%, 10%)`, right: '-5%', bottom: '-5%', background: 'rgba(0,0,0,0.15)' }} />

      <header style={styles.header}>
        <div style={styles.logo}>MUSIC QUIZ LEAGUE</div>
        <div style={styles.statusBadge}>
          {isQuestion ? 'LIVE QUESTION' : isResults ? 'REVEAL' : isPlaying ? 'LISTENING' : 'LOBBY'}
        </div>
      </header>

      <main style={styles.mainStage}>
        {isQuestion && (
          <div style={styles.qCard}>
            <div style={styles.qHeaderWrap}>
                <div style={{ color: '#46178f', fontWeight: 900, letterSpacing: '4px', fontSize: '1.4rem', flex: 1, textAlign: 'left' }}>
                    {currentQuestion.type}
                </div>
                <div style={styles.timerCircle}>
                    {timeLeft}
                </div>
            </div>

            {(currentQuestion.type === "ALBUM TRIVIA" || currentQuestion.type === "ARTIST RECOGNITION") && (
                <img src={currentTrack?.image} style={styles.visualClue} alt="Clue" />
            )}

            <h1 style={styles.qTitle}>{currentQuestion.text}</h1>
            
            {/* Dynamic Progress Bar */}
            <div style={{ 
              position: 'absolute', bottom: 0, left: 0, height: '20px', 
              background: timeLeft < 5 ? '#e21b3c' : '#ffa600', 
              width: `${(timeLeft / (currentQuestion.duration || 20)) * 100}%`,
              transition: 'width 1s linear, background 0.3s ease'
            }} />
          </div>
        )}

        {isResults && (
           <div style={styles.resultsStage}>
             <div style={{fontSize: '2rem', letterSpacing: '10px', marginBottom: '20px', fontWeight: 700}}>CORRECT ANSWER:</div>
             <div style={{
               ...styles.revealBanner, 
               background: ['#e21b3c','#1368ce','#d89e00','#26890c'][currentQuestion.correctIndex]
             }}>
               {currentQuestion.options[currentQuestion.correctIndex]}
             </div>
             <div style={{fontSize: '3rem', fontWeight: 900, opacity: 0.6}}>GET READY FOR THE NEXT ROUND</div>
           </div>
        )}

        {!isQuestion && !isResults && (
          <div style={styles.listeningView}>
            {isPlaying ? (
              <>
                <div className="pulse-ring-large" />
                <h1 style={styles.bigListen}>LISTEN</h1>
                <p style={styles.subListen}>Identifying the track data...</p>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ ...styles.bigListen, fontSize: '8rem' }}>JOIN THE GAME</h1>
                <div style={{ background: '#fff', color: '#111', padding: '30px 80px', borderRadius: '100px', fontSize: '4rem', fontWeight: 900, display: 'inline-block', marginTop: '40px' }}>
                  jukebox.boldron.info/quiz
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <div style={{ color: '#ffa600', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '2px', marginRight: '20px' }}>
          TOP PLAYERS
        </div>
        {leaderboard.map((team, idx) => (
          <div key={team.id} style={styles.teamPill}>
            <div style={{ ...styles.rankIcon, background: team.color }}>{idx + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem' }}>{team.name}</div>
              <div style={{ color: '#ffa600', fontWeight: 900, fontSize: '1rem' }}>{team.score} PTS</div>
            </div>
          </div>
        ))}
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');
        
        @keyframes pulseRingLarge {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        .pulse-ring-large {
          position: absolute; width: 500px; height: 500px;
          border: 12px solid rgba(255,255,255,0.2); border-radius: 50%;
          animation: pulseRingLarge 1.5s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
          z-index: -1;
        }

        body { margin: 0; overflow: hidden; background: #000; }
      `}</style>
    </div>
  );
}