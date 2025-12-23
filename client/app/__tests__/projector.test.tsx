import { render, screen, act, waitFor } from '@testing-library/react';
import Projector from '../projector/page';
import '@testing-library/jest-dom';

// Enhanced Mock Fetch
global.fetch = jest.fn((url) => {
  if (url.includes('/queue')) {
    return Promise.resolve({
      json: () => Promise.resolve([
          { name: 'Next Song', artist: 'Artist', album: 'Future Album', albumArt: 'next.jpg', uri: 'spotify:1' },
          { name: 'After Next', artist: 'Artist', album: 'Future Album', albumArt: 'after.jpg', uri: 'spotify:2' }
      ]),
    });
  }
  if (url.includes('/current')) {
    return Promise.resolve({ 
        json: () => Promise.resolve({ 
            name: 'Now Playing', 
            artist: 'Hero Artist', 
            album: 'Hero Album',
            albumArt: 'now.jpg',
            uri: 'spotify:now',
            startedAt: Date.now(),
            duration: 180000
        }) 
    });
  }
  if (url.includes('/theme')) {
      // Default mock state
      return Promise.resolve({ json: () => Promise.resolve({ theme: 'carousel', showLyrics: true }) });
  }
  return Promise.resolve({ json: () => Promise.resolve({ name: 'Pinfold' }) });
}) as jest.Mock;

describe('Projector Feature Audit', () => {
  beforeEach(() => { 
    jest.clearAllMocks(); 
  });

  it('verifies Global Branding is always present', async () => {
    await act(async () => { render(<Projector />); });
    await waitFor(() => {
        const branding = screen.getAllByText(/Pinfold/i);
        expect(branding.length).toBeGreaterThan(0);
    });
  });

  it('ensures QR code is REMOVED in Carousel mode', async () => {
    // Mock theme as carousel
    (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/theme')) return Promise.resolve({ json: () => Promise.resolve({ theme: 'carousel' }) });
        return Promise.resolve({ json: () => Promise.resolve({ name: 'Pinfold' }) });
    });

    await act(async () => { render(<Projector />); });
    await waitFor(() => {
        // We expect "SCAN TO" to NOT be in the document
        expect(screen.queryByText(/SCAN TO/i)).not.toBeInTheDocument();
    });
  });

  it('ensures QR code is PRESENT in Standard mode', async () => {
    // Mock theme as standard
    (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/theme')) return Promise.resolve({ json: () => Promise.resolve({ theme: 'standard' }) });
        return Promise.resolve({ json: () => Promise.resolve({ name: 'Pinfold' }) });
    });

    await act(async () => { render(<Projector />); });
    await waitFor(() => {
        // Standard mode uses "JOIN THE PARTY"
        expect(screen.getByText(/JOIN THE/i)).toBeInTheDocument();
    });
  });

  it('ensures Coverflow renders metadata correctly', async () => {
    await act(async () => { render(<Projector />); });
    await waitFor(() => {
        expect(screen.getByText(/Now Playing/i)).toBeInTheDocument();
        expect(screen.getByText(/Hero Artist/i)).toBeInTheDocument();
        expect(screen.getByText(/Hero Album/i)).toBeInTheDocument();
    });
  });

  it('gracefully handles empty states', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/current')) return Promise.resolve({ json: () => Promise.resolve(null) });
        return Promise.resolve({ json: () => Promise.resolve({ name: 'Pinfold' }) });
    });

    await act(async () => { render(<Projector />); });
    await waitFor(() => {
        const branding = screen.getAllByText(/Pinfold/i);
        expect(branding.length).toBeGreaterThan(0);
    });
  });
});