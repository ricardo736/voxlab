import { describe, it, expect } from 'vitest';
import { NOTE_NAMES, BASE_FREQ, EXERCISES } from '../constants';

describe('App Constants and Data', () => {
  describe('Constants', () => {
    it('should have correct NOTE_NAMES array', () => {
      expect(NOTE_NAMES).toBeDefined();
      expect(NOTE_NAMES).toHaveLength(12);
      expect(NOTE_NAMES[0]).toBe('C');
      expect(NOTE_NAMES[9]).toBe('A');
    });

    it('should have correct BASE_FREQ for C4', () => {
      expect(BASE_FREQ).toBe(261.63);
    });

    it('should have EXERCISES array', () => {
      expect(EXERCISES).toBeDefined();
      expect(Array.isArray(EXERCISES)).toBe(true);
      expect(EXERCISES.length).toBeGreaterThan(0);
    });
  });

  describe('Exercise Data Integrity', () => {
    it('should have valid exercise structure', () => {
      EXERCISES.forEach((exercise) => {
        expect(exercise).toHaveProperty('exercise_id');
        expect(exercise).toHaveProperty('name');
        expect(exercise).toHaveProperty('category');
        expect(exercise).toHaveProperty('key_center');
        expect(exercise).toHaveProperty('tempo_bpm');
        expect(exercise).toHaveProperty('notes');
        
        expect(typeof exercise.exercise_id).toBe('string');
        expect(typeof exercise.name).toBe('string');
        expect(typeof exercise.tempo_bpm).toBe('number');
        expect(Array.isArray(exercise.notes)).toBe(true);
      });
    });

    it('should have valid exercise notes', () => {
      EXERCISES.forEach((exercise) => {
        exercise.notes.forEach((note) => {
          expect(note).toHaveProperty('type');
          expect(note).toHaveProperty('duration');
          expect(['note', 'rest', 'chord']).toContain(note.type);
          expect(typeof note.duration).toBe('number');
          expect(note.duration).toBeGreaterThan(0);

          if (note.type === 'note') {
            expect(note).toHaveProperty('semitone');
            expect(typeof note.semitone).toBe('number');
          }

          if (note.type === 'chord') {
            expect(note).toHaveProperty('intervals');
            expect(Array.isArray(note.intervals)).toBe(true);
          }
        });
      });
    });

    it('should have unique exercise IDs', () => {
      const ids = EXERCISES.map((ex) => ex.exercise_id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have reasonable tempo_bpm values', () => {
      EXERCISES.forEach((exercise) => {
        expect(exercise.tempo_bpm).toBeGreaterThanOrEqual(40);
        expect(exercise.tempo_bpm).toBeLessThanOrEqual(200);
      });
    });

    it('should have valid key centers', () => {
      EXERCISES.forEach((exercise) => {
        expect(exercise.key_center).toMatch(/^[A-G][#b]?\d$/);
      });
    });
  });

  describe('Exercise Categories', () => {
    it('should have valid categories', () => {
      const validCategories = ['warmup', 'technique', 'agility', 'ear', 'style'];
      EXERCISES.forEach((exercise) => {
        expect(validCategories).toContain(exercise.category);
      });
    });

    it('should have exercises in each category', () => {
      const categories = ['warmup', 'technique', 'agility', 'ear', 'style'];
      categories.forEach((category) => {
        const exercisesInCategory = EXERCISES.filter((ex) => ex.category === category);
        expect(exercisesInCategory.length).toBeGreaterThan(0);
      });
    });
  });
});
