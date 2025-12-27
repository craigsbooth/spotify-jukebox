import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import GuestPage from '../guest/page';
import '@testing-library/jest-dom';
import React from 'react';

// --- MOCK FETCH ENGINE ---
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

mockFetch.mockImplementation((url: string) => {
  if (url.includes('/search')) {
    return Promise.resolve({
      json: () => Promise.resolve([{ 
        uri: 'spotify:track:unique123', 
        name: 'Target Track', 
        artist: 'Target Artist',
        votes: 0,
        votedBy: []
      }])
    });
  }
  
  if (url.includes('/queue')) {
    return Promise.resolve({ json: () => Promise.resolve([]) });
  }

  return Promise.resolve({ 
    json: () => Promise.resolve({ success: true, name: 'Pinfold', theme: 'standard' }) 
  });
});

describe('Guest Page Deployment Suite', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.clear();
    localStorage.setItem('jukebox_guest_id', 'test-guest-id');
    localStorage.setItem('jukebox_guest_name', 'Test Guest');
    jest.useFakeTimers(); 
  });

  afterEach(async () => {
    // Clean up any pending state updates from intervals/timers
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders search input and handles typing', async () => {
    await act(async () => { 
      render(<GuestPage />); 
      // Advance timers to clear the initial mount effects (polling start, etc)
      jest.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText(/Search/i);
    await act(async () => {
        fireEvent.change(input, { target: { value: 'Queen' } });
    });
    expect(input).toHaveValue('Queen');
  });

  it('sends an emoji reaction when a reaction button is tapped', async () => {
    await act(async () => { 
      render(<GuestPage />); 
      jest.advanceTimersByTime(100);
    });
    
    const fireBtn = screen.getByText('🔥');
    
    await act(async () => {
      fireEvent.click(fireBtn);
      // Flush the microtask queue for the fetch call
      await Promise.resolve();
    });
    
    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const reactRequest = calls.find(call => 
        (call[0].includes('/react') || call[0].includes('/reaction')) && 
        call[1]?.method === 'POST'
      );
      expect(reactRequest).toBeDefined();
    });
  });
});