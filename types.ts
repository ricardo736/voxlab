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
    name: string;
    desc: string;
    pattern: number[];
    duration: number;
    instructions: string;
    category: string;
    isAIGenerated?: boolean;
}

export interface Routine {
    id: string;
    name: string;
    description: string;
    exerciseIds: number[];
    benefits: string;
}

export type ActiveView = 'home' | 'range' | 'routines' | 'exercises' | 'pitch' | 'studies' | 'tokens' | 'voxlabai' | 'favorites' | 'instrumentTuner' | 'rangedetector2';

export enum TestStep {
    LowestNote,
    SpeakNaturally,
    SirenSound,
    Analyzing,
    ConfirmResults,
}

export interface VocalRangeEntry {
    start: Note;
    end: Note;
    timestamp: number;
}

export interface Language {
    code: string;
    name: string;
    flag: string;
}

export interface ColorPalette {
    id: string;
    name: string;
    gradient: string;
    primary: string;
    secondary: string;
    shadowRgb: string;
}

export interface Tuning {
    id: string;
    name: string;
    notes: { name: string; semitone: number }[];
}

export interface NoteNodes {
    oscillators: OscillatorNode[];
    gainNodes: GainNode[];
    allNodes: AudioNode[];
}

export interface GameNote {
    id: string;
    semitone: number;
    startTime: number;
    duration: number;
    played: boolean;
    playedAudio?: boolean;
    name: string;
    hitState: 'upcoming' | 'hit' | 'miss';
    scoreHandled?: boolean;
}

export interface PlaybackState {
    sessionStartTime: number;
    pausedTime: number;
    isCountingDown: boolean;
    countdownStartedAt: number;
}