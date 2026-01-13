import { useEffect, useRef, useState } from 'react';
import { styles } from './styles';
import { Track, LyricLine } from './types';

interface Props {
  queue: Track[];
  nowPlaying: Track | null;
  showUpNext: boolean;
  showLyrics: boolean;
  syncedLyrics: LyricLine[]; 
  // removed plainLyrics property completely
  activeLineIndex: number;
  progress: number;
  currentArt: string;
}

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

export const StandardView = ({ 
  queue, nowPlaying, showUpNext, showLyrics, 
  syncedLyrics, activeLineIndex, currentArt 
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [smoothProgress, setSmoothProgress] = useState(0);

  useEffect(() => {
    const start = nowPlaying?.startedAt;
    const duration = nowPlaying?.duration_ms || nowPlaying?.duration;

    if (!start || !duration) {
        setSmoothProgress(0);
        return;
    }

    let animationFrameId: number;
    const animate = () => {
        const now = Date.now();
        const elapsed = now - start;
        const pct = (elapsed / duration) * 100;
        setSmoothProgress(Math.min(100, Math.max(0, pct)));
        animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [nowPlaying]); 

  // Auto-scroll logic
  useEffect(() => {
    if (activeLineIndex >= 0 && scrollContainerRef.current) {
      const activeEl = document.getElementById(`line-${activeLineIndex}`);
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIndex]);

  const upNextTrack = (() => {
      if (!queue || queue.length === 0) return null;
      const first = queue[0];
      if (nowPlaying && first.uri === nowPlaying.uri) {
          return queue.length > 1 ? queue[1] : null;
      }
      return first;
  })();

  const addedByInfo = (() => {
    if (!upNextTrack) return null;
    const isSystem = upNextTrack.isFallback || upNextTrack.addedBy === 'Fallback Track';
    if (isSystem) return { icon: '📻', text: 'Fallback Track' };
    if (upNextTrack.addedBy) return { icon: '👤', text: `Added by ${upNextTrack.addedBy}` };
    return null;
  })();

  const shouldShowLyrics = showLyrics && syncedLyrics && syncedLyrics.length > 0;

  return (
    <div style={styles.standardContainer}>
      <div style={{
        ...styles.upNextPosition, 
        transition: 'transform 0.5s', 
        transform: showUpNext ? 'translateY(0)' : 'translateY(-100px)',
        opacity: showUpNext ? 1 : 0
      }}>
        {upNextTrack && (
          <div className="pill" style={styles.upNextPill}>
            <img src={upNextTrack.albumArt || RECORD_PLACEHOLDER} style={styles.upNextArt} />
            <div>
              <small>UP NEXT</small>
              <div style={{ fontWeight: 900 }}>{upNextTrack.displayName ?? upNextTrack.name}</div>
              {addedByInfo && (
                <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '2px' }}>
                  {addedByInfo.icon} {addedByInfo.text}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {shouldShowLyrics && (
        <div ref={scrollContainerRef} className="no-scrollbar" style={styles.lyricsWindow}>
          <div style={{ height: '20vh' }} /> 
          {syncedLyrics.map((l, i) => (
            <div key={i} id={`line-${i}`} 
              className={`lyric-line ${i === activeLineIndex ? 'active' : 'inactive'}`}
              style={{
                transform: i === activeLineIndex ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                opacity: i === activeLineIndex ? 1 : 0.5
              }}
            >{l.text}</div>
          ))}
          <div style={{ height: '20vh' }} /> 
        </div>
      )}

      <div style={styles.standardFooter}>
        <div style={styles.footerFlex}>
          <img src={currentArt} className="reflect-image" style={styles.footerArt} />
          <div>
            <h1 style={styles.footerTitle}>{nowPlaying?.displayName ?? nowPlaying?.name}</h1>
            <h3 style={styles.footerArtist}>{nowPlaying?.displayArtist ?? nowPlaying?.artist}</h3>
            <div style={styles.footerProgressBase}>
                <div style={{ ...styles.footerProgressFill, width: `${smoothProgress}%` }} />
            </div>
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