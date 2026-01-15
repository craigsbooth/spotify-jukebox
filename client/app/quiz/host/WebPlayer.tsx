'use client';
import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebPlayerProps {
    apiUrl: string;
    onDeviceReady: (deviceId: string) => void;
}

export default function WebPlayer({ apiUrl, onDeviceReady }: WebPlayerProps) {
    const isInitialized = useRef(false);
    const socketRef = useRef<Socket | null>(null);
    const playerRef = useRef<any>(null);
    const targetVolume = 0.8; // Centralized volume setting

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        // Initialize Socket for audio commands
        socketRef.current = io(apiUrl);

        (window as any).onSpotifyWebPlaybackSDKReady = () => {
            const player = new (window as any).Spotify.Player({
                name: 'Quiz Host (Web Browser)',
                getOAuthToken: async (cb: (token: string) => void) => {
                    try {
                        const res = await fetch(`${apiUrl}/quiz/token`);
                        const data = await res.json();
                        cb(data.token);
                    } catch (e) {
                        console.error("❌ Web Player: Token Fetch Error:", e);
                    }
                },
                volume: targetVolume
            });

            playerRef.current = player;

            // --- FADE LOGIC ---
            socketRef.current?.on('audio_command', async ({ action, duration }) => {
                if (action === 'FADE_OUT' && playerRef.current) {
                    try {
                        let currentVol = await playerRef.current.getVolume();
                        const steps = 20;
                        const intervalTime = duration / steps;
                        const stepAmount = currentVol / steps;

                        const fader = setInterval(async () => {
                            currentVol = Math.max(0, currentVol - stepAmount);
                            await playerRef.current.setVolume(currentVol);
                            
                            if (currentVol <= 0) {
                                clearInterval(fader);
                            }
                        }, intervalTime);
                    } catch (err) {
                        console.error("Fade Error:", err);
                    }
                }
            });

            // --- AUTO-VOLUME RESET ---
            // When the track changes or player state updates, ensure volume isn't stuck at 0 from a previous fade
            player.addListener('player_state_changed', async (state: any) => {
                if (!state) return;
                
                // If a new track starts or playback resumes, reset volume
                const currentVol = await player.getVolume();
                if (currentVol < 0.1 && !state.paused) {
                    await player.setVolume(targetVolume);
                }
            });

            // Event Listeners
            player.addListener('initialization_error', ({ message }: any) => console.error('Init Error:', message));
            player.addListener('authentication_error', ({ message }: any) => console.error('Auth Error:', message));
            player.addListener('account_error', ({ message }: any) => console.error('Account Error:', message));
            player.addListener('playback_error', ({ message }: any) => console.error('Playback Error:', message));

            player.addListener('ready', ({ device_id }: any) => {
                console.log('✅ Spotify Web Player Ready. Device ID:', device_id);
                onDeviceReady(device_id);
            });

            player.addListener('not_ready', ({ device_id }: any) => {
                console.log('⚠️ Device ID has gone offline:', device_id);
            });

            player.connect();
        };

        // Inject Spotify SDK Script
        if (!document.getElementById('spotify-player-script')) {
            const script = document.createElement('script');
            script.id = 'spotify-player-script';
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);
        }

        return () => {
            socketRef.current?.disconnect();
            if (playerRef.current) {
                playerRef.current.disconnect();
            }
        };
    }, []); // Empty dependency array ensures this only runs once on mount

    return null;
}