export function noteNameToFrequency(note: string, octave: number) {
    const NOTE_OFFSETS: Record<string, number> = {
        'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
        'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    const midi = 12 * (octave + 1) + NOTE_OFFSETS[note];
    return 440 * Math.pow(2, (midi - 69) / 12);
}