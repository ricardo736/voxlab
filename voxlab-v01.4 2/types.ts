

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

export interface Exercise {
    id: number;
    name: TranslationKey | string;
    desc: TranslationKey | string;
    pattern: number[];
    duration: number;
    instructions: string;
    category: TranslationKey | string;
    isAIGenerated?: boolean;
}

// Updated Routine interface
export interface Routine {
    id: string;
    name: TranslationKey;
    description: TranslationKey;
    exerciseIds: number[];
    benefits: TranslationKey;
}

// Type for main application views
export type ActiveView = 'home' | 'range' | 'routines' | 'exercises' | 'pitch' | 'studies' | 'tokens' | 'voxlabai' | 'favorites' | 'instrumentTuner' | 'rangedetector2';


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
export interface ColorPalette {
    id: string; // FIX: Added id to ColorPalette interface
    name: string;
    gradient: string; // Tailwind CSS gradient classes
    primary: string; // Tailwind CSS text color class for primary elements
    secondary: string; // Tailwind CSS text color class for secondary elements
    shadowRgb: string; // RGB values for dynamic shadows (e.g., '139, 92, 246')
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

// Interface for a game note in ExerciseGameView
export interface GameNote {
    id: string;
    semitone: number;
    startTime: number;
    duration: number;
    played: boolean; // Visual played state
    playedAudio?: boolean; // Audio played state
    name: string;
    hitState: 'upcoming' | 'hit' | 'miss';
    scoreHandled?: boolean; // New: Flag to ensure score is only counted once
}

export interface PlaybackState {
    sessionStartTime: number; // Absolute timestamp when *exercise content* started/resumed (0 if not started/paused with 0 content time)
    pausedTime: number; // Cumulative elapsed time *into exercise content* when paused (0 if not paused)
    isCountingDown: boolean; // Flag for countdown active
    countdownStartedAt: number; // Absolute timestamp when countdown started (0 if not active)
}