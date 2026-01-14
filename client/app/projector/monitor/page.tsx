'use client';
import { useProjector } from '../../hooks/useProjector';
import { MonitorView } from '../MonitorView';
import { Background } from '../Background';
import { styles, keyframes } from '../styles';

const RECORD_PLACEHOLDER = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=1000";

export default function MonitorPage() {
  const {
    partyName,
    nowPlaying,
    isKaraokeMode,
    youtubeId,
    activeReactions,
    progress,
    showUpNext,
    nextUpItem
  } = useProjector();

  const activeVideoId = youtubeId || (nowPlaying as any)?.youtubeId || null;
  const currentArt = nowPlaying?.albumArt || RECORD_PLACEHOLDER;
  const startTime = nowPlaying?.startedAt || 0;

  return (
    <div style={styles.masterWrapper}>
      <style dangerouslySetInnerHTML={{__html: keyframes}} />
      <Background 
        viewMode="monitor" 
        isKaraokeMode={isKaraokeMode} 
        youtubeId={activeVideoId} 
        currentArt={currentArt} 
        startedAt={startTime} 
      />
      <div style={styles.emojiLayer}>
        {activeReactions.map(r => (
          <div key={r.id} style={{ ...styles.emoji, left: `${r.left}%` }}>{r.emoji}</div>
        ))}
      </div>
      
      <div style={styles.brandingHeader}><h1>{partyName || 'The Pinfold'}</h1></div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
         <MonitorView 
            showUpNext={showUpNext} 
            nextUpItem={nextUpItem} 
            isKaraokeMode={isKaraokeMode} 
            nowPlaying={nowPlaying} 
            progress={progress} 
         />
      </div>
    </div>
  );
}