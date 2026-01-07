// client/app/projector/MonitorView.tsx
import { styles } from './styles';
import { Track } from './types';

interface Props {
  showUpNext: boolean;
  nextUpItem: any; // Could be Track or Karaoke Item
  isKaraokeMode: boolean;
  nowPlaying: Track | null;
  progress: number;
}

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

export const MonitorView = ({ showUpNext, nextUpItem, isKaraokeMode, nowPlaying, progress }: Props) => {
  
  const nextAddedByInfo = (() => {
     if (isKaraokeMode || !nextUpItem) return null;
     const isSystem = nextUpItem.isFallback || nextUpItem.addedBy === 'Fallback Track';
     if (isSystem) return { icon: '📻', text: 'Fallback Track' };
     if (nextUpItem.addedBy) return { icon: '👤', text: `Added by ${nextUpItem.addedBy}` };
     return null;
  })();

  return (
    <div style={styles.monitorContainer}>
      <div style={{ 
          position: 'absolute', top: '4vh', right: '4vw',
          transition: 'transform 0.8s ease-in-out, opacity 0.8s',
          transform: showUpNext ? 'translateY(0)' : 'translateY(-200%)',
          opacity: showUpNext ? 1 : 0
      }}>
        {nextUpItem && (
          <div className="pill" style={styles.upNextPill}>
            <img src={nextUpItem.albumArt || nextUpItem.thumb || RECORD_PLACEHOLDER} style={styles.upNextArt} />
            <div>
              <small style={{opacity:0.5, fontSize:'0.6rem'}}>{isKaraokeMode ? 'NEXT SINGER' : 'UP NEXT'}</small>
              <div style={{fontWeight:900, fontSize:'1rem'}}>
                  {isKaraokeMode ? (nextUpItem.singer || 'Guest') : (nextUpItem.displayName ?? nextUpItem.name)}
              </div>
              {isKaraokeMode ? (
                  <div style={{fontSize:'0.7rem', opacity:0.8}}>Performing: {nextUpItem.title}</div>
              ) : (
                  nextAddedByInfo && (
                      <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '2px' }}>
                         {nextAddedByInfo.icon} {nextAddedByInfo.text}
                      </div>
                  )
              )}
            </div>
          </div>
        )}
      </div>
      
      {!isKaraokeMode && (
        <div style={{textAlign: 'center', position: 'absolute', bottom: '10vh', left: 0, width: '100%'}}>
            <h1 style={styles.monitorTitle}>{nowPlaying?.displayName ?? nowPlaying?.name}</h1>
            <h2 style={styles.monitorArtist}>{nowPlaying?.displayArtist ?? nowPlaying?.artist}</h2>
            <div style={styles.footerProgressBase}><div style={{ ...styles.footerProgressFill, width: `${progress}%` }} /></div>
        </div>
      )}
    </div>
  );
};