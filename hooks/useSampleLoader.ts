import { useState, useRef, useCallback } from 'react';
import { semitoneToNoteName } from '../utils';

const CUSTOM_SAMPLES_URL = "/sounds/";

// Optimization: Static Regex patterns defined outside component
const NOTE_REGEX = /([a-gA-G])(#{1,2}|s|b{1,2})?\s*(-?\d+)$/;
const MIDI_NOTE_REGEX = /(?:^|\D)(2[1-9]|[3-9]\d|10[0-8])(?:\D|$)/;
const NORMALIZE_REGEX = /[_.-]/g;
const SHARP_REGEX = /sharp/gi;
const FLAT_REGEX = /flat/gi;

interface UseSampleLoaderReturn {
  // Refs
  instrumentLibraryRef: React.RefObject<Record<string, Map<number, AudioBuffer>>>;
  failedSamplesRef: React.RefObject<Set<number>>;
  
  // State
  activeInstrument: string;
  setActiveInstrument: (instrument: string) => void;
  availableInstruments: string[];
  setAvailableInstruments: (instruments: string[]) => void;
  loadedSampleCount: number;
  setLoadedSampleCount: (count: number | ((prev: number) => number)) => void;
  
  // Functions
  fetchAndDecodeSample: (semitone: number, audioCtx: AudioContext | null) => Promise<AudioBuffer | null>;
  checkAudioBuffers: (semitones: number[], audioCtx: AudioContext | null, initAudio: () => Promise<boolean>) => Promise<void>;
  parseSampleInfo: (filename: string) => { semitone: number | null; instrument: string };
  handleLoadLocalSamples: (fileList: FileList, audioCtx: AudioContext | null, initAudio: () => Promise<boolean>) => Promise<{ loaded: number; errors: number }>;
  loadBuiltInPianoSamples: (audioCtx: AudioContext | null, initAudio: () => Promise<boolean>) => Promise<{ loaded: number; errors: number }>;
}

export function useSampleLoader(): UseSampleLoaderReturn {
  // Refs
  const instrumentLibraryRef = useRef<Record<string, Map<number, AudioBuffer>>>({});
  const failedSamplesRef = useRef<Set<number>>(new Set());
  
  // State
  const [activeInstrument, setActiveInstrument] = useState<string>('Default');
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
  const [loadedSampleCount, setLoadedSampleCount] = useState(0);
  
  const fetchAndDecodeSample = useCallback(async (semitone: number, audioCtx: AudioContext | null): Promise<AudioBuffer | null> => {
    // This function handles "Cloud" fetching (legacy behavior if no local files)
    const defaultMap = instrumentLibraryRef.current['Default'];
    if (defaultMap && defaultMap.has(semitone)) return defaultMap.get(semitone)!;

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
  }, []);
  
  const checkAudioBuffers = useCallback(async (semitones: number[], audioCtx: AudioContext | null, initAudio: () => Promise<boolean>): Promise<void> => {
    const audioReady = await initAudio();
    if (!audioReady) return;

    // For local files, they are already loaded.
    // For cloud files, we'd fetch them here.
    // This function is mostly a no-op with local files.
    // If we wanted to preload certain semitones:
    for (const st of semitones) {
      if (activeInstrument === 'Default') {
        const defaultMap = instrumentLibraryRef.current['Default'];
        if (!defaultMap || !defaultMap.has(st)) {
          await fetchAndDecodeSample(st, audioCtx);
        }
      }
    }
  }, [activeInstrument, fetchAndDecodeSample]);
  
  const parseSampleInfo = useCallback((filename: string): { semitone: number | null; instrument: string } => {
    const cleanName = filename.replace(/\.(flac|mp3|wav|ogg|m4a|aac)$/i, '');
    const parts = cleanName.split('/');
    const instrumentPart = parts.length > 1 ? parts[0] : 'Default';
    const notePart = parts.length > 1 ? parts[parts.length - 1] : cleanName;

    let normalized = notePart.replace(NORMALIZE_REGEX, '').trim();
    normalized = normalized.replace(SHARP_REGEX, '#');
    normalized = normalized.replace(FLAT_REGEX, 'b');

    const midiMatch = normalized.match(MIDI_NOTE_REGEX);
    if (midiMatch) {
      const midiNumber = parseInt(midiMatch[1], 10);
      if (midiNumber >= 21 && midiNumber <= 108) {
        return { semitone: midiNumber - 60, instrument: instrumentPart };
      }
    }

    const noteMatch = normalized.match(NOTE_REGEX);
    if (noteMatch) {
      const noteLetter = noteMatch[1].toUpperCase();
      const accidental = noteMatch[2] || '';
      const octaveStr = noteMatch[3];
      const octave = parseInt(octaveStr, 10);

      const baseNotes: { [key: string]: number } = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
      let semitoneInOctave = baseNotes[noteLetter];
      if (semitoneInOctave === undefined) return { semitone: null, instrument: instrumentPart };

      if (accidental.includes('#') || accidental.toLowerCase().includes('s')) {
        const sharpCount = (accidental.match(/#/g) || []).length + (accidental.toLowerCase().match(/s/g) || []).length;
        semitoneInOctave += sharpCount;
      } else if (accidental.includes('b')) {
        const flatCount = (accidental.match(/b/g) || []).length;
        semitoneInOctave -= flatCount;
      }

      const midiNote = (octave + 1) * 12 + semitoneInOctave;
      const semitoneFromC4 = midiNote - 60;
      return { semitone: semitoneFromC4, instrument: instrumentPart };
    }

    return { semitone: null, instrument: instrumentPart };
  }, []);
  
  const handleLoadLocalSamples = useCallback(async (fileList: FileList, audioCtx: AudioContext | null, initAudio: () => Promise<boolean>) => {
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
      const firstNew = Array.from(newInstruments)[0];
      setActiveInstrument(firstNew);
    }

    setLoadedSampleCount(prev => prev + loadedCount);
    return { loaded: loadedCount, errors };
  }, [parseSampleInfo, activeInstrument]);
  
  const loadBuiltInPianoSamples = useCallback(async (audioCtx: AudioContext | null, initAudio: () => Promise<boolean>) => {
    const audioReady = await initAudio();
    if (!audioReady || !audioCtx) return { loaded: 0, errors: 0 };

    // Define the built-in piano samples (Salamander High Quality)
    const pianoSamples: { filename: string, semitone: number }[] = [];
    const notes = ['C', 'Ds', 'Fs', 'A'];
    const noteOffsets = { 'C': 0, 'Ds': 3, 'Fs': 6, 'A': 9 };

    for (let octave = 1; octave <= 7; octave++) {
      for (const note of notes) {
        const noteOffset = noteOffsets[note as keyof typeof noteOffsets];
        const midi = (octave + 1) * 12 + noteOffset;
        const semitone = midi - 60;

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
  }, []);
  
  return {
    instrumentLibraryRef,
    failedSamplesRef,
    activeInstrument,
    setActiveInstrument,
    availableInstruments,
    setAvailableInstruments,
    loadedSampleCount,
    setLoadedSampleCount,
    fetchAndDecodeSample,
    checkAudioBuffers,
    parseSampleInfo,
    handleLoadLocalSamples,
    loadBuiltInPianoSamples,
  };
}
