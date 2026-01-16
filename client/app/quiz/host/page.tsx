'use client';
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import WebPlayer from './WebPlayer'; 
import { styles } from './BroadcastConsole.styles';
import { API_URL, SOCKET_URL } from '../../config'; // <--- IMPORT FROM CONFIG

const GENRES = ["Rock", "Pop", "Hip Hop", "Grunge", "Indie", "Metal", "Country", "R&B", "Electronic", "Disco", "Jazz", "Soul", "Punk", "Funk", "Reggae", "Classical", "Folk", "Blues", "Latin", "Soundtrack"];
const ERAS = ["60s", "70s", "80s", "90s", "00s", "10s", "20s"];
const ICONS = ['▲', '◆', '●', '■'];

export default function BroadcastConsole() {
  const [gameState, setGameState] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [autoMode, setAutoMode] = useState(false); // Master switch
  const [gapTimer, setGapTimer] = useState(0);     // The countdown value
  const [isPaused, setIsPaused] = useState(false); // Pause toggle
  const GAP_TIME = 10;                             // Seconds between questions
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // FIX: Using SOCKET_URL connects to the root domain correctly
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.emit('join_room', 'quiz_projector');
    socket.on('quiz_update', (state) => setGameState(state));
    refreshDevices();
    return () => { socket.disconnect(); };
  }, []);

  // --- AUTO DIRECTOR ENGINE ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoMode && !isPaused) {
      // Logic: If we are in RESULTS mode, start counting down
      if (gameState?.status === 'SHOW_RESULTS') {
        interval = setInterval(() => {
          setGapTimer((prev) => {
            const newVal = prev <= 1 ? GAP_TIME : prev - 1;
            
            // Broadcast the countdown to the projector
            if (socketRef.current) {
                socketRef.current.emit('autohost_countdown', newVal);
            }

            if (prev <= 1) {
              // TIMER FINISHED: TRIGGER NEXT STEP
              handleAutoNext();
              return GAP_TIME; 
            }
            return newVal;
          });
        }, 1000);
      } 
      // Reset timer if we are manually moved out of results
      else {
        setGapTimer(GAP_TIME);
      }
    }

    return () => clearInterval(interval);
  }, [autoMode, isPaused, gameState?.status]); // Dependencies

  // The function that decides what to do when timer hits 0
  const handleAutoNext = async () => {
    try {
        // 1. Attempt to Ask Question
        const res = await fetch(`${API_URL}/quiz/ask-question`, { method: 'POST' });
        const data = await res.json();
        
        // 2. If no questions left, move to the next track automatically
        if (data.error === "No question available") {
            console.log("⏭️ No more questions for track. Advancing...");
            handlePlayNext();
        }
    } catch (e) {
        console.error("Auto-Next Error:", e);
    }
  };

  const refreshDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/quiz/devices`);
      const data = await res.json();
      setAvailableDevices(data.devices || []);
    } catch (e) { console.error("⚠️ Device fetch failed:", e); }
  };

  const updateGlobalConfig = async (updates: any) => {
    await fetch(`${API_URL}/quiz/config`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  };

  const toggleFilter = (type: 'selectedGenres' | 'selectedEras', value: string) => {
    if (!gameState?.config) return;
    const current = gameState.config[type] || [];
    const next = current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value];
    updateGlobalConfig({ [type]: next });
  };

  const handleAutoPopulate = async () => {
    await fetch(`${API_URL}/quiz/auto-populate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 10 })
    });
  };

  const removeFromQueue = async (index: number) => {
    await fetch(`${API_URL}/quiz/queue/remove`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index })
    });
  };

  const searchTracks = async () => {
    const res = await fetch(`${API_URL}/quiz/search?q=${search}`);
    const data = await res.json();
    setResults(data.tracks || []);
  };

  const addToQueue = async (track: any) => {
    await fetch(`${API_URL}/quiz/queue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track })
    });
  };

  const handlePlayNext = async () => {
    if (!deviceId) { alert("Select a playback device!"); return; }
    await fetch(`${API_URL}/quiz/next`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });
  };

  if (!gameState) return <div style={styles.loading}>CONNECTING TO CONSOLE...</div>;

  const isQuestion = gameState.status === 'QUESTION_ACTIVE';
  const isResults = gameState.status === 'SHOW_RESULTS';
  const currentQ = gameState.currentQuestion;
  const config = gameState.config || {};
  const teams = gameState.teams || [];

  return (
    <div style={styles.container}>
      <WebPlayer apiUrl={API_URL} onDeviceReady={(id) => { setDeviceId(id); refreshDevices(); }} />

      <div style={styles.controlPanel}>
        <header style={styles.header}>
            <h1 style={styles.title}>BROADCAST CONSOLE v4.5</h1>
            <div style={{...styles.statusPill, color: isQuestion ? '#f1c40f' : '#2ecc71'}}>{gameState.status}</div>
        </header>

        {/* AUTO DIRECTOR PANEL */}
        <div style={{...styles.settingsSection, border: autoMode ? '1px solid #2ecc71' : '1px solid #333'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <label style={styles.label}>🤖 AUTO-HOST ({gapTimer}s)</label>
                <button 
                    onClick={() => setAutoMode(!autoMode)} 
                    style={{
                        ...styles.toggleBtn, 
                        background: autoMode ? '#2ecc71' : '#333'
                    }}>
                    {autoMode ? 'ON' : 'OFF'}
                </button>
            </div>
            {autoMode && (
                <div style={{marginTop: 10, display:'flex', gap: 10}}>
                    <button onClick={() => setIsPaused(!isPaused)} style={styles.mainBtn}>
                        {isPaused ? '▶ RESUME' : '⏸ PAUSE TIMER'}
                    </button>
                </div>
            )}
        </div>

        {/* PLAYER SELECTOR */}
        <div style={styles.settingsSection}>
            <label style={styles.label}>SPOTIFY PLAYBACK DEVICE</label>
            <div style={{display: 'flex', gap: 10}}>
                <select style={styles.select} value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                    <option value="">SELECT PLAYER...</option>
                    {availableDevices.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.is_active ? '🟢' : '⚪'} {d.name} ({d.type})</option>
                    ))}
                </select>
                <button onClick={refreshDevices} style={styles.refreshBtn}>🔄 REFRESH</button>
            </div>
        </div>

        <div style={styles.masterActions}>
            <button onClick={handlePlayNext} style={{...styles.mainBtn, background: '#2ecc71'}}>▶ PLAY NEXT TRACK <span style={styles.subBtn}>Queue: {gameState.quizQueue?.length || 0} left</span></button>
            <button onClick={() => fetch(`${API_URL}/quiz/ask-question`, { method: 'POST' })} style={{...styles.mainBtn, background: isQuestion ? '#95a5a6' : '#e21b3c'}} disabled={isQuestion || !gameState.isPlaying}>❓ ASK QUESTION</button>
            <button onClick={() => fetch(`${API_URL}/quiz/reveal-answer`, { method: 'POST' })} style={{...styles.mainBtn, background: isQuestion ? '#f1c40f' : '#333', color: isQuestion ? '#000' : '#666'}} disabled={!isQuestion}>🏆 REVEAL WINNERS</button>
            <button onClick={() => window.confirm("End Quiz?") && fetch(`${API_URL}/quiz/end-quiz`, { method: 'POST' })} style={{...styles.mainBtn, background: '#f1c40f', color: '#000'}}>🥇 END QUIZ</button>
        </div>

        {(isQuestion || isResults) && currentQ && (
          <div style={styles.liveIntelPanel}>
              <div style={{flex: 1}}>
                  <label style={styles.label}>{isResults ? "ROUND SUMMARY" : `LIVE QUESTION: ${currentQ.difficulty}`}</label>
                  <p style={{fontSize: '0.9rem', margin: '5px 0', fontWeight: 900}}>{currentQ.text}</p>
                  <div style={styles.answerListHost}>
                    {currentQ.options.map((opt: string, i: number) => {
                      const isCorrect = i === currentQ.correctIndex;
                      return (
                        <div key={i} style={{ 
                            ...styles.answerRowHost, 
                            color: isCorrect ? '#2ecc71' : '#fff', 
                            opacity: isCorrect ? 1 : 0.5,
                            fontWeight: isCorrect ? 900 : 400
                        }}>
                          <span style={{marginRight: 10}}>{ICONS[i]}</span> 
                          {opt}
                          {isCorrect && <span style={{marginLeft: 10}}>✓ CORRECT</span>}
                        </div>
                      );
                    })}
                  </div>
              </div>
              
              {isResults && (
                <div style={styles.roundStats}>
                  <label style={styles.label}>PERFORMANCE</label>
                  {teams.filter((t:any) => t.hasAnswered).map((t:any) => (
                    <div key={t.id} style={{fontSize: '0.75rem', color: t.lastAnswerCorrect ? '#2ecc71' : '#ff3b30', marginBottom: 2}}>
                      {t.name}: {t.lastAnswerCorrect ? `+${t.lastPointsGained}` : '0'}
                    </div>
                  ))}
                </div>
              )}

              {currentQ.image && (
                  <div style={styles.picPreview}>
                      <img src={currentQ.image} style={styles.previewImg} alt="Trivia" />
                      <span style={styles.picLabel}>PICTURE ROUND</span>
                  </div>
              )}
          </div>
        )}

        <div style={styles.settingsSection}>
            <label style={styles.label}>LIVE QUEUE ({gameState.quizQueue?.length || 0})</label>
            <div style={styles.queueScroll}>
                {gameState.quizQueue?.map((track: any, idx: number) => (
                    <div key={idx} style={styles.queueItem}>
                        <div style={{flex: 1, fontSize: '0.8rem'}}><strong>{track.name}</strong> <br/> <span style={{opacity: 0.6}}>{track.artist}</span></div>
                        <button onClick={() => removeFromQueue(idx)} style={styles.removeBtn}>✕</button>
                    </div>
                ))}
            </div>
        </div>

        <div style={styles.settingsGrid}>
            <div style={styles.settingsSection}>
                <label style={styles.label}>DIFFICULTY Focus ({config.difficultyFocus || 0}%)</label>
                <input type="range" min="0" max="100" value={config.difficultyFocus || 50} onChange={(e) => updateGlobalConfig({ difficultyFocus: parseInt(e.target.value) })} style={styles.slider} />
            </div>
            <div style={styles.settingsSection}>
                <label style={styles.label}>TIMER (SEC)</label>
                <input type="number" value={config.timePerQuestion || 20} onChange={(e) => updateGlobalConfig({ timePerQuestion: parseInt(e.target.value) })} style={styles.numInput} />
            </div>
        </div>

        <div style={styles.filterSection}>
            <label style={styles.label}>GENRE & ERA FILTERS</label>
            <div style={styles.tagCloud}>
                {GENRES.map(g => (<button key={g} onClick={() => toggleFilter('selectedGenres', g)} style={{...styles.tag, background: config.selectedGenres?.includes(g) ? '#f1c40f' : '#222', color: config.selectedGenres?.includes(g) ? '#000' : '#fff'}}>{g}</button>))}
            </div>
            <div style={{...styles.tagCloud, marginTop: 10}}>
                {ERAS.map(e => (<button key={e} onClick={() => toggleFilter('selectedEras', e)} style={{...styles.tag, background: config.selectedEras?.includes(e) ? '#3498db' : '#222', color: '#fff'}}>{e}</button>))}
            </div>
            <button onClick={handleAutoPopulate} style={styles.autoPopulateBtn}>⚡ AUTO-FILL QUEUE (10)</button>
        </div>

        <div style={styles.searchSection}>
            <div style={{display:'flex', gap: 10, marginBottom: 10}}>
                <input style={styles.input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for tracks..." onKeyPress={(e) => e.key === 'Enter' && searchTracks()}/>
                <button onClick={searchTracks} style={styles.searchBtn}>SEARCH</button>
            </div>
            <div style={styles.resultsList}>
                {results.map((t: any) => (
                    <div key={t.id} style={styles.resultItem} onClick={() => addToQueue(t)}>{t.name} - {t.artist} <span style={{color: '#2ecc71'}}>+</span></div>
                ))}
            </div>
        </div>

        <div style={styles.dangerZone}><button onClick={() => window.confirm("Reset?") && fetch(`${API_URL}/quiz/reset`, { method: 'POST' })} style={styles.resetBtn}>💥 MASTER RESET</button></div>
      </div>

      <div style={styles.audiencePanel}>
          <label style={styles.label}>LIVE LEADERBOARD</label>
          <div style={styles.teamList}>
            {teams.sort((a:any, b:any) => b.score - a.score).map((t: any) => (
                <div key={t.id} style={styles.teamRow}>
                    <div style={{...styles.colorBar, background: t.color}} />
                    <div style={{flex: 1, fontWeight: 700}}>{t.name}</div>
                    <div style={{color: t.hasAnswered ? '#2ecc71' : '#666'}}>{t.hasAnswered ? '●' : '○'}</div>
                    <div style={styles.teamScore}>{t.score}</div>
                </div>
            ))}
          </div>
      </div>
    </div>
  );
}