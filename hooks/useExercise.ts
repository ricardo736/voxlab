import { useState, useCallback } from 'react';
import { Exercise, VocalRange, Routine } from '../types';

interface UseExerciseReturn {
  // Exercise state
  selectedExercise: Exercise | null;
  setSelectedExercise: (exercise: Exercise | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isExerciseComplete: boolean;
  setIsExerciseComplete: (complete: boolean) => void;
  exerciseKey: number;
  setExerciseKey: (key: number | ((prev: number) => number)) => void;
  
  // Exercise range
  exerciseRange: VocalRange;
  setExerciseRange: (range: VocalRange) => void;
  
  // Routine state
  currentRoutine: { routine: Routine; exerciseIndex: number } | null;
  setCurrentRoutine: (routine: { routine: Routine; exerciseIndex: number } | null) => void;
  isRoutineComplete: boolean;
  setIsRoutineComplete: (complete: boolean) => void;
  
  // AI exercises
  savedAIExercises: Exercise[];
  setSavedAIExercises: (exercises: Exercise[] | ((prev: Exercise[]) => Exercise[])) => void;
  aiResult: Exercise | null;
  setAiResult: (result: Exercise | null) => void;
  
  // Preview state
  isPreviewing: boolean;
  setIsPreviewing: (previewing: boolean) => void;
}

export function useExercise(): UseExerciseReturn {
  // Exercise state
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExerciseComplete, setIsExerciseComplete] = useState(false);
  const [exerciseKey, setExerciseKey] = useState(0);
  
  // Exercise range
  const [exerciseRange, setExerciseRange] = useState<VocalRange>({ start: null, end: null });
  
  // Routine state
  const [currentRoutine, setCurrentRoutine] = useState<{ routine: Routine; exerciseIndex: number } | null>(null);
  const [isRoutineComplete, setIsRoutineComplete] = useState(false);
  
  // AI exercises
  const [savedAIExercises, setSavedAIExercises] = useState<Exercise[]>([]);
  const [aiResult, setAiResult] = useState<Exercise | null>(null);
  
  // Preview state
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  return {
    selectedExercise,
    setSelectedExercise,
    isPlaying,
    setIsPlaying,
    isExerciseComplete,
    setIsExerciseComplete,
    exerciseKey,
    setExerciseKey,
    exerciseRange,
    setExerciseRange,
    currentRoutine,
    setCurrentRoutine,
    isRoutineComplete,
    setIsRoutineComplete,
    savedAIExercises,
    setSavedAIExercises,
    aiResult,
    setAiResult,
    isPreviewing,
    setIsPreviewing,
  };
}
