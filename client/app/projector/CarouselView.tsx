// client/app/projector/CarouselView.tsx
import { styles, getCarouselStyle } from './styles';
import { Track } from './types';

interface Props {
  history: Track[];
  nowPlaying: Track | null;
  queue: Track[];
  progress: number;
}

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

export const CarouselView = ({ history, nowPlaying, queue, progress }: Props) => {
  return (
    <div style={styles.carouselPerspective}>
      <div style={styles.carouselContainer}>
        {[...history.slice(-3), nowPlaying, ...queue.slice(0, 5)].map((track, index) => {
          if (!track) return null;
          const relIndex = index - Math.min(history.length, 3);
          return (
            <div key={`${track.uri}-${index}`} className="cover-container" style={getCarouselStyle(relIndex, Math.abs(relIndex))}>
              <img src={track.albumArt || RECORD_PLACEHOLDER} className="reflect-image" style={styles.carouselArt} />
              {relIndex === 0 && (
                <div style={styles.carouselInfo}>
                  <h1 style={styles.carouselTitle}>{track.displayName ?? track.name}</h1>
                  <h2 style={styles.carouselArtist}>{track.displayArtist ?? track.artist}</h2>
                  <div style={styles.progressBarBase}><div style={{ ...styles.progressBarFill, width: `${progress}%` }} /></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};