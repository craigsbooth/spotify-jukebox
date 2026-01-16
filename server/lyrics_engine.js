'use client';

import { useEffect, useState } from 'react';

export default function TestLyricsPage() {
  const [status, setStatus] = useState('Disconnected');
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [lyricsData, setLyricsData] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  };

  useEffect(() => {
    // Force HTTPS to match your domain
    const sseUrl = 'https://jukebox.boldron.info/api/events'; 

    addLog(`Attempting connection to ${sseUrl}...`);
    const evtSource = new EventSource(sseUrl);

    evtSource.onopen = () => {
      setStatus('🟢 Connected to SSE Stream');
      addLog('Connection Open');
    };

    // --- THE FIX: USE ONMESSAGE INSTEAD OF ADDEVENTLISTENER ---
    evtSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        const { type, payload } = parsed;

        // 1. Handle Initial Sync (Happens immediately on connect)
        if (type === 'INIT') {
            addLog('🔄 Received Initial State');
            if (payload.currentTrack) setCurrentTrack(payload.currentTrack);
            if (payload.currentLyrics) {
                setLyricsData(payload.currentLyrics);
                addLog('📝 Found Lyrics in Init');
            }
        }
        
        // 2. Handle Track Updates
        else if (type === 'CURRENT_TRACK') {
            // Support both direct payload or nested payload
            const data = payload || parsed; 
            setCurrentTrack(data);
            addLog(`🎵 Track Update: ${data.name || 'Unknown'}`);
        }

        // 3. Handle Lyrics Updates
        else if (type === 'LYRICS_UPDATE') {
            const data = payload || parsed;
            setLyricsData(data.lyrics || data); // Handle {lyrics: {...}} or direct {...}
            addLog(`📝 Lyrics Update: ${data ? 'HAS DATA' : 'NULL'}`);
        }

      } catch (err) {
        console.error("Parse Error", err);
      }
    };

    evtSource.onerror = (err) => {
      // Only log if we were previously connected to avoid spam
      if (status.startsWith('🟢')) {
          setStatus('🔴 Connection Error');
          addLog('Connection Lost');
      }
    };

    return () => {
      evtSource.close();
    };
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', backgroundColor: '#111', color: '#0f0', minHeight: '100vh' }}>
      <h1>🕵️ Lyrics Debugger (v2)</h1>
      <h3 style={{ color: status.startsWith('🟢') ? '#0f0' : '#f00' }}>{status}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* COLUMN 1: LIVE DATA */}
        <div>
          <h2>🎵 Current Track</h2>
          <div style={{ background: '#222', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
            {currentTrack ? (
              <>
                <p><strong>Name:</strong> {currentTrack.name}</p>
                <p><strong>Artist:</strong> {currentTrack.artist}</p>
                <p><strong>URI:</strong> {currentTrack.uri}</p>
              </>
            ) : <p>Waiting for track...</p>}
          </div>

          <h2>📝 Lyrics State</h2>
          <div style={{ background: '#222', padding: '10px', borderRadius: '5px', minHeight: '200px' }}>
            {lyricsData ? (
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {JSON.stringify(lyricsData, null, 2)}
              </pre>
            ) : <p>Waiting for lyrics event...</p>}
          </div>
        </div>

        {/* COLUMN 2: EVENT LOGS */}
        <div>
          <h2>📡 Event Log</h2>
          <div style={{ background: '#000', border: '1px solid #333', padding: '10px', height: '400px', overflowY: 'auto' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ borderBottom: '1px solid #222', padding: '4px 0' }}>{log}</div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}