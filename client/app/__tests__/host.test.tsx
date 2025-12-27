import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import HostDashboard from '../page';
import '@testing-library/jest-dom';
import React from 'react';

// Mock the Spotify Player to prevent rendering errors in test
jest.mock('react-spotify-web-playback', () => {
  return function MockPlayer() {
    return <div data-testid="mock-player" />;
  };
});

// Enhanced Mock Fetch
global.fetch = jest.fn((url) => {
  if (url.includes('/queue')) {
    return Promise.resolve({
      json: () => Promise.resolve([{ 
        uri: 'spotify:1', 
        name: 'Song 1', 
        artist: 'Artist', 
        votes: 1, 
        votedBy: [] 
      }])
    });
  }
  if (url.includes('/theme')) {
    // Check for POST vs GET
    return Promise.resolve({ 
      json: () => Promise.resolve({ theme: 'carousel', success: true }) 
    });
  }
  // Default response for settings/auth/name
  return Promise.resolve({ 
    json: () => Promise.resolve({ 
      access_token: 'fake_token', 
      name: 'Pinfold', 
      theme: 'standard' 
    }) 
  });
}) as jest.Mock;

describe('Host Dashboard Critical Paths', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('requires PIN entry before showing the dashboard', async () => {
    await act(async () => {
      render(<HostDashboard />);
    });
    expect(screen.getByText(/HOST ACCESS/i)).toBeInTheDocument();
  });

  it('unlocks the dashboard with the correct PIN', async () => {
    await act(async () => {
      render(<HostDashboard />);
    });

    const pinInput = screen.getByPlaceholderText(/PIN/i);
    
    await act(async () => {
      fireEvent.change(pinInput, { target: { value: '1234' } });
    });

    // We use closest('form') because 'form' role is sometimes implicit or missing in JSDOM
    const form = pinInput.closest('form');
    if (form) {
      await act(async () => {
        fireEvent.submit(form);
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/PRIORITY QUEUE/i)).toBeInTheDocument();
    });
  });

  it('toggles Projector modes correctly', async () => {
    // Bypass PIN for this test to focus on functionality
    localStorage.setItem('jukebox_host_auth', 'true');
    
    await act(async () => {
      render(<HostDashboard />);
    });
    
    await waitFor(() => {
        const carouselBtn = screen.getByText(/CAROUSEL/i);
        fireEvent.click(carouselBtn);
    });

    // Verify the API call was made to change the theme
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/theme'), 
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"theme":"carousel"')
      })
    );
  });
});