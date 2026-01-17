'use client';
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { styles } from './Projector.styles';
import { API_URL, SOCKET_URL } from '../../config';

const ICONS = ['▲', '◆', '●', '■'];

// Helper for rolling numbers (Score counter)
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
  const [nextQuestionTimer, setNextQuestionTimer] = useState<number | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.emit('join_room', 'quiz_projector');
    
    // 1. Listen for State Updates
    socket.on('quiz_update', (state: any) => {
      setGameState(state);
      // Clear local countdown if we move out of results mode to avoid stale timer visuals
      if (state.status !== 'SHOW_RESULTS') {
        setNextQuestionTimer(null);
      }
    });

    // 2. Listen for Auto-Host Heartbeat (The "Next Round In..." countdown)
    socket.on('autohost_countdown', (seconds: number) => {
      setNextQuestionTimer(seconds);
    });

    return () => { socket.disconnect(); };
  }, []);

  if (!gameState) return <div style={styles.loading}>SYNCING BROADCAST...</div>;

  const { status, teams, currentQuestion, isPlaying, config, currentTrack } = gameState;
  const isQuestion = status === 'QUESTION_ACTIVE' && currentQuestion;
  const isResults = status === 'SHOW_RESULTS' && currentQuestion;
  const isFinished = status === 'FINISHED';
  const leaderboard = [...teams].sort((a: any, b: any) => b.score - a.score);
  const podium = leaderboard.slice(0, 3);
  
  // V11: Check if this is the final question of the batch
  const isFinalQuestion = gameState.questionsRemaining === 0;

  // QR Code URL based on your config
  const joinUrl = API_URL.replace('/api', '') + '/quiz';

  return (
    <div style={{ ...styles.stage, background: isQuestion ? '#46178f' : (isResults ? '#1368ce' : (isFinished ? '#050505' : '#00c6ff')) }}>
      
      {/* Audio Context Unlocker (Browser Policy) */}
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
                    // Blur the image if it's a "Picture" round question, remove blur on reveal
                    filter: 'blur(15px)',
                    transition: 'filter 1.2s ease'
                  }} 
                  alt="Visual" 
                />
              </div>
            )}
            <div style={{flex: 1}}>
              <div style={styles.qMeta}>
                  {currentQuestion.type.replace('_', ' ')} // {currentQuestion.points || 1000} PTS
                  
                  {/* V11: FINAL QUESTION BADGE */}
                  {isFinalQuestion && (
                      <span style={{
                          marginLeft: '20px',
                          background: '#e21b3c',
                          color: '#fff',
                          padding: '5px 15px',
                          borderRadius: '5px',
                          fontWeight: 'bold',
                          fontSize: '0.8em',
                          verticalAlign: 'middle',
                          animation: 'pulse 1s infinite'
                      }}>
                          ⚠ FINAL QUESTION
                      </span>
                  )}
              </div>
              
              <h1 style={{...styles.qTitle, fontSize: currentQuestion.image ? '3rem' : '4.5rem'}}>{currentQuestion.text}</h1>
              <div style={styles.optionsGrid}>
                {currentQuestion.options.map((opt: string, i: number) => (
                  <div key={i} style={{...styles.optItem, fontSize: currentQuestion.image ? '1.4rem' : '2rem', borderLeft: `15px solid ${['#e21b3c','#1368ce','#d89e00','#26890c'][i]}`}}>
                    <span style={{marginRight: 15, opacity: 0.6}}>{ICONS[i]}</span> {opt}
                  </div>
                ))}
              </div>
            </div>
            {/* CSS-based Timer Bar synced to config time */}
            <div style={styles.timerTrack}>
                <div style={{ ...styles.timerFill, animationDuration: `${config?.timePerQuestion || 20}s` }} />
            </div>
          </div>
        )}

        {/* VIEW 2: ROUND RESULTS */}
        {isResults && (
           <div style={styles.resultsReveal}>
             
             {/* AUTO-HOST COUNTDOWN OVERLAY */}
             {/* Only appears if Auto-Host is ON in the Console */}
             {nextQuestionTimer !== null && nextQuestionTimer > 0 && (
               <div style={{
                 position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.8)', 
                 padding: '15px 25px', borderRadius: '40px', border: '3px solid #f1c40f', zIndex: 100,
                 textAlign: 'center', boxShadow: '0 0 20px rgba(241, 196, 15, 0.5)'
               }}>
                 <div style={{fontSize: '0.8rem', fontWeight: 900, opacity: 0.8, color: '#fff'}}>NEXT ROUND IN</div>
                 <div style={{fontSize: '2.5rem', fontWeight: 900, color: '#f1c40f'}}>{nextQuestionTimer}</div>
               </div>
             )}

             <div style={styles.revealLabel}>CORRECT ANSWER</div>
             <div style={{...styles.answerBanner, background: ['#e21b3c','#1368ce','#d89e00','#26890c'][currentQuestion.correctIndex]}}>
               <span style={{marginRight: 20}}>{ICONS[currentQuestion.correctIndex]}</span>
               {currentQuestion.options[currentQuestion.correctIndex]}
             </div>

             {/* If it was a picture round, show the UNBLURRED image now */}
             {currentQuestion.image && (
                <div style={{marginTop: '30px', textAlign: 'center'}}>
                   <img 
                    src={currentQuestion.image} 
                    style={{
                      ...styles.qImage,
                      maxHeight: '300px',
                      width: 'auto',
                      filter: 'none', // Remove blur
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

        {/* VIEW 3: PODIUM (End of Game) */}
        {isFinished && (
            <div style={styles.podiumContainer}>
                <h1 style={styles.podiumTitle}>CONGRATULATIONS!</h1>
                <div style={styles.podiumStage}>
                    {/* 2nd Place */}
                    {podium[1] && (
                      <div style={styles.podiumColumn}>
                        <div style={styles.podiumName}>{podium[1].name}</div>
                        <div style={{...styles.podiumBar, height: '300px', background: '#bdc3c7', animationDelay: '0.5s'}} className="podium-bar-anim">
                          <div style={styles.podiumRank}>2</div>
                          <div style={styles.podiumScore}><AnimatedNumber value={podium[1].score} /></div>
                        </div>
                      </div>
                    )}
                    {/* 1st Place */}
                    {podium[0] && (
                      <div style={styles.podiumColumn}>
                        <div style={styles.podiumName}>{podium[0].name}</div>
                        <div style={{...styles.podiumBar, height: '450px', background: '#f1c40f', animationDelay: '1s'}} className="podium-bar-anim">
                          <div style={styles.podiumRank}>1</div>
                          <div style={styles.podiumScore}><AnimatedNumber value={podium[0].score} /></div>
                        </div>
                      </div>
                    )}
                    {/* 3rd Place */}
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
                    {/* Only show difficulty if playing */}
                    {currentTrack?.explicit && <div style={{color: '#e74c3c', marginTop: 20, border:'1px solid #e74c3c', padding:'5px 15px', display:'inline-block', borderRadius:5}}>EXPLICIT</div>}
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