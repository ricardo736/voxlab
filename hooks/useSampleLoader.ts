import { useState, useRef, useCallback } from 'react';
import { semitoneToNoteName } from '../utils';

const CUSTOM_SAMPLES_URL = "/sounds/";

// Regex patterns for sample parsing
const NOTE_REGEX = /([a-gA-G])(#{1,2}|s|b{1,2})?\s*(-?\d+)$/;
const MIDI_NOTE_REGEX = /(?:^|\D)(2[1-9]|[3-9]\d|10[0-8])(?:\D|$)/;
const NORMALIZE_REGEX = /[_.-]/g;
const SHARP_REGEX = /sharp/gi;
const FLAT_REGEX = /flat/gi;

interface UseSampleLoaderOptions {
    audioCtx: AudioContext | null;
    initAudio: () => Promise<boolean>;
}

interface UseSampleLoaderReturn {
    activeInstrument: string;
    availableInstruments: string[];
    loadedSampleCount: number;
    loadLocalSamples: (files: FileList) => Promise<{ loaded: number, errors: number }>;
    loadBuiltInPianoSamples: () => Promise<{ loaded: number, errors: number }>;
    instrumentLibraryRef: React.MutableRefObject<Record<string, Map<number, AudioBuffer>>>;
    failedSamplesRef: React.MutableRefObject<Set<number>>;
    fetchAndDecodeSample: (semitone: number) => Promise<AudioBuffer | null>;
    setActiveInstrument: (instrument: string) => void;
}

export function useSampleLoader({
    audioCtx,
    initAudio,
}: UseSampleLoaderOptions): UseSampleLoaderReturn {
    const [activeInstrument, setActiveInstrument] = useState<string>('Default');
    const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
    const [loadedSampleCount, setLoadedSampleCount] = useState(0);

    const instrumentLibraryRef = useRef<Record<string, Map<number, AudioBuffer>>>({});
    const failedSamplesRef = useRef<Set<number>>(new Set());

    const fetchAndDecodeSample = useCallback(async (semitone: number): Promise<AudioBuffer | null> => {
        // This function handles "Cloud" fetching (legacy behavior if no local files)
        // It assumes "Default" instrument or similar.
        // For now, we only check the 'Default' bucket in the library.

        const defaultMap = instrumentLibraryRef.current['Default'];
        if (defaultMap && defaultMap.has(semitone)) return defaultMap.get(semitone)!;

        // If strictly using local files, we might skip this fetch.
        // But for compatibility, let's assume there's a "Default" behavior or "Cloud" behavior.
        // If we are forcing local files, this might return null.
        // For now, preserving original behavior which fetches from CUSTOM_SAMPLES_URL

        if (failedSamplesRef.current.has(semitone)) return null;

        const noteName = semitoneToNoteName(semitone);
        const encodedName = encodeURIComponent(noteName);
        const safeName = noteName.replace('#', 's');

        const urlsToTry = [
            `${CUSTOM_SAMPLES_URL}${encodedName}.flac`,
            `${CUSTOM_SAMPLES_URL}${encodedName}.mp3`,
            `${CUSTOM_SAMPLES_URL}${safeName}.flac`,
            `${CUSTOM_SAMPLES_URL}${safeName}.mp3`
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        try {
            for (const url of urlsToTry) {
                try {
                    const response = await fetch(url, { signal: controller.signal });
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        clearTimeout(timeoutId);
                        if (!audioCtx) return null;
                        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                        // Cache it in the "Default" bucket
                        if (!instrumentLibraryRef.current['Default']) {
                            instrumentLibraryRef.current['Default'] = new Map();
                        }
                        instrumentLibraryRef.current['Default'].set(semitone, audioBuffer);

                        return audioBuffer;
                    }
                } catch (error) { }
            }
        } catch (e) { } finally { clearTimeout(timeoutId); }

        failedSamplesRef.current.add(semitone);
        return null;
    }, [audioCtx]);

    const parseSampleInfo = useCallback((filename: string): { semitone: number | null, instrument: string } => {
        // 1. Remove extension
        let name = filename.replace(/\.[^/.]+$/, "");

        // 2. Normalize separators for splitting
        // We want to find the split between Instrument and Note
        // Heuristic: Look for the Note pattern (e.g. C#4) at the end.

        // Normalize: "Grand Piano_C#4" -> "Grand Piano C#4"
        const normalized = name.replace(NORMALIZE_REGEX, ' ').replace(/♯/g, '#').replace(/♭/g, 'b').replace(SHARP_REGEX, '#').replace(FLAT_REGEX, 'b');

        // Find the note part at the end of string
        const match = normalized.match(NOTE_REGEX);

        let semitone: number | null = null;
        let instrument = "Custom"; // Default name if no prefix found

        if (match) {
            // We found a note at the end!
            const fullNoteString = match[0]; // e.g. "C#4"
            const letter = match[1].toUpperCase();
            const accidentalRaw = (match[2] || "").toLowerCase();
            const octave = parseInt(match[3], 10);

            const baseOffsets: { [key: string]: number } = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
            let semitoneOffset = baseOffsets[letter];

            if (accidentalRaw.includes('#') || accidentalRaw === 's') semitoneOffset += 1;
            else if (accidentalRaw === '##') semitoneOffset += 2;
            else if (accidentalRaw.includes('b')) semitoneOffset -= 1;
            else if (accidentalRaw === 'bb') semitoneOffset -= 2;

            semitone = (octave - 4) * 12 + semitoneOffset;

            // Extract Instrument Name
            const splitIndex = match.index;
            if (splitIndex !== undefined && splitIndex > 0) {
                let prefix = normalized.substring(0, splitIndex).trim();
                // Clean up typical separators at the end of the prefix
                prefix = prefix.replace(/[_.-]+$/, '').trim();
                if (prefix.length > 0) {
                    instrument = prefix;
                }
            }
        } else {
            // Try MIDI number fallback
            const midiMatch = name.match(MIDI_NOTE_REGEX);
            if (midiMatch) {
                semitone = parseInt(midiMatch[1], 10) - 60;
                // Instrument is harder to guess here, maybe everything before the number?
                const splitIndex = midiMatch.index;
                if (splitIndex !== undefined && splitIndex > 0) {
                    let prefix = name.substring(0, splitIndex).replace(/[_.-]+$/, '').trim();
                    if (prefix.length > 0) instrument = prefix;
                }
            }
        }

        return { semitone, instrument };
    }, []);

    const loadLocalSamples = useCallback(async (fileList: FileList) => {
        const audioReady = await initAudio();
        if (!audioReady || !audioCtx) return { loaded: 0, errors: 0 };

        let loadedCount = 0;
        let errors = 0;
        const newInstruments = new Set<string>();

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            if (file.name.match(/\.(flac|mp3|wav|ogg|m4a|aac)$/i) || file.type.startsWith('audio/')) {
                const { semitone, instrument } = parseSampleInfo(file.name);

                if (semitone !== null) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                        // Add to library
                        if (!instrumentLibraryRef.current[instrument]) {
                            instrumentLibraryRef.current[instrument] = new Map();
                        }
                        instrumentLibraryRef.current[instrument].set(semitone, audioBuffer);

                        newInstruments.add(instrument);
                        loadedCount++;
                    } catch (e) {
                        console.error(`Failed to decode ${file.name}`, e);
                        errors++;
                    }
                }
            }
        }

        // Update available instruments state
        const allKeys = Object.keys(instrumentLibraryRef.current);
        setAvailableInstruments(allKeys);

        // If we loaded new instruments and currently on Default (or nothing), switch to the first new one
        if (newInstruments.size > 0 && (activeInstrument === 'Default' || !instrumentLibraryRef.current[activeInstrument])) {
            // Prefer the one with the most samples? Or just the first one.
            // Let's pick the first one we found.
            const firstNew = Array.from(newInstruments)[0];
            setActiveInstrument(firstNew);
        }

        setLoadedSampleCount(prev => prev + loadedCount);
        return { loaded: loadedCount, errors };
    }, [initAudio, audioCtx, parseSampleInfo, activeInstrument]);

    const loadBuiltInPianoSamples = useCallback(async () => {
        const audioReady = await initAudio();
        if (!audioReady || !audioCtx) return { loaded: 0, errors: 0 };

        // Define the built-in piano samples (Salamander High Quality)
        // Using C, Ds, Fs, A pattern for better coverage (every 3 semitones)
        const pianoSamples: { filename: string, semitone: number }[] = [];
        const notes = ['C', 'Ds', 'Fs', 'A'];
        const noteOffsets = { 'C': 0, 'Ds': 3, 'Fs': 6, 'A': 9 };

        for (let octave = 1; octave <= 7; octave++) {
            for (const note of notes) {
                // Calculate semitone relative to C4 (MIDI 60)
                // MIDI = (octave + 1) * 12 + noteOffset
                const noteOffset = noteOffsets[note as keyof typeof noteOffsets];
                const midi = (octave + 1) * 12 + noteOffset;
                const semitone = midi - 60; // Relative to C4

                pianoSamples.push({
                    filename: `${note}${octave}.mp3`,
                    semitone: semitone
                });
            }
        }

        let loadedCount = 0;
        let errors = 0;

        // Create the Piano instrument map
        if (!instrumentLibraryRef.current['Piano']) {
            instrumentLibraryRef.current['Piano'] = new Map();
        }

        for (const sample of pianoSamples) {
            try {
                const response = await fetch(`/sounds/Salamander_Piano/${sample.filename}`);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                    instrumentLibraryRef.current['Piano'].set(sample.semitone, audioBuffer);
                    loadedCount++;
                } else {
                    console.warn(`Failed to load ${sample.filename}: ${response.status}`);
                    errors++;
                }
            } catch (e) {
                console.error(`Error loading ${sample.filename}:`, e);
                errors++;
            }
        }

        // Update available instruments
        const allKeys = Object.keys(instrumentLibraryRef.current);
        setAvailableInstruments(allKeys);

        // Set Piano as the active instrument if samples were loaded
        if (loadedCount > 0) {
            setActiveInstrument('Piano');
            setLoadedSampleCount(prev => prev + loadedCount);
        }

        return { loaded: loadedCount, errors };
    }, [initAudio, audioCtx]);

    return {
        activeInstrument,
        availableInstruments,
        loadedSampleCount,
        loadLocalSamples,
        loadBuiltInPianoSamples,
        instrumentLibraryRef,
        failedSamplesRef,
        fetchAndDecodeSample,
        setActiveInstrument,
    };
}
