

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


// Pitch detection utilities moved from RangeDetectorV2View.tsx
export function average(arr: number[]): number | null {
    if (!arr || arr.length === 0) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function min(arr: number[]): number | null {
    if (!arr || arr.length === 0) return null;
    return arr.reduce((a, b) => (a < b ? a : b));
}

export function max(arr: number[]): number | null {
    if (!arr || arr.length === 0) return null;
    return arr.reduce((a, b) => (a > b ? a : b));
}

export function calculateRMS(arr: Float32Array): number {
    if (!arr || arr.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i] * arr[i];
    }
    return Math.sqrt(sum / arr.length);
}

export function midiToNoteName(m: number): string {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(m / 12) - 1;
    const name = names[((m % 12) + 12) % 12];
    return `${name}${octave}`;
}

export function freqToNote(freq: number | null): string | null {
    if (!freq) return null;
    const midi = 69 + 12 * Math.log2(freq / 440);
    const rounded = Math.round(midi);
    return midiToNoteName(rounded);
}

export const YIN_THRESHOLD = 0.12;
export const YIN_MIN_FREQ = 50;
export const YIN_MAX_FREQ = 2000;
export const LOW_VOLUME_RMS_THRESHOLD = 0.008; // This threshold acts as a noise gate for pitch detection.

export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
    const bufferSize = buffer.length;
    const halfBufferSize = Math.floor(bufferSize / 2);
    let rms = 0;
    for (let i = 0; i < bufferSize; i++) {
        rms += buffer[i] * buffer[i];
    }
    
    if (rms < LOW_VOLUME_RMS_THRESHOLD) {
        return null;
    }

    // YIN algorithm implementation
    let tauEstimate = -1;
    const difference = new Float32Array(halfBufferSize);

    for (let tau = 1; tau < halfBufferSize; tau++) {
        for (let i = 0; i < halfBufferSize; i++) {
            const delta = buffer[i] - buffer[i + tau];
            difference[tau] += delta * delta;
        }
    }

    // Cumulative Mean Normalized Difference
    if (halfBufferSize > 0) {
        difference[0] = 1;
    }
    let runningSum = 0;
    for (let tau = 1; tau < halfBufferSize; tau++) {
        runningSum += difference[tau];
        if (runningSum === 0) {
            difference[tau] = 1;
        } else {
            difference[tau] *= tau / runningSum;
        }
    }

    // Find first minimum below threshold
    for (let tau = 4; tau < halfBufferSize; tau++) {
        if (difference[tau] < YIN_THRESHOLD) {
            let localMin = tau;
            while (tau + 1 < halfBufferSize && difference[tau + 1] < difference[tau]) {
                localMin = ++tau;
            }
            tauEstimate = localMin;
            break;
        }
    }

    // If no minimum below threshold, find global minimum
    if (tauEstimate === -1) {
        let minVal = Infinity;
        for (let tau = 4; tau < halfBufferSize; tau++) {
            if (difference[tau] < minVal) {
                minVal = difference[tau];
                tauEstimate = tau;
            }
        }
    }

    // Parabolic interpolation around the estimate
    if (tauEstimate > 0 && tauEstimate < halfBufferSize - 1) {
        const y1 = difference[tauEstimate - 1];
        const y2 = difference[tauEstimate];
        const y3 = difference[tauEstimate + 1];
        const a = (y1 + y3 - 2 * y2) / 2;
        const b = (y3 - y1) / 2;
        if (a !== 0) {
            tauEstimate -= b / (2 * a);
        }
    }

    const freq = tauEstimate > 0 ? sampleRate / tauEstimate : -1;

    // Filter out frequencies outside human voice range
    if (freq > 0 && (freq < YIN_MIN_FREQ || freq > YIN_MAX_FREQ)) {
        return null;
    }
    if (freq <= 0) return null;
    return freq;
}
