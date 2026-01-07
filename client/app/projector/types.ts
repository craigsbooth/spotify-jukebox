// client/app/projector/types.ts
export interface Track { 
  name: string; artist: string; displayName?: string; displayArtist?: string;
  album?: string; albumArt?: string; uri?: string; startedAt?: number; 
  duration?: number; is_playing?: boolean; addedBy?: string; singer?: string; 
  title?: string; thumb?: string; isFallback?: boolean;
  lyrics?: { synced: any; plain: string } | null; 
}

export interface LyricLine { time: number; text: string; }
export interface Reaction { id: number; emoji: string; left: number; }