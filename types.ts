import { TranslationKey } from './i18n';

export interface Note {
    semitone: number;
    name: string;
    isSharp: boolean;
}

export interface VocalRange {
    start: Note | null;
    end: Note | null;
}

// MIDI-like Exercise Format Types (v1.5 - Hybrid)
export interface ExerciseNote {
    type: 'note' | 'rest' | 'chord';
    semitone?: number;   // Semitones from key_center (0 = root, 12 = octave), required for notes
    duration: number;    // Duration in BEATS for audio playback
    advance?: number;    // Optional: how much to advance timeline (defaults to duration). Use for overlapping events.
    lyric?: string;      // Optional syllable/vowel to display
    intervals?: number[]; // For chords: array of semitone offsets from root (e.g., [0, 4, 7] for major triad)
    rootOffset?: number;  // For chords: offset from current key root (default 0)
}

export interface MidiExercise {
    exercise_id: string;
    name: string;
    category: string;
    key_center: string;     // e.g., "C4" - the reference pitch
    tempo_bpm: number;
    time_signature: string; // e.g., "4/4"
    notes: ExerciseNote[];
    instructions?: string;
    desc?: string;
    isAIGenerated?: boolean;
}

// Legacy Exercise Format (for backward compatibility)
export interface LegacyExercise {
    id: number;
    name: TranslationKey | string;
    desc: TranslationKey | string;
    pattern: number[];
    bpm?: number;
    duration: number;
    durations?: number[];
    instructions: string;
    category: TranslationKey | string;
    isAIGenerated?: boolean;
    reverse?: boolean;
}

// Unified Exercise type (can be either format)
export type Exercise = LegacyExercise | MidiExercise;

// Type guard to check if exercise is MIDI format
export function isMidiExercise(exercise: Exercise): exercise is MidiExercise {
    return 'exercise_id' in exercise && 'notes' in exercise;
}


// Updated Routine interface
export interface Routine {
    id: string;
    name: TranslationKey;
    description: TranslationKey;
    exerciseIds: string[]; // Changed to string[] to support MIDI exercise IDs
    benefits: TranslationKey;
    estimatedMinutes?: number;
}

// Type for main application views
export type ActiveView = 'home' | 'range' | 'routines' | 'exercises' | 'pitch' | 'studies' | 'tokens' | 'voxlabai' | 'favorites' | 'instrumentTuner' | 'test';

// Enum for the new, streamlined vocal range test flow
export enum TestStep {
    LowestNote,
    SpeakNaturally,
    SirenSound,
    Analyzing,
    ConfirmResults,
}

// Interface for storing historical vocal range data
export interface VocalRangeEntry {
    start: Note;
    end: Note;
    timestamp: number;
}

// Interface for language options in settings
export interface Language {
    code: string;
    name: string;
    flag: string;
}

// Interface for color palette options in settings
export interface Theme {
    id: string;
    name: string;
    visualizer: { name: string; gradient: string }[];
    button: {
        from: string;
        via: string;
        to: string;
        shadow: string;
        shadowRgb: string;
    };
    gradientText: {
        from: string;
        to: string;
        darkFrom: string;
        darkTo: string;
    };
    resultsRange: {
        from: string;
        to: string;
    };
    progress: {
        from: string;
        to: string;
    };
}

// Interface for instrument tunings
export interface Tuning {
    id: string;
    name: TranslationKey;
    notes: { name: string; semitone: number }[];
}

// Type for a group of nodes associated with a single playing note
export interface NoteNodes {
    oscillators: OscillatorNode[];
    gainNodes: GainNode[];
    // Add all other nodes that need explicit disconnection
    allNodes: AudioNode[]; // General array to ensure everything is disconnected
}

// Types for the Exercise Game View, moved here for sharing
export type HitState = 'upcoming' | 'hit' | 'miss';

export interface GameNote {
    id: string;
    semitone: number;
    startTime: number;
    duration: number;
    played: boolean;
    name: string;
    hitState: HitState;
}