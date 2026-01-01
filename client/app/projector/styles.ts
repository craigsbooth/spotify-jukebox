// styles.ts - The Design System for the Projector
export const styles: any = {
  masterWrapper: { position: 'fixed', inset: 0, background: '#000', color: 'white', overflow: 'hidden', fontFamily: 'Inter, sans-serif' },
  backgroundContainer: { position: 'absolute', inset: 0, zIndex: 0 },
  bgImage: { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', transition: 'background-image 2s ease' },
  monitorOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)' },
  meshAnimation: { position: 'absolute', inset: '-10%', animation: 'meshDrift 40s infinite ease-in-out' },
  emojiLayer: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 250 },
  emoji: { position: 'absolute', fontSize: '8rem', animation: 'emojiDrop 7s linear forwards', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' },
  brandingHeader: { position: 'absolute', top: '3vh', left: '3vw', zIndex: 100, fontSize: '0.7rem', fontWeight: 900, letterSpacing: '8px', textTransform: 'uppercase', opacity: 0.5 },
  notificationWrapper: { position: 'absolute', top: '10vh', left: '50%', transform: 'translateX(-50%)', zIndex: 200, animation: 'slideDown 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' },
  joinPill: { background: 'rgba(255,255,255,0.3)', padding: '20px 60px', borderRadius: '100px', backdropFilter: 'blur(40px)' },
  carouselPerspective: { position: 'relative', height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '1500px' },
  carouselContainer: { position: 'relative', width: '100%', height: '70vh', marginTop: '-10vh', display: 'flex', alignItems: 'center', justifyContent: 'center', transformStyle: 'preserve-3d' },
  carouselArt: { width: '100%', aspectRatio: '1/1', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' },
  carouselInfo: { marginTop: '6vh', width: '140%', marginLeft: '-20%', textAlign: 'center' },
  carouselTitle: { fontSize: '3.5vw', margin: 0, fontWeight: 950, lineHeight: 1 },
  carouselArtist: { fontSize: '1.8vw', color: '#D4AF37', fontWeight: 800, marginTop: '0.5vh' },
  progressBarBase: { width: '25vw', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', margin: '2vh auto 0 auto', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #fff, #D4AF37)', transition: 'width 0.5s linear' },
  standardContainer: { position: 'relative', zIndex: 10, height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6vw' },
  upNextPosition: { position: 'absolute', top: '4vh', right: '4vw' },
  upNextPill: { display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.12)', padding: '10px 25px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.25)' },
  upNextArt: { width: '60px', height: '60px', borderRadius: '10px' },
  lyricsWindow: { height: '45vh', overflowY: 'auto', maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)' },
  plainLyricsText: { textAlign: 'center', fontSize: '2.5rem', opacity: 0.3, fontWeight: 900, padding: '0 10vw' },
  standardFooter: { position: 'absolute', bottom: '6vh', left: '4vw', right: '4vw', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  footerFlex: { display: 'flex', gap: '3vw', alignItems: 'center' },
  footerArt: { width: '20vw', height: '20vw', borderRadius: '30px' },
  footerTitle: { fontSize: '4vw', fontWeight: 950, margin: '0' },
  footerArtist: { fontSize: '2vw', opacity: 0.8 },
  footerProgressBase: { width: '30vw', height: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', marginTop: '3vh', overflow: 'hidden' },
  footerProgressFill: { height: '100%', background: 'white', transition: 'width 0.5s linear' },
  qrContainer: { background: 'white', padding: '2vw', borderRadius: '40px', textAlign: 'center', width: '20vw' },
  qrText: { color: 'black', fontWeight: 950, fontSize: '1rem', marginTop: '1vh' },
  monitorContainer: { position: 'relative', zIndex: 10, height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10vh 8vw' },
  monitorTitle: { fontSize: '7vw', margin: 0, fontWeight: 950, lineHeight: 1 },
  monitorArtist: { fontSize: '3.5vw', opacity: 0.9, color: '#D4AF37', marginTop: '1vh' },
  debugOverlay: { position: 'fixed', bottom: '2vh', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'rgba(0,0,0,0.85)', padding: '8px 25px', borderRadius: '50px', color: '#0f0', fontSize: '0.75rem', border: '1px solid #0f0' }
};

export const getCarouselStyle = (relIndex: number, absIndex: number) => ({
  position: 'absolute' as 'absolute',
  width: (relIndex === 0) ? '22vw' : '16vw',
  zIndex: 100 - absIndex,
  transform: `translateX(${relIndex * 12 + (relIndex < 0 ? -12 : relIndex > 0 ? 12 : 0)}vw) translateY(${absIndex * 1.5}vh) translateZ(${(relIndex === 0) ? '10vw' : `calc(5vw - ${absIndex * 6}vw)`}) rotateY(${relIndex === 0 ? 0 : relIndex < 0 ? 60 : -60}deg)`,
  transition: 'all 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
  transformStyle: 'preserve-3d' as 'preserve-3d',
  backfaceVisibility: 'hidden' as 'hidden',
  opacity: 1,
  textAlign: 'center' as 'center'
});

export const keyframes = `
  @keyframes meshDrift { 0% { transform: scale(1); } 50% { transform: scale(1.1) rotate(1deg); } 100% { transform: scale(1); } }
  @keyframes emojiDrop { 0% { transform: translateY(-20vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(110vh) rotate(360deg); opacity: 0; } }
  @keyframes slideDown { from { transform: translateY(-200%); } to { transform: translateY(0); } }
  .lyric-line { transition: all 0.6s cubic-bezier(0.2, 1, 0.2, 1); margin: 2.5rem 0; text-align: center; width: 100%; }
  .active { font-size: 3.5rem; font-weight: 950; opacity: 1; color: #fff; text-shadow: 0 0 30px rgba(255,255,255,0.5); transform: scale(1.05); }
  .inactive { font-size: 2rem; font-weight: 700; opacity: 0.15; transform: scale(0.9); color: #fff; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .reflect-image { -webkit-box-reflect: below 4px linear-gradient(transparent, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.25) 100%); object-fit: cover; }
`;