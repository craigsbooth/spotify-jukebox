'use client';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config'; 

interface Track { name: string; artist: string; albumArt?: string; votes?: number; addedBy?: string; startedAt?: number; duration?: number; }

export default function Projector() {
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);
  const [upNext, setUpNext] = useState<Track | null>(null);
  const [theme, setTheme] = useState('none');
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [partyName, setPartyName] = useState('Pinfold');
  
  const [activeReactions, setActiveReactions] = useState<{id: number, emoji: string, left: number}[]>([]);
  const [progress, setProgress] = useState(0);
  const lastReactionIdRef = useRef(0); 

  useEffect(() => {
    const fetchData = () => {
      fetch(`${API_URL}/current`).then(res => res.json()).then(data => setNowPlaying(data?.name ? data : null));
      fetch(`${API_URL}/queue`).then(res => res.json()).then(data => setUpNext(data.length > 0 ? data[0] : null));
      fetch(`${API_URL}/theme`).then(res => res.json()).then(data => setTheme(data.theme));
      fetch(`${API_URL}/name`).then(res => res.json()).then(d => setPartyName(d.name));
      
      fetch(`${API_URL}/join-event`).then(res => res.json()).then(data => {
            if (data.name && data.name !== joinNotification) {
                setJoinNotification(data.name);
                setTimeout(() => setJoinNotification(null), 4000);
            }
      });
    };

    fetchData(); 
    const dataInterval = setInterval(fetchData, 2000); 

    const reactionInterval = setInterval(() => {
        fetch(`${API_URL}/reaction-event`).then(res => res.json()).then(data => {
            if (data.id > lastReactionIdRef.current && data.emoji) {
                lastReactionIdRef.current = data.id; 
                const newReaction = { id: data.id, emoji: data.emoji, left: Math.random() * 90 + 5 }; 
                setActiveReactions(prev => [...prev, newReaction]);
                setTimeout(() => setActiveReactions(prev => prev.filter(r => r.id !== newReaction.id)), 6000);
            }
        });
    }, 500);
    
    const progressInterval = setInterval(() => {
        setNowPlaying(current => {
            if (!current || !current.startedAt || !current.duration) { setProgress(0); return current; }
            const elapsed = Date.now() - current.startedAt;
            const pct = Math.min((elapsed / current.duration) * 100, 100);
            setProgress(pct);
            return current;
        });
    }, 100);

    return () => { 
        clearInterval(dataInterval); 
        clearInterval(reactionInterval); 
        clearInterval(progressInterval); 
    };
  }, [joinNotification]); 

  const bgImage = nowPlaying?.albumArt || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2070&auto=format&fit=crop';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slowMove { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes fallDown { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(130vh) rotate(45deg); opacity: 1; } }
        @keyframes snowfall { 0% { transform: translateY(-10vh) translateX(0); opacity: 1; } 100% { transform: translateY(110vh) translateX(20px); opacity: 0.3; } }
        @keyframes confettiFall { 0% { transform: translateY(-10vh) rotate(0deg); } 100% { transform: translateY(110vh) rotate(360deg); } }
        @keyframes sunPulse { 0% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 0.3; transform: scale(1); } }
      `}} />

      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', zIndex: 0, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(80px) brightness(0.6) saturate(1.4)', animation: 'slowMove 60s infinite alternate ease-in-out' }} />

      {theme === 'winter' && ( <div style={{position: 'absolute', top:0, left:0, width:'100%', height:'100%', zIndex: 5, pointerEvents: 'none'}}> <div style={{position: 'absolute', top:0, left:0, width:'100%', height:'100%', boxShadow: 'inset 0 0 150px 50px rgba(255,255,255,0.4)', opacity: 0.8}} /> {[...Array(20)].map((_, i) => ( <div key={i} style={{ position: 'absolute', top: -20, left: `${Math.random() * 100}vw`, color: 'white', fontSize: `${Math.random() * 20 + 10}px`, opacity: 0.8, animation: `snowfall ${Math.random() * 5 + 5}s linear infinite`, animationDelay: `-${Math.random() * 5}s` }}>❄</div> ))} </div> )}
      {theme === 'party' && ( <div style={{position: 'absolute', top:0, left:0, width:'100%', height:'100%', zIndex: 5, pointerEvents: 'none'}}> {[...Array(30)].map((_, i) => ( <div key={i} style={{ position: 'absolute', top: -20, left: `${Math.random() * 100}vw`, width: '10px', height: '10px', backgroundColor: ['#FF0', '#F00', '#0F0', '#00F', '#F0F'][Math.floor(Math.random()*5)], animation: `confettiFall ${Math.random() * 3 + 2}s linear infinite`, animationDelay: `-${Math.random() * 3}s` }} /> ))} </div> )}
      {theme === 'summer' && ( <div style={{ position: 'absolute', top:'-20%', right:'-20%', width:'80vw', height:'80vw', background: 'radial-gradient(circle, rgba(255,200,100,0.4) 0%, rgba(255,200,100,0) 70%)', zIndex: 5, pointerEvents: 'none', mixBlendMode: 'screen', animation: 'sunPulse 10s infinite ease-in-out' }} /> )}

      {activeReactions.map(r => (
          <div key={r.id} style={{ position: 'absolute', left: `${r.left}%`, top: '-15vh', fontSize: '6rem', zIndex: 9999, animation: 'fallDown 5s linear forwards', pointerEvents: 'none' }}>{r.emoji}</div>
      ))}

      {joinNotification && (
          <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', 
              background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.4), rgba(242, 208, 107, 0.4))', 
              backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
              color: 'black', zIndex: 999, textAlign: 'center', padding: '20px',
              animation: 'slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', boxShadow: '0 5px 20px rgba(0,0,0,0.2)'
          }}>
              <h1 style={{margin:0, textTransform:'uppercase', fontSize:'2rem', fontWeight:900}}>👋 {joinNotification} has joined!</h1>
          </div>
      )}

      <div style={{ position: 'relative', zIndex: 10, height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: 'white' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h1 style={{ margin: 0, fontSize: '1.8rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800 }}>{partyName} JukeBox</h1>
              <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {upNext ? (
                      <>
                        <img src={upNext.albumArt || 'https://placehold.co/100'} style={{ width: '50px', height: '50px', borderRadius: '6px', marginRight: '15px', objectFit: 'cover' }} />
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.7, letterSpacing: '1px' }}>Up Next</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upNext.name}</div>
                            {upNext.addedBy ? <div style={{ fontSize: '0.8rem', color: '#D4AF37' }}>Requested by {upNext.addedBy}</div> : <div style={{ opacity: 0.8, fontSize: '0.8rem' }}>{upNext.artist}</div>}
                        </div>
                      </>
                  ) : ( <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Up Next: DJ Fallback Mix</div> )}
              </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '40px' }}>
              {nowPlaying ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1, overflow: 'hidden', animation: 'fadeIn 1s' }}>
                      <img src={nowPlaying.albumArt} style={{ width: '220px', height: '220px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', flexShrink: 0, objectFit: 'cover' }} />
                      <div style={{ marginLeft: '30px', paddingBottom: '5px', overflow: 'hidden', flex: 1 }}>
                          <div style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.7, marginBottom: '8px' }}>Now Playing</div>
                          <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '10px', textShadow: '0 2px 10px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowPlaying.name}</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 400, opacity: 0.9 }}>{nowPlaying.artist}</div>
                          {nowPlaying.addedBy && nowPlaying.addedBy !== 'Guest' && (
                              <div style={{ marginTop: '15px', display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: '15px', fontSize: '0.9rem', fontWeight:'bold', border:'1px solid rgba(255,255,255,0.3)' }}>
                                  Selected by {nowPlaying.addedBy}
                              </div>
                          )}
                          
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', marginTop: '20px', overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', background: '#D4AF37', borderRadius: '3px', transition: 'width 0.1s linear' }} />
                          </div>
                      </div>
                  </div>
              ) : ( <div style={{ opacity: 0.5, fontSize: '1.5rem' }}>Waiting for music...</div> )}

              <div style={{ background: 'white', padding: '15px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', color: 'black', width: '180px', flexShrink: 0 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://jukebox.boldron.info/guest')}`} style={{ width: '100%', aspectRatio: '1/1', display: 'block' }} />
                  <div style={{ fontWeight: 900, fontSize: '1rem', marginTop: '10px', textTransform: 'uppercase' }}>Join the Party</div>
              </div>
          </div>
      </div>
    </div>
  );
}