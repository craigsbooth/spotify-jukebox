import { useEffect, useRef, useState } from 'react';
import { styles } from './styles';
import { Track, LyricLine } from './types';

interface Props {
  queue: Track[];
  nowPlaying: Track | null;
  showUpNext: boolean;
  showLyrics: boolean;
  syncedLyrics: LyricLine[]; 
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

  // Inject animations for the new visuals
  const visualKeyframes = `
    @keyframes pulse-art {
      0% { transform: scale(1); opacity: 1; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
      50% { transform: scale(1.02); opacity: 0.9; box-shadow: 0 30px 60px rgba(29, 185, 84, 0.3); }
      100% { transform: scale(1); opacity: 1; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    }
    @keyframes equalizer-bar {
      0% { height: 10px; }
      50% { height: 35px; }
      100% { height: 10px; }
    }
  `;

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
  
  // Future-proofing: Check if the track has a Spotify Canvas video URL
  const canvasUrl = (nowPlaying as any)?.canvasUrl;

  return (
    <div style={styles.standardContainer}>
      <style dangerouslySetInnerHTML={{__html: visualKeyframes}} />

      <div style={{
        ...styles.upNextPosition, 
        transition: 'transform 0.5s', 
        transform: showUpNext ? 'translateY(0)' : 'translateY(-100px)',
        opacity: showUpNext ? 1 : 0,
        zIndex: 20
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
      
      {/* 1. VISUALS MODE (Center Stage when Lyrics are OFF) */}
      {!shouldShowLyrics && (
          <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0, left: 0,
              zIndex: 0
          }}>
              {canvasUrl ? (
                  <video 
                     src={canvasUrl}
                     autoPlay loop muted playsInline
                     style={{
                         height: '60vh',
                         aspectRatio: '9/16',
                         borderRadius: '16px',
                         boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
                         objectFit: 'cover'
                     }}
                  />
              ) : (
                  <div style={{ position: 'relative' }}>
                      <img 
                          src={currentArt} 
                          alt="Album Art"
                          style={{
                              height: '50vh',
                              width: '50vh',
                              borderRadius: '12px',
                              objectFit: 'cover',
                              animation: 'pulse-art 6s infinite ease-in-out'
                          }}
                      />
                      {/* Equalizer Overlay */}
                      <div style={{
                          position: 'absolute',
                          bottom: '-40px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          gap: '6px',
                          alignItems: 'flex-end',
                          height: '40px'
                      }}>
                          {[0, 1, 2, 3, 4].map((i) => (
                              <div key={i} style={{
                                  width: '8px',
                                  background: '#1DB954',
                                  borderRadius: '4px',
                                  animation: `equalizer-bar 1.2s infinite ease-in-out ${i * 0.15}s`
                              }} />
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* 2. LYRICS MODE */}
      {shouldShowLyrics && (
        <div ref={scrollContainerRef} className="no-scrollbar" style={{...styles.lyricsWindow, zIndex: 10}}>
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

      <div style={{...styles.standardFooter, zIndex: 20}}>
        <div style={styles.footerFlex}>
          {/* Footer Art also supports Video now */}
          {canvasUrl ? (
             <video src={canvasUrl} autoPlay loop muted style={{...styles.footerArt, objectFit: 'cover'}} />
          ) : (
             <img src={currentArt} className="reflect-image" style={styles.footerArt} />
          )}
          
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