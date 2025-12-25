import { describe, it, expect } from 'vitest';
import { frequencyToNote, semitoneToNoteName, noteToFrequency } from '../utils';
import { BASE_FREQ } from '../constants';

describe('Pitch Detection Utils', () => {
  describe('frequencyToNote', () => {
    it('should convert 440 Hz to A4', () => {
      const result = frequencyToNote(440);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('A4');
      expect(result?.semitone).toBe(9); // A4 is 9 semitones above C4
    });

    it('should convert 261.63 Hz (C4) to C4', () => {
      const result = frequencyToNote(BASE_FREQ);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('C4');
      expect(result?.semitone).toBe(0);
    });

    it('should convert 523.25 Hz to C5', () => {
      const result = frequencyToNote(523.25);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('C5');
      expect(result?.semitone).toBe(12);
    });

    it('should return null for invalid frequencies', () => {
      expect(frequencyToNote(0)).toBeNull();
      expect(frequencyToNote(-1)).toBeNull();
    });

    it('should calculate detune correctly for slightly sharp notes', () => {
      // Slightly sharp A4 (445 Hz instead of 440 Hz)
      const result = frequencyToNote(445);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('A4');
      expect(result?.detune).toBeGreaterThan(0);
      expect(result?.detune).toBeLessThan(50); // Should be less than 50 cents sharp
    });

    it('should calculate detune correctly for slightly flat notes', () => {
      // Slightly flat A4 (435 Hz instead of 440 Hz)
      const result = frequencyToNote(435);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('A4');
      expect(result?.detune).toBeLessThan(0);
      expect(result?.detune).toBeGreaterThan(-50); // Should be less than 50 cents flat
    });
  });

  describe('semitoneToNoteName', () => {
    it('should convert semitone 0 to C4', () => {
      expect(semitoneToNoteName(0)).toBe('C4');
    });

    it('should convert semitone 9 to A4', () => {
      expect(semitoneToNoteName(9)).toBe('A4');
    });

    it('should convert semitone 12 to C5', () => {
      expect(semitoneToNoteName(12)).toBe('C5');
    });

    it('should convert semitone -12 to C3', () => {
      expect(semitoneToNoteName(-12)).toBe('C3');
    });

    it('should handle sharp notes correctly', () => {
      expect(semitoneToNoteName(1)).toBe('C#4');
      expect(semitoneToNoteName(6)).toBe('F#4');
    });
  });

  describe('noteToFrequency', () => {
    it('should convert semitone 0 (C4) to base frequency', () => {
      expect(noteToFrequency(0)).toBeCloseTo(BASE_FREQ, 1);
    });

    it('should convert semitone 9 (A4) to 440 Hz', () => {
      expect(noteToFrequency(9)).toBeCloseTo(440, 1);
    });

    it('should convert semitone 12 (C5) to double base frequency', () => {
      expect(noteToFrequency(12)).toBeCloseTo(BASE_FREQ * 2, 1);
    });

    it('should convert semitone -12 (C3) to half base frequency', () => {
      expect(noteToFrequency(-12)).toBeCloseTo(BASE_FREQ / 2, 1);
    });

    it('should handle semitone conversion symmetrically', () => {
      // Converting frequency to semitone and back should give the same frequency
      const originalSemitone = 7; // G4
      const frequency = noteToFrequency(originalSemitone);
      const result = frequencyToNote(frequency);
      expect(result?.semitone).toBe(originalSemitone);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low frequencies', () => {
      const result = frequencyToNote(55); // A1
      expect(result).not.toBeNull();
      expect(result?.name).toBe('A1');
    });

    it('should handle very high frequencies', () => {
      const result = frequencyToNote(1760); // A6
      expect(result).not.toBeNull();
      expect(result?.name).toBe('A6');
    });

    it('should round to nearest semitone', () => {
      // Test frequency between A4 (440 Hz) and A#4 (466.16 Hz)
      const midFreq = (440 + 466.16) / 2;
      const result = frequencyToNote(midFreq);
      expect(result).not.toBeNull();
      // Should round to one of the two notes
      expect(['A4', 'A#4']).toContain(result?.name);
    });
  });
});
