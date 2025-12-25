import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0, setValueAtTime: vi.fn() },
    type: 'sine',
    disconnect: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  })),
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteTimeDomainData: vi.fn(),
    getByteFrequencyData: vi.fn(),
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createBiquadFilter: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    frequency: { value: 0, setValueAtTime: vi.fn() },
    Q: { value: 1, setValueAtTime: vi.fn() },
    type: 'lowpass',
  })),
  createBuffer: vi.fn((channels, length, sampleRate) => ({
    length,
    duration: length / sampleRate,
    sampleRate,
    numberOfChannels: channels,
    getChannelData: vi.fn(() => new Float32Array(length)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
    playbackRate: { value: 1, setValueAtTime: vi.fn() },
    loop: false,
    loopStart: 0,
    loopEnd: 0,
  })),
  destination: {},
  sampleRate: 48000,
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
})) as any;

// Mock AudioWorklet
global.AudioWorkletNode = vi.fn().mockImplementation((context, name) => ({
  context,
  name,
  connect: vi.fn(),
  disconnect: vi.fn(),
  port: {
    postMessage: vi.fn(),
    onmessage: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
})) as any;

// Mock MediaDevices
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: vi.fn(() => [
      {
        stop: vi.fn(),
        kind: 'audio',
        enabled: true,
      },
    ]),
    getAudioTracks: vi.fn(() => [
      {
        stop: vi.fn(),
        kind: 'audio',
        enabled: true,
      },
    ]),
  }),
  enumerateDevices: vi.fn().mockResolvedValue([]),
} as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
