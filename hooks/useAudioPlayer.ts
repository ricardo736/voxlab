
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { NoteNodes } from '../types';
import { noteToFrequency, semitoneToNoteName } from '../utils';

// Constants for sample parsing
const CUSTOM_SAMPLES_URL = 'https://raw.githubusercontent.com/ricardo736/PP_Samples/main/';
const NORMALIZE_REGEX = /[_.-]/g;
const NOTE_REGEX = /([A-Ga-g])(#|s|b|##|bb)?(-?\d)$/;
const MIDI_NOTE_REGEX = /(\d{1,3})$/;
const SHARP_REGEX = /sharp/gi;
const FLAT_REGEX = /flat/gi;

interface AudioPlayerProps {
    exerciseNoteVolume: number;
    metronomeVolume: number;
    frequencySeparationEnabled: boolean;
    initAudio: () => Promise<boolean>;
}

export const useAudioPlayer = ({
    exerciseNoteVolume,
    metronomeVolume,
    frequencySeparationEnabled,
    initAudio
}: AudioPlayerProps) => {
    const { audioCtxRef, masterGainRef } = useAudio();

    const [activeInstrument, setActiveInstrument] = useState<string>('Default');
    const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
    const [loadedSampleCount, setLoadedSampleCount] = useState(0);

    const instrumentLibraryRef = useRef<Record<string, Map<number, AudioBuffer>>>({});
    const failedSamplesRef = useRef<Set<number>>(new Set());
    const currentPlayingExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set());
    const currentNonExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set());

    const fetchAndDecodeSample = useCallback(async (semitone: number): Promise<AudioBuffer | null> => {
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return null;

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
                        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

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
    }, [audioCtxRef]);

    const checkAudioBuffers = useCallback(async (semitones: number[]): Promise<void> => {
        const audioReady = await initAudio();
        if (!audioReady) return;

        if (activeInstrument === 'Default' && (!instrumentLibraryRef.current['Default'] || instrumentLibraryRef.current['Default'].size === 0)) {
            const uniqueSemitones = [...new Set(semitones)];
            const needed = uniqueSemitones.filter(s =>
                !(instrumentLibraryRef.current['Default'] && instrumentLibraryRef.current['Default'].has(s)) &&
                !failedSamplesRef.current.has(s)
            );
            if (needed.length > 0) {
                await Promise.all(needed.map(s => fetchAndDecodeSample(s)));
            }
        }
    }, [initAudio, fetchAndDecodeSample, activeInstrument]);

    const parseSampleInfo = useCallback((filename: string): { semitone: number | null, instrument: string } => {
        let name = filename.replace(/\.[^/.]+$/, "");
        const normalized = name.replace(NORMALIZE_REGEX, ' ').replace(/♯/g, '#').replace(/♭/g, 'b').replace(SHARP_REGEX, '#').replace(FLAT_REGEX, 'b');
        const match = normalized.match(NOTE_REGEX);

        let semitone: number | null = null;
        let instrument = "Custom";

        if (match) {
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

            const splitIndex = match.index;
            if (splitIndex !== undefined && splitIndex > 0) {
                let prefix = normalized.substring(0, splitIndex).trim();
                prefix = prefix.replace(/[_.-]+$/, '').trim();
                if (prefix.length > 0) instrument = prefix;
            }
        } else {
            const midiMatch = name.match(MIDI_NOTE_REGEX);
            if (midiMatch) {
                semitone = parseInt(midiMatch[1], 10) - 60;
                const splitIndex = midiMatch.index;
                if (splitIndex !== undefined && splitIndex > 0) {
                    let prefix = name.substring(0, splitIndex).replace(/[_.-]+$/, '').trim();
                    if (prefix.length > 0) instrument = prefix;
                }
            }
        }

        return { semitone, instrument };
    }, []);

    const handleLoadLocalSamples = useCallback(async (fileList: FileList) => {
        const audioReady = await initAudio();
        if (!audioReady || !audioCtxRef.current) return { loaded: 0, errors: 0 };

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
                        const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);

                        if (!instrumentLibraryRef.current[instrument]) {
                            instrumentLibraryRef.current[instrument] = new Map();
                        }
                        instrumentLibraryRef.current[instrument].set(semitone, audioBuffer);
                        newInstruments.add(instrument);
                        loadedCount++;
                    } catch (e) {
                        errors++;
                    }
                }
            }
        }

        const allKeys = Object.keys(instrumentLibraryRef.current);
        setAvailableInstruments(allKeys);

        if (newInstruments.size > 0 && (activeInstrument === 'Default' || !instrumentLibraryRef.current[activeInstrument])) {
            const firstNew = Array.from(newInstruments)[0];
            setActiveInstrument(firstNew);
        }

        setLoadedSampleCount(prev => prev + loadedCount);
        return { loaded: loadedCount, errors };
    }, [initAudio, audioCtxRef, parseSampleInfo, activeInstrument]);

    const loadBuiltInPianoSamples = useCallback(async () => {
        const audioReady = await initAudio();
        if (!audioReady || !audioCtxRef.current) return { loaded: 0, errors: 0 };

        const pianoSamples: { filename: string, semitone: number }[] = [];
        const notes = ['C', 'Ds', 'Fs', 'A'];
        const noteOffsets = { 'C': 0, 'Ds': 3, 'Fs': 6, 'A': 9 };

        for (let octave = 1; octave <= 7; octave++) {
            for (const note of notes) {
                const noteOffset = noteOffsets[note as keyof typeof noteOffsets];
                const midi = (octave + 1) * 12 + noteOffset;
                const semitone = midi - 60;
                pianoSamples.push({ filename: `${note}${octave}.mp3`, semitone });
            }
        }

        let loadedCount = 0;
        let errors = 0;

        if (!instrumentLibraryRef.current['Piano']) {
            instrumentLibraryRef.current['Piano'] = new Map();
        }

        for (const sample of pianoSamples) {
            try {
                const response = await fetch(`/sounds/Salamander_Piano/${sample.filename}`);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
                    instrumentLibraryRef.current['Piano'].set(sample.semitone, audioBuffer);
                    loadedCount++;
                } else {
                    errors++;
                }
            } catch (e) {
                errors++;
            }
        }

        const allKeys = Object.keys(instrumentLibraryRef.current);
        setAvailableInstruments(allKeys);

        if (loadedCount > 0) {
            setActiveInstrument('Piano');
            setLoadedSampleCount(prev => prev + loadedCount);
        }

        return { loaded: loadedCount, errors };
    }, [initAudio, audioCtxRef]);

    const stopAllExerciseNotes = useCallback(() => {
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        currentPlayingExerciseNoteNodesRef.current.forEach(n => {
            n.gainNodes.forEach(g => {
                try {
                    g.gain.cancelScheduledValues(now);
                    g.gain.setValueAtTime(g.gain.value, now);
                    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                } catch (e) { }
            });
            n.allNodes.forEach(node => {
                if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                    try { node.stop(now + 0.15); } catch (e) { }
                }
            });
            setTimeout(() => {
                n.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } });
            }, 200);
        });
        currentPlayingExerciseNoteNodesRef.current.clear();
    }, [audioCtxRef]);

    const stopAllNonExerciseNotes = useCallback(() => {
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        currentNonExerciseNoteNodesRef.current.forEach(n => {
            n.allNodes.forEach(node => {
                if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                    try { node.stop(now); } catch (e) { }
                }
                try { node.disconnect(); } catch (e) { }
            });
        });
        currentNonExerciseNoteNodesRef.current.clear();
    }, [audioCtxRef]);

    const playNote = useCallback(async (semitone: number, duration: number, forExercise: boolean = false) => {
        const audioReady = await initAudio();
        const audioCtx = audioCtxRef.current;
        const masterGain = masterGainRef.current;
        if (!audioReady || !audioCtx || !masterGain) return;

        const now = audioCtx.currentTime;
        const noteSet = forExercise ? currentPlayingExerciseNoteNodesRef.current : currentNonExerciseNoteNodesRef.current;

        // Prevent overlapping
        noteSet.forEach(existingNode => {
            if ((existingNode as any).semitone === semitone) {
                existingNode.gainNodes.forEach(g => {
                    try {
                        g.gain.cancelScheduledValues(now);
                        g.gain.setValueAtTime(g.gain.value, now);
                        g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                    } catch (e) { }
                });
                existingNode.allNodes.forEach(node => {
                    if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                        try { node.stop(now + 0.06); } catch (e) { }
                    }
                });
                setTimeout(() => {
                    existingNode.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } });
                    noteSet.delete(existingNode);
                }, 70);
            }
        });

        const currentMap = instrumentLibraryRef.current[activeInstrument];
        let buffer: AudioBuffer | null = null;
        let playbackRate = 1.0;

        if (currentMap && currentMap.size > 0) {
            if (currentMap.has(semitone)) {
                buffer = currentMap.get(semitone)!;
            } else {
                let closestSemitone: number | null = null;
                let minDistance = Infinity;
                for (const key of currentMap.keys()) {
                    const dist = Math.abs(semitone - key);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestSemitone = key;
                    }
                }
                if (closestSemitone !== null) {
                    buffer = currentMap.get(closestSemitone)!;
                    playbackRate = Math.pow(2, (semitone - closestSemitone) / 12);
                }
            }
        } else if (activeInstrument === 'Default') {
            try {
                const fetched = await fetchAndDecodeSample(semitone);
                if (fetched) buffer = fetched;
            } catch (e) { }
        }

        if (buffer) {
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = playbackRate;

            const sampleGain = audioCtx.createGain();
            sampleGain.gain.setValueAtTime(forExercise ? exerciseNoteVolume * 1.5 : 0.8, now);
            sampleGain.gain.exponentialRampToValueAtTime(0.001, now + (duration / 1000) + 0.5);

            source.connect(sampleGain);
            const nodes: NoteNodes = { oscillators: [], gainNodes: [sampleGain], allNodes: [source, sampleGain] };

            if (frequencySeparationEnabled) {
                const lowPassFilter = audioCtx.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 900;
                lowPassFilter.Q.value = 1.0;
                sampleGain.connect(lowPassFilter);
                lowPassFilter.connect(masterGain);
                nodes.allNodes.push(lowPassFilter);
            } else {
                sampleGain.connect(masterGain);
            }

            source.start(now);
            try {
                const adjustedDuration = (duration / 1000) / playbackRate;
                source.stop(now + adjustedDuration + 2.0);
            } catch (e) { }

            (nodes as any).semitone = semitone;
            source.onended = () => { nodes.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } }); noteSet.delete(nodes); };
            noteSet.add(nodes);
        } else {
            // Synthesis Fallback
            const freq = noteToFrequency(semitone);
            const totalDurationSecs = duration / 1000;
            const mainGainNode = audioCtx.createGain();
            mainGainNode.gain.setValueAtTime(0, now);
            mainGainNode.gain.linearRampToValueAtTime(forExercise ? exerciseNoteVolume : 0.8, now + 0.05); // Slower attack (was 0.01) to reduce click
            mainGainNode.gain.exponentialRampToValueAtTime(0.5, now + 0.2); // Higher sustain (was 0.1 at 0.11s) for more body
            mainGainNode.gain.exponentialRampToValueAtTime(0.0001, now + totalDurationSecs);

            const nodes: NoteNodes = { oscillators: [], gainNodes: [mainGainNode], allNodes: [mainGainNode] };

            if (frequencySeparationEnabled) {
                const lowPassFilter = audioCtx.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 900;
                lowPassFilter.Q.value = 1.0;
                mainGainNode.connect(lowPassFilter);
                lowPassFilter.connect(masterGain);
                nodes.allNodes.push(lowPassFilter);
            } else {
                mainGainNode.connect(masterGain);
            }

            (nodes as any).semitone = semitone;
            const osc1 = audioCtx.createOscillator(); osc1.type = 'sine'; osc1.frequency.setValueAtTime(freq, now); osc1.connect(mainGainNode);
            nodes.oscillators.push(osc1); nodes.allNodes.push(osc1);

            const brightOscGain = audioCtx.createGain(); brightOscGain.gain.setValueAtTime(0, now); brightOscGain.gain.linearRampToValueAtTime(0.1, now + 0.005); brightOscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            brightOscGain.connect(mainGainNode); nodes.gainNodes.push(brightOscGain); nodes.allNodes.push(brightOscGain);

            const osc2 = audioCtx.createOscillator(); osc2.type = 'square'; osc2.frequency.setValueAtTime(freq * 2, now); osc2.connect(brightOscGain);
            nodes.oscillators.push(osc2); nodes.allNodes.push(osc2);

            nodes.oscillators.forEach(osc => { osc.start(now); try { osc.stop(now + totalDurationSecs); } catch (e) { } });
            osc1.onended = () => { nodes.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } }); noteSet.delete(nodes); };
            noteSet.add(nodes);
        }
    }, [initAudio, audioCtxRef, masterGainRef, activeInstrument, exerciseNoteVolume, frequencySeparationEnabled, fetchAndDecodeSample]);

    const playMetronomeClick = useCallback(async (volume: number) => {
        const audioReady = await initAudio();
        const audioCtx = audioCtxRef.current;
        const masterGain = masterGainRef.current;
        if (!audioReady || !audioCtx || !masterGain) return;

        const now = audioCtx.currentTime;
        const clickGain = audioCtx.createGain();
        clickGain.gain.setValueAtTime(volume, now);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        clickGain.connect(masterGain);

        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.connect(clickGain);
        osc.start(now);
        osc.stop(now + 0.1);
        osc.onended = () => { try { osc.disconnect(); clickGain.disconnect(); } catch (e) { } };
    }, [initAudio, audioCtxRef, masterGainRef]);

    return {
        activeInstrument,
        setActiveInstrument,
        availableInstruments,
        loadedSampleCount,
        playNote,
        playMetronomeClick,
        stopAllExerciseNotes,
        stopAllNonExerciseNotes,
        handleLoadLocalSamples,
        loadBuiltInPianoSamples,
        checkAudioBuffers
    };
};
