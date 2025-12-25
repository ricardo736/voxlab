import { MidiExercise, Language, Theme, Routine, Tuning } from './types';
import { TranslationKey } from './i18n';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const IS_SHARP = [false, true, false, false, true, false, true, false, true, false, true, false];
export const BASE_FREQ = 261.63; // C4

// Helper function to convert semitone pattern to scale degrees
function patternToDegrees(pattern: number[]): { degree: number; octave_shift: number }[] {
    const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];

    return pattern.map(semitone => {
        const octave_shift = Math.floor(semitone / 12);
        const semiInOctave = semitone % 12;

        // Find closest scale degree
        let degree = 1;
        let minDiff = 12;
        majorScaleIntervals.forEach((interval, idx) => {
            const diff = Math.abs(semiInOctave - interval);
            if (diff < minDiff) {
                minDiff = diff;
                degree = idx + 1;
            }
        });

        return { degree, octave_shift };
    });
}

export const EXERCISES: MidiExercise[] = [
    // Warmup
    {
        exercise_id: "FAM_002",
        name: 'descendingFiveTone',
        desc: 'descendingFiveToneDesc',
        category: 'warmup',
        key_center: "C4",
        tempo_bpm: 90,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 7, duration: 1, lyric: "Mum" }, { type: "note", semitone: 5, duration: 1, lyric: "Mum" }, { type: "note", semitone: 4, duration: 1, lyric: "Mum" }, { type: "note", semitone: 2, duration: 1, lyric: "Mum" }, { type: "note", semitone: 0, duration: 4, lyric: "Mum" }]
    },
    {
        exercise_id: "COOL_001",
        name: 'gentleSlideDown',
        desc: 'gentleSlideDownDesc',
        category: 'warmup',
        key_center: "C4",
        tempo_bpm: 80,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 7, duration: 2, lyric: "Hum" }, { type: "note", semitone: 4, duration: 2, lyric: "Hum" }, { type: "note", semitone: 0, duration: 4, lyric: "Hum" }]
    },
    // Technique
    {
        exercise_id: "FAM_006",
        name: 'staccatoArpeggio',
        desc: 'staccatoArpeggioDesc',
        category: 'technique',
        key_center: "C4",
        tempo_bpm: 90,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 0.5, lyric: "Ha" }, { type: "rest", duration: 0.5 }, { type: "note", semitone: 4, duration: 0.5, lyric: "Ha" }, { type: "rest", duration: 0.5 }, { type: "note", semitone: 7, duration: 0.5, lyric: "Ha" }, { type: "rest", duration: 0.5 }, { type: "note", semitone: 12, duration: 0.5, lyric: "Ha" }, { type: "rest", duration: 0.5 }, { type: "note", semitone: 7, duration: 0.5, lyric: "Ha" }, { type: "rest", duration: 0.5 }, { type: "note", semitone: 4, duration: 0.5, lyric: "Ha" }, { type: "rest", duration: 0.5 }, { type: "note", semitone: 0, duration: 2, lyric: "Ha" }]
    },
    // Resonance & Tone
    {
        exercise_id: "EX_012",
        name: 'vowelPurityScale',
        desc: 'vowelPurityScaleDesc',
        category: 'technique',
        key_center: "C4",
        tempo_bpm: 90,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "Ah" }, { type: "note", semitone: 2, duration: 1, lyric: "Ah" }, { type: "note", semitone: 4, duration: 1, lyric: "Ah" }, { type: "note", semitone: 5, duration: 1, lyric: "Ah" }, { type: "note", semitone: 7, duration: 1, lyric: "Ah" }, { type: "note", semitone: 5, duration: 1, lyric: "Ah" }, { type: "note", semitone: 4, duration: 1, lyric: "Ah" }, { type: "note", semitone: 2, duration: 1, lyric: "Ah" }, { type: "note", semitone: 0, duration: 2, lyric: "Ah" }]
    },
    {
        exercise_id: "EX_020",
        name: 'vowelUniformity',
        desc: 'vowelUniformityDesc',
        category: 'technique',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "Ee" }, { type: "note", semitone: 4, duration: 1, lyric: "Ah" }, { type: "note", semitone: 7, duration: 1, lyric: "Oo" }, { type: "note", semitone: 12, duration: 2, lyric: "Ee" }, { type: "note", semitone: 7, duration: 1, lyric: "Ah" }, { type: "note", semitone: 4, duration: 1, lyric: "Oo" }, { type: "note", semitone: 0, duration: 2, lyric: "Ee" }]
    },
    {
        exercise_id: "FAM_007",
        name: 'neighOctave',
        desc: 'neighOctaveDesc',
        category: 'technique',
        key_center: "C4",
        tempo_bpm: 110,
        time_signature: "4/4",
        notes: [
            // The scale notes (no intro chord - it's handled by previous sequence's "next chord")
            { type: "note", semitone: 0, duration: 1, lyric: "Nay" },
            { type: "note", semitone: 4, duration: 1, lyric: "Nay" },
            { type: "note", semitone: 7, duration: 1, lyric: "Nay" },
            { type: "note", semitone: 12, duration: 0.5, lyric: "Nay" },
            { type: "note", semitone: 12, duration: 0.5, lyric: "Nay" },
            { type: "note", semitone: 12, duration: 0.5, lyric: "Nay" },
            { type: "note", semitone: 12, duration: 0.5, lyric: "Nay" },
            { type: "note", semitone: 7, duration: 1, lyric: "Nay" },
            { type: "note", semitone: 4, duration: 1, lyric: "Nay" },
            { type: "note", semitone: 0, duration: 2, lyric: "Nay" },
            // Transition: current key chord (1 beat, then stops)
            { type: "chord", intervals: [0, 4, 7], duration: 1 },
            // Transition: next key chord (sustains 12 beats under next notes, advances 2 beats)
            { type: "chord", intervals: [0, 4, 7], duration: 12, advance: 2, rootOffset: 1 }
        ]
    },
    {
        exercise_id: "EX_030",
        name: 'rapidConsonants',
        desc: 'rapidConsonantsDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 110,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 0.5, lyric: "Dig" }, { type: "note", semitone: 2, duration: 0.5, lyric: "Ga" }, { type: "note", semitone: 4, duration: 0.5, lyric: "Dig" }, { type: "note", semitone: 5, duration: 0.5, lyric: "Ga" }, { type: "note", semitone: 7, duration: 0.5, lyric: "Dig" }, { type: "note", semitone: 5, duration: 0.5, lyric: "Ga" }, { type: "note", semitone: 4, duration: 0.5, lyric: "Dig" }, { type: "note", semitone: 2, duration: 0.5, lyric: "Ga" }, { type: "note", semitone: 0, duration: 1, lyric: "Dig" }]
    },
    // Belting
    {
        exercise_id: "EX_026",
        name: 'edgyAh',
        desc: 'edgyAhDesc',
        category: 'technique',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 7, duration: 1, lyric: "AH" }, { type: "note", semitone: 9, duration: 1, lyric: "AH" }, { type: "note", semitone: 12, duration: 2, lyric: "AH" }, { type: "note", semitone: 9, duration: 1, lyric: "AH" }, { type: "note", semitone: 7, duration: 2, lyric: "AH" }]
    },
    // Scales & Agility
    {
        exercise_id: "FAM_004",
        name: 'onePointFiveOctaveScale',
        desc: 'onePointFiveOctaveScaleDesc',
        category: 'technique',
        key_center: "C4",
        tempo_bpm: 120,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 0.5, lyric: "La" }, { type: "note", semitone: 2, duration: 0.5, lyric: "La" }, { type: "note", semitone: 4, duration: 0.5, lyric: "La" }, { type: "note", semitone: 5, duration: 0.5, lyric: "La" }, { type: "note", semitone: 7, duration: 0.5, lyric: "La" }, { type: "note", semitone: 9, duration: 0.5, lyric: "La" }, { type: "note", semitone: 11, duration: 0.5, lyric: "La" }, { type: "note", semitone: 12, duration: 0.5, lyric: "La" }, { type: "note", semitone: 14, duration: 0.5, lyric: "La" }, { type: "note", semitone: 16, duration: 0.5, lyric: "La" }, { type: "note", semitone: 17, duration: 1, lyric: "La" }, { type: "note", semitone: 16, duration: 0.5, lyric: "La" }, { type: "note", semitone: 14, duration: 0.5, lyric: "La" }, { type: "note", semitone: 12, duration: 0.5, lyric: "La" }, { type: "note", semitone: 11, duration: 0.5, lyric: "La" }, { type: "note", semitone: 9, duration: 0.5, lyric: "La" }, { type: "note", semitone: 7, duration: 0.5, lyric: "La" }, { type: "note", semitone: 5, duration: 0.5, lyric: "La" }, { type: "note", semitone: 4, duration: 0.5, lyric: "La" }, { type: "note", semitone: 2, duration: 0.5, lyric: "La" }, { type: "note", semitone: 0, duration: 2, lyric: "La" }]
    },
    {
        exercise_id: "EX_007",
        name: 'majorArpeggio',
        desc: 'majorArpeggioDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 4, duration: 1, lyric: "La" }, { type: "note", semitone: 7, duration: 1, lyric: "La" }, { type: "note", semitone: 12, duration: 2, lyric: "La" }, { type: "note", semitone: 7, duration: 1, lyric: "La" }, { type: "note", semitone: 4, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 2, lyric: "La" }]
    },
    {
        exercise_id: "EX_010",
        name: 'minorArpeggio',
        desc: 'minorArpeggioDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 3, duration: 1, lyric: "La" }, { type: "note", semitone: 7, duration: 1, lyric: "La" }, { type: "note", semitone: 12, duration: 2, lyric: "La" }, { type: "note", semitone: 7, duration: 1, lyric: "La" }, { type: "note", semitone: 3, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 2, lyric: "La" }]
    },
    {
        exercise_id: "FAM_001",
        name: 'hanonRun',
        desc: 'hanonRunDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 70,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 0.25, lyric: "Ha" }, { type: "note", semitone: 4, duration: 0.25, lyric: "Ha" }, { type: "note", semitone: 5, duration: 0.25, lyric: "Ha" }, { type: "note", semitone: 7, duration: 0.25, lyric: "Ha" }, { type: "note", semitone: 9, duration: 0.25, lyric: "Ha" }, { type: "note", semitone: 7, duration: 0.25, lyric: "Ha" }, { type: "note", semitone: 5, duration: 0.25, lyric: "Ha" }, { type: "note", semitone: 4, duration: 0.25, lyric: "Ha" }, { type: "note", semitone: 0, duration: 2, lyric: "Ha" }]
    },
    {
        exercise_id: "FAM_005",
        name: 'rossiniScale',
        desc: 'rossiniScaleDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 115,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 0.5, lyric: "A" }, { type: "note", semitone: 2, duration: 0.5, lyric: "A" }, { type: "note", semitone: 4, duration: 0.5, lyric: "A" }, { type: "note", semitone: 5, duration: 0.5, lyric: "A" }, { type: "note", semitone: 7, duration: 0.5, lyric: "A" }, { type: "note", semitone: 9, duration: 0.5, lyric: "A" }, { type: "note", semitone: 11, duration: 0.5, lyric: "A" }, { type: "note", semitone: 12, duration: 0.5, lyric: "A" }, { type: "note", semitone: 14, duration: 0.5, lyric: "A" }, { type: "note", semitone: 12, duration: 0.5, lyric: "A" }, { type: "note", semitone: 11, duration: 0.5, lyric: "A" }, { type: "note", semitone: 9, duration: 0.5, lyric: "A" }, { type: "note", semitone: 7, duration: 0.5, lyric: "A" }, { type: "note", semitone: 5, duration: 0.5, lyric: "A" }, { type: "note", semitone: 4, duration: 0.5, lyric: "A" }, { type: "note", semitone: 2, duration: 0.5, lyric: "A" }, { type: "note", semitone: 0, duration: 2, lyric: "A" }]
    },
    {
        exercise_id: "EX_027",
        name: 'descendingScale',
        desc: 'descendingScaleDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 90,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 12, duration: 1, lyric: "Ah" }, { type: "note", semitone: 11, duration: 1, lyric: "Ah" }, { type: "note", semitone: 9, duration: 1, lyric: "Ah" }, { type: "note", semitone: 7, duration: 1, lyric: "Ah" }, { type: "note", semitone: 5, duration: 1, lyric: "Ah" }, { type: "note", semitone: 4, duration: 1, lyric: "Ah" }, { type: "note", semitone: 2, duration: 1, lyric: "Ah" }, { type: "note", semitone: 0, duration: 2, lyric: "Ah" }]
    },
    {
        exercise_id: "EX_028",
        name: 'descendingArpeggio',
        desc: 'descendingArpeggioDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 12, duration: 1, lyric: "La" }, { type: "note", semitone: 7, duration: 1, lyric: "La" }, { type: "note", semitone: 4, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 2, lyric: "La" }]
    },
    {
        exercise_id: "ALT_001",
        name: 'harmonicMinor',
        desc: 'harmonicMinorDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 0.5, lyric: "La" }, { type: "note", semitone: 2, duration: 0.5, lyric: "La" }, { type: "note", semitone: 3, duration: 0.5, lyric: "La" }, { type: "note", semitone: 5, duration: 0.5, lyric: "La" }, { type: "note", semitone: 7, duration: 0.5, lyric: "La" }, { type: "note", semitone: 8, duration: 0.5, lyric: "La" }, { type: "note", semitone: 11, duration: 0.5, lyric: "La" }, { type: "note", semitone: 12, duration: 0.5, lyric: "La" }, { type: "note", semitone: 11, duration: 0.5, lyric: "La" }, { type: "note", semitone: 8, duration: 0.5, lyric: "La" }, { type: "note", semitone: 7, duration: 0.5, lyric: "La" }, { type: "note", semitone: 5, duration: 0.5, lyric: "La" }, { type: "note", semitone: 3, duration: 0.5, lyric: "La" }, { type: "note", semitone: 2, duration: 0.5, lyric: "La" }, { type: "note", semitone: 0, duration: 2, lyric: "La" }]
    },
    {
        exercise_id: "ALT_003",
        name: 'wholeToneScale',
        desc: 'wholeToneScaleDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 90,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "Ah" }, { type: "note", semitone: 2, duration: 1, lyric: "Ah" }, { type: "note", semitone: 4, duration: 1, lyric: "Ah" }, { type: "note", semitone: 6, duration: 1, lyric: "Ah" }, { type: "note", semitone: 8, duration: 1, lyric: "Ah" }, { type: "note", semitone: 10, duration: 1, lyric: "Ah" }, { type: "note", semitone: 12, duration: 2, lyric: "Ah" }]
    },
    {
        exercise_id: "ALT_004",
        name: 'majorPentatonic',
        desc: 'majorPentatonicDesc',
        category: 'agility',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "Oh" }, { type: "note", semitone: 2, duration: 1, lyric: "Oh" }, { type: "note", semitone: 4, duration: 1, lyric: "Oh" }, { type: "note", semitone: 7, duration: 1, lyric: "Oh" }, { type: "note", semitone: 9, duration: 1, lyric: "Oh" }, { type: "note", semitone: 12, duration: 2, lyric: "Oh" }]
    },
    {
        exercise_id: "FAM_003",
        name: 'dominantSeventhArp',
        desc: 'dominantSeventhArpDesc',
        category: 'style',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "Nay" }, { type: "note", semitone: 4, duration: 1, lyric: "Nay" }, { type: "note", semitone: 7, duration: 1, lyric: "Nay" }, { type: "note", semitone: 10, duration: 1, lyric: "Nay" }, { type: "note", semitone: 12, duration: 1.5, lyric: "Nay" }, { type: "note", semitone: 10, duration: 1, lyric: "Nay" }, { type: "note", semitone: 7, duration: 1, lyric: "Nay" }, { type: "note", semitone: 4, duration: 1, lyric: "Nay" }, { type: "note", semitone: 0, duration: 2, lyric: "Nay" }]
    },
    {
        exercise_id: "ALT_002",
        name: 'bluesScale',
        desc: 'bluesScaleDesc',
        category: 'style',
        key_center: "C4",
        tempo_bpm: 90,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "Bah" }, { type: "note", semitone: 3, duration: 1, lyric: "Da" }, { type: "note", semitone: 5, duration: 1, lyric: "Bah" }, { type: "note", semitone: 6, duration: 1, lyric: "Da" }, { type: "note", semitone: 7, duration: 1, lyric: "Bah" }, { type: "note", semitone: 10, duration: 1, lyric: "Da" }, { type: "note", semitone: 12, duration: 3, lyric: "Bah" }]
    },
    {
        exercise_id: "EX_031",
        name: 'jazzSixthScat',
        desc: 'jazzSixthScatDesc',
        category: 'style',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 0.5, lyric: "Doo" }, { type: "note", semitone: 4, duration: 0.5, lyric: "Bah" }, { type: "note", semitone: 7, duration: 0.5, lyric: "Doo" }, { type: "note", semitone: 9, duration: 0.5, lyric: "Bah" }, { type: "note", semitone: 12, duration: 0.5, lyric: "Dat" }, { type: "note", semitone: 9, duration: 0.5, lyric: "Bah" }, { type: "note", semitone: 7, duration: 0.5, lyric: "Doo" }, { type: "note", semitone: 4, duration: 0.5, lyric: "Bah" }, { type: "note", semitone: 0, duration: 2, lyric: "Doo" }]
    },
    // Pitch & Intonation
    {
        exercise_id: "EX_004",
        name: 'octaveJumps',
        desc: 'octaveJumpsDesc',
        category: 'ear',
        key_center: "C4",
        tempo_bpm: 90,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "Ah" }, { type: "note", semitone: 12, duration: 1, lyric: "Ah" }, { type: "note", semitone: 0, duration: 1, lyric: "Ah" }, { type: "note", semitone: 12, duration: 1, lyric: "Ah" }, { type: "note", semitone: 0, duration: 2, lyric: "Ah" }]
    },
    {
        exercise_id: "EX_006",
        name: 'thirdIntervals',
        desc: 'thirdIntervalsDesc',
        category: 'ear',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 4, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 4, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 4, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 2, lyric: "La" }]
    },
    {
        exercise_id: "EX_021",
        name: 'minorThirdIntervals',
        desc: 'minorThirdIntervalsDesc',
        category: 'ear',
        key_center: "C4",
        tempo_bpm: 100,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 3, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 3, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 3, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 2, lyric: "La" }]
    },
    {
        exercise_id: "EX_016",
        name: 'sixthIntervals',
        desc: 'sixthIntervalsDesc',
        category: 'ear',
        key_center: "C4",
        tempo_bpm: 90,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "Ah" }, { type: "note", semitone: 9, duration: 1, lyric: "Ah" }, { type: "note", semitone: 0, duration: 1, lyric: "Ah" }, { type: "note", semitone: 9, duration: 1, lyric: "Ah" }, { type: "note", semitone: 0, duration: 2, lyric: "Ah" }]
    },
    {
        exercise_id: "EX_022",
        name: 'scaleOfFifths',
        desc: 'scaleOfFifthsDesc',
        category: 'ear',
        key_center: "C4",
        tempo_bpm: 90,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "Ah" }, { type: "note", semitone: 7, duration: 1, lyric: "Ah" }, { type: "note", semitone: 2, duration: 1, lyric: "Ah" }, { type: "note", semitone: 9, duration: 1, lyric: "Ah" }, { type: "note", semitone: 4, duration: 1, lyric: "Ah" }, { type: "note", semitone: 11, duration: 1, lyric: "Ah" }, { type: "note", semitone: 5, duration: 1, lyric: "Ah" }, { type: "note", semitone: 12, duration: 2, lyric: "Ah" }]
    },
    {
        exercise_id: "EX_032",
        name: 'tritoneChallenge',
        desc: 'tritoneChallengeDesc',
        category: 'ear',
        key_center: "C4",
        tempo_bpm: 80,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 6, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 1, lyric: "La" }, { type: "note", semitone: 6, duration: 1, lyric: "La" }, { type: "note", semitone: 0, duration: 2, lyric: "La" }]
    },
    {
        exercise_id: "EX_008",
        name: 'chromaticScale',
        desc: 'chromaticScaleDesc',
        category: 'ear',
        key_center: "C4",
        tempo_bpm: 120,
        time_signature: "4/4",
        notes: [{ type: "note", semitone: 0, duration: 0.5, lyric: "La" }, { type: "note", semitone: 1, duration: 0.5, lyric: "La" }, { type: "note", semitone: 2, duration: 0.5, lyric: "La" }, { type: "note", semitone: 3, duration: 0.5, lyric: "La" }, { type: "note", semitone: 4, duration: 0.5, lyric: "La" }, { type: "note", semitone: 5, duration: 0.5, lyric: "La" }, { type: "note", semitone: 6, duration: 0.5, lyric: "La" }, { type: "note", semitone: 7, duration: 0.5, lyric: "La" }, { type: "note", semitone: 8, duration: 0.5, lyric: "La" }, { type: "note", semitone: 9, duration: 0.5, lyric: "La" }, { type: "note", semitone: 10, duration: 0.5, lyric: "La" }, { type: "note", semitone: 11, duration: 0.5, lyric: "La" }, { type: "note", semitone: 12, duration: 2, lyric: "La" }]
    }
];

// MVP exercises - Simple scales only
export const MVP_EXERCISES: MidiExercise[] = [
    EXERCISES.find(e => e.exercise_id === "EX_012")!,
    EXERCISES.find(e => e.exercise_id === "EX_007")!
];


// Updated Routines with MIDI exercise IDs
export const ROUTINES: Routine[] = [
    // Warmup Routines
    {
        id: 'warmup-quick',
        name: 'warmUpQuick',
        description: 'warmUpQuickDesc',
        exerciseIds: ['FAM_002', 'COOL_001'],
        benefits: 'warmUpQuickBenefits',
        estimatedMinutes: 3
    },
    {
        id: 'warmup-complete',
        name: 'warmUpComplete',
        description: 'warmUpCompleteDesc',
        exerciseIds: ['FAM_002', 'COOL_001', 'EX_012', 'EX_007'],
        benefits: 'warmUpCompleteBenefits',
        estimatedMinutes: 8
    },
    // Technique Routines
    {
        id: 'resonance-focus',
        name: 'resonanceFocus',
        description: 'resonanceFocusDesc',
        exerciseIds: ['EX_012', 'EX_020', 'FAM_007'],
        benefits: 'resonanceFocusBenefits',
        estimatedMinutes: 6
    },
    {
        id: 'staccato-control',
        name: 'staccatoControl',
        description: 'staccatoControlDesc',
        exerciseIds: ['FAM_006', 'EX_030', 'EX_007'],
        benefits: 'staccatoControlBenefits',
        estimatedMinutes: 5
    },
    // Agility Routines
    {
        id: 'agility-scales',
        name: 'agilityScales',
        description: 'agilityScalesDesc',
        exerciseIds: ['FAM_005', 'FAM_001', 'FAM_004'],
        benefits: 'agilityScalesBenefits',
        estimatedMinutes: 7
    },
    {
        id: 'arpeggios-master',
        name: 'arpeggiosMaster',
        description: 'arpeggiosMasterDesc',
        exerciseIds: ['EX_007', 'EX_010', 'EX_028', 'ALT_001'],
        benefits: 'arpeggiosMasterBenefits',
        estimatedMinutes: 8
    },
    // Ear Training Routines
    {
        id: 'interval-training',
        name: 'intervalTraining',
        description: 'intervalTrainingDesc',
        exerciseIds: ['EX_006', 'EX_021', 'EX_016', 'EX_004'],
        benefits: 'intervalTrainingBenefits',
        estimatedMinutes: 7
    },
    {
        id: 'pitch-precision',
        name: 'pitchPrecision',
        description: 'pitchPrecisionDesc',
        exerciseIds: ['EX_022', 'EX_032', 'EX_008'],
        benefits: 'pitchPrecisionBenefits',
        estimatedMinutes: 6
    },
    // Style Routines
    {
        id: 'jazz-blues',
        name: 'jazzBlues',
        description: 'jazzBluesDesc',
        exerciseIds: ['ALT_002', 'FAM_003', 'EX_031'],
        benefits: 'jazzBluesBenefits',
        estimatedMinutes: 6
    },
    {
        id: 'belting-power',
        name: 'beltingPower',
        description: 'beltingPowerDesc',
        exerciseIds: ['EX_026', 'FAM_007', 'EX_004'],
        benefits: 'beltingPowerBenefits',
        estimatedMinutes: 5
    },
];


// Piano layout constants
export const WHITE_KEY_SLOT_WIDTH = 60;
export const WHITE_KEY_SIZE = 54;
export const BLACK_KEY_SIZE = 36;
export const V_PADDING = 22;

// New constants for settings
export const LANGUAGES: Language[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt-BR', name: 'Português Brasileiro', flag: '🇧🇷' }
];

export const THEMES: Theme[] = [
    {
        id: 'violet-wave',
        name: 'Violet Wave',
        visualizer: [
            { name: 'orb1', gradient: 'radial-gradient(circle, #a78bfa, #8b5cf6 80%, transparent 100%)' },
            { name: 'orb2', gradient: 'radial-gradient(circle, #f0abfc, #d946ef 80%, transparent 100%)' },
            { name: 'orb3', gradient: 'radial-gradient(circle, #fde047, #facc15 80%, transparent 100%)' },
            { name: 'orb4', gradient: 'radial-gradient(circle, #a78bfa, #8b5cf6 80%, transparent 100%)' },
            { name: 'orb5', gradient: 'radial-gradient(circle, #f0abfc, #d946ef 80%, transparent 100%)' },
            { name: 'orb6', gradient: 'radial-gradient(circle, #fde047, #facc15 80%, transparent 100%)' },
        ],
        button: { from: 'from-violet-500', via: 'via-fuchsia-500', to: 'to-yellow-300', shadow: 'shadow-fuchsia-500/40', shadowRgb: '217, 70, 239' },
        gradientText: { from: 'from-violet-600', to: 'to-fuchsia-600', darkFrom: 'dark:from-violet-400', darkTo: 'dark:to-fuchsia-400' },
        resultsRange: { from: 'from-violet-500', to: 'to-fuchsia-500' },
        progress: { from: 'from-violet-400', to: 'to-fuchsia-500' },
    },
    {
        id: 'ocean-blue',
        name: 'Ocean Blue',
        visualizer: [
            { name: 'orb1', gradient: 'radial-gradient(circle, #7dd3fc, #38bdf8 80%, transparent 100%)' },
            { name: 'orb2', gradient: 'radial-gradient(circle, #67e8f9, #22d3ee 80%, transparent 100%)' },
            { name: 'orb3', gradient: 'radial-gradient(circle, #60a5fa, #3b82f6 80%, transparent 100%)' },
            { name: 'orb4', gradient: 'radial-gradient(circle, #7dd3fc, #38bdf8 80%, transparent 100%)' },
            { name: 'orb5', gradient: 'radial-gradient(circle, #67e8f9, #22d3ee 80%, transparent 100%)' },
            { name: 'orb6', gradient: 'radial-gradient(circle, #60a5fa, #3b82f6 80%, transparent 100%)' },
        ],
        button: { from: 'from-sky-400', via: 'via-cyan-400', to: 'to-blue-500', shadow: 'shadow-cyan-400/40', shadowRgb: '34, 211, 238' },
        gradientText: { from: 'from-sky-600', to: 'to-blue-600', darkFrom: 'dark:from-sky-400', darkTo: 'dark:to-blue-400' },
        resultsRange: { from: 'from-sky-500', to: 'to-blue-500' },
        progress: { from: 'from-sky-400', to: 'to-blue-500' },
    },
    {
        id: 'forest-green',
        name: 'Forest Green',
        visualizer: [
            { name: 'orb1', gradient: 'radial-gradient(circle, #6ee7b7, #34d399 80%, transparent 100%)' },
            { name: 'orb2', gradient: 'radial-gradient(circle, #5eead4, #14b8a6 80%, transparent 100%)' },
            { name: 'orb3', gradient: 'radial-gradient(circle, #4ade80, #16a34a 80%, transparent 100%)' },
            { name: 'orb4', gradient: 'radial-gradient(circle, #6ee7b7, #34d399 80%, transparent 100%)' },
            { name: 'orb5', gradient: 'radial-gradient(circle, #5eead4, #14b8a6 80%, transparent 100%)' },
            { name: 'orb6', gradient: 'radial-gradient(circle, #4ade80, #16a34a 80%, transparent 100%)' },
        ],
        button: { from: 'from-emerald-400', via: 'via-teal-500', to: 'to-green-600', shadow: 'shadow-teal-500/40', shadowRgb: '20, 184, 166' },
        gradientText: { from: 'from-emerald-700', to: 'to-teal-600', darkFrom: 'dark:from-emerald-400', darkTo: 'dark:to-teal-400' },
        resultsRange: { from: 'from-emerald-500', to: 'to-teal-500' },
        progress: { from: 'from-emerald-400', to: 'to-teal-500' },
    },
    {
        id: 'sunset-orange',
        name: 'Sunset Orange',
        visualizer: [
            { name: 'orb1', gradient: 'radial-gradient(circle, #fcd34d, #facc15 80%, transparent 100%)' },
            { name: 'orb2', gradient: 'radial-gradient(circle, #fb923c, #f97316 80%, transparent 100%)' },
            { name: 'orb3', gradient: 'radial-gradient(circle, #f87171, #ef4444 80%, transparent 100%)' },
            { name: 'orb4', gradient: 'radial-gradient(circle, #fcd34d, #facc15 80%, transparent 100%)' },
            { name: 'orb5', gradient: 'radial-gradient(circle, #fb923c, #f97316 80%, transparent 100%)' },
            { name: 'orb6', gradient: 'radial-gradient(circle, #f87171, #ef4444 80%, transparent 100%)' },
        ],
        button: { from: 'from-amber-400', via: 'via-orange-500', to: 'to-red-500', shadow: 'shadow-orange-500/40', shadowRgb: '249, 115, 22' },
        gradientText: { from: 'from-amber-600', to: 'to-orange-600', darkFrom: 'dark:from-amber-400', darkTo: 'dark:to-orange-400' },
        resultsRange: { from: 'from-amber-500', to: 'to-orange-500' },
        progress: { from: 'from-amber-400', to: 'to-orange-500' },
    },
];

// New constant for instrument tunings
export const TUNINGS: Tuning[] = [
    { id: 'chromatic', name: 'chromatic', notes: [] }, // Chromatic is special-cased
    {
        id: 'standard-guitar',
        name: 'standardGuitar',
        notes: [
            { name: 'E2', semitone: -20 },
            { name: 'A2', semitone: -15 },
            { name: 'D3', semitone: -10 },
            { name: 'G3', semitone: -5 },
            { name: 'B3', semitone: -1 },
            { name: 'E4', semitone: 4 },
        ]
    }
];

// Instructions for the redesigned "siren" vocal range test
export const RANGE_TEST_INSTRUCTIONS = {
    initial: "To find your vocal range, you will sing a \"siren\" sound.",
    detail: "Glide your voice from your lowest comfortable note up to your highest, and then back down. It's okay to repeat the glide if you have time.",
    warning: "Important: Do not strain your voice. Stop if you feel any discomfort.",
    listening: "Start singing now!",
};
