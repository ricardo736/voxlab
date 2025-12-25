import { useState, useCallback, useRef } from 'react';
import { Exercise, VocalRange, Routine, isMidiExercise } from '../types';
import { getExercisePattern, getExerciseId } from '../exerciseUtils';

interface UseExerciseOptions {
    vocalRange: VocalRange;
    exercises: Exercise[]; // Add exercises array
    stopAllExerciseNotes: () => void;
    stopAllNonExerciseNotes: () => void;
    onViewChange: (view: 'main' | 'exercise') => void;
    onMenuVisibilityChange: (visible: boolean) => void;
    onCameraUpdate: (center: number, octaves: number, snap: boolean) => void;
    onExerciseNoteCenter: (center: number | null) => void;
    onActiveViewChange?: (view: string) => void; // Add optional callback for active view changes
    playNote?: (semitone: number, duration: number, forExercise?: boolean) => Promise<void>; // Optional for preview
    initAudio?: () => Promise<boolean>; // Optional for preview
}

interface UseExerciseReturn {
    selectedExercise: Exercise | null;
    isPlaying: boolean;
    isExerciseComplete: boolean;
    isRoutineComplete: boolean;
    exerciseRange: VocalRange;
    exerciseKey: number;
    currentRoutine: { routine: Routine; exerciseIndex: number } | null;
    selectExercise: (ex: Exercise) => void;
    handlePlayPause: () => void;
    handleStop: () => void;
    handleExerciseComplete: () => void;
    handleNextExerciseInRoutine: () => void;
    handleStartRoutine: (routine: Routine) => void;
    setIsPlaying: (playing: boolean) => void;
    setExerciseKey: (key: number | ((prev: number) => number)) => void;
    setSelectedExercise: (exercise: Exercise | null) => void;
    handleRefineExercise: (currentExercise: Exercise, refinePrompt: string) => Promise<void>;
    setAiResult: (result: Exercise | null) => void;
    aiResult: Exercise | null;
    isPreviewing: boolean;
    handlePreview: () => Promise<void>;
    stopPreview: () => void;
}

export function useExercise({
    vocalRange,
    exercises,
    stopAllExerciseNotes,
    stopAllNonExerciseNotes,
    onViewChange,
    onMenuVisibilityChange,
    onCameraUpdate,
    onExerciseNoteCenter,
    onActiveViewChange,
    playNote,
    initAudio,
}: UseExerciseOptions): UseExerciseReturn {
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExerciseComplete, setIsExerciseComplete] = useState(false);
    const [isRoutineComplete, setIsRoutineComplete] = useState(false);
    const [exerciseRange, setExerciseRange] = useState<VocalRange>({ start: null, end: null });
    const [exerciseKey, setExerciseKey] = useState(0);
    const [currentRoutine, setCurrentRoutine] = useState<{ routine: Routine; exerciseIndex: number } | null>(null);
    const [aiResult, setAiResult] = useState<Exercise | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const uiViewRef = useRef<'main' | 'exercise'>('main');
    const previewTimersRef = useRef<number[]>([]);

    const getSafeExerciseRange = useCallback((fullRange: VocalRange): VocalRange => {
        const { start, end } = fullRange;

        if (!start || !end) {
            // Default to safe beginner range (E3 - G4)
            return {
                start: { semitone: -9, name: 'E3', isSharp: false },
                end: { semitone: 7, name: 'G4', isSharp: false }
            };
        }

        // Use the user's actual range directly
        return fullRange;
    }, []);

    const executeExerciseAction = useCallback((action: () => void) => {
        // Always execute action immediately.
        // If vocal range is missing, selectExercise will use defaults.
        action();
    }, []);

    const selectExercise = useCallback((ex: Exercise) => {
        // GUARD: Prevent calling if already transitioning to or in exercise view with this exercise
        if (uiViewRef.current === 'exercise' && selectedExercise && getExerciseId(selectedExercise) === getExerciseId(ex)) {
            return;
        }

        // Calculate SAFE range for exercises (not raw detection extremes)
        let currentExerciseRange: VocalRange;

        if (vocalRange.start && vocalRange.end && vocalRange.start.semitone >= 0 && vocalRange.end.semitone >= 0) {
            // Use safe pedagogical range derived from user's full range
            currentExerciseRange = getSafeExerciseRange(vocalRange);
        } else {
            // Use default safe beginner range (E3 to G4) if not set
            currentExerciseRange = {
                start: { semitone: -9, name: 'E3', isSharp: false },
                end: { semitone: 7, name: 'G4', isSharp: false }
            };
        }

        setExerciseRange(currentExerciseRange);

        executeExerciseAction(() => {
            // Reset state for new exercise
            setIsPlaying(false);
            setIsExerciseComplete(false);

            setSelectedExercise(ex);
            // Always increment key to force full remount (ensures clean AudioContext)
            setExerciseKey(prev => prev + 1);
            uiViewRef.current = 'exercise'; // Update ref
            onViewChange('exercise');

            // Hide menu when entering exercise
            onMenuVisibilityChange(false);

            // Calculate view center based on exercise pattern and vocal range
            const startSemitone = currentExerciseRange.start?.semitone ?? 52;
            const endSemitone = currentExerciseRange.end?.semitone ?? 67;
            const rangeSpan = endSemitone - startSemitone;
            const rangeMidpoint = startSemitone + Math.floor(rangeSpan / 2);
            const comfortableStart = rangeMidpoint - 6;

            const pattern = getExercisePattern(ex);
            const firstNoteSemitone = pattern && pattern.length > 0
                ? comfortableStart + pattern[0]
                : rangeMidpoint;
            
            onCameraUpdate(firstNoteSemitone, 1.5, true);
        });
    }, [vocalRange, executeExerciseAction, selectedExercise, getSafeExerciseRange, onViewChange, onMenuVisibilityChange, onCameraUpdate]);

    const handlePlayPause = useCallback(() => {
        // Auto-start mic logic removed - handled by ALT wrapper

        // Immediately update playing state for instant UI response
        if (isExerciseComplete) {
            setIsExerciseComplete(false);
            setExerciseKey(k => k + 1);
            setIsPlaying(true);
        } else {
            const newPlayingState = !isPlaying;
            setIsPlaying(newPlayingState);

            // If pausing, stop all exercise notes immediately
            if (!newPlayingState) {
                stopAllExerciseNotes();
            }
        }
    }, [isExerciseComplete, isPlaying, stopAllExerciseNotes]);

    const stopPreview = useCallback(() => {
        previewTimersRef.current.forEach(clearTimeout);
        previewTimersRef.current = [];
        stopAllExerciseNotes();
        setIsPreviewing(false);
    }, [stopAllExerciseNotes]);

    const handlePreview = useCallback(async () => {
        if (!selectedExercise || !exerciseRange.start) return;
        if (isPreviewing) {
            stopPreview();
            return;
        }

        // Check if playNote and initAudio are available
        if (!playNote || !initAudio) {
            console.warn('handlePreview requires playNote and initAudio functions');
            return;
        }

        await initAudio();
        setIsPreviewing(true);

        const timers: number[] = [];
        let delay = 0;

        // Handle legacy pattern-based exercises
        if ('pattern' in selectedExercise && selectedExercise.pattern) {
            selectedExercise.pattern.forEach(offset => {
                const timer = window.setTimeout(() => {
                    playNote(exerciseRange.start!.semitone + offset, selectedExercise.duration || 500, true);
                }, delay);
                timers.push(timer);
                delay += selectedExercise.duration || 500;
            });
        }

        const finalTimer = window.setTimeout(() => {
            setIsPreviewing(false);
            previewTimersRef.current = [];
        }, delay + 100);
        timers.push(finalTimer);
        previewTimersRef.current = timers;

    }, [selectedExercise, exerciseRange, initAudio, playNote, isPreviewing, stopPreview]);

    const handleStop = useCallback(() => {
        if (isPreviewing) stopPreview();
        setIsPlaying(false);
        setIsExerciseComplete(false);
        stopAllExerciseNotes();
        stopAllNonExerciseNotes();

        // Check if this is an AI-generated exercise
        const isAIExercise = selectedExercise?.isAIGenerated;

        setSelectedExercise(null);
        setExerciseRange({ start: null, end: null });
        onExerciseNoteCenter(null);
        uiViewRef.current = 'main'; // Update ref
        onViewChange('main');
        onMenuVisibilityChange(true);

        // Return to appropriate view
        if (currentRoutine) {
            setCurrentRoutine(null);
            onActiveViewChange?.('routines');
        } else if (isAIExercise) {
            onActiveViewChange?.('voxlabai');
        }

        onCameraUpdate(0, 0.7, true); // Reset camera
    }, [currentRoutine, selectedExercise, stopAllExerciseNotes, stopAllNonExerciseNotes, isPreviewing, stopPreview, onViewChange, onMenuVisibilityChange, onExerciseNoteCenter, onCameraUpdate, onActiveViewChange]);

    const handleExerciseComplete = useCallback(() => {
        setIsPlaying(false);
        setIsExerciseComplete(true);
    }, []);

    const handleNextExerciseInRoutine = useCallback(() => {
        if (!currentRoutine) return;
        const nextIndex = currentRoutine.exerciseIndex + 1;
        if (nextIndex < currentRoutine.routine.exerciseIds.length) {
            const nextExId = currentRoutine.routine.exerciseIds[nextIndex];
            const nextEx = exercises.find(ex => getExerciseId(ex) === nextExId);
            if (nextEx) {
                setCurrentRoutine({ ...currentRoutine, exerciseIndex: nextIndex });
                selectExercise(nextEx);
                setTimeout(() => setIsPlaying(true), 200);
            } else {
                handleStop();
            }
        } else {
            setIsPlaying(false);
            setIsExerciseComplete(false);
            setIsRoutineComplete(true);
        }
    }, [currentRoutine, exercises, selectExercise, handleStop]);

    const handleStartRoutine = useCallback((routine: Routine) => {
        const firstEx = exercises.find(ex => getExerciseId(ex) === routine.exerciseIds[0]);
        if (firstEx) {
            setCurrentRoutine({ routine, exerciseIndex: 0 });
            selectExercise(firstEx);
        } else {
            console.error('Could not find first exercise for routine', routine.id);
        }
    }, [exercises, selectExercise]);

    const handleRefineExercise = useCallback(async (currentExercise: Exercise, refinePrompt: string) => {
        try {
            // Import Google AI
            const { GoogleGenAI, Type } = await import("@google/genai");

            // Get API key
            const envKey = process.env.API_KEY;
            const apiKey = (envKey && envKey.length > 0 && envKey !== 'undefined') ? envKey : '';

            if (!apiKey) {
                console.error('No API key available for refinement');
                return;
            }

            const ai = new GoogleGenAI({ apiKey });

            // Create refine prompt
            const fullPrompt = `
                I have a vocal exercise defined in JSON: ${JSON.stringify(currentExercise)}.
                Please modify this exercise based on this request: "${refinePrompt}".
                
                IMPORTANT FORMAT RULES:
                1. Use the "notes" array, NOT "pattern".
                2. Each note must have: type ("note" or "rest"), semitone (0-12+), duration (in beats), lyric (optional).
                3. Use "tempo_bpm" for speed.
                
                Keep the pedagogical goal but adjust parameters as requested.
            `;

            // Define schema (same as in AIStudioView)
            // Define schema (updated to match new format with notes)
            const noteSchema = {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: "Either 'note' or 'rest'" },
                    semitone: { type: Type.INTEGER, description: "Semitones from root (0-12+)" },
                    duration: { type: Type.NUMBER, description: "Duration in BEATS" },
                    lyric: { type: Type.STRING, description: "Optional syllable" }
                },
                required: ["type", "duration"]
            };

            const schema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    desc: { type: Type.STRING },
                    category: { type: Type.STRING },
                    instructions: { type: Type.STRING },
                    notes: { type: Type.ARRAY, items: noteSchema },
                    tempo_bpm: { type: Type.INTEGER }
                },
                required: ["name", "desc", "category", "instructions", "notes", "tempo_bpm"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const jsonResult = JSON.parse(response.text);
            const refinedExercise: Exercise = {
                ...jsonResult,
                // Keep same ID - use exercise_id for MIDI, id for Legacy
                ...(isMidiExercise(currentExercise)
                    ? { exercise_id: currentExercise.exercise_id }
                    : { id: currentExercise.id }),
                isAIGenerated: true,
            };

            // Update the AI result state
            setAiResult(refinedExercise);

            // Update the current exercise
            setSelectedExercise(refinedExercise);
            setExerciseKey(prev => prev + 1); // Force remount

        } catch (e) {
            console.error("Error refining exercise:", e);
        }
    }, []);

    return {
        selectedExercise,
        isPlaying,
        isExerciseComplete,
        isRoutineComplete,
        exerciseRange,
        exerciseKey,
        currentRoutine,
        selectExercise,
        handlePlayPause,
        handleStop,
        handleExerciseComplete,
        handleNextExerciseInRoutine,
        handleStartRoutine,
        setIsPlaying,
        setExerciseKey,
        setSelectedExercise,
        handleRefineExercise,
        setAiResult,
        aiResult,
        isPreviewing,
        handlePreview,
        stopPreview,
    };
}
