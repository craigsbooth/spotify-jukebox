import { API_URL } from '../config';

export const useJukeboxHandlers = (state: any, setters: any) => {
  const { pendingChanges, lastActionRef, fetchMetadata } = state;

  const setStability = (key: string) => { pendingChanges.current[key] = Date.now(); };

  // --- HELPER: KILL SPOTIFY INSTANTLY ---
  const killSpotify = async () => {
    if (state.token) {
        try {
            // Force Volume to 0
            await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=0`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            // Force Pause
            await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
        } catch (e) {}
    }
  };

  // --- UPDATED INTERCEPTED SKIP LOGIC ---
  const handleSkip = async () => {
    const res = await fetch(`${API_URL}/pop`, { method: 'POST' });
    const track = await res.json();
    
    if (track?.uri) {
        // IF KARAOKE IS ON: We update the server but DO NOT tell the local Spotify player.
        // This keeps the Spotify player dormant and silent.
        if (state.isKaraokeMode) {
            console.log("⏭️ Background Queue advanced (Spotify kept dormant)");
            // We might want to refresh metadata just to update the "Up Next" label
            // but we do NOT call setters.setCurrentTrack(track)
            fetchMetadata(); 
        } else {
            // IF KARAOKE IS OFF: Normal behavior.
            setters.setCurrentTrack(track);
        }
    }
  };

  return {
    skipTrack: handleSkip,

    // --- CONTEXT-AWARE ADD TRACK ---
    addTrack: async (track: any) => {
      // 1. Check if we should treat this as a Karaoke Request
      // We check the Global Mode OR if the track itself is flagged as Karaoke (from the search)
      if (state.isKaraokeMode || track.isKaraoke) {
          console.log("🎤 Adding to Karaoke Queue:", track.name);
          await fetch(`${API_URL}/karaoke-queue`, { 
              method: 'POST', 
              headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify({ 
                  id: track.id, 
                  title: track.name, 
                  thumb: track.albumArt, 
                  guestId: track.guestId || 'guest', 
                  singer: track.singer || 'Guest' 
              }) 
          });
      } else {
          // 2. Otherwise, add to Standard Spotify Queue
          console.log("🎵 Adding to Spotify Queue:", track.name);
          await fetch(`${API_URL}/add`, { 
              method: 'POST', 
              headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify({ uri: track.uri }) 
          });
      }
    },

    // --- RESTORED HANDLER: STATION IDENTITY ---
    updatePartyName: async (name: string) => {
        if(setters.setPartyName) setters.setPartyName(name);
        await fetch(`${API_URL}/name`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ name }) 
        });
    },

    // --- RESTORED HANDLER: CROSSFADER ---
    setCrossfade: async (val: number) => {
        if(setters.setCrossfadeSec) setters.setCrossfadeSec(val);
        await fetch(`${API_URL}/theme`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ crossfadeSec: val }) 
        });
    },

    // --- RESTORED HANDLER: FALLBACK REFRESH ---
    refreshFallback: async () => {
        const res = await fetch(`${API_URL}/fallback`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ id: 'refresh' }) 
        });
        const data = await res.json();
        if(data.count !== undefined) alert(`Fallback pool reshuffled! (${data.count} tracks)`);
    },

    changeView: (mode: string) => {
      setters.setViewMode(mode);
      fetch(`${API_URL}/theme`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ theme: mode }) 
      });
    },

    removeItem: async (uri: string) => {
      await fetch(`${API_URL}/remove`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ uri }) 
      });
      setters.setQueue((prev: any[]) => prev.filter(t => t.uri !== uri));
    },

    reorder: async (idx: number, dir: string) => {
      lastActionRef.current = Date.now();
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= state.queue.length) return;
      const newQ = [...state.queue];
      [newQ[idx], newQ[newIdx]] = [newQ[newIdx], newQ[idx]];
      setters.setQueue(newQ);
      await fetch(`${API_URL}/reorder`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ queue: newQ }) 
      });
    },

    toggleDJ: () => {
      const nv = !state.isDjMode;
      setters.setIsDjMode(nv);
      fetch(`${API_URL}/dj-mode`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ enabled: nv }) 
      });
    },

    toggleKaraokeMode: async (enabled: boolean) => {
      setters.setIsKaraokeMode(enabled);
      
      if (enabled) {
          // ENTERING KARAOKE: Kill Spotify Audio
          await killSpotify();
      } else {
          // EXITING KARAOKE: Kill YouTube
          if (setters.setYoutubeId) setters.setYoutubeId(null);
          await fetch(`${API_URL}/theme`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ youtubeId: null }) 
          });

          // Wait for Projector to sync
          await new Promise(r => setTimeout(r, 500));
          
          // Restore Volume to 80%
          if (state.token) {
             await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=80`, {
                 method: 'PUT',
                 headers: { 'Authorization': `Bearer ${state.token}` }
             });
          }
      }

      fetch(`${API_URL}/karaoke-mode`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ enabled }) 
      });
    },

    removeKaraokeItem: async (index: number) => {
      await fetch(`${API_URL}/remove-karaoke`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ index }) 
      });
      setters.setKaraokeQueue((prev: any[]) => prev.filter((_, i) => i !== index));
    },

    popKaraoke: async (index: number = 0) => {
      // 1. Ensure Spotify is Dead
      await killSpotify();

      // 2. Trigger Server Swap
      const res = await fetch(`${API_URL}/pop-karaoke`, { method: 'POST' });
      const data = await res.json();
      
      if (data.success && data.youtubeId) {
          if (setters.setYoutubeId) setters.setYoutubeId(data.youtubeId);
          setters.setKaraokeQueue((prev: any) => prev.slice(1));
      }
    },

    toggleLyrics: () => {
      const nv = !state.showLyrics;
      setters.setShowLyrics(nv);
      fetch(`${API_URL}/theme`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ showLyrics: nv }) 
      });
    },

    stopPerformance: async () => {
      if (setters.setYoutubeId) setters.setYoutubeId(null);
      await fetch(`${API_URL}/theme`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ youtubeId: null }) 
      });
      
      // Restore Volume
      if (state.token) {
          await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=80`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${state.token}` }
          });
      }
    },

    fetchKaraokeSuggestions: async (genre: string) => {
      const res = await fetch(`${API_URL}/karaoke-suggestions?genre=${encodeURIComponent(genre)}`);
      const data = await res.json();
      setters.setKaraokeSuggestions(data);
    },

    quickAddKaraoke: async (item: any) => {
      await fetch(`${API_URL}/karaoke-queue`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ ...item, guestId: 'host', singer: 'Host Choice' }) 
      });
    },

    saveTokenSettings: async (settings: any) => {
      setStability('tokens');
      setters.setTokensEnabled(settings.tokensEnabled);
      setters.setTokensInitial(settings.tokensInitial);
      setters.setTokensPerHour(settings.tokensPerHour);
      setters.setTokensMax(settings.tokensMax);
      await fetch(`${API_URL}/theme`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(settings) 
      });
      await fetch(`${API_URL}/sync-token-caps`, { method: 'POST' });
    },

    setPlaylistQuery: (q: string) => setters.setPlaylistQuery(q),

    searchPlaylists: async (e: React.FormEvent) => {
      e.preventDefault();
      if (!state.playlistQuery) return;
      const res = await fetch(`${API_URL}/search-playlists?q=${encodeURIComponent(state.playlistQuery)}`);
      const data = await res.json();
      setters.setPlaylistResults(data);
    },

    setFallback: async (playlist: any) => {
      const playlistName = playlist.displayName || playlist.name;
      const res = await fetch(`${API_URL}/fallback`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ id: playlist.id, name: playlistName }) 
      });
      const data = await res.json();
      if (data.success) {
        setters.setFallbackName(playlistName);
        setters.setPlaylistResults([]);
        setters.setPlaylistQuery('');
      }
    },

    onPlayerCallback: (s: any) => {
      // 1. BLOCK AUTO-DJ IN KARAOKE MODE
      if (state.isKaraokeMode) return; 

      if (s.type === 'initialization_error') fetchMetadata();
      
      // 2. CLIENT-SIDE AUTO-DJ (RE-ENABLED)
      // Logic: If player stops (isPlaying: false) AND track finished (progressMs: 0)
      // AND it's a real 'player_update' event... then request next track.
      if (!s.isPlaying && s.progressMs === 0 && s.type === 'player_update') {
          // Double check we actually have a duration, effectively debouncing initial load
          if (state.currentTrack && state.currentTrack.duration_ms > 0) {
             console.log("⏭️ Client: Track finished. Requesting next...");
             handleSkip();
          }
      }
    }
  };
};