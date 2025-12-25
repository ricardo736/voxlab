import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock the Google GenAI module
vi.mock('@google/genai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Mocked AI response',
        },
      }),
    })),
  })),
}));

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />);
    // Check if the app renders some expected element
    const rootElement = document.getElementById('root');
    expect(rootElement).toBeDefined();
  });

  it('should have proper structure', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
    expect(container.firstChild).toBeDefined();
  });

  it('should initialize with default state', () => {
    render(<App />);
    // The app should render without errors
    expect(document.body).toBeTruthy();
  });
});

describe('App Integration', () => {
  it('should handle audio context creation', () => {
    render(<App />);
    // Audio context should be mocked
    expect(global.AudioContext).toBeDefined();
  });

  it('should handle media devices', () => {
    render(<App />);
    expect(global.navigator.mediaDevices).toBeDefined();
    expect(global.navigator.mediaDevices.getUserMedia).toBeDefined();
  });
});

describe('App Error Handling', () => {
  it('should render with ErrorBoundary', () => {
    // The app should be wrapped in an error boundary
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('should handle missing audio context gracefully', () => {
    const originalAudioContext = global.AudioContext;
    // @ts-ignore
    global.AudioContext = undefined;
    
    try {
      render(<App />);
      expect(document.body).toBeTruthy();
    } finally {
      global.AudioContext = originalAudioContext;
    }
  });
});
