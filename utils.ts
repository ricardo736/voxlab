

import { Note } from './types';
import { NOTE_NAMES, IS_SHARP, BASE_FREQ } from './constants';

export function generateNotes(startSemitone: number, endSemitone: number): Note[] {
    const notes: Note[] = [];
    for (let s = startSemitone; s <= endSemitone; s++) {
        const c4Offset = s;
        const octave = Math.floor(c4Offset / 12) + 4;
        const noteIndex = (c4Offset % 12 + 12) % 12;
        notes.push({
            semitone: s,
            name: NOTE_NAMES[noteIndex] + octave,
            isSharp: IS_SHARP[noteIndex],
        });
    }
    return notes;
}

export function frequencyToNote(frequency: number) {
    if (frequency <= 0) return null;
    const preciseSemitone = 12 * (Math.log2(frequency / BASE_FREQ));
    const roundedSemitone = Math.round(preciseSemitone);
    const detune = (preciseSemitone - roundedSemitone) * 100;
    const noteIndex = ((roundedSemitone % 12) + 12) % 12;
    const noteName = NOTE_NAMES[noteIndex];
    const octave = Math.floor(roundedSemitone / 12) + 4;
    return {
        name: noteName + octave,
        semitone: roundedSemitone,
        preciseSemitone: preciseSemitone,
        detune: detune,
        // Add isSharp to match the Note interface
        isSharp: IS_SHARP[noteIndex],
    };
};

export function semitoneToNoteName(semitone: number): string {
    const roundedSemitone = Math.round(semitone);
    const noteIndex = ((roundedSemitone % 12) + 12) % 12;
    const octave = Math.floor(roundedSemitone / 12) + 4;
    return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function noteToFrequency(semitone: number): number {
    return BASE_FREQ * Math.pow(2, semitone / 12);
}

export const lerp = (start: number, end: number, amt: number): number => (1 - amt) * start + amt * end;