'use client';
import React from 'react';
import { styles } from './BroadcastConsole.styles';

interface HostQueueProps {
  quizQueue: any[];
  search: string;
  setSearch: (val: string) => void;
  results: any[];
  onSearch: () => void;
  onAddToQueue: (track: any) => void;
  onRemoveFromQueue: (index: number) => void;
}

export default function HostQueue({
  quizQueue,
  search,
  setSearch,
  results,
  onSearch,
  onAddToQueue,
  onRemoveFromQueue
}: HostQueueProps) {
  return (
    <>
      {/* LIVE QUEUE SECTION */}
      <div style={styles.settingsSection}>
        <label style={styles.label}>LIVE QUEUE ({quizQueue?.length || 0})</label>
        <div style={styles.queueScroll}>
          {quizQueue?.map((track: any, idx: number) => (
            <div key={idx} style={styles.queueItem}>
              <div style={{ flex: 1, fontSize: '0.8rem' }}>
                <strong>{track.name}</strong> <br />
                <span style={{ opacity: 0.6 }}>{track.artist}</span>
              </div>
              <button 
                onClick={() => onRemoveFromQueue(idx)} 
                style={styles.removeBtn}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SEARCH & DISCOVERY SECTION */}
      <div style={styles.searchSection}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <input
            style={styles.input}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for tracks..."
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          />
          <button onClick={onSearch} style={styles.searchBtn}>SEARCH</button>
        </div>
        <div style={styles.resultsList}>
          {results.map((t: any) => (
            <div 
              key={t.id} 
              style={styles.resultItem} 
              onClick={() => onAddToQueue(t)}
            >
              {t.name} - {t.artist} <span style={{ color: '#2ecc71' }}>+</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}