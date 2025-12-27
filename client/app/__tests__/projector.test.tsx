import { render, screen, act, waitFor } from '@testing-library/react';
import Projector from '../projector/page';
import '@testing-library/jest-dom';

// universal Mock Fetch
global.fetch = jest.fn((url) => {
  if (url.includes('/queue')) {
    return Promise.resolve({
      json: () => Promise.resolve([{ name: 'Next Song', artist: 'Artist', albumArt: 'next.jpg', uri: 'spotify:1' }]),
    });
  }
  if (url.includes('/current')) {
    return Promise.resolve({ 
        json: () => Promise.resolve({ 
            name: 'Now Playing', artist: 'Hero Artist', album: 'Hero Album',
            startedAt: Date.now(), duration: 180000, uri: 'spotify:now'
        }) 
    });
  }
  if (url.includes('/reaction-event')) {
    return Promise.resolve({ json: () => Promise.resolve({ id: 999, emoji: '🔥' }) });
  }
  if (url.includes('/join-event')) {
    return Promise.resolve({ json: () => Promise.resolve({ name: 'GuestUser' }) });
  }
  if (url.includes('/theme')) {
    return Promise.resolve({ json: () => Promise.resolve({ theme: 'standard', showLyrics: true }) });
  }
  if (url.includes('/name')) {
    return Promise.resolve({ json: () => Promise.resolve({ name: 'Pinfold' }) });
  }
  // Mock external Lyrics API to prevent the "Error" status in logs
  if (url.includes('lrclib.net')) {
    return Promise.resolve({ json: () => Promise.resolve([{ trackName: 'Now Playing', plainLyrics: 'Test Lyrics' }]) });
  }
  return Promise.resolve({ json: () => Promise.resolve({}) });
}) as jest.Mock;

describe('Projector Fortified Suite v2.0.0', () => {
  beforeEach(() => { 
    jest.clearAllMocks(); 
  });

  it('verifies the Reaction Engine (Falling Emojis) is functional', async () => {
    // We use real timers but a very fast poll mock
    await act(async () => { render(<Projector />); });

    // The reaction engine polls every 500ms. We wait for it to cycle once.
    await waitFor(() => {
        const emoji = screen.queryByText('🔥');
        expect(emoji).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('verifies the Up Next pill visibility in Standard View', async () => {
    await act(async () => { render(<Projector />); });
    
    await waitFor(() => {
        expect(screen.getByText(/UP NEXT/i)).toBeInTheDocument();
        expect(screen.getByText(/Next Song/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('verifies Join Notifications popup logic', async () => {
    await act(async () => { render(<Projector />); });
    await waitFor(() => {
        expect(screen.getByText(/GuestUser joined!/i)).toBeInTheDocument();
    });
  });

  it('verifies Global Branding and Metadata', async () => {
    await act(async () => { render(<Projector />); });
    await waitFor(() => {
        expect(screen.getAllByText(/Pinfold/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Hero Artist/i)).toBeInTheDocument();
    });
  });

  it('gracefully handles empty states', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/current')) return Promise.resolve({ json: () => Promise.resolve(null) });
        return Promise.resolve({ json: () => Promise.resolve({ name: 'Pinfold' }) });
    });
    await act(async () => { render(<Projector />); });
    await waitFor(() => {
        expect(screen.getAllByText(/Pinfold/i).length).toBeGreaterThan(0);
    });
  });
});