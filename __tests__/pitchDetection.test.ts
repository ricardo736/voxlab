import { describe, it, expect, beforeEach, vi } from 'vitest';
import { noteToFrequency, frequencyToNote, semitoneToNoteName } from '../utils';

describe('Pitch Detection Utilities', () => {
  describe('noteToFrequency', () => {
    it('should convert semitones to correct frequencies', () => {
      // C4 is at semitone 0 (BASE_FREQ = 261.63)
      expect(noteToFrequency(0)).toBeCloseTo(261.63, 1);
      // A4 is +9 semitones from C4
      expect(noteToFrequency(9)).toBeCloseTo(440.0, 1);
      // C5 is +12 semitones from C4
      expect(noteToFrequency(12)).toBeCloseTo(523.25, 1);
    });

    it('should handle positive semitones', () => {
      // C#4 is +1 semitone from C4
      expect(noteToFrequency(1)).toBeCloseTo(277.18, 1);
      // F#4 is +6 semitones from C4
      expect(noteToFrequency(6)).toBeCloseTo(369.99, 1);
    });

    it('should handle different octaves', () => {
      // C3 is -12 semitones from C4
      expect(noteToFrequency(-12)).toBeCloseTo(130.81, 1);
      // C5 is +12 semitones from C4
      expect(noteToFrequency(12)).toBeCloseTo(523.25, 1);
    });
  });

  describe('frequencyToNote', () => {
    it('should convert frequencies to correct note names', () => {
      const result = frequencyToNote(440.0);
      expect(result?.name).toBe('A4');
      expect(result?.detune).toBeCloseTo(0, 1);
    });

    it('should detect slightly flat notes', () => {
      const result = frequencyToNote(435.0); // Slightly flat A4
      expect(result?.name).toBe('A4');
      expect(result?.detune).toBeLessThan(0);
    });

    it('should detect slightly sharp notes', () => {
      const result = frequencyToNote(445.0); // Slightly sharp A4
      expect(result?.name).toBe('A4');
      expect(result?.detune).toBeGreaterThan(0);
    });

    it('should handle low frequencies', () => {
      const result = frequencyToNote(100.0);
      expect(result?.name).toBeTruthy();
    });

    it('should handle high frequencies', () => {
      const result = frequencyToNote(1000.0);
      expect(result?.name).toBeTruthy();
    });

    it('should handle invalid frequencies', () => {
      const result = frequencyToNote(0);
      expect(result).toBe(null);
    });
  });

  describe('semitoneToNoteName', () => {
    it('should convert semitones to correct note names with octave', () => {
      // Semitone 0 = C4
      expect(semitoneToNoteName(0)).toBe('C4');
      // Semitone 1 = C#4
      expect(semitoneToNoteName(1)).toBe('C#4');
      // Semitone 2 = D4
      expect(semitoneToNoteName(2)).toBe('D4');
    });

    it('should handle octave changes', () => {
      // Semitone 12 = C5
      expect(semitoneToNoteName(12)).toBe('C5');
      // Semitone 13 = C#5
      expect(semitoneToNoteName(13)).toBe('C#5');
    });

    it('should handle negative semitones', () => {
      // Semitone -1 = B3
      expect(semitoneToNoteName(-1)).toBe('B3');
      // Semitone -2 = A#3 (Bb3 enharmonic)
      expect(semitoneToNoteName(-2)).toBe('A#3');
    });
  });
});

describe('Audio Processing', () => {
  it('should have AudioContext mock available', () => {
    expect(global.AudioContext).toBeDefined();
  });

  it('should create mocked oscillator', () => {
    const mockContext = vi.fn().mockReturnValue({
      createOscillator: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
      })),
    });
    const context = mockContext();
    const oscillator = context.createOscillator();
    expect(oscillator).toBeDefined();
    expect(oscillator.connect).toBeDefined();
  });
});

