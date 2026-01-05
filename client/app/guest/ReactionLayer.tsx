'use client';
import React from 'react';

interface Reaction {
  id: number;
  emoji: string;
  left: number;
}

interface ReactionLayerProps {
  activeReactions: Reaction[];
}

export const ReactionLayer = ({ activeReactions }: ReactionLayerProps) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none', // Critical: Allows clicks to pass through to buttons
      overflow: 'hidden',    // Bug 6 Fix: Prevents emojis from stretching the screen
      zIndex: 9999,          // Ensure they float above the UI
    }}>
      {activeReactions.map(r => (
        <div
          key={r.id}
          className="float-emoji"
          style={{
            position: 'absolute',
            left: `${r.left}%`,
            bottom: '-50px',
            fontSize: '2.5rem',
            userSelect: 'none',
            opacity: 0,
            animation: 'emojiFloat 4s ease-out forwards'
          }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Embedded CSS for the contained animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes emojiFloat {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          10% { opacity: 1; transform: translateY(-10vh) scale(1.2); }
          100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
        }
      `}} />
    </div>
  );
};