// client/app/projector/Background.tsx
import { useEffect, useRef } from 'react';
import { styles } from './styles';

interface Props {
  viewMode: string;
  isKaraokeMode: boolean;
  youtubeId: string | null;
  currentArt: string;
  startedAt: number;
}

export const Background = ({ viewMode, isKaraokeMode, youtubeId, currentArt, startedAt }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const showVideo = !!youtubeId;
  const shouldUnmuteVideo = isKaraokeMode && showVideo;

  // --- 1. COMMAND CENTER (Mute/Unmute + Seek) ---
  useEffect(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow || !showVideo) return;

    const iframeWindow = iframeRef.current.contentWindow;

    // A. Handle Volume
    const volCommand = shouldUnmuteVideo ? 'unMute' : 'mute';
    iframeWindow.postMessage(JSON.stringify({ event: 'command', func: volCommand, args: [] }), '*');

    // B. Handle Sync (Seek to current time)
    // We only do this if the video JUST loaded (we don't want to keep seeking every second)
    if (startedAt) {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        if (elapsed > 0) {
            // "seekTo" command: args = [seconds, allowSeekAhead]
            iframeWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [elapsed, true] }), '*');
        }
    }
  }, [shouldUnmuteVideo, youtubeId, startedAt]); // Dependent on these changing

  if (viewMode === 'monitor' || isKaraokeMode) {
    return (
      <div style={styles.backgroundContainer}>
        {showVideo ? (
          <div key={youtubeId} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: -1 }}>
            <iframe
              ref={iframeRef}
              // CRITICAL FIX: Removed timestamp from key to prevent re-mounting
              key={youtubeId} 
              style={{ 
                width: '100vw', height: '56.25vw', 
                minHeight: '100vh', minWidth: '177.77vh',
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) scale(1.05)',
                pointerEvents: 'none' 
              }}
              // CRITICAL FIX: Removed '&start=' param to stop URL thrashing.
              // We now handle syncing via the postMessage in useEffect above.
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&vq=hd1080&enablejsapi=1`}
              frameBorder="0" 
              allow="autoplay; encrypted-media" 
              loading="eager"
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