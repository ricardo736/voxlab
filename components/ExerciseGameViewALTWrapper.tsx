import React, { useEffect, useRef, useState, useCallback } from 'react';
import { detectPitchPYIN, resetPYINHistory } from '../utils/pitchDetection';
import ExerciseGameViewALT from './ExerciseGameViewALT';
import { useTranslation } from '../hooks/useTranslation';

interface ExerciseGameViewALTWrapperProps {
    exercise: any;
    vocalRange: any;
    userPitch: any;
    micGain: number;
    isPlaying: boolean;
    isExerciseComplete: boolean;
    onStop: () => void;
    onBack?: () => void;
    onComplete: () => void;
    onPlayPause: () => void;
    onPreview: () => void;
    isPreviewing: boolean;
    playNote: (freq: number, startTime: number, duration: number, type: OscillatorType, volume: number) => void;
    centerSemitone: number | null;
    visibleOctaves: number;
    onNotePositionUpdate?: (semitone: number | null) => void;
    currentRoutine: any;
    onNextInRoutine: () => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    isExerciseFavorite: boolean;
    isRoutineFavorite: boolean;
    onToggleFavoriteExercise: () => void;
    onToggleFavoriteRoutine: () => void;
    onRestart?: () => void;
    checkAudioBuffers: () => void;
    // Audio settings for pitch detection
    pyinBias?: number;
    pyinTolerance?: number;
    pyinGateMode?: 'smooth' | 'instant';
    noiseGateThreshold?: number;
    onEdit?: () => void; // For AI-generated exercises
    onRefine?: (exercise: any, refinePrompt: string) => Promise<void>; // For AI refinement
    currentTheme: any; // Using any to avoid circular dependency or strict type check for now, should be Theme
}

const ExerciseGameViewALTWrapper: React.FC<ExerciseGameViewALTWrapperProps> = (props) => {
    console.log('ExerciseGameViewALTWrapper rendering', {
        exerciseId: props.exercise?.id,
        routine: props.currentRoutine,
        exerciseType: typeof props.exercise,
        exerciseKeys: props.exercise ? Object.keys(props.exercise) : []
    });

    const { t } = useTranslation();
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [pitch, setPitch] = useState<{ frequency: number; note: string; cents: number } | null>(null);
    const [micActive, setMicActive] = useState(false);
    const [internalIsPlaying, setInternalIsPlaying] = useState(false);
    const animationFrameRef = useRef<number>();

    // Piano sample buffers
    const pianoBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());
    const pianoSamplesLoaded = useRef(false);

    // Ref to store latest audio settings to avoid stale closures in RAF loop
    const audioSettingsRef = useRef({
        bias: props.pyinBias ?? 0.1,
        tolerance: props.pyinTolerance ?? 0.3,
        gateThreshold: props.noiseGateThreshold ?? 0.01,
        gateMode: props.pyinGateMode ?? 'smooth'
    });

    // Available piano samples (MIDI note numbers)
    // Available piano samples (Salamander High Quality)
    const PIANO_SAMPLES: { midi: number; file: string }[] = [];
    const notes = ['C', 'Ds', 'Fs', 'A'];
    const noteOffsets = { 'C': 0, 'Ds': 3, 'Fs': 6, 'A': 9 };

    for (let octave = 1; octave <= 7; octave++) {
        for (const note of notes) {
            const noteOffset = noteOffsets[note as keyof typeof noteOffsets];
            const midi = (octave + 1) * 12 + noteOffset;
            PIANO_SAMPLES.push({ midi, file: `/sounds/Salamander_Piano/${note}${octave}.mp3` });
        }
    }

    // Auto-start microphone on mount - browser/OS will show native permission prompt
    // If user denies, exercise continues normally without pitch feedback
    useEffect(() => {
        const autoStartMic = async () => {
            try {
                // Small delay to ensure audio context is ready
                await new Promise(resolve => setTimeout(resolve, 500));

                // This will trigger the native browser/OS permission prompt
                // echoCancellation: true helps prevent picking up the output audio
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, autoGainControl: false, noiseSuppression: false }
                });
                streamRef.current = stream;

                // Ensure context exists
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                    const ctx = new AudioContext();
                    audioContextRef.current = ctx;
                    const analyser = ctx.createAnalyser();
                    analyser.fftSize = 4096;
                    analyser.smoothingTimeConstant = 0.8;
                    analyserRef.current = analyser;
                    await loadPianoSamples(ctx);
                }

                if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume();
                }

                const source = audioContextRef.current.createMediaStreamSource(stream);
                micSourceRef.current = source;

                // FREQUENCY SEPARATION: Band-pass filter for mic input (200Hz - 600Hz)
                // Focus on voice fundamentals, avoid synth notes which are often higher
                const highPassFilter = audioContextRef.current.createBiquadFilter();
                highPassFilter.type = 'highpass';
                highPassFilter.frequency.value = 200; // Cut rumble and low synth
                highPassFilter.Q.value = 1.0;

                const lowPassFilter = audioContextRef.current.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 600; // Cut synth notes (most are above this)
                lowPassFilter.Q.value = 1.0;

                // Chain: source -> highPass -> lowPass (creates band-pass) -> analyser
                // No compressor - it was amplifying synth bleed
                source.connect(highPassFilter);
                highPassFilter.connect(lowPassFilter);
                lowPassFilter.connect(analyserRef.current!);

                setMicActive(true);
                // Start pitch detection loop
                const updatePitchLoop = () => {
                    if (!analyserRef.current || !audioContextRef.current) return;

                    const buffer = new Float32Array(analyserRef.current.fftSize);
                    analyserRef.current.getFloatTimeDomainData(buffer);

                    const frequency = detectPitchPYIN(buffer, audioContextRef.current.sampleRate, {
                        bias: audioSettingsRef.current.bias,
                        tolerance: audioSettingsRef.current.tolerance,
                        gateThreshold: audioSettingsRef.current.gateThreshold,
                        gateMode: audioSettingsRef.current.gateMode as 'smooth' | 'instant'
                    });

                    if (frequency > 0) {
                        const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
                        const pitch = 69 + 12 * Math.log2(frequency / 440);
                        const midi = Math.round(pitch);
                        const note = noteStrings[midi % 12];
                        const octave = Math.floor(midi / 12) - 1;
                        const cents = Math.floor((pitch - midi) * 100);
                        setPitch({ frequency, note: `${note}${octave}`, cents });
                    } else {
                        setPitch(null);
                    }

                    animationFrameRef.current = requestAnimationFrame(updatePitchLoop);
                };
                updatePitchLoop();

            } catch (err) {
                // User denied permission or error - exercise continues without mic feedback
                console.log('Microphone not available - continuing without pitch feedback');
            }
        };

        autoStartMic();

        return () => {
            // Cleanup on unmount
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (micSourceRef.current) {
                micSourceRef.current.disconnect();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // Empty deps - only run on mount/unmount

    // Track isPlaying changes
    useEffect(() => {
        setInternalIsPlaying(props.isPlaying);
    }, [props.isPlaying]);

    useEffect(() => {
        const initAudio = async () => {
            // Ensure we have a valid context
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                const ctx = new AudioContext();
                audioContextRef.current = ctx;

                const analyser = ctx.createAnalyser();
                analyser.fftSize = 4096;
                analyser.smoothingTimeConstant = 0.8;
                analyserRef.current = analyser;

                // Load piano samples
                await loadPianoSamples(ctx);
            }

            // Try to resume, but don't block if it fails (will be resumed on user interaction)
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().catch(e => { });
            }
        };

        initAudio();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            // Cleanup AudioContext on unmount to prevent leaks and "context closed" errors on remount
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {

                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, []);

    const loadPianoSamples = async (ctx: AudioContext) => {
        if (pianoSamplesLoaded.current) return;

        try {
            const loadPromises = PIANO_SAMPLES.map(async (sample) => {
                const response = await fetch(sample.file);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                pianoBuffersRef.current.set(sample.midi, audioBuffer);
            });

            await Promise.all(loadPromises);
            pianoSamplesLoaded.current = true;
        } catch (error) {
            console.error('❌ Error loading piano samples:', error);
        }
    };

    // Helper: Convert frequency to MIDI note number
    const freqToMidi = (freq: number): number => {
        return Math.round(12 * Math.log2(freq / 440) + 69);
    };

    // Helper: Find nearest piano sample
    const findNearestSample = (targetMidi: number): number => {
        if (!PIANO_SAMPLES || PIANO_SAMPLES.length === 0) {
            console.error('PIANO_SAMPLES is empty or undefined!');
            return 60; // Default C4
        }
        let nearest = PIANO_SAMPLES[0].midi;
        let minDistance = Math.abs(targetMidi - nearest);

        for (const sample of PIANO_SAMPLES) {
            const distance = Math.abs(targetMidi - sample.midi);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = sample.midi;
            }
        }

        return nearest;
    };

    const startMicrophone = async () => {
        try {
            // Ensure context exists and is running
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                const ctx = new AudioContext();
                audioContextRef.current = ctx;
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 4096;
                analyser.smoothingTimeConstant = 0.8;
                analyserRef.current = analyser;
                await loadPianoSamples(ctx);
            }

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            // echoCancellation: true helps prevent picking up the output audio
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, autoGainControl: false, noiseSuppression: false }
            });
            streamRef.current = stream;

            const source = audioContextRef.current.createMediaStreamSource(stream);
            micSourceRef.current = source;

            // FREQUENCY SEPARATION: Band-pass filter for mic input (200Hz - 600Hz)
            // Focus on voice fundamentals, avoid synth notes which are often higher
            const highPassFilter = audioContextRef.current.createBiquadFilter();
            highPassFilter.type = 'highpass';
            highPassFilter.frequency.value = 200; // Cut rumble and low synth
            highPassFilter.Q.value = 1.0;

            const lowPassFilter = audioContextRef.current.createBiquadFilter();
            lowPassFilter.type = 'lowpass';
            lowPassFilter.frequency.value = 600; // Cut synth notes (most are above this)
            lowPassFilter.Q.value = 1.0;

            // Chain: source -> highPass -> lowPass (creates band-pass) -> analyser
            // No compressor - it was amplifying synth bleed
            source.disconnect();
            source.connect(highPassFilter);
            highPassFilter.connect(lowPassFilter);
            lowPassFilter.connect(analyserRef.current!);

            setMicActive(true);
            updatePitch();
        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    };

    const stopMicrophone = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (micSourceRef.current) {
            micSourceRef.current.disconnect();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setMicActive(false);
        setPitch(null);
        resetPYINHistory();
    };

    // Helper: Get note from frequency
    const getNote = (frequency: number) => {
        const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const pitch = 69 + 12 * Math.log2(frequency / 440);
        const midi = Math.round(pitch);
        const note = noteStrings[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        const cents = Math.floor((pitch - midi) * 100);
        return { note, octave, cents, midi, frequency };
    };

    useEffect(() => {
        audioSettingsRef.current = {
            bias: props.pyinBias ?? 0.1,
            tolerance: props.pyinTolerance ?? 0.3,
            gateThreshold: props.noiseGateThreshold ?? 0.01,
            gateMode: props.pyinGateMode ?? 'smooth' as 'smooth' | 'instant'
        };
    }, [props.pyinBias, props.pyinTolerance, props.noiseGateThreshold, props.pyinGateMode]);

    const updatePitch = () => {
        if (!analyserRef.current || !audioContextRef.current) return;

        const buffer = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buffer);

        const frequency = detectPitchPYIN(buffer, audioContextRef.current.sampleRate, {
            bias: audioSettingsRef.current.bias,
            tolerance: audioSettingsRef.current.tolerance,
            gateThreshold: audioSettingsRef.current.gateThreshold,
            gateMode: audioSettingsRef.current.gateMode as 'smooth' | 'instant'
        });



        if (frequency > 0) {
            const pitchData = getNote(frequency);
            setPitch({ frequency, note: `${pitchData.note}${pitchData.octave}`, cents: pitchData.cents });
        } else {
            setPitch(null);
        }

        animationFrameRef.current = requestAnimationFrame(updatePitch);
    };

    // Track active sources to stop them on pause
    const activeSourcesRef = useRef<AudioScheduledSourceNode[]>([]);

    const stopAllAudio = () => {
        activeSourcesRef.current.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
        });
        activeSourcesRef.current = [];
    };

    useEffect(() => {
        if (!props.isPlaying) {
            stopAllAudio();
            if (audioContextRef.current?.state === 'running') {
                audioContextRef.current.suspend();
            }
        } else {
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
        }
    }, [props.isPlaying]);

    // Piano sampler playback
    const playNoteMock = useCallback((freq: number, startTime: number, duration: number, type: OscillatorType, volume: number) => {
        if (!audioContextRef.current || !pianoSamplesLoaded.current) return;

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const targetMidi = freqToMidi(freq);
        const nearestSampleMidi = findNearestSample(targetMidi);
        const sampleBuffer = pianoBuffersRef.current.get(nearestSampleMidi);

        if (!sampleBuffer) return;

        const semitoneDiff = targetMidi - nearestSampleMidi;
        const playbackRate = Math.pow(2, semitoneDiff / 12);

        const source = ctx.createBufferSource();
        source.buffer = sampleBuffer;
        source.playbackRate.value = playbackRate;

        const gainNode = ctx.createGain();
        gainNode.gain.value = volume * 4.0; // Boost volume (4x)

        source.connect(gainNode);

        // FREQUENCY SEPARATION: Band-stop filter for piano output
        // Cut mid-range (700Hz-1000Hz) where voice lives, keep bass + highs

        // LOW PATH: Keep bass (below 700Hz)
        const lowPassFilter = ctx.createBiquadFilter();
        lowPassFilter.type = 'lowpass';
        lowPassFilter.frequency.value = 700; // Only bass
        lowPassFilter.Q.value = 1.0;

        // HIGH PATH: Keep brightness (above 1000Hz)
        const highPassFilter = ctx.createBiquadFilter();
        highPassFilter.type = 'highpass';
        highPassFilter.frequency.value = 1000; // Only highs
        highPassFilter.Q.value = 1.0;

        // Merger node to combine low + high paths
        const mergerGain = ctx.createGain();
        mergerGain.gain.value = 1.0;

        // COMPRESSOR: Light thickening (reduced to avoid pumping)
        const pianoCompressor = ctx.createDynamicsCompressor();
        pianoCompressor.threshold.value = -20; // Raised from -30
        pianoCompressor.knee.value = 10;
        pianoCompressor.ratio.value = 3; // Reduced from 8
        pianoCompressor.attack.value = 0.01;
        pianoCompressor.release.value = 0.2;

        // LIMITER: Final safety catch to prevent clipping
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -1.0;
        limiter.knee.value = 0.0;
        limiter.ratio.value = 20.0; // Hard limiting
        limiter.attack.value = 0.001;
        limiter.release.value = 0.1;

        // Chain: Gain -> [LowPass + HighPass] -> Merger -> Compressor -> Limiter -> Out
        gainNode.connect(lowPassFilter);
        gainNode.connect(highPassFilter);
        lowPassFilter.connect(mergerGain);
        highPassFilter.connect(mergerGain);
        mergerGain.connect(pianoCompressor);
        pianoCompressor.connect(limiter);
        limiter.connect(ctx.destination);

        source.start(startTime);
        source.stop(startTime + duration); // Stop exactly at duration - no tail

        // Track source
        activeSourcesRef.current.push(source);
        source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        };
    }, []);

    // Metronome click (with band-stop filter to avoid voice detection)
    const playMetronomeClick = useCallback((startTime?: number) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const now = startTime || ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Use a frequency ABOVE the cut range (>1000Hz) for brightness
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, now); // Bright click above voice band

        // Louder, percussive envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1.0, now + 0.002); // Fast attack, 2x louder
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08); // Slightly longer decay

        // FREQUENCY SEPARATION: Band-stop filter (same as piano)
        // Cut mid-range (700Hz-1000Hz), keep bass + highs
        const lowPassFilter = ctx.createBiquadFilter();
        lowPassFilter.type = 'lowpass';
        lowPassFilter.frequency.value = 700;
        lowPassFilter.Q.value = 1.0;

        const highPassFilter = ctx.createBiquadFilter();
        highPassFilter.type = 'highpass';
        highPassFilter.frequency.value = 1000;
        highPassFilter.Q.value = 1.0;

        const mergerGain = ctx.createGain();
        mergerGain.gain.value = 1.0;

        // Chain: osc -> gain -> [lowPass + highPass] -> merger -> out
        osc.connect(gain);
        gain.connect(lowPassFilter);
        gain.connect(highPassFilter);
        lowPassFilter.connect(mergerGain);
        highPassFilter.connect(mergerGain);
        mergerGain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);

        activeSourcesRef.current.push(osc);
        osc.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== osc);
        };
    }, []);

    const handlePlayPause = () => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        props.onPlayPause();
    };

    const getAudioContext = () => audioContextRef.current;

    const [restartKey, setRestartKey] = useState(0);

    const handleRestart = () => {
        stopAllAudio();
        setRestartKey(prev => prev + 1);
        // Ensure we start playing again if we were paused, or just reset
        if (!internalIsPlaying) {
            props.onPlayPause();
        }
    };

    return (
        <div className="fixed inset-0 z-50">
            <ExerciseGameViewALT
                key={restartKey}
                exercise={props.exercise}
                vocalRange={props.vocalRange}
                userPitch={pitch?.frequency || null}
                centerSemitone={props.centerSemitone}
                visibleOctaves={props.visibleOctaves}
                isPlaying={internalIsPlaying}
                isPreviewing={props.isPreviewing}
                isExerciseComplete={props.isExerciseComplete}
                playNote={playNoteMock as any}
                playMetronomeClick={playMetronomeClick}
                onPlayPause={handlePlayPause}
                onStop={() => { stopMicrophone(); props.onStop(); }}
                {...(props.onRestart ? { onRestart: handleRestart } : {})}
                onPreview={props.onPreview}
                onComplete={props.onComplete}
                onNotePositionUpdate={props.onNotePositionUpdate || (() => { })}
                onBack={props.onBack}
                onEdit={props.onEdit}
                onRefine={props.onRefine}
                // Routine Support
                currentRoutine={props.currentRoutine}
                onNextInRoutine={props.onNextInRoutine}
                isFullscreen={props.isFullscreen}
                onToggleFullscreen={props.onToggleFullscreen}
                isExerciseFavorite={props.isExerciseFavorite}
                isRoutineFavorite={props.isRoutineFavorite}
                onToggleFavoriteExercise={props.onToggleFavoriteExercise}
                onToggleFavoriteRoutine={props.onToggleFavoriteRoutine}
                checkAudioBuffers={props.checkAudioBuffers}
                micGain={0}
                micActive={micActive}
                onToggleMic={micActive ? stopMicrophone : startMicrophone}
                getAudioContext={getAudioContext}
                currentTheme={props.currentTheme}
            />
        </div>
    );
};

export default ExerciseGameViewALTWrapper;
