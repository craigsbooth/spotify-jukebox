'use client';
import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { styles } from './ReactionPad.styles';
import { API_URL, SOCKET_URL } from '../config';

const COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
const ICONS = ['▲', '◆', '●', '■'];

export default function ReactionPad() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [name, setName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showStandings, setShowStandings] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem('quiz_team_id');
    
    // FIX: Connect using the correct SOCKET_URL
    const newSocket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        path: '/socket.io'
    });
    setSocket(newSocket);

    newSocket.on('quiz_update', (state) => {
      setGameState(state);

      // Auto-join logic
      if (savedId && !hasJoined) {
        if (state.teams && state.teams.find((t: any) => t.id === savedId)) {
          setHasJoined(true);
          setMyTeamId(savedId);
        }
      }

      // Logic Sync: Hide standings when a new question becomes active
      if (state.status === 'QUESTION_ACTIVE') {
        setShowStandings(false);
      }

      // Cleanup: Reset local interactions when moving to IDLE or PLAYING
      if (state.status !== 'QUESTION_ACTIVE' && state.status !== 'SHOW_RESULTS') {
        setHasAnswered(false);
        setSelectedIdx(null);
        setShowStandings(false);
      }
    });

    return () => { newSocket.disconnect(); };
  }, [hasJoined]);

  // Force local reset when a specific question ID changes
  useEffect(() => {
    if (gameState?.currentQuestion?.id) {
      setHasAnswered(false);
      setSelectedIdx(null);
    }
  }, [gameState?.currentQuestion?.id]);

  // Auto-transition to Leaderboard view after seeing results
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState?.status === 'SHOW_RESULTS') {
      timer = setTimeout(() => setShowStandings(true), 15000);
    }
    return () => clearTimeout(timer);
  }, [gameState?.status]);

  const handleJoin = async () => {
    if (!name.trim()) return;
    
    try {
        // FIX: Defined 'res' variable so it can be used below
        const res = await fetch(`${API_URL}/quiz/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Added socketId to payload to ensure robust backend linking
            body: JSON.stringify({ 
                name: name.toUpperCase(), 
                icon: 'record', 
                color: '#fff',
                socketId: socket?.id 
            })
        });

        const data = await res.json();

        if (data.success) {
            setMyTeamId(data.team.id);
            setHasJoined(true);
            localStorage.setItem('quiz_team_id', data.team.id);
        } else {
            alert("Join failed: " + (data.message || "Unknown error"));
        }
    } catch (e) {
        console.error("Join Error:", e);
    }
  };

  const handleAnswer = async (index: number) => {
    if (hasAnswered || !myTeamId) return;
    setHasAnswered(true);
    setSelectedIdx(index);
    if (navigator.vibrate) navigator.vibrate(50);

    try {
        await fetch(`${API_URL}/quiz/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId: myTeamId, answerIndex: index })
        });
    } catch (e) {
        console.error("Answer failed:", e);
    }
  };

  if (!hasJoined) {
    return (
      <div style={styles.lobby}>
        <h1 style={styles.lobbyTitle}>MUSIC QUIZ</h1>
        <input style={styles.input} placeholder="ENTER NICKNAME" value={name} onChange={e => setName(e.target.value)} />
        <button style={styles.joinBtn} onClick={handleJoin}>OK, GO!</button>
      </div>
    );
  }

  const myTeam = gameState?.teams?.find((t: any) => t.id === myTeamId);
  const isQuestion = gameState?.status === 'QUESTION_ACTIVE';
  const isResults = gameState?.status === 'SHOW_RESULTS';
  const currentQ = gameState?.currentQuestion;
  const sortedTeams = gameState?.teams ? [...gameState.teams].sort((a: any, b: any) => b.score - a.score) : [];

  return (
    <div style={styles.container}>
      <header style={styles.hud}>
        <div style={styles.hudTeam}>{myTeam?.name}</div>
        <div style={styles.hudScore}>{myTeam?.score || 0} PTS</div>
      </header>

      <main style={styles.pad}>
        {showStandings && !isQuestion ? (
          <div style={styles.standingsView}>
            <h2 style={styles.standingsTitle}>STANDINGS</h2>
            <div style={styles.standingsList}>
              {sortedTeams.slice(0, 5).map((t: any, i: number) => (
                <div key={t.id} style={{ ...styles.standingRow, background: t.id === myTeamId ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                  <span>#{i + 1} {t.name}</span>
                  <span style={{ fontWeight: 900 }}>{t.score}</span>
                </div>
              ))}
            </div>
          </div>
        ) : isQuestion ? (
          <div style={styles.questionView}>
            <div style={styles.grid}>
              {currentQ?.options?.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={hasAnswered}
                  style={{
                    ...styles.answerBtn,
                    background: COLORS[i],
                    opacity: hasAnswered ? (selectedIdx === i ? 1 : 0.3) : 1,
                    transform: hasAnswered && selectedIdx === i ? 'scale(0.95)' : 'scale(1)'
                  }}>
                  <span style={styles.btnIcon}>{ICONS[i]}</span>
                  <div style={styles.optText}>{opt}</div>
                </button>
              ))}
            </div>
          </div>
        ) : isResults ? (
          <div style={{ ...styles.resultsScreen, background: myTeam?.lastAnswerCorrect ? '#26890c' : '#e21b3c' }}>
            <div style={styles.resultIcon}>{myTeam?.lastAnswerCorrect ? '✓' : '✕'}</div>
            <h2 style={styles.resultTitle}>{myTeam?.lastAnswerCorrect ? 'CORRECT' : 'INCORRECT'}</h2>
            <div style={styles.resultPoints}>
              {/* SYNCED POINTS: Pulls directly from the engine's calculation */}
              {myTeam?.lastAnswerCorrect ? `+${myTeam?.lastPointsGained || 0}` : '+0'}
            </div>
          </div>
        ) : (
          <div style={styles.waitView}>
            <div className="pulse-circle" />
            <h2 style={styles.waitText}>{gameState?.isPlaying ? "LISTEN..." : "GET READY!"}</h2>
          </div>
        )}
      </main>

      <footer style={styles.statusFooter}>
        {showStandings ? "WAITING FOR NEXT TRACK..." : (isResults ? "ANSWERS REVEALED" : (hasAnswered ? "ANSWER RECEIVED" : (isQuestion ? "PICK ONE!" : "READY?")))}
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&display=swap');
        body { margin: 0; background: #111; font-family: 'Outfit', sans-serif; color: white; overflow: hidden; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
        .pulse-circle { width: 100px; height: 100px; border: 4px solid #fff; border-radius: 50%; animation: pulse 1.5s infinite; position: absolute; }
      `}</style>
    </div>
  );
}