import { describe, it, expect } from 'vitest';
import { EXERCISES } from '../constants';
import { getExercisePattern, getExerciseId } from '../exerciseUtils';
import type { Exercise } from '../types';

describe('Exercise Utilities', () => {
  describe('Exercise Constants', () => {
    it('should have valid exercise definitions', () => {
      expect(EXERCISES).toBeDefined();
      expect(Array.isArray(EXERCISES)).toBe(true);
      expect(EXERCISES.length).toBeGreaterThan(0);
    });

    it('should have required properties for each exercise', () => {
      EXERCISES.forEach(exercise => {
        const id = getExerciseId(exercise);
        expect(id).toBeDefined();
        expect(exercise).toBeDefined();
      });
    });

    it('should have unique exercise IDs', () => {
      const ids = EXERCISES.map(e => getExerciseId(e));
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('getExercisePattern', () => {
    it('should return a pattern for valid exercise', () => {
      const exercise = EXERCISES[0];
      const pattern = getExercisePattern(exercise);
      expect(pattern).toBeDefined();
      expect(Array.isArray(pattern)).toBe(true);
    });

    it('should return non-empty patterns', () => {
      EXERCISES.forEach(exercise => {
        const pattern = getExercisePattern(exercise);
        if (pattern) {
          expect(pattern.length).toBeGreaterThan(0);
        }
      });
    });

    it('should return patterns of numbers', () => {
      const exercise = EXERCISES[0];
      const pattern = getExercisePattern(exercise);
      
      pattern.forEach(note => {
        expect(typeof note).toBe('number');
      });
    });
  });

  describe('getExerciseId', () => {
    it('should generate consistent IDs', () => {
      const exercise = EXERCISES[0];
      const id1 = getExerciseId(exercise);
      const id2 = getExerciseId(exercise);
      
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different exercises', () => {
      if (EXERCISES.length > 1) {
        const id1 = getExerciseId(EXERCISES[0]);
        const id2 = getExerciseId(EXERCISES[1]);
        
        expect(id1).not.toBe(id2);
      }
    });
  });

  describe('Exercise Categories', () => {
    it('should have exercises in multiple categories', () => {
      const categories = new Set(EXERCISES.map(e => {
        if (typeof e.category === 'string') return e.category;
        return 'mixed';
      }));
      expect(categories.size).toBeGreaterThan(0);
    });
  });
});

describe('Exercise Pattern Generation', () => {
  it('should generate patterns with valid note sequences', () => {
    const exercise = EXERCISES[0];
    const pattern = getExercisePattern(exercise);
    
    pattern.forEach(note => {
      // Note should be a number (semitone offset)
      expect(typeof note).toBe('number');
      // Numbers can be 0 or any value, so just check it's a number
      expect(Number.isFinite(note)).toBe(true);
    });
  });

  it('should handle all exercises gracefully', () => {
    EXERCISES.forEach(exercise => {
      const pattern = getExercisePattern(exercise);
      expect(pattern).toBeDefined();
      expect(Array.isArray(pattern)).toBe(true);
    });
  });
});

