import React, { useMemo } from 'react';

interface FretboardProps {
    activeNotes: number[]; // MIDI numbers of currently active notes
    tuning?: number[]; // MIDI numbers of open strings (default: Standard E)
    fretCount?: number;
    showNoteNames?: boolean;
    width?: number;
    height?: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const getNoteName = (midi: number) => {
    return NOTE_NAMES[midi % 12];
};

const STANDARD_TUNING = [64, 59, 55, 50, 45, 40]; // E4, B3, G3, D3, A2, E2 (Top to Bottom)

export default function Fretboard({
    activeNotes = [],
    tuning = STANDARD_TUNING,
    fretCount = 22,
    showNoteNames = false,
    width = 800,
    height = 200
}: FretboardProps) {

    // Calculate fret positions (logarithmic spacing)
    const fretPositions = useMemo(() => {
        const positions = [];
        let currentPos = 0;
        const scaleLen = width * 1.05; // Slightly larger than width to fit frets

        for (let i = 0; i <= fretCount; i++) {
            // Formula: d = s - (s / (2 ^ (n / 12)))
            const pos = scaleLen - (scaleLen / Math.pow(2, i / 12));
            positions.push(pos);
        }
        // Normalize to fit width exactly
        const maxPos = positions[fretCount];
        return positions.map(p => (p / maxPos) * width);
    }, [width, fretCount]);

    // Generate all playable notes on the fretboard
    const stringNotes = useMemo(() => {
        return tuning.map((openStringMidi, stringIndex) => {
            const notes = [];
            for (let fret = 0; fret <= fretCount; fret++) {
                notes.push({
                    midi: openStringMidi + fret,
                    fret,
                    stringIndex
                });
            }
            return notes;
        });
    }, [tuning, fretCount]);

    const stringSpacing = height / (tuning.length + 1);

    return (
        <div className="relative select-none" style={{ width, height }}>
            <svg width={width} height={height} className="overflow-visible">
                {/* Fretboard Background */}
                <rect x={0} y={0} width={width} height={height} fill="#3e2723" rx={4} />

                {/* Frets */}
                {fretPositions.map((pos, i) => (
                    <React.Fragment key={`fret-${i}`}>
                        <line
                            x1={pos}
                            y1={0}
                            x2={pos}
                            y2={height}
                            stroke="#d7ccc8"
                            strokeWidth={i === 0 ? 4 : 2} // Nut is thicker
                        />
                        {/* Fret Markers (Dots) */}
                        {[3, 5, 7, 9, 15, 17, 19, 21].includes(i) && (
                            <circle
                                cx={(fretPositions[i] + fretPositions[i - 1]) / 2}
                                cy={height / 2}
                                r={height * 0.04}
                                fill="#d7ccc8"
                                opacity={0.6}
                            />
                        )}
                        {i === 12 && (
                            <>
                                <circle
                                    cx={(fretPositions[i] + fretPositions[i - 1]) / 2}
                                    cy={height * 0.3}
                                    r={height * 0.04}
                                    fill="#d7ccc8"
                                    opacity={0.6}
                                />
                                <circle
                                    cx={(fretPositions[i] + fretPositions[i - 1]) / 2}
                                    cy={height * 0.7}
                                    r={height * 0.04}
                                    fill="#d7ccc8"
                                    opacity={0.6}
                                />
                            </>
                        )}
                    </React.Fragment>
                ))}

                {/* Strings */}
                {tuning.map((_, i) => (
                    <line
                        key={`string-${i}`}
                        x1={0}
                        y1={stringSpacing * (i + 1)}
                        x2={width}
                        y2={stringSpacing * (i + 1)}
                        stroke="#bcaaa4"
                        strokeWidth={1 + (i * 0.5)} // Thicker for lower strings
                        opacity={0.9}
                    />
                ))}

                {/* Active Notes */}
                {stringNotes.map((string, stringIndex) => (
                    string.map((note) => {
                        const isActive = activeNotes.includes(note.midi);
                        if (!isActive) return null;

                        // Calculate position
                        const x = note.fret === 0
                            ? -15 // Open string played "behind" the nut
                            : (fretPositions[note.fret] + fretPositions[note.fret - 1]) / 2;
                        const y = stringSpacing * (stringIndex + 1);

                        return (
                            <g key={`note-${stringIndex}-${note.fret}`}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={height * 0.06}
                                    fill="#ef4444" // Red for active note
                                    stroke="white"
                                    strokeWidth={2}
                                />
                                {showNoteNames && (
                                    <text
                                        x={x}
                                        y={y}
                                        dy=".3em"
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize={height * 0.07}
                                        fontWeight="bold"
                                    >
                                        {getNoteName(note.midi)}
                                    </text>
                                )}
                            </g>
                        );
                    })
                ))}
            </svg>
        </div>
    );
}
