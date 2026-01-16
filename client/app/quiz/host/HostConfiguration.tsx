'use client';
import React from 'react';
import { styles } from './BroadcastConsole.styles';

const GENRES = ["Rock", "Pop", "Hip Hop", "Grunge", "Indie", "Metal", "Country", "R&B", "Electronic", "Disco", "Jazz", "Soul", "Punk", "Funk", "Reggae", "Classical", "Folk", "Blues", "Latin", "Soundtrack"];
const ERAS = ["60s", "70s", "80s", "90s", "00s", "10s", "20s"];

interface HostConfigurationProps {
  deviceId: string;
  setDeviceId: (id: string) => void;
  availableDevices: any[];
  onRefreshDevices: () => void;
  config: any;
  onUpdateConfig: (updates: any) => void;
  onAutoPopulate: () => void;
}

export default function HostConfiguration({
  deviceId,
  setDeviceId,
  availableDevices,
  onRefreshDevices,
  config,
  onUpdateConfig,
  onAutoPopulate
}: HostConfigurationProps) {
  
  const toggleFilter = (type: 'selectedGenres' | 'selectedEras', value: string) => {
    const current = config[type] || [];
    const next = current.includes(value) 
      ? current.filter((v: string) => v !== value) 
      : [...current, value];
    onUpdateConfig({ [type]: next });
  };

  return (
    <>
      {/* DEVICE SELECTION */}
      <div style={styles.settingsSection}>
        <label style={styles.label}>SPOTIFY PLAYBACK DEVICE</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <select 
            style={styles.select} 
            value={deviceId} 
            onChange={(e) => setDeviceId(e.target.value)}
          >
            <option value="">SELECT PLAYER...</option>
            {availableDevices.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.is_active ? '🟢' : '⚪'} {d.name} ({d.type})
              </option>
            ))}
          </select>
          <button onClick={onRefreshDevices} style={styles.refreshBtn}>🔄 REFRESH</button>
        </div>
      </div>

      {/* GAME PARAMETERS */}
      <div style={styles.settingsGrid}>
        <div style={styles.settingsSection}>
          <label style={styles.label}>DIFFICULTY Focus ({config.difficultyFocus || 0}%)</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={config.difficultyFocus || 50} 
            onChange={(e) => onUpdateConfig({ difficultyFocus: parseInt(e.target.value) })} 
            style={styles.slider} 
          />
        </div>
        <div style={styles.settingsSection}>
          <label style={styles.label}>TIMER (SEC)</label>
          <input 
            type="number" 
            value={config.timePerQuestion || 20} 
            onChange={(e) => onUpdateConfig({ timePerQuestion: parseInt(e.target.value) })} 
            style={styles.numInput} 
          />
        </div>
      </div>

      {/* GENRE & ERA FILTERS */}
      <div style={styles.filterSection}>
        <label style={styles.label}>GENRE & ERA FILTERS</label>
        <div style={styles.tagCloud}>
          {GENRES.map(g => (
            <button 
              key={g} 
              onClick={() => toggleFilter('selectedGenres', g)} 
              style={{
                ...styles.tag, 
                background: config.selectedGenres?.includes(g) ? '#f1c40f' : '#222', 
                color: config.selectedGenres?.includes(g) ? '#000' : '#fff'
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <div style={{ ...styles.tagCloud, marginTop: 10 }}>
          {ERAS.map(e => (
            <button 
              key={e} 
              onClick={() => toggleFilter('selectedEras', e)} 
              style={{
                ...styles.tag, 
                background: config.selectedEras?.includes(e) ? '#3498db' : '#222', 
                color: '#fff'
              }}
            >
              {e}
            </button>
          ))}
        </div>
        <button onClick={onAutoPopulate} style={styles.autoPopulateBtn}>
          ⚡ AUTO-FILL QUEUE (10)
        </button>
      </div>
    </>
  );
}