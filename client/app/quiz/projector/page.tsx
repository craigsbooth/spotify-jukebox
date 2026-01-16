'use client';
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { styles } from './Projector.styles';
import { API_URL, SOCKET_URL } from '../../config'; // <--- IMPORT FROM CONFIG

const ICONS = ['▲', '◆', '●', '■'];

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    let start = prevValueRef.current;
    const end = value;
    if (start === end) return;
    const duration = 2000;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      setDisplayValue(current);
      if (progress < 1) window.requestAnimationFrame(step);
      else prevValueRef.current = end;
    };
    window.requestAnimationFrame(step);
  }, [value]);
  return <span>{displayValue.toLocaleString()}</span>;
}

export default function KahootDeezerProjector() {
  const [gameState, setGameState] = useState<any>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.emit('join_room', 'quiz_projector');
    socket.on('quiz_update', (state: any) => setGameState(state));
    return () => { socket.disconnect(); };
  }, []);

  if (!gameState) return <div style={styles.loading}>SYNCING BROADCAST...</div>;

  const { status, teams, currentQuestion, isPlaying, config, currentTrack } = gameState;
  const isQuestion = status === 'QUESTION_ACTIVE' && currentQuestion;
  const isResults = status === 'SHOW_RESULTS' && currentQuestion;
  const isFinished = status === 'FINISHED';
  const leaderboard = [...teams].sort((a, b) => b.score - a.score);
  const podium = leaderboard.slice(0, 3);
  
  // Anti-Cheat: Hide track info if the question is identifying it
  const hideDetails = isQuestion && ['ARTIST', 'TITLE', 'SOUNDTRACK'].includes(currentQuestion.type);

  // QR Code Link (Dynamic based on where the app is running)
  const joinUrl = API_URL.replace('/api', '') + '/quiz';

  return (
    <div style={{ ...styles.stage, background: isQuestion ? '#46178f' : (isResults ? '#1368ce' : (isFinished ? '#050505' : '#00c6ff')) }}>
      {!audioEnabled && <div style={styles.audioPrompt} onClick={() => setAudioEnabled(true)}>🔊 CLICK TO INITIALIZE SFX</div>}

      <div style={styles.header}>
        <div style={styles.logo}>MUSIC QUIZ <span style={{fontWeight:400}}>LEAGUE</span></div>
        <div style={styles.liveStatus}>
          <div style={{...styles.pulseDot, background: isFinished ? '#f1c40f' : '#ff3b30'}} />
          {isFinished ? 'GRAND FINALE' : (isQuestion ? `${currentQuestion.difficulty.toUpperCase()} ROUND` : (isResults ? 'ROUND RESULTS' : (isPlaying ? 'IDENTIFYING' : 'LOBBY')))}
        </div>
      </div>

      <main style={styles.mainContent}>
        
        {/* VIEW 1: ACTIVE QUESTION */}
        {isQuestion && (
          <div style={{...styles.qCard, display: currentQuestion.image ? 'flex' : 'block', gap: 60}}>
            {currentQuestion.image && (
              <div style={styles.qImageContainer}>
                <img 
                  src={currentQuestion.image} 
                  style={{
                    ...styles.qImage,
                    // FIX: Blur image during question to prevent spoilers on album covers
                    filter: 'blur(30px)',
                    transition: 'filter 1.2s ease'
                  }} 
                  alt="Visual" 
                />
              </div>
            )}
            <div style={{flex: 1}}>
              <div style={styles.qMeta}>{currentQuestion.type.replace('_', ' ')} // {currentQuestion.points || 1000} PTS</div>
              <h1 style={{...styles.qTitle, fontSize: currentQuestion.image ? '3rem' : '4.5rem'}}>{currentQuestion.text}</h1>
              <div style={styles.optionsGrid}>
                {currentQuestion.options.map((opt: string, i: number) => (
                  <div key={i} style={{...styles.optItem, fontSize: currentQuestion.image ? '1.4rem' : '2rem', borderLeft: `15px solid ${['#e21b3c','#1368ce','#d89e00','#26890c'][i]}`}}>
                    <span style={{marginRight: 15, opacity: 0.6}}>{ICONS[i]}</span> {opt}
                  </div>
                ))}
              </div>
            </div>
            <div style={styles.timerTrack}><div style={{ ...styles.timerFill, animationDuration: `${config?.timePerQuestion || 20}s` }} /></div>
          </div>
        )}

        {/* VIEW 2: ROUND RESULTS */}
        {isResults && (
           <div style={styles.resultsReveal}>
              <div style={styles.revealLabel}>CORRECT ANSWER</div>
              <div style={{...styles.answerBanner, background: ['#e21b3c','#1368ce','#d89e00','#26890c'][currentQuestion.correctIndex]}}>
                <span style={{marginRight: 20}}>{ICONS[currentQuestion.correctIndex]}</span>
                {currentQuestion.options[currentQuestion.correctIndex]}
              </div>

              {/* REVEAL IMAGE WITHOUT BLUR IN RESULTS */}
              {currentQuestion.image && (
                <div style={{marginTop: '30px', textAlign: 'center'}}>
                   <img 
                    src={currentQuestion.image} 
                    style={{
                      ...styles.qImage,
                      maxHeight: '300px',
                      width: 'auto',
                      filter: 'none',
                      borderRadius: '15px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }} 
                    alt="Revealed Visual" 
                  />
                </div>
              )}
              
              <div style={styles.leaderboardBox}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20, borderBottom:'1px solid rgba(255,255,255,0.2)', paddingBottom:10}}>
                   <h2 style={{color: '#fff', fontSize: '1.5rem', margin:0}}>TOP TEAMS</h2>
                   <span style={{fontSize:'0.8rem', opacity:0.7}}>ROUND PERFORMANCE</span>
                </div>
                
                {leaderboard.slice(0, 5).map((t: any, i: number) => (
                  <div key={t.id} style={styles.leaderRow}>
                    <div style={{display:'flex', alignItems:'center', flex:1}}>
                        <span style={{fontWeight: 900, color: t.color, width: 40, fontSize:'1.5rem'}}>#{i+1}</span>
                        <span style={{fontSize:'1.8rem', fontWeight: 600}}>{t.name}</span>
                    </div>
                    
                    <div style={{display:'flex', alignItems:'center', gap: 20}}>
                        {t.lastPointsGained > 0 && (
                            <span style={styles.roundPoints}>+{t.lastPointsGained}</span>
                        )}
                        <span style={{fontWeight: 900, color: '#ffa600', fontSize:'2rem', minWidth: 100, textAlign:'right'}}>
                            <AnimatedNumber value={t.score} />
                        </span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {/* VIEW 3: PODIUM */}
        {isFinished && (
            <div style={styles.podiumContainer}>
                <h1 style={styles.podiumTitle}>CONGRATULATIONS!</h1>
                <div style={styles.podiumStage}>
                    {podium[1] && (
                      <div style={styles.podiumColumn}>
                        <div style={styles.podiumName}>{podium[1].name}</div>
                        <div style={{...styles.podiumBar, height: '300px', background: '#bdc3c7', animationDelay: '0.5s'}} className="podium-bar-anim">
                          <div style={styles.podiumRank}>2</div>
                          <div style={styles.podiumScore}><AnimatedNumber value={podium[1].score} /></div>
                        </div>
                      </div>
                    )}
                    {podium[0] && (
                      <div style={styles.podiumColumn}>
                        <div style={styles.podiumName}>{podium[0].name}</div>
                        <div style={{...styles.podiumBar, height: '450px', background: '#f1c40f', animationDelay: '1s'}} className="podium-bar-anim">
                          <div style={styles.podiumRank}>1</div>
                          <div style={styles.podiumScore}><AnimatedNumber value={podium[0].score} /></div>
                        </div>
                      </div>
                    )}
                    {podium[2] && (
                      <div style={styles.podiumColumn}>
                        <div style={styles.podiumName}>{podium[2].name}</div>
                        <div style={{...styles.podiumBar, height: '180px', background: '#cd7f32', animationDelay: '0s'}} className="podium-bar-anim">
                          <div style={styles.podiumRank}>3</div>
                          <div style={styles.podiumScore}><AnimatedNumber value={podium[2].score} /></div>
                        </div>
                      </div>
                    )}
                </div>
            </div>
        )}

        {/* VIEW 4: LOBBY & LISTENING */}
        {!isQuestion && !isResults && !isFinished && (
          <div style={styles.centerStage}>
            {isPlaying ? (
              <div style={styles.listenWrapper}>
                <div style={styles.pulseContainer}>
                   <div className="pulse-circle" style={{animationDelay: '0s'}} />
                   <div className="pulse-circle" style={{animationDelay: '0.8s'}} />
                   <div className="pulse-circle" style={{animationDelay: '1.6s'}} />
                </div>
                <div style={styles.listenTextContent}>
                    <h1 style={styles.bigListen}>LISTEN</h1>
                    <p style={styles.subListen}>IDENTIFY THE TRACK...</p>
                </div>
              </div>
            ) : (
              <div style={styles.lobbyView}>
                <div style={styles.qrSide}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`} style={styles.qr} alt="QR" />
                </div>
                <div style={styles.joinText}>
                  <h2 style={{fontSize:'4rem', margin:0}}>JOIN THE QUIZ</h2>
                  <p style={{fontSize:'1.8rem', opacity:0.7}}>{joinUrl.replace('https://', '')}</p>
                  <div style={styles.playerCount}>{teams.length} TEAMS READY</div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <div style={styles.tickerLabel}>LIVE STANDINGS</div>
        <div style={styles.tickerScroll}>
          {leaderboard.slice(0, 15).map((t: any, i: number) => (
            <div key={t.id} style={styles.tickerItem}>
              <span style={{color: t.color}}>#{i+1}</span> {t.name}: <strong>{t.score}</strong>
            </div>
          ))}
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        body { margin: 0; font-family: 'Outfit', sans-serif; overflow: hidden; background: #000; }
        @keyframes timer { from { width: 100%; } to { width: 0%; } }
        @keyframes growUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes pulse { 
            0% { transform: scale(0.8); opacity: 0.8; border-width: 5px; } 
            100% { transform: scale(3.5); opacity: 0; border-width: 0px; } 
        }
        .podium-bar-anim { animation: growUp 1.5s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; transform-origin: bottom; }
        .pulse-circle { 
          position: absolute; top: 50%; left: 50%; margin-top: -150px; margin-left: -150px;
          width: 300px; height: 300px; 
          border: 4px solid #fff; border-radius: 50%; 
          animation: pulse 3s infinite linear; pointer-events: none;
        }
      `}</style>
    </div>
  );
}