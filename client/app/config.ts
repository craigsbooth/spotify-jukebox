// client/app/config.ts - Flexible Environment Bridge

/**
 * ENVIRONMENT DETECTION
 * Determines if we are running locally or on the production domain.
 */
const isLocal = typeof window !== 'undefined' && 
               (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/**
 * BASE URL SELECTION
 * We use 127.0.0.1:8888 locally to match your Spotify Redirect whitelist exactly.
 */
const BASE_URL = isLocal 
  ? 'http://127.0.0.1:8888' 
  : 'https://jukebox.boldron.info';

/**
 * API_URL (THE FIX)
 * We append /api to match the modular route mounting in server.js.
 * This resolves the "Cannot GET /token" 404 error.
 */
export const API_URL = `${BASE_URL}/api`;

// --- CRITICAL ADDITION FOR QUIZ ---
// Sockets must connect to the Root URL (https://site.com), NOT the API URL (https://site.com/api)
export const SOCKET_URL = BASE_URL; 

console.log(`🌐 Jukebox Mode: ${isLocal ? 'LOCAL (127.0.0.1)' : 'PRODUCTION'}`);
console.log(`🔗 API Endpoint: ${API_URL}`);