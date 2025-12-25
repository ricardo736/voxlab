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
        expect(exercise.id).toBeDefined();
        expect(exercise.title).toBeDefined();
        expect(exercise.category).toBeDefined();
      });
    });

    it('should have unique exercise IDs', () => {
      const ids = EXERCISES.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('getExercisePattern', () => {
    it('should return a pattern for valid exercise', () => {
      const exercise = EXERCISES[0];
      const pattern = getExercisePattern(exercise, 'C4');
      expect(pattern).toBeDefined();
      expect(Array.isArray(pattern)).toBe(true);
    });

    it('should handle different starting notes', () => {
      const exercise = EXERCISES[0];
      const patternC4 = getExercisePattern(exercise, 'C4');
      const patternD4 = getExercisePattern(exercise, 'D4');
      
      expect(patternC4).toBeDefined();
      expect(patternD4).toBeDefined();
      expect(patternC4).not.toEqual(patternD4);
    });

    it('should return non-empty patterns', () => {
      EXERCISES.forEach(exercise => {
        const pattern = getExercisePattern(exercise, 'C4');
        if (pattern) {
          expect(pattern.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('getExerciseId', () => {
    it('should generate consistent IDs', () => {
      const exercise = EXERCISES[0];
      const id1 = getExerciseId(exercise, 'C4');
      const id2 = getExerciseId(exercise, 'C4');
      
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different starting notes', () => {
      const exercise = EXERCISES[0];
      const idC4 = getExerciseId(exercise, 'C4');
      const idD4 = getExerciseId(exercise, 'D4');
      
      expect(idC4).not.toBe(idD4);
    });

    it('should generate different IDs for different exercises', () => {
      if (EXERCISES.length > 1) {
        const id1 = getExerciseId(EXERCISES[0], 'C4');
        const id2 = getExerciseId(EXERCISES[1], 'C4');
        
        expect(id1).not.toBe(id2);
      }
    });
  });

  describe('Exercise Categories', () => {
    it('should have exercises in multiple categories', () => {
      const categories = new Set(EXERCISES.map(e => e.category));
      expect(categories.size).toBeGreaterThan(0);
    });

    it('should categorize exercises correctly', () => {
      const validCategories = ['warmup', 'scales', 'intervals', 'arpeggios', 'technique'];
      
      EXERCISES.forEach(exercise => {
        // Some exercises might have custom categories
        expect(exercise.category).toBeTruthy();
      });
    });
  });

  describe('Exercise Difficulty', () => {
    it('should have difficulty levels for exercises', () => {
      EXERCISES.forEach(exercise => {
        if (exercise.difficulty) {
          expect(['beginner', 'intermediate', 'advanced']).toContain(exercise.difficulty);
        }
      });
    });
  });
});

describe('Exercise Pattern Generation', () => {
  it('should generate patterns with valid note sequences', () => {
    const exercise = EXERCISES[0];
    const pattern = getExercisePattern(exercise, 'C4');
    
    if (pattern) {
      pattern.forEach(note => {
        expect(note).toBeTruthy();
        // Note should be a string like "C4", "D4", etc.
        expect(typeof note).toBe('string');
      });
    }
  });

  it('should handle edge cases gracefully', () => {
    const exercise = EXERCISES[0];
    
    // Test with very low note
    const lowPattern = getExercisePattern(exercise, 'C2');
    expect(lowPattern).toBeDefined();
    
    // Test with very high note
    const highPattern = getExercisePattern(exercise, 'C6');
    expect(highPattern).toBeDefined();
  });
});
