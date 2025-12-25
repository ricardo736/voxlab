import { describe, it, expect, beforeEach, vi } from 'vitest';
import { noteToFrequency, frequencyToNote, semitoneToNoteName } from '../utils';

describe('Pitch Detection Utilities', () => {
  describe('noteToFrequency', () => {
    it('should convert note names to correct frequencies', () => {
      expect(noteToFrequency('A4')).toBeCloseTo(440.0, 1);
      expect(noteToFrequency('C4')).toBeCloseTo(261.63, 1);
      expect(noteToFrequency('C5')).toBeCloseTo(523.25, 1);
    });

    it('should handle sharp notes', () => {
      expect(noteToFrequency('C#4')).toBeCloseTo(277.18, 1);
      expect(noteToFrequency('F#4')).toBeCloseTo(369.99, 1);
    });

    it('should handle flat notes', () => {
      expect(noteToFrequency('Db4')).toBeCloseTo(277.18, 1);
      expect(noteToFrequency('Bb4')).toBeCloseTo(466.16, 1);
    });

    it('should handle different octaves', () => {
      expect(noteToFrequency('A3')).toBeCloseTo(220.0, 1);
      expect(noteToFrequency('A5')).toBeCloseTo(880.0, 1);
    });
  });

  describe('frequencyToNote', () => {
    it('should convert frequencies to correct note names', () => {
      const result = frequencyToNote(440.0);
      expect(result.note).toBe('A4');
      expect(result.cents).toBeCloseTo(0, 1);
    });

    it('should detect slightly flat notes', () => {
      const result = frequencyToNote(435.0); // Slightly flat A4
      expect(result.note).toBe('A4');
      expect(result.cents).toBeLessThan(0);
    });

    it('should detect slightly sharp notes', () => {
      const result = frequencyToNote(445.0); // Slightly sharp A4
      expect(result.note).toBe('A4');
      expect(result.cents).toBeGreaterThan(0);
    });

    it('should handle low frequencies', () => {
      const result = frequencyToNote(100.0);
      expect(result.note).toBeTruthy();
    });

    it('should handle high frequencies', () => {
      const result = frequencyToNote(1000.0);
      expect(result.note).toBeTruthy();
    });
  });

  describe('semitoneToNoteName', () => {
    it('should convert semitones to correct note names', () => {
      expect(semitoneToNoteName(0)).toBe('C');
      expect(semitoneToNoteName(1)).toBe('C#');
      expect(semitoneToNoteName(2)).toBe('D');
    });

    it('should handle octave wrapping', () => {
      expect(semitoneToNoteName(12)).toBe('C');
      expect(semitoneToNoteName(13)).toBe('C#');
    });

    it('should handle negative semitones', () => {
      expect(semitoneToNoteName(-1)).toBe('B');
      expect(semitoneToNoteName(-2)).toBe('Bb');
    });
  });
});

describe('Audio Processing', () => {
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
  });

  it('should create an audio context', () => {
    expect(audioContext).toBeDefined();
    expect(audioContext.sampleRate).toBe(48000);
  });

  it('should create an oscillator', () => {
    const oscillator = audioContext.createOscillator();
    expect(oscillator).toBeDefined();
    expect(oscillator.connect).toBeDefined();
    expect(oscillator.start).toBeDefined();
  });

  it('should create a gain node', () => {
    const gainNode = audioContext.createGain();
    expect(gainNode).toBeDefined();
    expect(gainNode.gain).toBeDefined();
  });

  it('should create an analyser node', () => {
    const analyser = audioContext.createAnalyser();
    expect(analyser).toBeDefined();
    expect(analyser.fftSize).toBe(2048);
  });
});
