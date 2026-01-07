// client/app/projector/StandardView.tsx
import { useEffect, useRef } from 'react';
import { styles } from './styles';
import { Track, LyricLine } from './types';

interface Props {
  queue: Track[];
  nowPlaying: Track | null;
  showUpNext: boolean;
  showLyrics: boolean;
  syncedLyrics: LyricLine[];
  plainLyrics: string;
  activeLineIndex: number;
  progress: number;
  currentArt: string;
}

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

export const StandardView = ({ 
  queue, nowPlaying, showUpNext, showLyrics, 
  syncedLyrics, plainLyrics, activeLineIndex, progress, currentArt 
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (activeLineIndex >= 0 && scrollContainerRef.current) {
      const activeEl = document.getElementById(`line-${activeLineIndex}`);
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIndex]);

  // Helper for "Added By" text
  const addedByInfo = (() => {
    const item = queue[0];
    if (!item) return null;
    const isSystem = item.isFallback || item.addedBy === 'Fallback Track';
    if (isSystem) return { icon: '📻', text: 'Fallback Track' };
    if (item.addedBy) return { icon: '👤', text: `Added by ${item.addedBy}` };
    return null;
  })();

  return (
    <div style={styles.standardContainer}>
      {/* UP NEXT PILL */}
      <div style={{
        ...styles.upNextPosition, 
        transition: 'transform 0.5s', 
        transform: showUpNext ? 'translateY(0)' : 'translateY(-100px)',
        opacity: showUpNext ? 1 : 0
      }}>
        {queue[0] && (
          <div className="pill" style={styles.upNextPill}>
            <img src={queue[0].albumArt || RECORD_PLACEHOLDER} style={styles.upNextArt} />
            <div>
              <small>UP NEXT</small>
              <div style={{ fontWeight: 900 }}>{queue[0].displayName ?? queue[0].name}</div>
              {addedByInfo && (
                <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '2px' }}>
                  {addedByInfo.icon} {addedByInfo.text}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* LYRICS WINDOW */}
      {showLyrics && (
        <div ref={scrollContainerRef} className="no-scrollbar" style={styles.lyricsWindow}>
          <div style={{ height: '20vh' }} /> 
          {syncedLyrics.length > 0 ? syncedLyrics.map((l, i) => (
            <div key={i} id={`line-${i}`} 
              className={`lyric-line ${i === activeLineIndex ? 'active' : 'inactive'}`}
              style={{
                transform: i === activeLineIndex ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                opacity: i === activeLineIndex ? 1 : 0.5
              }}
            >{l.text}</div>
          )) : (
            <div style={styles.plainLyricsText}>
              {plainLyrics || (nowPlaying ? "Searching for lyrics..." : "")}
            </div>
          )}
          <div style={{ height: '20vh' }} /> 
        </div>
      )}

      <div style={styles.standardFooter}>
        <div style={styles.footerFlex}>
          <img src={currentArt} className="reflect-image" style={styles.footerArt} />
          <div>
            <h1 style={styles.footerTitle}>{nowPlaying?.displayName ?? nowPlaying?.name}</h1>
            <h3 style={styles.footerArtist}>{nowPlaying?.displayArtist ?? nowPlaying?.artist}</h3>
            <div style={styles.footerProgressBase}><div style={{ ...styles.footerProgressFill, width: `${progress}%` }} /></div>
          </div>
        </div>
        <div style={styles.qrContainer}>
            <img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://jukebox.boldron.info/guest')}`} style={{ width: '100%' }} />
            <div style={styles.qrText}>JOIN THE PARTY</div>
        </div>
      </div>
    </div>
  );
};