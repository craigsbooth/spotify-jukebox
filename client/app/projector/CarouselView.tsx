import { styles, getCarouselStyle } from './styles';
import { Track } from './types';

interface Props {
  history: Track[];
  nowPlaying: Track | null;
  queue: Track[];
  progress: number;
  partyName: string;
}

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

export const CarouselView = ({ history, nowPlaying, queue, progress, partyName }: Props) => {
  
  // 1. FILTERING: Remove the currently playing track from History and Queue
  const activeUri = nowPlaying?.uri;
  
  const safeHistory = history
      .filter(t => t.uri !== activeUri)
      .slice(-3); // Keep only last 3

  const safeQueue = queue
      .filter(t => t.uri !== activeUri)
      .slice(0, 5); // Keep next 5

  // 2. CONSTRUCT: Create the linear list of tracks to render
  const items = [...safeHistory, nowPlaying, ...safeQueue];
  const activeIndex = safeHistory.length; // The index where "Now Playing" sits

  // 3. DEDUPLICATION TRACKER
  const seenUris = new Set<string>();

  return (
    <div style={styles.carouselPerspective}>
      <div style={styles.brandingHeader}><h1>{partyName || 'The Pinfold'}</h1></div>
      
      <div style={styles.carouselContainer}>
        {items.map((track, index) => {
          if (!track) return null;
          
          // Calculate position relative to the center (Now Playing)
          const relIndex = index - activeIndex;
          
          // 4. SMART KEY GENERATION
          // We prioritize the naked URI for the first occurrence to maintain animation continuity.
          // If the song appears again (e.g. in queue after being in history), we suffix it.
          let uniqueKey = track.uri;
          if (seenUris.has(track.uri)) {
              uniqueKey = `${track.uri}-dup-${index}`;
          }
          seenUris.add(track.uri);

          return (
            <div 
                key={uniqueKey} 
                className="cover-container" 
                style={getCarouselStyle(relIndex, Math.abs(relIndex))}
            >
              <img 
                src={track.albumArt || RECORD_PLACEHOLDER} 
                className="reflect-image" 
                style={styles.carouselArt} 
                alt={track.name}
              />
              
              {relIndex === 0 && (
                <div style={styles.carouselInfo}>
                  <h1 style={styles.carouselTitle}>{track.displayName ?? track.name}</h1>
                  <h2 style={styles.carouselArtist}>{track.displayArtist ?? track.artist}</h2>
                  <div style={styles.progressBarBase}>
                    <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};