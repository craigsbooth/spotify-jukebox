// client/app/projector/types.ts
export interface Track {
    id?: string;
    uri: string;
    name: string;
    artist: string;
    album?: string;
    albumArt?: string;
    thumb?: string;
    
    // Time fields (Covering both naming conventions to stop errors)
    duration_ms?: number; 
    duration?: number;
    startedAt?: number;
    
    is_playing?: boolean;
    addedBy?: string;
    isFallback?: boolean;
    
    // Karaoke specific
    singer?: string;
    title?: string;
    
    // Legacy / Extra
    displayName?: string;
    displayArtist?: string;
}

export interface LyricLine {
    time: number;
    text: string;
    seconds?: number;
}

export interface Reaction {
    id: number;
    emoji: string;
    left: number;
}