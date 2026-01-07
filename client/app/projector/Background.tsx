// client/app/projector/Background.tsx
import { styles } from './styles';

interface Props {
  viewMode: string;
  isKaraokeMode: boolean;
  youtubeId: string | null;
  currentArt: string;
}

export const Background = ({ viewMode, isKaraokeMode, youtubeId, currentArt }: Props) => {
  const showVideo = !!youtubeId;
  const shouldUnmuteVideo = isKaraokeMode && showVideo;

  if (viewMode === 'monitor' || isKaraokeMode) {
    return (
      <div style={styles.backgroundContainer}>
        {showVideo ? (
          <div key={youtubeId} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: -1 }}>
            <iframe
              key={`${youtubeId}-${shouldUnmuteVideo ? 'LOUD' : 'SILENT'}`}
              style={{ 
                width: '100vw', height: '56.25vw', 
                minHeight: '100vh', minWidth: '177.77vh',
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) scale(1.05)',
                pointerEvents: 'none' 
              }}
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${shouldUnmuteVideo ? '0' : '1'}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&vq=hd1080`}
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