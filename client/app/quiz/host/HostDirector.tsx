'use client';
import React, { useEffect, useRef } from 'react';
import { styles } from './BroadcastConsole.styles';

interface HostDirectorProps {
  gameState: any;
  autoMode: boolean;
  setAutoMode: (val: boolean) => void;
  gapTimer: number;
  setGapTimer: (val: any) => void;
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  handleAutoNext: () => void;
  handlePlayNext: () => void;
  askQuestion: () => void;
  revealResults: () => void;
  endQuiz: () => void;
}

export default function HostDirector({
  gameState,
  autoMode,
  setAutoMode,
  gapTimer,
  setGapTimer,
  isPaused,
  setIsPaused,
  handleAutoNext,
  handlePlayNext,
  askQuestion,
  revealResults,
  endQuiz
}: HostDirectorProps) {
  const GAP_TIME = 10;
  const isQuestion = gameState.status === 'QUESTION_ACTIVE';
  
  // Use a ref to track the latest state without re-triggering the effect loop
  const statusRef = useRef(gameState.status);
  useEffect(() => {
    statusRef.current = gameState.status;
  }, [gameState.status]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoMode && !isPaused) {
      // Only run the timer during transitional phases
      const isTransitional = statusRef.current === 'SHOW_RESULTS' || statusRef.current === 'PLAYING';

      if (isTransitional) {
        interval = setInterval(() => {
          setGapTimer((prev: number) => {
            // If we hit zero, trigger the next action
            if (prev <= 1) {
              handleAutoNext();
              return GAP_TIME;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // If a question is active or we are idle, reset the timer for the next transition
        setGapTimer(GAP_TIME);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoMode, isPaused, gameState.status]); // Dependencies strictly controlled

  return (
    <>
      {/* AUTO DIRECTOR PANEL */}
      <div style={{...styles.settingsSection, border: autoMode ? '1px solid #2ecc71' : '1px solid #333'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <label style={styles.label}>🤖 AUTO-HOST ({gapTimer}s)</label>
          <button 
            onClick={() => setAutoMode(!autoMode)} 
            style={{...styles.toggleBtn, background: autoMode ? '#2ecc71' : '#333'}}>
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

      {/* MASTER ACTIONS */}
      <div style={styles.masterActions}>
        <button onClick={handlePlayNext} style={{...styles.mainBtn, background: '#2ecc71'}}>
          ▶ PLAY NEXT TRACK <span style={styles.subBtn}>Queue: {gameState.quizQueue?.length || 0}</span>
        </button>
        <button 
          onClick={askQuestion} 
          style={{...styles.mainBtn, background: isQuestion ? '#95a5a6' : '#e21b3c'}} 
          disabled={isQuestion || !gameState.isPlaying}>
          ❓ ASK QUESTION
        </button>
        <button 
          onClick={revealResults} 
          style={{...styles.mainBtn, background: isQuestion ? '#f1c40f' : '#333', color: isQuestion ? '#000' : '#666'}} 
          disabled={!isQuestion}>
          🏆 REVEAL WINNERS
        </button>
        <button onClick={endQuiz} style={{...styles.mainBtn, background: '#f1c40f', color: '#000'}}>
          🥇 END QUIZ
        </button>
      </div>
    </>
  );
}