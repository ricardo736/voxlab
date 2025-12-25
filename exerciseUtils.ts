import { Exercise, LegacyExercise, MidiExercise, ExerciseNote, isMidiExercise } from './types';

// Convert scale degree to semitones (supports Major and Minor scales)
export function degreeToSemitone(degree: number, octave_shift: number = 0, scale: 'major' | 'minor' = 'major'): number {
    // Major scale intervals: W-W-H-W-W-W-H (Whole-Whole-Half-Whole-Whole-Whole-Half)
    const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];

    // Natural Minor scale intervals: W-H-W-W-H-W-W
    const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10];

    const scaleIntervals = scale === 'minor' ? minorScaleIntervals : majorScaleIntervals;

    const baseSemitone = scaleIntervals[(degree - 1) % 7];
    const octaveOffset = Math.floor((degree - 1) / 7) * 12;
    return baseSemitone + octaveOffset + (octave_shift * 12);
}

// ============================================================================
// USER-FRIENDLY MUSIC THEORY HELPERS
// These functions translate between musical terms and our internal format
// ============================================================================

// Convert user-friendly rhythm names to beats
export function rhythmNameToBeats(rhythm: string): number {
    const rhythmMap: Record<string, number> = {
        // Standard names
        'whole': 4.0,
        'half': 2.0,
        'quarter': 1.0,
        'eighth': 0.5,
        'sixteenth': 0.25,
        // Short codes
        'wn': 4.0,
        'hn': 2.0,
        'qn': 1.0,
        'en': 0.5,
        'sn': 0.25,
        // Dotted notes
        'dotted-half': 3.0,
        'dotted-quarter': 1.5,
        'dotted-eighth': 0.75,
        // Triplets
        'quarter-triplet': 0.667,
        'eighth-triplet': 0.333
    };
    return rhythmMap[rhythm.toLowerCase()] || 1.0;
}

// Convert beats to user-friendly rhythm name
export function beatsToRhythmName(beats: number): string {
    if (beats >= 4.0) return 'Whole Note';
    if (beats >= 3.0) return 'Dotted Half Note';
    if (beats >= 2.0) return 'Half Note';
    if (beats >= 1.5) return 'Dotted Quarter Note';
    if (beats >= 1.0) return 'Quarter Note';
    if (beats >= 0.75) return 'Dotted Eighth Note';
    if (beats >= 0.667) return 'Quarter Triplet';
    if (beats >= 0.5) return 'Eighth Note';
    if (beats >= 0.333) return 'Eighth Triplet';
    if (beats >= 0.25) return 'Sixteenth Note';
    return `${beats} Beats`;
}

// Convert interval name to semitones
export function intervalNameToSemitone(interval: string): number {
    const intervalMap: Record<string, number> = {
        // Unison/Root
        'root': 0, 'unison': 0, 'p1': 0, '1': 0,
        // 2nds
        'minor 2nd': 1, 'm2': 1, 'half step': 1,
        'major 2nd': 2, 'M2': 2, 'whole step': 2, 'whole tone': 2,
        // 3rds
        'minor 3rd': 3, 'm3': 3, 'b3': 3,
        'major 3rd': 4, 'M3': 4, '3': 4,
        // 4ths
        'perfect 4th': 5, 'P4': 5, '4': 5,
        'augmented 4th': 6, 'tritone': 6, '#4': 6, 'b5': 6,
        // 5ths
        'perfect 5th': 7, 'P5': 7, '5': 7,
        'minor 6th': 8, 'm6': 8, 'b6': 8,
        // 6ths
        'major 6th': 9, 'M6': 9, '6': 9,
        // 7ths
        'minor 7th': 10, 'm7': 10, 'b7': 10,
        'major 7th': 11, 'M7': 11, '7': 11,
        // Octave
        'octave': 12, 'P8': 12, '8': 12
    };
    return intervalMap[interval.toLowerCase()] || 0;
}

// Convert semitone to interval name
export function semitoneToIntervalName(semitone: number): string {
    const names = [
        'Root', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd',
        'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th',
        'Minor 7th', 'Major 7th'
    ];
    const octaves = Math.floor(semitone / 12);
    const semiInOctave = semitone % 12;
    const baseName = names[semiInOctave] || 'Unknown';
    return octaves > 0 ? `${baseName} (+${octaves} octave${octaves > 1 ? 's' : ''})` : baseName;
}

// ============================================================================
// MUSICIAN-FRIENDLY INPUT (1-BASED) vs COMPUTER FORMAT (0-BASED)
// ============================================================================
// Musicians think: 1=Root, 3=Third, 5=Fifth
// Computers need: 0=Root, 4=Third, 7=Fifth
// These functions translate between the two

/**
 * Convert musician-friendly scale degree (1-based) to semitone (0-based)
 * 
 * @param degree - Scale degree (1=Root, 2=2nd, 3=3rd, etc.)
 * @param scale - 'major' or 'minor' (default: 'major')
 * @returns Semitone value (0-11)
 * 
 * @example
 * scaleDegreeToSemitone(1, 'major') // → 0 (root)
 * scaleDegreeToSemitone(3, 'major') // → 4 (major 3rd)
 * scaleDegreeToSemitone(3, 'minor') // → 3 (minor 3rd)
 */
export function scaleDegreeToSemitone(degree: number, scale: 'major' | 'minor' = 'major'): number {
    // Major scale: 1=0, 2=2, 3=4, 4=5, 5=7, 6=9, 7=11
    const majorScale = [0, 2, 4, 5, 7, 9, 11];
    // Minor scale: 1=0, 2=2, 3=3, 4=5, 5=7, 6=8, 7=10
    const minorScale = [0, 2, 3, 5, 7, 8, 10];

    const scaleIntervals = scale === 'minor' ? minorScale : majorScale;
    const octaves = Math.floor((degree - 1) / 7);
    const degreeInOctave = ((degree - 1) % 7);

    return scaleIntervals[degreeInOctave] + (octaves * 12);
}

/**
 * Parse user input that might be 1-based or 0-based
 * Accepts: "1", "root", "3", "b3", "M3", etc.
 * 
 * @param input - User input (number, interval name, or scale degree)
 * @param assumeOneBased - If true, treat numbers as 1-based (default: true for musician input)
 * @returns Semitone value (0-11)
 * 
 * @example
 * parseUserSemitone("1") // → 0 (assumes 1-based, converts to root)
 * parseUserSemitone("3") // → 4 (assumes 1-based major scale, converts to major 3rd)
 * parseUserSemitone("M3") // → 4 (interval name)
 * parseUserSemitone("0", false) // → 0 (explicitly 0-based)
 */
export function parseUserSemitone(input: string | number, assumeOneBased: boolean = true): number {
    const inputStr = String(input).trim();

    // Check if it's an interval name first (M3, b3, P5, etc.)
    const intervalSemitone = intervalNameToSemitone(inputStr);
    if (intervalSemitone !== 0 || inputStr.toLowerCase().includes('root') || inputStr === '1' || inputStr === 'p1') {
        return intervalSemitone;
    }

    // It's a number - check if 1-based or 0-based
    const num = parseInt(inputStr);
    if (isNaN(num)) return 0;

    // If assumeOneBased and number is 1-7, treat as scale degree
    if (assumeOneBased && num >= 1 && num <= 7) {
        return scaleDegreeToSemitone(num, 'major');
    }

    // Otherwise treat as direct semitone (0-based)
    return num;
}


// Parse key center to get base semitone (e.g., "C4" -> 0, "D4" -> 2)
export function parseKeyCenter(keyCenter: string): number {
    const noteMap: Record<string, number> = {
        'C': 0, 'C#': 1, 'Db': 1,
        'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4,
        'F': 5, 'F#': 6, 'Gb': 6,
        'G': 7, 'G#': 8, 'Ab': 8,
        'A': 9, 'A#': 10, 'Bb': 10,
        'B': 11
    };

    const noteName = keyCenter.replace(/\d+$/, ''); // Remove octave number
    return noteMap[noteName] || 0;
}

// Convert MIDI exercise to legacy format for playback
export function midiToLegacy(midi: MidiExercise): LegacyExercise & { chordIntervals?: number[][], chordRootOffsets?: number[], advances?: number[] } {
    const pattern: number[] = [];
    const durations: number[] = [];
    const advances: number[] = []; // Timeline advancement (can differ from duration for overlaps)
    const chordIntervals: (number[] | null)[] = []; // Parallel array to track chord data
    const chordRootOffsets: number[] = []; // Parallel array to track chord root offset
    const keyOffset = parseKeyCenter(midi.key_center);

    midi.notes.forEach(note => {
        // Advance defaults to duration if not specified
        const advance = note.advance !== undefined ? note.advance : note.duration;

        if (note.type === 'chord' && note.intervals) {
            // Chord event - store root offset (default 0) in pattern
            // and the intervals in a parallel array
            const rootOffset = note.rootOffset || 0;
            pattern.push(-2); // Special marker for chord (-2 distinguishes from rest -1)
            durations.push(note.duration);
            advances.push(advance);
            chordIntervals.push(note.intervals);
            chordRootOffsets.push(rootOffset);
        } else if (note.type === 'note' && note.semitone !== undefined) {
            const totalSemitone = note.semitone + keyOffset;
            pattern.push(totalSemitone);
            durations.push(note.duration);
            advances.push(advance);
            chordIntervals.push(null);
            chordRootOffsets.push(0);
        } else if (note.type === 'rest') {
            // Represent rest as -1 semitone (special value)
            pattern.push(-1);
            durations.push(note.duration);
            advances.push(advance);
            chordIntervals.push(null);
            chordRootOffsets.push(0);
        }
    });

    return {
        id: parseInt(midi.exercise_id.replace(/\D/g, '')) || 9999,
        name: midi.name,
        desc: midi.name,
        pattern,
        bpm: midi.tempo_bpm,
        duration: (durations && durations.length > 0) ? durations[0] : 1, // First duration as default, fallback to 1
        durations,
        instructions: midi.instructions || '',
        category: midi.category,
        isAIGenerated: midi.isAIGenerated || false,
        chordIntervals: chordIntervals.some(c => c !== null) ? chordIntervals.map(c => c || []) : undefined,
        chordRootOffsets: chordRootOffsets.some(r => r !== 0) ? chordRootOffsets : undefined,
        advances: advances.some((a, i) => a !== durations[i]) ? advances : undefined
    };
}

// Get pattern array from any exercise format
export function getExercisePattern(exercise: Exercise): number[] {
    if (isMidiExercise(exercise)) {
        const legacy = midiToLegacy(exercise);
        return legacy.pattern;
    }
    return exercise.pattern;
}

// Get durations array from any exercise format
export function getExerciseDurations(exercise: Exercise): number[] {
    if (isMidiExercise(exercise)) {
        const legacy = midiToLegacy(exercise);
        return legacy.durations || [];
    }
    return exercise.durations || Array(exercise.pattern.length).fill(exercise.duration);
}

// Get chord intervals from exercise (for embedded chords)
export function getExerciseChordIntervals(exercise: Exercise): (number[] | null)[] {
    if (isMidiExercise(exercise)) {
        const legacy = midiToLegacy(exercise);
        if (legacy.chordIntervals) {
            return legacy.chordIntervals.map(c => c.length > 0 ? c : null);
        }
    }
    return [];
}

// Get chord root offsets from exercise (for transposed chords)
export function getExerciseChordRootOffsets(exercise: Exercise): number[] {
    if (isMidiExercise(exercise)) {
        const legacy = midiToLegacy(exercise);
        if (legacy.chordRootOffsets) {
            return legacy.chordRootOffsets;
        }
    }
    return [];
}

// Get advances from exercise (timeline advancement, may differ from duration)
export function getExerciseAdvances(exercise: Exercise): number[] | null {
    if (isMidiExercise(exercise)) {
        const legacy = midiToLegacy(exercise);
        if (legacy.advances) {
            return legacy.advances;
        }
    }
    return null; // null means use durations
}



// Get BPM from any exercise format
export function getExerciseBPM(exercise: Exercise): number {
    if (isMidiExercise(exercise)) {
        return exercise.tempo_bpm;
    }
    return exercise.bpm || 90;
}

// Get exercise name (handles both string and TranslationKey)
export function getExerciseName(exercise: Exercise): string {
    if (isMidiExercise(exercise)) {
        return exercise.name;
    }
    return typeof exercise.name === 'string' ? exercise.name : exercise.name;
}

// Get exercise instructions
export function getExerciseInstructions(exercise: Exercise): string {
    if (isMidiExercise(exercise)) {
        return exercise.instructions || '';
    }
    return exercise.instructions;
}

// Get exercise category
export function getExerciseCategory(exercise: Exercise): string {
    if (isMidiExercise(exercise)) {
        return exercise.category;
    }
    return typeof exercise.category === 'string' ? exercise.category : exercise.category;
}

// Get exercise ID (string for MIDI, number for legacy)
export function getExerciseId(exercise: Exercise): string {
    if (isMidiExercise(exercise)) {
        return exercise.exercise_id;
    }
    return exercise.id.toString();
}

// Convert legacy exercise to MIDI format
export function legacyToMidi(legacy: LegacyExercise): MidiExercise {
    const notes: ExerciseNote[] = [];
    const durations = legacy.durations || Array(legacy.pattern.length).fill(legacy.duration);

    legacy.pattern.forEach((semitone, index) => {
        const beats = durations[index] || legacy.duration;

        // Convert old ms duration to beats if needed (assuming 90 BPM)
        let durationBeats = beats;
        if (durationBeats > 10) {
            durationBeats = (durationBeats / 1000) / (60 / 90);
        }

        if (semitone === -1) {
            // Rest
            notes.push({
                type: 'rest',
                duration: durationBeats
            });
        } else {
            // Note - use semitone directly
            notes.push({
                type: 'note',
                duration: durationBeats,
                semitone: semitone
            });
        }
    });

    return {
        exercise_id: `LEG_${legacy.id}`,
        name: typeof legacy.name === 'string' ? legacy.name : legacy.name,
        category: typeof legacy.category === 'string' ? legacy.category : legacy.category,
        key_center: 'C4',
        tempo_bpm: legacy.bpm || 90,
        time_signature: '4/4',
        notes,
        instructions: legacy.instructions,
        isAIGenerated: legacy.isAIGenerated
    };
}

// Normalize any exercise to legacy format for playback
export function normalizeExercise(exercise: Exercise): LegacyExercise {
    if (isMidiExercise(exercise)) {
        return midiToLegacy(exercise);
    }
    return exercise;
}

// Example MIDI exercises
export const MIDI_EXERCISES: MidiExercise[] = [
    {
        exercise_id: "PENT_MAJ_001",
        name: "Major Pentatonic Breath Control",
        category: "scalesAndAgility",
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [
            { type: "note", semitone: 0, duration: 1.0 },
            { type: "note", semitone: 2, duration: 1.0 },
            { type: "note", semitone: 4, duration: 1.0 },
            { type: "note", semitone: 7, duration: 1.0 },
            { type: "note", semitone: 9, duration: 1.0 },
            { type: "note", semitone: 12, duration: 1.0 },
            { type: "note", semitone: 9, duration: 1.0 },
            { type: "note", semitone: 7, duration: 1.0 },
            { type: "note", semitone: 4, duration: 1.0 },
            { type: "note", semitone: 2, duration: 1.0 },
            { type: "note", semitone: 0, duration: 1.0 }
        ],
        instructions: "Sing the major pentatonic scale up and down, focusing on breath control."
    }
];

// Example exercises in MIDI format
export const EXAMPLE_MIDI_EXERCISES: MidiExercise[] = [
    {
        exercise_id: "EX_MIDI_001",
        name: "Major Scale",
        category: "scalesAndAgility",
        key_center: "C4",
        tempo_bpm: 120,
        time_signature: "4/4",
        notes: [
            { type: "note", semitone: 0, duration: 1.0 },
            { type: "note", semitone: 2, duration: 1.0 },
            { type: "note", semitone: 4, duration: 1.0 },
            { type: "note", semitone: 5, duration: 1.0 },
            { type: "note", semitone: 7, duration: 1.0 },
            { type: "note", semitone: 9, duration: 1.0 },
            { type: "note", semitone: 11, duration: 1.0 },
            { type: "note", semitone: 12, duration: 1.0 }
        ],
        instructions: "Sing the major scale up and down."
    }
];
