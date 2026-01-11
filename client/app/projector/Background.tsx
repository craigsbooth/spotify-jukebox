// client/app/projector/Background.tsx
import { useEffect, useRef } from 'react';
import { styles } from './styles';

interface Props {
  viewMode: string;
  isKaraokeMode: boolean;
  youtubeId: string | null;
  currentArt: string;
}

export const Background = ({ viewMode, isKaraokeMode, youtubeId, currentArt }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const showVideo = !!youtubeId;
  
  // Logic remains the same, but implementation moves to side-effect
  const shouldUnmuteVideo = isKaraokeMode && showVideo;

  // --- NEW: Handle Mute/Unmute via Message to prevent Iframe Reloads ---
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = shouldUnmuteVideo ? 'unMute' : 'mute';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }), 
        '*'
      );
    }
  }, [shouldUnmuteVideo, youtubeId]); // Re-run if volume state or video changes

  if (viewMode === 'monitor' || isKaraokeMode) {
    return (
      <div style={styles.backgroundContainer}>
        {showVideo ? (
          <div key={youtubeId} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: -1 }}>
            <iframe
              ref={iframeRef}
              // Key is strictly ID to prevent unmounting on state updates
              key={youtubeId}
              style={{ 
                width: '100vw', height: '56.25vw', 
                minHeight: '100vh', minWidth: '177.77vh',
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) scale(1.05)',
                pointerEvents: 'none' 
              }}
              // FIX: Removed dynamic 'mute=' param. 
              // Defaults to mute=1 (silent start), then useEffect immediately unmutes if needed.
              // This ensures the src string NEVER changes during playback.
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&vq=hd1080&enablejsapi=1`}
              frameBorder="0" allow="autoplay; encrypted-media" loading="eager"
            />
          </div>
        ) : (
          <div style={{ ...styles.bgImage, backgroundImage: `url(${currentArt})` }} />
        )}
        <div style={styles.monitorOverlay} />
      </div>
    );
  }

  return (
    <div style={styles.backgroundContainer}>
      <div style={styles.meshAnimation}>
        <div style={{ ...styles.bgImage, backgroundImage: `url(${currentArt})`, filter: 'blur(80px) brightness(0.12)' }} />
      </div>
    </div>
  );
};