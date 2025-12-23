import { render, screen, act, waitFor } from '@testing-library/react';
import Home from '../page';

// 1. Mock Spotify Player and API
jest.mock('react-spotify-web-playback', () => () => <div data-testid="spotify-player" />);

global.fetch = jest.fn((url) => {
  if (url.includes('/queue')) {
    return Promise.resolve({
      json: () => Promise.resolve([
          { name: 'Voted Song', artist: 'Guest', votes: 1, isFallback: false },
          { name: 'Fallback Buffer', artist: 'System', votes: 0, isFallback: true }
      ]),
    });
  }
  return Promise.resolve({ json: () => Promise.resolve({ access_token: 'fake', name: 'The Pinfold', theme: 'standard' }) });
}) as jest.Mock;

describe('Priority Queue Feature Audit', () => {
  beforeEach(() => {
    Storage.prototype.getItem = jest.fn(() => 'true'); 
    jest.clearAllMocks();
  });

  it('renders priority branding and AWAKE status', async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => {
        expect(screen.getByText(/PRIORITY QUEUE/i)).toBeInTheDocument();
        expect(screen.getByText(/AWAKE/i)).toBeInTheDocument();
    });
  });

  it('verifies that Buffer tracks are identified in the UI', async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => {
        // Voted tracks should appear
        expect(screen.getByText(/Voted Song/i)).toBeInTheDocument();
        
        // Handle multiple instances of "BUFFER" (The name and the Label)
        const bufferElements = screen.getAllByText(/BUFFER/i);
        expect(bufferElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('verifies overlay controls exist', async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => {
        // Checking for the toggle section restored in previous step
        expect(screen.getByText(/LYRICS:/i)).toBeInTheDocument();
    });
  });
});