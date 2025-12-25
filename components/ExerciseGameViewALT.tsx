import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Settings, Mic, Play, Pause, Volume2, VolumeX, MicOff, ChevronDown, ChevronUp, ChevronLeft, RotateCcw, Zap, Star } from 'lucide-react';
import { Exercise, VocalRange, Routine } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { getExercisePattern, getExerciseDurations, getExerciseBPM, getExerciseId, getExerciseChordIntervals, getExerciseChordRootOffsets, getExerciseAdvances } from '../exerciseUtils';

/**
 * Props interface for ExerciseGameViewALT
 * This component expects the parent to handle:
 * - Audio Context management
 * - Pitch detection (via userPitch prop)
 * - Note playback (via playNote callback)
 */
export interface ExerciseGameViewALTProps {
    // Data
    exercise: Exercise;
    vocalRange: VocalRange;
    userPitch: number | null;

    // Configuration
    centerSemitone: number;
    visibleOctaves: number;

    // State
    isPlaying: boolean;
    isPreviewing: boolean;
    isExerciseComplete: boolean;

    // Audio / Callbacks (ALT2 style - frequency-based with scheduled time)
    playNote: (freq: number, startTime: number, duration: number, type: OscillatorType, volume: number) => void;
    playMetronomeClick?: (startTime?: number) => void;
    onPlayPause: () => void;
    onStop: () => void;
    onRestart?: () => void;
    onPreview: () => void;
    onComplete: () => void;
    onNotePositionUpdate: (noteCenter: number | null) => void;
    onBack?: () => void;
    onRefine?: (exercise: Exercise, refinePrompt: string) => Promise<void>; // For AI-generated exercises

    // Routine Support
    currentRoutine: { routine: Routine; exerciseIndex: number } | null;
    onNextInRoutine: (() => void) | null;

    // UI State
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    isExerciseFavorite: boolean;
    isRoutineFavorite: boolean;
    onToggleFavoriteExercise: (id: string) => void;
    onToggleFavoriteRoutine: (id: string) => void;
    checkAudioBuffers: () => Promise<boolean>;

    // Microphone Control (standalone mode)
    micGain: number;
    micActive: boolean;
    onToggleMic: () => void;
    getAudioContext?: () => AudioContext | null;

    // Theme & Editing
    currentTheme?: any; // Should be Theme type
    onEdit?: () => void;
}

/**
 * UTILITIES & MATH HELPERS
 */
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getNote(frequency: number | null) {
    if (!frequency || frequency === -1) return { note: "-", cents: 0, octave: 0, midi: -1 };
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const midi = Math.round(noteNum) + 69;
    const note = noteStrings[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    const cents = Math.floor((noteNum - Math.round(noteNum)) * 100);
    return { note, octave, cents, midi };
}

function getNoteNameFromMidi(midi: number) {
    const note = noteStrings[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${note}${octave}`;
}

function getFrequency(midi: number) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

// Dynamic canvas theme based on app theme
const getCanvasTheme = (currentTheme?: any) => {
    const isDark = document.documentElement.classList.contains('dark');

    // Default colors (Violet/Fuchsia)
    const primary = isDark ? '#a78bfa' : '#7c3aed'; // violet-400 : violet-600
    const secondary = isDark ? '#f0abfc' : '#c026d3'; // fuchsia-400 : fuchsia-600

    // Override with currentTheme if available
    if (currentTheme) {
        // Extract colors from theme (assuming tailwind classes or hex values)
        // This is a simplification; ideally we'd parse the theme object properly
        // For now, we'll stick to the default logic but allow for future expansion
        // or if theme object has direct hex values.

        // If theme has specific hex codes for visualizer, use them
        if (currentTheme.visualizer && currentTheme.visualizer.length > 0) {
            // Use the first gradient color as primary
            // This is tricky without a full color parser, so we'll rely on CSS variables or classes if possible
            // But canvas needs HEX.
        }
    }

    if (isDark) {
        return {
            background: '#0f172a', // slate-900
            surface: '#1e293b', // slate-800
            gridLines: '#334155', // slate-700
            gridLabels: '#64748b', // slate-500
            primary: primary,
            secondary: secondary,
            success: '#6ee7b7', // emerald-400
            text: '#f1f5f9', // slate-100
            textSubtle: '#94a3b8', // slate-400
            notePreview: 'rgba(255, 255, 255, 0.05)',
            pitchLine: '#a78bfa' // violet-400
        };
    }

    return {
        background: '#f1f5f9', // slate-100
        surface: '#e2e8f0', // slate-200
        gridLines: '#cbd5e1', // slate-300
        gridLabels: '#94a3b8', // slate-400
        primary: '#8b5cf6', // violet-600
        secondary: '#d946ef', // fuchsia-500
        success: '#34d399', // emerald-400
        text: '#0f172a', // slate-900
        textSubtle: '#64748b', // slate-500
        notePreview: 'rgba(0, 0, 0, 0.05)',
        pitchLine: '#8b5cf6' // violet-600
    };
};

/**
 * COMPONENT: ExerciseGameViewALT
 */
export default function ExerciseGameViewALT(props: ExerciseGameViewALTProps) {
    const { t } = useTranslation();

    // Destructure props
    const {
        exercise,
        vocalRange,
        userPitch,
        visibleOctaves,
        isPlaying,
        micGain,
        playNote,
        onPlayPause,
        onStop,
        onBack,
        onRefine,
        currentRoutine,
        isExerciseFavorite,
        isRoutineFavorite,
        onToggleFavoriteExercise,
        onToggleFavoriteRoutine
    } = props;

    // Safety check: ensure exercise exists and has required data
    if (!exercise) {
        console.error('ExerciseGameViewALT: No exercise provided!');
        return <div className="flex items-center justify-center h-screen text-white">No exercise data</div>;
    }

    // Use default canvas theme
    const canvasTheme = getCanvasTheme(props.currentTheme);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<number[]>([]);
    const userPitchRef = useRef<{ frequency: number; confidence: number } | null>(null);
    const lastPitchPositionRef = useRef<{ x: number; y: number } | null>(null); // Store last position

    // Local UI State
    const [showSettings, setShowSettings] = useState(false);
    const [showEngineSettings, setShowEngineSettings] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
    const [cursorRatio, setCursorRatio] = useState(0.2);
    const isDraggingRef = useRef(false);
    const [isMetronomeOn, setIsMetronomeOn] = useState(true);
    const [showMicPermissionDialog, setShowMicPermissionDialog] = useState(false); // Dialog removed - mic requested automatically by system
    const [showRefineInput, setShowRefineInput] = useState(false); // For AI exercise refinement
    const [refinePrompt, setRefinePrompt] = useState(''); // Refine input text

    // Engine Params (Local to this view)
    const [localParams, setLocalParams] = useState({
        historyScale: 1.0,
        verticalZoom: 1.5, // Default 1.5 octaves visible (closer zoom)
        horizontalZoom: 3.0, // 3 seconds visible
        tempoMultiplier: 1.0 // 1.0 = normal speed, 0.5 = half speed, 2.0 = double speed
    });



    // Note: vocalRange.start.semitone is relative to C4 (semitone 0 = C4 = MIDI 60)
    // E3 = -9 semitones = MIDI 60 + (-9) = MIDI 51
    const [currentKeyMidi, setCurrentKeyMidi] = useState(() => {
        const semitone = vocalRange.start?.semitone ?? -9; // Default E3
        return 60 + semitone; // Convert to MIDI
    });

    // Game Logic Refs
    const notesRef = useRef<any[]>([]);
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    // Fix: Track isPlaying in a ref so callbacks always see the latest value
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // Fix: Update currentKeyMidi when vocalRange changes to ensure camera starts at correct position
    useEffect(() => {
        const semitone = vocalRange.start?.semitone ?? -9;
        // Convert relative semitone to absolute MIDI (same logic as initial state)
        // If semitone is small (relative), add 60. If large (absolute), use as is.
        // vocalRange.start.semitone is usually relative to C4 (0).
        const midi = Math.abs(semitone) < 36 ? 60 + semitone : semitone;
        setCurrentKeyMidi(midi);
    }, [vocalRange.start?.semitone]);

    // Visual Effects Refs
    interface Particle {
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
        color: string;
        size: number;
    }
    const particlesRef = useRef<Particle[]>([]);
    const lastHitTimeRef = useRef(0);

    // Visual Smoothing Ref
    const visualPitchRef = useRef(0); // Stores the interpolated pitch for smooth drawing

    // Cleanup: Stop audio when component unmounts
    useEffect(() => {
        return () => {
            // Clear all timeouts
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current = [];
            // Stop playback - only on actual unmount, not when onStop callback changes
            // onStop(); // REMOVED: This was causing the app to navigate back on restart
        };
    }, []); // Empty deps - only run on mount/unmount


    // Initialize camera based on vocal range - memoized to prevent infinite loops
    const initialCameraRange = useMemo(() => {
        // Fix: Convert relative semitone (relative to C4) to absolute MIDI
        // vocalRange.start.semitone is relative to C4 (semitone 0 = C4 = MIDI 60)
        // E.g., -9 = E3 = MIDI 51, so we need: 60 + semitone
        let startMidi = vocalRange.start?.semitone != null ? 60 + vocalRange.start.semitone : 48;
        let endMidi = vocalRange.end?.semitone != null ? 60 + vocalRange.end.semitone : 72;


        // Check if values are valid (reasonable MIDI range)
        if (startMidi < 36 || startMidi > 84) {
            startMidi = 48;
        }
        if (endMidi < 48 || endMidi > 96) {
            endMidi = 72;
        }

        // Fix: Center camera on the START of the exercise (plus offset) to avoid "swoop"
        // This matches the dynamicCenterMidi logic in the draw loop (currentKeyMidi + 5)
        const centerMidi = startMidi + 5;
        const octavesVisible = 2.0; // Always use 2 octaves as default
        const freqRatio = Math.pow(2, octavesVisible / 2);
        const centerFreq = getFrequency(centerMidi);



        return {
            minF: centerFreq / freqRatio,
            maxF: centerFreq * freqRatio
        };
    }, [vocalRange.start?.semitone, vocalRange.end?.semitone, visibleOctaves]); // Only recalculate when these change

    const cameraRef = useRef<{ minF: number; maxF: number }>(initialCameraRange);
    const startTimeRef = useRef<number>(0);

    // --- AUDIO HELPERS ---
    const stopAllLocalEvents = useCallback(() => {
        timeoutsRef.current.forEach(id => clearTimeout(id));
        timeoutsRef.current = [];
    }, []);

    const pausedTimeRef = useRef<number>(0);
    const totalPausedTimeRef = useRef<number>(0);
    const pauseStartTimeRef = useRef<number>(0);
    // Fix: Track the next scheduled sequence so we can restart it on resume
    const nextScheduleStateRef = useRef<{ rootMidi: number, anchorTime: number } | null>(null);
    // Track scheduled chords for resume (gameTime-based startTime and endTime)
    const scheduledChordsRef = useRef<Array<{ rootMidi: number, startTime: number, endTime: number, pattern: number[] }>>([]);

    useEffect(() => {
        if (!isPlaying) {
            // Pausing
            pauseStartTimeRef.current = performance.now();
            stopAllLocalEvents();
            setShowControls(true);
        } else {
            // Playing
            // If we have notes AND pauseStartTimeRef is set, we're resuming from a real pause
            if (pauseStartTimeRef.current > 0 && notesRef.current.length > 0) {
                const pauseDuration = performance.now() - pauseStartTimeRef.current;
                totalPausedTimeRef.current += pauseDuration;
                pauseStartTimeRef.current = 0;

                // Don't restart! Just resume loop.
                // The visual loop continues because isPlaying is true.

                // Fix: Reschedule the next sequence if it was pending
                if (nextScheduleStateRef.current) {
                    const { rootMidi, anchorTime } = nextScheduleStateRef.current;
                    const now = getGameTime();
                    // Calculate how much time is left until the scheduled anchor time
                    // Note: getGameTime() already accounts for the new totalPausedTimeRef
                    const timeToNextGenMs = (anchorTime - getNoteStreamLeadTime() - now) * 1000;
                    const safeDelayMs = Math.max(0, timeToNextGenMs);

                    console.log('Resuming: rescheduling next sequence', { safeDelayMs, rootMidi, anchorTime });

                    // Fix: Reschedule currently active or future notes that were silenced by pause
                    const audioCtx = props.getAudioContext?.();
                    if (audioCtx) {
                        const now = getGameTime();
                        console.log('Rescheduling active notes and metronome...', { now, noteCount: notesRef.current.length });

                        // Reschedule notes
                        notesRef.current.forEach(note => {
                            const endTime = note.startTime + note.duration;
                            // If note ends in the future, it needs to be played
                            if (endTime > now) {
                                let playStartTime = audioCtx.currentTime;
                                let playDuration = note.duration;

                                if (note.startTime > now) {
                                    // Future note: schedule with delay
                                    playStartTime += (note.startTime - now);
                                } else {
                                    // Active note: play remainder immediately
                                    playDuration = endTime - now;
                                }

                                // Apply articulation (same as createNotes)
                                const articulatedDuration = playDuration * 0.95;
                                const waveType = note.type === 'preview' ? 'triangle' : 'sine';
                                const volume = 1.0;

                                // Add small safety buffer for immediate notes to avoid glitching
                                if (playStartTime < audioCtx.currentTime + 0.01) {
                                    playStartTime = audioCtx.currentTime + 0.01;
                                }

                                props.playNote(note.freq, playStartTime, articulatedDuration, waveType, volume);
                            }
                        });

                        // Reschedule metronome clicks (DAW-style: on the same timeline as notes)
                        if (isMetronomeOn && props.playMetronomeClick) {
                            const bpm = getExerciseBPM(exercise);
                            const secondsPerBeat = 60 / bpm;
                            const beatDur = secondsPerBeat / localParams.tempoMultiplier;

                            // Find the latest note end time to know how long to schedule clicks
                            let latestNoteEnd = now;
                            notesRef.current.forEach(note => {
                                const noteEnd = note.startTime + note.duration;
                                if (noteEnd > latestNoteEnd) {
                                    latestNoteEnd = noteEnd;
                                }
                            });

                            // Calculate timing constants (same as startGame)
                            const timeWindow = 5.0 * localParams.historyScale;
                            const leadTime = timeWindow * (1 - cursorRatio);
                            const anchorTimeBase = Math.max(leadTime, 4 * beatDur);
                            const firstClickTime = anchorTimeBase - 4 * beatDur;

                            // Schedule clicks from current time to latest note end
                            // Find which beat we're at now
                            const currentBeat = Math.floor((now - firstClickTime) / beatDur);
                            // Find which beat the latest note ends at
                            const lastBeat = Math.ceil((latestNoteEnd - firstClickTime) / beatDur);

                            const AUDIO_LATENCY_COMPENSATION = 0.05;

                            console.log('Rescheduling metronome clicks', { currentBeat, lastBeat, now, latestNoteEnd });

                            for (let beatIndex = currentBeat; beatIndex <= lastBeat; beatIndex++) {
                                const beatGameTime = firstClickTime + beatIndex * beatDur;
                                // Only schedule future beats
                                if (beatGameTime > now) {
                                    const audioScheduleTime = audioCtx.currentTime + (beatGameTime - now) + AUDIO_LATENCY_COMPENSATION;
                                    if (audioScheduleTime >= audioCtx.currentTime) {
                                        props.playMetronomeClick(audioScheduleTime);
                                    }
                                }
                            }
                        }

                        // Chords are now embedded in the exercise sequence
                        // They get rescheduled automatically with the notes above
                    }

                    scheduleEvent(() => {
                        console.log('Resume event firing: calling scheduleNextSequence');
                        if (!isPlayingRef.current) return;
                        setCurrentKeyMidi(rootMidi);
                        scheduleNextSequence(rootMidi, anchorTime);
                    }, safeDelayMs);
                } else {
                    console.log('Resume: No pending schedule state found');
                }
            } else {
                // First start (no notes yet) - always call startGame
                console.log('First start or restart');
                pauseStartTimeRef.current = 0; // Reset to avoid confusion
                nextScheduleStateRef.current = null; // Clear any stale state
                startGame();
            }
        }
        return () => stopAllLocalEvents();
    }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps



    // Update camera when vocal range changes
    useEffect(() => {
        cameraRef.current = initialCameraRange;
    }, [initialCameraRange]);

    // Handle Resize with DPR using ResizeObserver for accurate initial sizing
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateDimensions = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setDimensions(prev => {
                    const newWidth = rect.width * dpr;
                    const newHeight = rect.height * dpr;
                    if (Math.abs(prev.width - newWidth) < 1 && Math.abs(prev.height - newHeight) < 1) {
                        return prev;
                    }
                    return { width: newWidth, height: newHeight };
                });
            }
        };

        // Use ResizeObserver for accurate detection
        const resizeObserver = new ResizeObserver(() => {
            updateDimensions();
        });
        resizeObserver.observe(container);

        // Also update on initial mount with a small delay to ensure layout is complete
        requestAnimationFrame(() => {
            updateDimensions();
        });

        return () => resizeObserver.disconnect();
    }, []);

    // --- CANVAS INTERACTION (Removed drag functionality) ---
    const getCanvasCoords = (e: MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if ((e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
            clientX = (e as TouchEvent).touches[0].clientX;
            clientY = (e as TouchEvent).touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    // --- CONTROL VISIBILITY ---
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toggleControls = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    }, [isPlaying]);

    useEffect(() => {
        const handleInteraction = (e: Event) => {
            const target = e.target as HTMLElement;
            const isControlBtn = target.closest('.btn-interactive');
            if (e.target === canvasRef.current || isControlBtn) toggleControls();
        };
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction, { passive: true });
        toggleControls();
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [toggleControls]);

    useEffect(() => {
        // Only enable spacebar on desktop (non-touch devices)
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (isTouchDevice) {
            // Skip spacebar handler on mobile to avoid interfering with keyboard input
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                props.onPlayPause();
                toggleControls();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [props.onPlayPause, toggleControls]);

    // --- NOTE GENERATION LOGIC ---
    const getGameTime = () => {
        let currentTotalPaused = totalPausedTimeRef.current;
        // If currently paused, add the time since pause started
        if (!isPlaying && pauseStartTimeRef.current > 0) {
            currentTotalPaused += (performance.now() - pauseStartTimeRef.current);
        }
        return (performance.now() - startTimeRef.current - currentTotalPaused) / 1000;
    };

    const getNoteStreamLeadTime = useCallback(() => {
        const timeWindow = 5.0 * localParams.historyScale;
        return timeWindow * (1 - cursorRatio);
    }, [localParams.historyScale, cursorRatio]);


    const createNotes = useCallback((rootMidi: number, anchorTime: number, type: 'preview' | 'target', scheduleCountIn: boolean = false, direction: number = 1) => {
        const pattern = getExercisePattern(exercise);

        // Get BPM using utility function
        const bpm = getExerciseBPM(exercise);

        // Calculate seconds per beat: (60 seconds / BPM) = seconds per beat
        const secondsPerBeat = 60 / bpm;

        // Apply tempo multiplier from settings
        const beatDur = secondsPerBeat / localParams.tempoMultiplier;

        // Get durations array using utility function
        const durations = getExerciseDurations(exercise);
        const hasDurationsArray = durations && durations.length === pattern.length && durations.length > 0;

        // Get default duration in beats (backward compatibility: if > 10, assume it's old ms format)
        let defaultDurationBeats = 1;
        if (durations && durations.length > 0) {
            defaultDurationBeats = durations[0];
        }
        if (defaultDurationBeats > 10) {
            // Old format was in ms, convert to beats assuming 90 BPM
            defaultDurationBeats = (defaultDurationBeats / 1000) / (60 / 90);
        }

        // Apply tempo multiplier
        const effectiveSecondsPerBeat = secondsPerBeat / localParams.tempoMultiplier;

        const notes: any[] = [];
        let currentTime = 0; // Track cumulative time in seconds

        // Get AudioContext for proper timing
        const audioCtx = props.getAudioContext?.();
        const currentGameTime = getGameTime();
        const delayUntilSequenceStarts = anchorTime - currentGameTime;

        // Ensure we don't schedule in the past
        const safeDelay = Math.max(0, delayUntilSequenceStarts);
        const audioStartTime = audioCtx ? audioCtx.currentTime + safeDelay : 0;

        // Audio Scheduling with latency compensation - used for BOTH notes and metronome
        const AUDIO_LATENCY_COMPENSATION = 0.05; // 50ms

        // --- METRONOME: Schedule clicks on the same timeline as notes ---
        if (audioCtx && isMetronomeOn && props.playMetronomeClick) {
            // Calculate total duration first to know how many beats we need
            let totalNoteDuration = 0;
            pattern.forEach((_, i) => {
                let durationBeats = defaultDurationBeats;
                if (hasDurationsArray) {
                    durationBeats = durations[i];
                    if (durationBeats > 10) {
                        durationBeats = (durationBeats / 1000) / (60 / 90);
                    }
                }
                totalNoteDuration += durationBeats * effectiveSecondsPerBeat;
            });

            // Schedule count-in clicks (4 beats before anchorTime) if requested
            if (scheduleCountIn) {
                for (let i = 4; i >= 1; i--) {
                    const clickAudioTime = audioStartTime - (i * beatDur) + AUDIO_LATENCY_COMPENSATION;
                    if (clickAudioTime >= audioCtx.currentTime) {
                        props.playMetronomeClick(clickAudioTime);
                    }
                }
            }

            // Schedule clicks during the notes
            // Click at the start of each beat that overlaps with the notes
            const totalBeats = Math.ceil(totalNoteDuration / beatDur);
            for (let beatIndex = 0; beatIndex < totalBeats; beatIndex++) {
                const clickAudioTime = audioStartTime + (beatIndex * beatDur) + AUDIO_LATENCY_COMPENSATION;
                if (clickAudioTime >= audioCtx.currentTime) {
                    props.playMetronomeClick(clickAudioTime);
                }
            }
        }

        // --- NOTES AND CHORDS: Schedule each event ---
        const chordIntervals = getExerciseChordIntervals(exercise);
        const chordRootOffsets = getExerciseChordRootOffsets(exercise);
        const advances = getExerciseAdvances(exercise);

        pattern.forEach((semitoneOffset, i) => {
            // Get duration for this specific event in beats (audio length)
            let durationBeats = defaultDurationBeats;
            if (hasDurationsArray) {
                durationBeats = durations[i];
                // Handle old ms format if present (old format used 500+ms values)
                // Only convert if > 100 to avoid converting valid beat counts like 12
                if (durationBeats > 100) {
                    durationBeats = (durationBeats / 1000) / (60 / 90);
                }
            }

            // Get advance for this event (timeline progression, defaults to duration)
            let advanceBeats = durationBeats;
            if (advances && advances[i] !== undefined) {
                advanceBeats = advances[i];
            }

            // Convert beats to seconds
            const noteDurationSeconds = durationBeats * effectiveSecondsPerBeat;
            const advanceSeconds = advanceBeats * effectiveSecondsPerBeat;
            const absoluteHitTime = anchorTime + currentTime;
            const audioScheduleTime = audioStartTime + currentTime + AUDIO_LATENCY_COMPENSATION;

            // Check if this is a chord event
            if (semitoneOffset === -2 && chordIntervals && chordIntervals[i]) {
                // Play chord - all intervals simultaneously
                const intervals = chordIntervals[i];
                // Apply root offset for transition chords, multiplied by direction
                // (e.g., rootOffset:1 with direction:1 = +1, rootOffset:1 with direction:-1 = -1)
                const rootOffset = chordRootOffsets && chordRootOffsets[i] ? chordRootOffsets[i] * direction : 0;
                const chordRoot = rootMidi + rootOffset;

                if (intervals && audioCtx) {
                    intervals.forEach(interval => {
                        const chordMidi = chordRoot + interval;
                        const chordFreq = getFrequency(chordMidi);
                        playNote(chordFreq, audioScheduleTime, noteDurationSeconds, 'sine', 0.25);
                    });
                }
                // Chords don't get added to visual notes array
            } else if (semitoneOffset === -1) {
                // Rest - no audio, but advance time
                // Rests don't get added to visual notes array
            } else if (semitoneOffset >= 0) {
                // Regular note
                const midi = rootMidi + semitoneOffset;
                const freq = getFrequency(midi);

                const waveType: OscillatorType = type === 'preview' ? 'triangle' : 'sine';
                const volume = 1.0; // Max volume for mobile

                // Play the note with articulation (shorter than full beat for clarity)
                const playDuration = noteDurationSeconds * 0.95; // 95% for smoother legato sound

                if (audioCtx) {
                    playNote(freq, audioScheduleTime, playDuration, waveType, volume);
                }

                notes.push({
                    id: Math.random(),
                    midi,
                    freq,
                    startTime: absoluteHitTime,
                    duration: noteDurationSeconds, // Visual duration = full beat duration
                    type: type,
                    hit: false
                });
            }

            // Advance time by the ADVANCE value (may differ from duration for overlaps)
            currentTime += advanceSeconds;
        });


        return { notes, totalDuration: currentTime };
    }, [exercise, playNote, props, localParams.tempoMultiplier, isMetronomeOn]);

    const scheduleEvent = (callback: () => void, delayMs: number) => {
        // Fix: Use ref to check latest isPlaying state
        if (!isPlayingRef.current) return;
        const timeoutId = setTimeout(callback, delayMs);
        timeoutsRef.current.push(timeoutId);
    };

    // Helper: Validate and sanitize MIDI range
    const sanitizeMidiRange = useCallback((startMidi: number | undefined, endMidi: number | undefined) => {
        let start = startMidi || 48; // Default to C3
        let end = endMidi || 72;     // Default to C5

        // Ensure start is within reasonable bounds (C2 to C6)
        if (start < 36) {
            start = 48;
        }
        if (start > 84) {
            start = 60;
        }

        // Ensure end is within reasonable bounds
        if (end < 48) {
            end = 72;
        }
        if (end > 96) {
            end = 84;
        }

        // Ensure end > start
        if (end <= start) {
            start = 48;
            end = 72;
        }

        return { start, end };
    }, []);

    // Helper function to play a chord (triad) - MUST BE BEFORE scheduleNextSequence
    const playChord = useCallback((rootMidi: number, startTime: number, duration: number, pattern: number[]) => {
        // Determine if exercise uses minor third (for minor chord quality)
        const hasMinorThird = pattern.some(semitone => semitone === 3);
        const thirdInterval = hasMinorThird ? 3 : 4; // Minor 3rd or Major 3rd

        // Play root, third, and fifth
        playNote(getFrequency(rootMidi), startTime, duration, 'sine', 0.35);
        playNote(getFrequency(rootMidi + thirdInterval), startTime, duration, 'sine', 0.35);
        playNote(getFrequency(rootMidi + 7), startTime, duration, 'sine', 0.35);
    }, [playNote]);

    // Direction ref for ascending/descending progression
    const directionRef = useRef(1); // 1 = ascending, -1 = descending
    const isLastSequenceScheduledRef = useRef(false);
    const currentChordNodesRef = useRef<any[]>([]);

    const scheduleNextSequence = useCallback((rootMidi: number, sequenceStartTime: number) => {
        console.log('scheduleNextSequence called', { rootMidi, sequenceStartTime, isPlaying: isPlayingRef.current });
        // Fix: Use ref to check latest isPlaying state
        if (!isPlayingRef.current) return;

        const audioCtx = props.getAudioContext?.();
        if (!audioCtx) return;

        const now = getGameTime();
        const bpm = getExerciseBPM(exercise);
        const beatDur = (60 / bpm) / localParams.tempoMultiplier;

        // Detect chord quality from exercise intervals  
        const pattern = getExercisePattern(exercise);
        const noteSemitones = pattern.filter(s => s > 0);

        // Create and schedule the sequence (chords are now embedded in the sequence)
        // Pass direction so transition chords follow the ascending/descending pattern
        const { notes, totalDuration } = createNotes(rootMidi, sequenceStartTime, 'target', false, directionRef.current);
        notesRef.current = [...notesRef.current, ...notes];

        // Since chords are now embedded in the sequence, totalDuration already includes
        // the intro chord, notes, and transition chords. No extra padding needed.
        const nextSequenceAnchorTime = sequenceStartTime + totalDuration;

        const maxPatternInterval = Math.max(...noteSemitones);

        // Use sanitized range
        const { start: minMidi, end: maxMidi } = sanitizeMidiRange(
            vocalRange.start?.semitone,
            vocalRange.end?.semitone
        );

        let nextRootMidi = rootMidi + directionRef.current;
        let shouldStop = false;

        if (directionRef.current === 1) {
            const projectedPeak = nextRootMidi + maxPatternInterval;
            if (projectedPeak > maxMidi) {
                directionRef.current = -1;
                nextRootMidi = rootMidi - 1;
            }
        }

        if (directionRef.current === -1) {
            if (nextRootMidi < minMidi) {
                shouldStop = true;
            }
        }

        const willBeLastSequence = shouldStop;

        if (willBeLastSequence && !isLastSequenceScheduledRef.current) {
            isLastSequenceScheduledRef.current = true;
            const completionDelay = (nextSequenceAnchorTime - now) * 1000;
            scheduleEvent(() => {
                if (!isPlaying) return;
                stopAllLocalEvents();
                props.onComplete();
            }, Math.max(0, completionDelay));

            return;
        } else if (isLastSequenceScheduledRef.current) {
            return;
        }

        // No separate chord scheduling - chords are embedded in exercise

        const timeToNextGenMs = (nextSequenceAnchorTime - getNoteStreamLeadTime() - now) * 1000;
        const safeDelayMs = Math.max(0, timeToNextGenMs);

        // Fix: Save state before scheduling
        nextScheduleStateRef.current = {
            rootMidi: nextRootMidi,
            anchorTime: nextSequenceAnchorTime
        };

        scheduleEvent(() => {
            // Fix: Use ref to check latest isPlaying state
            if (!isPlayingRef.current) return;
            setCurrentKeyMidi(nextRootMidi);
            scheduleNextSequence(nextRootMidi, nextSequenceAnchorTime);
        }, safeDelayMs);
    }, [isPlaying, vocalRange, exercise, getNoteStreamLeadTime, createNotes, props, sanitizeMidiRange, localParams.tempoMultiplier, playNote, stopAllLocalEvents]);

    // Metronome clicks are now scheduled inline with notes in createNotes()
    // This ensures they're on the exact same timeline - like a DAW.
    // No separate metronome loop needed!

    const startGame = () => {

        notesRef.current = [];
        stopAllLocalEvents();

        // Reset completion tracking refs
        isLastSequenceScheduledRef.current = false;
        directionRef.current = 1; // Reset to ascending

        // Reset timing refs for fresh start
        totalPausedTimeRef.current = 0;
        pauseStartTimeRef.current = 0;

        startTimeRef.current = performance.now();
        const now = 0;
        const leadTime = getNoteStreamLeadTime();

        // Get BPM and calculate beat duration (same as createNotes)
        const bpm = getExerciseBPM(exercise);
        const secondsPerBeat = 60 / bpm;
        const beatDur = secondsPerBeat / localParams.tempoMultiplier;

        // Sanitize the vocal range
        const { start: startKey, end: endKey } = sanitizeMidiRange(
            vocalRange.start?.semitone,
            vocalRange.end?.semitone
        );


        setCurrentKeyMidi(startKey);

        const anchorTime = Math.max(leadTime, 4 * beatDur);

        // Get exercise pattern for chord quality determination
        const pattern = getExercisePattern(exercise);

        // Get AudioContext for scheduling
        const audioCtx = props.getAudioContext?.();

        // Play intro chord for the FIRST sequence - sustain through the preview notes
        // This is needed because there's no previous "next chord" to serve as intro
        if (audioCtx) {
            const hasMinorThird = pattern.some((s: number) => s === 3);
            const thirdInterval = hasMinorThird ? 3 : 4;
            const introChordTime = audioCtx.currentTime + anchorTime - (2 * beatDur);
            // Sustain intro chord through the preview notes (12 beats total)
            const introChordDur = 12 * beatDur;

            // Play chord (root, third, fifth) - background support
            props.playNote(getFrequency(startKey), introChordTime, introChordDur, 'sine', 0.25);
            props.playNote(getFrequency(startKey + thirdInterval), introChordTime, introChordDur, 'sine', 0.25);
            props.playNote(getFrequency(startKey + 7), introChordTime, introChordDur, 'sine', 0.25);
        }

        // Create preview notes WITH count-in metronome clicks (4 beats before)
        // Pass direction=0 so the "next chord" stays in same key (first target repeats preview key)
        const previewData = createNotes(startKey, anchorTime, 'preview', true, 0);
        notesRef.current = [...notesRef.current, ...previewData.notes];

        // The sequence includes notes + transition chords, so firstTargetHitTime
        // is simply anchorTime + totalDuration (no extra gap needed)
        const firstTargetHitTime = anchorTime + previewData.totalDuration;

        scheduleNextSequence(startKey, firstTargetHitTime);
        toggleControls();
    };

    // Clear events on pause
    useEffect(() => {
        if (!isPlaying) {
            stopAllLocalEvents();
        }
    }, [isPlaying, stopAllLocalEvents]);

    // Ref for userPitch to avoid re-running effect loop
    useEffect(() => {
        // Filter out noise: only accept frequencies above 100 Hz (valid vocal range)
        // Increased from 80 Hz to reduce low-frequency artifacts
        if (userPitch && userPitch > 100) {
            userPitchRef.current = { frequency: userPitch, confidence: 1 };
        } else {
            userPitchRef.current = null;
        }
    }, [userPitch]);

    // --- MAIN DRAW LOOP ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        const extendedGrid = [];
        for (let m = 36; m <= 96; m++) {
            const midiIndex = m % 12;
            const isNatural = [0, 2, 4, 5, 7, 9, 11].includes(midiIndex);
            extendedGrid.push({ midi: m, freq: getFrequency(m), isNatural });
        }

        let animationFrameId: number;
        // Use horizontal zoom from settings (default 2 seconds visible)
        const pixelsPerSecond = (width / localParams.horizontalZoom) / localParams.historyScale;

        const loop = () => {
            try {
                // --- PITCH & SMOOTHING CALCULATION (Moved to top of loop) ---
                const currentPitchFreq = userPitchRef.current?.frequency || -1;
                const hasSignalNow = currentPitchFreq > 50 && currentPitchFreq < 2000;

                // VISUAL SMOOTHING (SLEW RATE LIMITING + LERP)
                if (hasSignalNow) {
                    if (visualPitchRef.current <= 0) {
                        visualPitchRef.current = currentPitchFreq;
                    } else {
                        // 1. Calculate target diff
                        const diff = currentPitchFreq - visualPitchRef.current;

                        // 2. Slew Rate Limiting (Max change per frame)
                        // Limit to ~3% change per frame to STRICTLY prevent teleporting
                        // This forces a visible slide for any large jump
                        const maxChangeRatio = 0.03;
                        const maxChange = visualPitchRef.current * maxChangeRatio;

                        const clampedDiff = Math.max(-maxChange, Math.min(maxChange, diff));

                        // 3. Apply Lerp to the CLAMPED diff
                        // Use 0.5 for responsiveness
                        visualPitchRef.current += clampedDiff * 0.5;
                    }
                }

                const currentPitch = currentPitchFreq; // Alias for existing code compatibility
                const hasUserSignal = hasSignalNow;    // Alias for existing code compatibility
                const cursorX = width * cursorRatio;

                // Camera Logic - STATIC (Only follows exercise/key)
                const dynamicCenterMidi = currentKeyMidi + 5;
                // REMOVED: Auto-adjustment based on user pitch
                // if (!isPlaying && hasUserSignal) {
                //     const { midi } = getNote(currentPitch);
                //     if (midi > 0) dynamicCenterMidi = midi;
                // }

                const targetCenterFreq = getFrequency(dynamicCenterMidi);
                const octavesVisible = localParams.verticalZoom;
                const freqRatio = Math.pow(2, octavesVisible / 2);
                const targetMinF = targetCenterFreq / freqRatio;
                const targetMaxF = targetCenterFreq * freqRatio;

                // Smoother camera easing (reduced from 0.1 to 0.05)
                cameraRef.current.minF += (targetMinF - cameraRef.current.minF) * 0.05;
                cameraRef.current.maxF += (targetMaxF - cameraRef.current.maxF) * 0.05;

                const { minF, maxF } = cameraRef.current;

                const getLogY = (f: number) => {
                    const safeF = Math.max(1, f);
                    const safeMin = Math.max(1, minF);
                    const safeMax = Math.max(1, maxF);
                    if (safeMax === safeMin) return height / 2;
                    const normalized = (Math.log(safeF) - Math.log(safeMin)) / (Math.log(safeMax) - Math.log(safeMin));
                    return height - (normalized * height);
                }

                // Calculate lane height (approximate)
                const y1 = getLogY(440);
                const y2 = getLogY(440 * Math.pow(2, 1 / 12));
                const laneHeight = Math.abs(y1 - y2);


                // Time calculation: Always use real time for pitch trail scrolling
                // This ensures the trail moves even in Test Mode (when isPlaying = false)
                const VISUAL_LATENCY = 0.08; // 80ms delay for visuals to match audio
                const rawTime = getGameTime(); // Game time (pauses when game pauses)
                const now = rawTime - VISUAL_LATENCY; // Game time for NOTES

                // Visual time for TRAIL (always running)
                const visualNow = performance.now() / 1000;

                // Clear Canvas
                ctx.clearRect(0, 0, width, height);

                // Draw Grid
                extendedGrid.forEach(item => {
                    const y = getLogY(item.freq);

                    ctx.strokeStyle = canvasTheme.gridLines;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();

                    if (item.isNatural) {
                        const { note: gridNote, octave: gridOctave } = getNote(item.freq);
                        ctx.fillStyle = canvasTheme.gridLabels;
                        ctx.font = '12px monospace';
                        ctx.fillText(`${gridNote}${gridOctave}`, 5, y - 2);
                    }
                });

                // Update pitch history for trail visualization (do this every frame)
                if (hasSignalNow && currentPitchFreq) {
                    // REMOVED DOWNSAMPLING: For short trail (20 points), we want maximum smoothness
                    // So we record every frame.
                    historyRef.current.push({ frequency: visualPitchRef.current, time: visualNow });

                    // Keep only last 2 seconds of history
                    const cutoffTime = visualNow - 2;
                    while (historyRef.current.length > 0 && historyRef.current[0].time < cutoffTime) {
                        historyRef.current.shift();
                    }
                }

                // Draw Notes (show even when paused)
                if (isPlaying || notesRef.current.length > 0) {
                    // Only filter out old notes if playing
                    if (isPlaying) {
                        notesRef.current = notesRef.current.filter(note => {
                            const deltaT = note.startTime - now;
                            const noteWidth = note.duration * pixelsPerSecond;
                            const noteX = cursorX + (deltaT * pixelsPerSecond);
                            return (noteX + noteWidth) > -100;
                        });
                    }

                    notesRef.current.forEach(note => {
                        const deltaT = note.startTime - now;
                        const noteWidth = note.duration * pixelsPerSecond;
                        const noteX = cursorX + (deltaT * pixelsPerSecond);
                        const noteY = getLogY(note.freq);

                        if (noteX > width) return;

                        const isCrossingCursor = noteX <= cursorX && (noteX + noteWidth) >= cursorX;
                        const isPast = (noteX + noteWidth) < cursorX;

                        // Only update hit detection when playing
                        if (isPlaying && note.type === 'target' && isCrossingCursor && hasUserSignal) {
                            const { midi } = getNote(currentPitch);
                            if (Math.abs(midi - note.midi) < 0.6) {
                                note.hit = true;
                            }
                        }

                        // Calculate progress (0 = far right, 1 = at cursor)
                        const distanceToCursor = noteX - cursorX;
                        const maxDistance = width - cursorX;
                        const progress = Math.max(0, Math.min(1, 1 - (distanceToCursor / maxDistance)));

                        // Calculate how much of the note has crossed the cursor (for gradient within note)
                        let crossProgress = 0;
                        if (isCrossingCursor) {
                            const crossedAmount = cursorX - noteX;
                            crossProgress = Math.max(0, Math.min(1, crossedAmount / noteWidth));
                        } else if (isPast) {
                            crossProgress = 1;
                        }

                        // Dynamic Styling
                        let fillColor = canvasTheme.primary;
                        let strokeColor = canvasTheme.primary;
                        let glowColor = null;
                        const label = null;
                        let useGradient = false;
                        let gradientColors = null;

                        if (note.type === 'preview') {
                            fillColor = 'rgba(150, 160, 180, 0.2)';
                            strokeColor = 'rgba(150, 160, 180, 0.4)';
                            ctx.setLineDash([4, 4]);
                            // Don't set label here - we'll draw it once for all preview notes
                        } else if (note.type === 'target') {
                            ctx.setLineDash([]);

                            if (note.hit) {
                                // Hit: Simple emerald green gradient
                                useGradient = true;
                                gradientColors = { start: '#34D399', end: '#10B981' };
                                strokeColor = '#059669';
                                glowColor = '#34D399';
                            } else if (isCrossingCursor) {
                                // Active: Gradient from violet to brighter violet based on cross progress
                                useGradient = true;
                                const violetStart = '#8B5CF6'; // Violet 500
                                const violetEnd = '#C4B5FD';   // Violet 300
                                gradientColors = { start: violetStart, end: violetEnd, crossProgress };
                            } else if (isPast) {
                                // Missed: Red with gradient
                                useGradient = true;
                                gradientColors = { start: '#DC2626', end: '#EF4444' };
                                strokeColor = '#DC2626';
                            } else {
                                // Future notes: Theme Gradient (Violet -> Fuchsia -> Yellow)
                                useGradient = true;

                                // Theme Colors (RGB)
                                // Violet: #8b5cf6 -> 139, 92, 246
                                // Fuchsia: #d946ef -> 217, 70, 239
                                // Yellow: #facc15 -> 250, 204, 21

                                const getThemeColor = (p: number) => {
                                    // p is 0 (at cursor) to 1 (at right edge)
                                    // We want: 0 -> Violet, 0.5 -> Fuchsia, 1.0 -> Yellow

                                    let r, g, b;
                                    if (p < 0.5) {
                                        // Violet to Fuchsia
                                        const localP = p * 2; // 0 to 1
                                        r = 139 + (217 - 139) * localP;
                                        g = 92 + (70 - 92) * localP;
                                        b = 246 + (239 - 246) * localP;
                                    } else {
                                        // Fuchsia to Yellow
                                        const localP = (p - 0.5) * 2; // 0 to 1
                                        r = 217 + (250 - 217) * localP;
                                        g = 70 + (204 - 70) * localP;
                                        b = 239 + (21 - 239) * localP;
                                    }
                                    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
                                };

                                // Calculate progress for left and right edges of the note
                                const leftDist = Math.max(0, noteX - cursorX);
                                const rightDist = Math.max(0, (noteX + noteWidth) - cursorX);
                                const maxDist = width - cursorX;

                                const pLeft = Math.min(1, leftDist / maxDist);
                                const pRight = Math.min(1, rightDist / maxDist);

                                gradientColors = { start: getThemeColor(pLeft), end: getThemeColor(pRight) };
                                strokeColor = getThemeColor(pRight); // Use the "far" color for stroke to define the shape
                            }
                        }

                        if (noteY < -50 || noteY > height + 50) return;

                        // Glow effect
                        if (glowColor) {
                            ctx.shadowBlur = 20;
                            ctx.shadowColor = glowColor;
                        } else {
                            ctx.shadowBlur = 0;
                        }

                        const rectHeight = Math.max(10, laneHeight * 0.8);
                        const radius = rectHeight / 2;

                        // Create gradient fill
                        if (useGradient && gradientColors) {
                            const gradient = ctx.createLinearGradient(noteX, 0, noteX + noteWidth, 0);
                            if (gradientColors.crossProgress !== undefined) {
                                // For crossing notes, gradient from dark to bright based on crossProgress
                                gradient.addColorStop(0, gradientColors.start);
                                gradient.addColorStop(gradientColors.crossProgress, gradientColors.end);
                                gradient.addColorStop(1, gradientColors.end);
                            } else {
                                gradient.addColorStop(0, gradientColors.start);
                                gradient.addColorStop(1, gradientColors.end);
                            }
                            ctx.fillStyle = gradient;
                        } else {
                            ctx.fillStyle = fillColor;
                        }

                        ctx.strokeStyle = strokeColor;
                        ctx.lineWidth = 2;

                        // Pill shape
                        ctx.beginPath();
                        ctx.roundRect(noteX, noteY - rectHeight / 2, Math.max(4, noteWidth - 2), rectHeight, radius);
                        ctx.fill();

                        // Glass Shine Effect
                        if (note.type === 'target') {
                            const shineGrad = ctx.createLinearGradient(noteX, noteY - rectHeight / 2, noteX, noteY);
                            shineGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
                            shineGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
                            shineGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
                            ctx.fillStyle = shineGrad;
                            ctx.fill();
                        }

                        // SWEEP EFFECT REMOVED (didn't work as intended)

                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.shadowBlur = 0;

                        // Note Name Label - Bigger for better visibility
                        if (noteWidth > 20) {
                            ctx.fillStyle = note.type === 'preview' ? 'rgba(0,0,0,0.6)' : '#000000';
                            ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'; // Larger, system font
                            ctx.textAlign = 'center';
                            ctx.fillText(getNote(note.freq).note, noteX + noteWidth / 2, noteY + 10);
                            ctx.textAlign = 'left';
                        }
                    });

                    // Draw single PRÉVIA label - LARGE and STATIC on screen during preview
                    const previewNotes = notesRef.current.filter(n => n.type === 'preview');

                    // Calculate preview timing for smooth transitions
                    let previewAlpha = 0;

                    previewNotes.forEach(n => {
                        const deltaT = n.startTime - now;
                        const endTime = n.startTime + n.duration;
                        const deltaEnd = endTime - now;

                        // Show PRÉVIA during entire preview with simple fade out at end
                        if (deltaT > -0.5 && deltaEnd > -1.0) {
                            // Fade in at start
                            if (deltaT > 2) {
                                previewAlpha = Math.max(previewAlpha, 1 - (deltaT - 2));
                            }
                            // Simple fade out at the end (last 1 second)
                            else if (deltaEnd < 0.5 && deltaEnd > -1.0) {
                                previewAlpha = Math.max(previewAlpha, (deltaEnd + 1.0) / 1.5);
                            }
                            // Full opacity during most of the preview
                            else {
                                previewAlpha = Math.max(previewAlpha, 0.9);
                            }
                        }
                    });

                    // Draw PRÉVIA with gradient matching app theme
                    if (previewAlpha > 0.05) {
                        ctx.save();
                        ctx.font = '800 56px system-ui, -apple-system, sans-serif';
                        ctx.textAlign = 'center';

                        // Create gradient text effect (violet to fuchsia)
                        const gradient = ctx.createLinearGradient(width / 2 - 100, 0, width / 2 + 100, 0);
                        gradient.addColorStop(0, `rgba(139, 92, 246, ${previewAlpha})`);  // violet-500
                        gradient.addColorStop(1, `rgba(217, 70, 239, ${previewAlpha})`);  // fuchsia-500
                        ctx.fillStyle = gradient;

                        ctx.fillText('PRÉVIA', width / 2, 120);
                        ctx.restore();
                    }
                }

                // Draw Pitch Line (History)
                const history = historyRef.current;
                const historyPoints = Math.min(history.length, Math.ceil(cursorX / ((1 / 60) * pixelsPerSecond)));

                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Gradient for pitch line
                const gradient = ctx.createLinearGradient(0, 0, cursorX, 0);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
                gradient.addColorStop(0.8, canvasTheme.pitchLine);
                gradient.addColorStop(1, '#ffffff');
                ctx.strokeStyle = gradient;

                // --- DYNAMIC THEME COLORS (Interpolated) ---
                // Cycle between Violet (#8b5cf6), Fuchsia (#d946ef), and Pink (#ec4899)
                // Using sine wave for smooth interpolation
                const cycleSpeed = 2.0; // Seconds per cycle
                const t = (visualNow % cycleSpeed) / cycleSpeed; // 0 to 1
                const phase = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // 0 to 1 oscillating

                // Interpolate function
                const lerpColor = (c1: number[], c2: number[], factor: number) => {
                    const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
                    const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
                    const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor);
                    return `rgba(${r}, ${g}, ${b}`; // Missing closing paren and alpha to be added later
                };

                const violet = [139, 92, 246];
                const fuchsia = [217, 70, 239];
                const pink = [236, 72, 153];

                // Color 1: Violet <-> Fuchsia
                const color1Base = lerpColor(violet, fuchsia, phase);
                // Color 2: Fuchsia <-> Pink
                const color2Base = lerpColor(fuchsia, pink, phase);

                const getDynamicColor = (base: string, alpha: number) => {
                    return `${base}, ${alpha})`;
                };

                // Draw Pitch History Trail - SMOOTH CONTINUOUS PATH
                // Only draw if we have a signal NOW (otherwise trail disappears)
                if (hasSignalNow && historyPoints > 1) {
                    // To completely eliminate "steppy" look, we MUST use a single continuous path.
                    // Segmented drawing always has issues with overlaps and joints.
                    // We will use a single path with a gradient stroke.
                    // Note: Variable width is hard with single path, so we'll rely on the gradient alpha/color for the "fading/tapering" feel.

                    // Shortened trail length as requested (was 20, increased to 30 for resolution)
                    const maxTrailPoints = 30;
                    const pointsToDraw = Math.min(historyPoints, maxTrailPoints);

                    if (pointsToDraw > 2) {
                        ctx.beginPath();

                        // Start from the newest point (cursor)
                        // We need to find the start X (cursorX) and end X (tail) to create the gradient
                        const newestPoint = history[history.length - 1];
                        const oldestPoint = history[history.length - pointsToDraw];

                        if (newestPoint && oldestPoint) {
                            const startX = cursorX;
                            // Use visualNow for trail calculations
                            const endX = cursorX - ((visualNow - oldestPoint.time) * pixelsPerSecond);

                            // Create Gradient: Dynamic Colors
                            const trailGradient = ctx.createLinearGradient(startX, 0, endX, 0);
                            // Start: Dynamic Color 1
                            trailGradient.addColorStop(0, getDynamicColor(color1Base, 1.0));
                            // Middle: Dynamic Color 2
                            trailGradient.addColorStop(0.4, getDynamicColor(color2Base, 0.8));
                            // End: Transparent
                            trailGradient.addColorStop(1, getDynamicColor(color2Base, 0.0));

                            ctx.strokeStyle = trailGradient;
                            ctx.lineWidth = 12; // Reduced from 16 as requested
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.shadowBlur = 8;
                            ctx.shadowColor = getDynamicColor(color1Base, 0.5);

                            // CRITICAL FIX: Start drawing EXACTLY at the cursor position (visualPitchRef)
                            // This connects the ball to the trail perfectly, fixing "inverted delay"
                            const cursorY = getLogY(visualPitchRef.current);

                            ctx.moveTo(cursorX, cursorY);

                            // Draw the path backwards from history
                            for (let i = 0; i < pointsToDraw; i++) {
                                const index = history.length - 1 - i;
                                const point = history[index];

                                if (!point || point.frequency <= 0) {
                                    ctx.stroke();
                                    ctx.beginPath();
                                    // If gap, we can't easily reconnect to cursor, so just skip
                                    continue;
                                }

                                const y = getLogY(point.frequency);
                                // Use visualNow for trail calculations
                                const x = cursorX - ((visualNow - point.time) * pixelsPerSecond);

                                // We use the previous point (which is closer to cursor) as control point?
                                // Actually, standard approach:
                                // To point (x, y). 
                                // Since we started at cursor, we just lineTo or curveTo the first history point.

                                // Cubic Bezier for smoother curves
                                // We need 2 control points.
                                // P0 = previous point (x,y)
                                // P3 = current point (prevX, prevY)
                                // Control points can be calculated to ensure C1 continuity

                                if (i === 0) {
                                    // First segment: Cursor to first history point
                                    // Simple quadratic is fine here, or cubic with CP1=start, CP2=end
                                    const cpX = (cursorX + x) / 2;
                                    const cpY = (cursorY + y) / 2;
                                    ctx.quadraticCurveTo(cpX, cpY, x, y);
                                } else {
                                    // Subsequent segments
                                    const prevIndex = history.length - i;
                                    const prevPoint = history[prevIndex];
                                    if (prevPoint) {
                                        const prevY = getLogY(prevPoint.frequency);
                                        // Use visualNow for trail calculations
                                        const prevX = cursorX - ((visualNow - prevPoint.time) * pixelsPerSecond);

                                        // Calculate Control Points for Cubic Bezier
                                        // Simple smoothing: use midpoints as control points?
                                        // Or Catmull-Rom spline converted to Bezier?
                                        // Let's stick to a simpler approach that is smoother than quadratic:
                                        // Use the midpoint of the previous segment and current segment

                                        // Actually, standard "smooth curve through points" often uses:
                                        // ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
                                        // For simplicity and performance in a game loop, let's refine the Quadratic approach
                                        // by using the MIDPOINTS of the segments as the start/end of the curves, 
                                        // and the actual data points as the Control Points.
                                        // This creates a B-Spline which is very smooth (but doesn't pass exactly through points).
                                        // Given we have high resolution (every frame), this is perfect.

                                        // We are drawing backwards from cursor.
                                        // Current pen position is 'x, y' (from previous iteration).
                                        // Wait, the loop structure is a bit weird for that.

                                        // Let's revert to standard Quadratic but with the "midpoint" technique
                                        // which guarantees smoothness at the joints.

                                        const midX = (x + prevX) / 2;
                                        const midY = (y + prevY) / 2;

                                        // Draw curve from previous midpoint to this midpoint, using the point (x,y) as control
                                        // But we are iterating points...

                                        // Let's just use the simple Quadratic we had, but since we have more points (30),
                                        // it should look smoother. The "steppiness" usually comes from low resolution.
                                        // If it's still steppy, it's because of the angle changes.

                                        // Let's try the midpoint technique properly:
                                        // We need to look ahead.

                                        const cpX = x;
                                        const cpY = y;
                                        const endX = (x + prevX) / 2;
                                        const endY = (y + prevY) / 2;

                                        ctx.quadraticCurveTo(cpX, cpY, endX, endY);

                                        // Note: This leaves the last half-segment undrawn, but for a fading trail it's fine.
                                    } else {
                                        ctx.lineTo(x, y);
                                    }
                                }
                            }
                            ctx.stroke();
                            ctx.shadowBlur = 0;
                        }
                    }
                }

                // --- HIT DETECTION & PARTICLES ---
                let isHitting = false;

                if (hasSignalNow) {
                    const { midi: userMidi } = getNote(visualPitchRef.current);

                    // Check if hitting any target note
                    const targetNotes = notesRef.current.filter(n =>
                        n.type === 'target' &&
                        n.startTime <= now &&
                        (n.startTime + n.duration) >= now
                    );

                    for (const target of targetNotes) {
                        const { midi: targetMidi } = getNote(target.freq);
                        // Allow small margin of error (e.g., +/- 0.5 semitones is strict, let's say +/- 0.8 for "hit" visual)
                        if (Math.abs(userMidi - targetMidi) < 0.8) {
                            isHitting = true;
                            break;
                        }
                    }
                }

                // Spawn particles if hitting
                if (isHitting && hasSignalNow) {
                    // Limit spawn rate
                    if (now - lastHitTimeRef.current > 0.05) { // Every 50ms
                        lastHitTimeRef.current = now;
                        const y = getLogY(currentPitchFreq);

                        // Spawn burst - MORE PARTICLES for evident hit
                        for (let k = 0; k < 10; k++) { // Increased from 6 to 10
                            particlesRef.current.push({
                                x: cursorX,
                                y: y,
                                vx: -80 - Math.random() * 100, // Move BACKWARDS (negative = left) as if hit reaction
                                vy: (Math.random() - 0.5) * 120, // Slight vertical spread
                                life: 1.2, // Longer life
                                color: k % 2 === 0 ? '#34d399' : '#22c55e', // Emerald Green variations
                                size: Math.random() * 6 + 3 // Larger particles
                            });
                        }
                    }
                }

                // Update and Draw Particles
                for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                    const p = particlesRef.current[i];
                    p.life -= 0.02; // Decay
                    p.x += p.vx * 0.016; // Move X
                    p.y += p.vy * 0.016; // Move Y

                    if (p.life <= 0) {
                        particlesRef.current.splice(i, 1);
                        continue;
                    }

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }

                // Draw Cursor Line
                ctx.shadowBlur = 0;
                ctx.strokeStyle = canvasTheme.primary;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cursorX, 0);
                ctx.lineTo(cursorX, height);
                ctx.stroke();

                // Draw User Voice Circle - Enhanced, ALWAYS VISIBLE, bigger

                let circleY;
                if (hasSignalNow) {
                    // Active: use SMOOTHED visual pitch
                    circleY = getLogY(visualPitchRef.current);
                    lastPitchPositionRef.current = { x: cursorX, y: circleY };
                } else if (lastPitchPositionRef.current) {
                    // No signal: use last known position
                    circleY = lastPitchPositionRef.current.y;
                } else {
                    // No signal and no history: center of screen
                    circleY = height / 2;
                }

                if (circleY >= 0 && circleY <= height) {
                    // Even bigger circle for better visibility
                    const radius = width < 768 ? 28 : 22; // Increased from 24/18

                    // Color based on signal and hit status
                    const isActive = hasSignalNow;
                    // If hitting, use Gold/Amber, else Violet or Grey
                    const baseColor = isHitting ? '251, 191, 36' : (isActive ? '139, 92, 246' : '150, 160, 180');

                    // Outer glow ring - Pulse if hitting
                    const pulse = isHitting ? 1.5 + Math.sin(now * 20) * 0.5 : 1.0;

                    ctx.beginPath();
                    ctx.arc(cursorX, circleY, (radius + 8) * (isHitting ? 1.2 : 1.0), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${baseColor}, ${isHitting ? 0.4 : 0.15})`;
                    ctx.fill();

                    // Middle ring
                    ctx.beginPath();
                    ctx.arc(cursorX, circleY, radius + 4, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(${baseColor}, 0.4)`;
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    // Main circle with gradient
                    const gradient = ctx.createRadialGradient(cursorX, circleY, 0, cursorX, circleY, radius);
                    if (isActive) {
                        gradient.addColorStop(0, '#C4B5FD');
                        gradient.addColorStop(1, '#8B5CF6');
                    } else {
                        gradient.addColorStop(0, '#D1D5DB'); // Light grey
                        gradient.addColorStop(1, '#9CA3AF'); // Medium grey
                    }

                    ctx.beginPath();
                    ctx.arc(cursorX, circleY, radius, 0, Math.PI * 2);
                    ctx.fillStyle = gradient;
                    ctx.fill();

                    // Inner highlight
                    ctx.beginPath();
                    ctx.arc(cursorX - radius / 3, circleY - radius / 3, radius / 3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.fill();
                }

                animationFrameId = requestAnimationFrame(loop);
            } catch (error) {
                console.error('Error in draw loop:', error);
                // Don't restart loop to avoid infinite error spam
            }
        };

        loop();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isPlaying, localParams, getNoteStreamLeadTime, currentKeyMidi, exercise, vocalRange, createNotes, props.onComplete, scheduleNextSequence]);
    const { note, octave, cents } = getNote(userPitch);
    const hasSignal = (userPitch || 0) > 50 && (userPitch || 0) < 2000;

    return (
        <div className="h-full w-full flex flex-col font-sans overflow-hidden" style={{ backgroundColor: canvasTheme.background, color: canvasTheme.text }}>
            <style>
                {`
                @keyframes shine {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                `}
            </style>



            {/* Top Left - Routine Info */}
            {currentRoutine && (
                <div className="absolute top-2 left-2 md:top-4 md:left-4 z-50">
                    <div className="bg-white/40 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-2 md:p-3 shadow-xl">
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[9px] md:text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                                {t('routineLabel')}
                            </div>
                            <div className="text-xs md:text-sm font-bold text-slate-900">
                                {t(currentRoutine.routine.name)}
                            </div>
                            <div className="text-[10px] md:text-xs font-mono text-slate-600">
                                {t('exerciseProgress', {
                                    current: currentRoutine.exerciseIndex + 1,
                                    total: currentRoutine.routine.exerciseIds.length
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Favorite Star - Top Right */}
            <button
                onClick={() => {
                    if (currentRoutine) {
                        onToggleFavoriteRoutine(currentRoutine.routine.id);
                    } else {
                        onToggleFavoriteExercise(getExerciseId(exercise));
                    }
                }}
                className="absolute top-3 right-3 md:top-5 md:right-5 z-50 p-2 transition-all btn-interactive hover:scale-110 active:scale-95"
                title={currentRoutine ? "Favorite Routine" : "Favorite Exercise"}
            >
                <Star
                    size={32}
                    strokeWidth={2}
                    className={`transition-all ${(currentRoutine ? isRoutineFavorite : isExerciseFavorite)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-amber-400'
                        }`}
                />
            </button>


            {/* Refine Input Panel - Only for AI exercises */}
            {exercise.isAIGenerated && showRefineInput && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-violet-200 dark:border-violet-700 p-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">Refinar</h3>
                            <button
                                onClick={() => setShowRefineInput(false)}
                                className="ml-auto w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <input
                            type="text"
                            value={refinePrompt}
                            onChange={(e) => setRefinePrompt(e.target.value)}
                            placeholder="ex: Faça mais rápido, mais agudo, ou mude a vogal..."
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                            autoFocus
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter' && refinePrompt.trim() && onRefine) {
                                    const prompt = refinePrompt.trim();
                                    setRefinePrompt('');
                                    setShowRefineInput(false);
                                    // Call the refine callback
                                    await onRefine(exercise, prompt);
                                } else if (e.key === 'Escape') {
                                    setShowRefineInput(false);
                                }
                            }}
                        />
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                            Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">Enter</kbd> to refine • <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">ESC</kbd> to cancel
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-grow relative min-h-0" ref={containerRef}>
                <canvas
                    ref={canvasRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="block w-full h-full relative z-10"
                    style={{
                        width: '100%',
                        height: '100%'
                    }}
                />



                {/* Top Left - Routine Info */}
                {currentRoutine && (
                    <div className="absolute top-2 left-2 md:top-4 md:left-4 z-50">
                        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-600/50 rounded-2xl p-2 md:p-3 shadow-xl">
                            <div className="flex flex-col gap-0.5">
                                <div className="text-[9px] md:text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    {t('routineLabel')}
                                </div>
                                <div className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {t(currentRoutine.routine.name)}
                                </div>
                                <div className="text-[10px] md:text-xs font-mono text-slate-600 dark:text-slate-400">
                                    {t('exerciseProgress', {
                                        current: currentRoutine.exerciseIndex + 1,
                                        total: currentRoutine.routine.exerciseIds.length
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Favorite Star - Top Right */}
                <button
                    onClick={() => {
                        if (currentRoutine) {
                            onToggleFavoriteRoutine(currentRoutine.routine.id);
                        } else {
                            onToggleFavoriteExercise(getExerciseId(exercise));
                        }
                    }}
                    className="absolute top-3 right-3 md:top-5 md:right-5 z-50 p-2 transition-all btn-interactive hover:scale-110 active:scale-95"
                    title={currentRoutine ? "Favorite Routine" : "Favorite Exercise"}
                >
                    <Star
                        size={32}
                        strokeWidth={2}
                        className={`transition-all ${(currentRoutine ? isRoutineFavorite : isExerciseFavorite)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-amber-400'
                            }`}
                    />
                </button>

                {/* Bottom Controls - Always visible with blur background */}
                <div className="absolute left-0 right-0 z-50" style={{ bottom: 0 }}>
                    <div className={`w-full p-3 md:p-6 flex items-end justify-center pointer-events-auto transition-opacity duration-300`}>
                        {/* Center Main Controls - Grouped Together */}
                        <div className="flex items-center gap-2 md:gap-3">
                            {/* Back Button */}
                            <button
                                onClick={onBack || onStop}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${isPlaying ? 'bg-white/40 backdrop-blur-md border border-white/50 text-slate-700' : 'bg-gradient-to-br from-yellow-400 to-yellow-500 border-2 border-yellow-300 text-slate-900'} flex items-center justify-center shadow-lg hover:scale-105 transition-all duration-300 ease-out btn-interactive`}
                            >
                                <ChevronLeft size={20} strokeWidth={3} />
                            </button>

                            {/* Edit/Refine Button - Only for AI exercises */}
                            {exercise.isAIGenerated && (
                                <button
                                    onClick={() => setShowRefineInput(!showRefineInput)}
                                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${showRefineInput ? 'bg-gradient-to-br from-violet-600 to-violet-700 border-2 border-violet-400 text-white' : isPlaying ? 'bg-white/40 backdrop-blur-md border border-white/50 text-slate-700' : 'bg-gradient-to-br from-violet-400 to-violet-500 border-2 border-violet-300 text-white'} flex items-center justify-center shadow-lg hover:scale-105 transition-all duration-300 ease-out btn-interactive`}
                                >
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            )}

                            {/* Play/Pause Button - Staggered animation delay 100ms */}
                            <button
                                onClick={onPlayPause}
                                className={`w-12 h-12 md:w-14 md:h-14 rounded-full group transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 text-white shadow-xl overflow-hidden opacity-100`}
                                style={{
                                    backgroundImage: `linear-gradient(to bottom right, #8b5cf6, #d946ef, #facc15)`,
                                    boxShadow: `0 8px 32px rgba(217, 70, 239, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                                    transitionDelay: showControls ? '100ms' : '100ms'
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine"
                                    style={{ animationName: 'shine', animationDuration: '0.7s', animationDelay: '0s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationPlayState: 'running' }}>
                                </div>
                                <div className="relative z-10 flex items-center justify-center h-full w-full">
                                    {isPlaying
                                        ? <Pause size={28} fill="currentColor" />
                                        : <Play size={28} fill="currentColor" className="ml-1" />}
                                </div>
                            </button>


                            {/* Restart Button - Only show if onRestart is provided */}
                            {props.onRestart && (
                                <button
                                    onClick={() => {
                                        props.onRestart!();
                                    }}
                                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${isPlaying ? 'bg-white/40 backdrop-blur-md border border-white/50 text-slate-700' : 'bg-white/60 backdrop-blur-md border border-slate-200/50 text-slate-800'} flex items-center justify-center shadow-xl hover:scale-105 transition-all duration-300 ease-out btn-interactive`}
                                >
                                    <RotateCcw size={20} />
                                </button>
                            )}

                            {/* Fullscreen/Immersive Mode Button */}
                            <button
                                onClick={props.onToggleFullscreen}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${isPlaying ? 'bg-white/40 backdrop-blur-md border border-white/50 text-slate-700' : 'bg-white/60 backdrop-blur-md border border-slate-200/50 text-slate-800'} flex items-center justify-center shadow-lg hover:scale-105 transition-all duration-300 ease-out btn-interactive`}
                                title={props.isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            >
                                {props.isFullscreen ? (
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H4v4m12 4h4v-4M8 20H4v-4m12 4h4v-4" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Settings Popup */}
                {
                    showSettings && (
                        <div className="fixed inset-x-0 bottom-0 max-h-[70vh] w-full rounded-t-2xl md:absolute md:top-20 md:right-4 md:w-72 md:rounded-2xl bg-white/40 backdrop-blur-xl p-4 md:p-5 border border-slate-200/50 shadow-2xl z-50 overflow-y-auto">
                            <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between gap-2 border-b border-slate-300/50 pb-2">
                                <div className="flex items-center gap-2">
                                    <Settings size={18} className="text-violet-600" /> Range Settings
                                </div>
                                <button onClick={() => setShowSettings(false)} className="w-7 h-7 rounded-full text-slate-500 hover:text-slate-800 btn-interactive flex items-center justify-center">
                                    <ChevronDown size={18} />
                                </button>
                            </h4>
                            <div className="space-y-4">
                                <div className="bg-slate-100/50 rounded-lg p-3">
                                    <div className="text-xs text-slate-600 mb-2 font-semibold">Current Range</div>
                                    <div className="text-sm font-mono text-slate-800">
                                        {vocalRange.start?.name || 'C3'} - {vocalRange.end?.name || 'C5'}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-slate-600 mb-2">Shift Range (Semitones)</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentKeyMidi(k => Math.max(24, k - 1))}
                                            className="flex-1 px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-sm transition-colors"
                                        >
                                            ↓ Down
                                        </button>
                                        <button
                                            onClick={() => setCurrentKeyMidi(k => Math.min(96, k + 1))}
                                            className="flex-1 px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-sm transition-colors"
                                        >
                                            ↑ Up
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-slate-600 mb-2">Quick Shift</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setCurrentKeyMidi(k => Math.max(24, k - 12))}
                                            className="px-3 py-2 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-800 font-semibold text-xs transition-colors"
                                        >
                                            -1 Octave
                                        </button>
                                        <button
                                            onClick={() => setCurrentKeyMidi(k => Math.min(96, k + 12))}
                                            className="px-3 py-2 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-800 font-semibold text-xs transition-colors"
                                        >
                                            +1 Octave
                                        </button>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-500 italic pt-2 border-t border-slate-200">
                                    Tip: Adjust if exercises feel too high or too low for your voice.
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Engine Settings Popup */}
                {
                    showEngineSettings && (
                        <div className="fixed inset-x-0 bottom-0 max-h-[70vh] w-full rounded-t-2xl md:absolute md:top-20 md:right-4 md:w-72 md:rounded-2xl bg-white/40 backdrop-blur-xl p-4 md:p-5 border border-slate-200/50 shadow-2xl z-50 overflow-y-auto">
                            <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between gap-2 border-b border-slate-300/50 pb-2">
                                <div className="flex items-center gap-2">
                                    <Zap size={18} className="text-indigo-600" /> Engine Settings
                                </div>
                                <button onClick={() => setShowEngineSettings(false)} className="w-7 h-7 rounded-full text-slate-500 hover:text-slate-800 btn-interactive flex items-center justify-center">
                                    <ChevronDown size={18} />
                                </button>
                            </h4>
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Vertical Zoom (Octaves)</span><span className="font-mono text-violet-600">{localParams.verticalZoom.toFixed(1)}</span></div>
                                <input type="range" min="1" max="4" step="0.5" value={localParams.verticalZoom} onChange={(e) => setLocalParams(p => ({ ...p, verticalZoom: parseFloat(e.target.value) }))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600" />
                            </div>
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Horizontal Zoom (Seconds)</span><span className="font-mono text-violet-600">{localParams.horizontalZoom.toFixed(1)}</span></div>
                                <input type="range" min="1" max="5" step="0.5" value={localParams.horizontalZoom} onChange={(e) => setLocalParams(p => ({ ...p, horizontalZoom: parseFloat(e.target.value) }))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600" />
                            </div>
                            <div className="border-t border-slate-300/50 pt-4 mb-5">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>Tempo Speed</span>
                                    <span className="font-mono text-violet-600">
                                        {localParams.tempoMultiplier === 0.5 ? '50%' :
                                            localParams.tempoMultiplier === 0.75 ? '75%' :
                                                localParams.tempoMultiplier === 1.0 ? '100%' :
                                                    localParams.tempoMultiplier === 1.25 ? '125%' : '150%'}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.25"
                                    value={localParams.tempoMultiplier}
                                    onChange={(e) => setLocalParams(p => ({ ...p, tempoMultiplier: parseFloat(e.target.value) }))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                    <span>Slower</span>
                                    <span>Normal</span>
                                    <span>Faster</span>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Microphone Permission Dialog - Portuguese with Glass Design */}
                {
                    showMicPermissionDialog && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-md mx-4 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 shadow-lg">
                                        <Mic size={32} className="text-white" />
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Usar Microfone?</h3>
                                    <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-6">
                                        Gostaria de usar seu microfone para detecção de altura durante este exercício?
                                    </p>
                                    <div className="flex flex-col gap-3 w-full">
                                        <button
                                            onClick={() => {
                                                setShowMicPermissionDialog(false);
                                                if (props.onToggleMic && !props.micActive) {
                                                    props.onToggleMic();
                                                }
                                            }}
                                            className="relative overflow-hidden px-6 py-4 rounded-2xl font-semibold text-white transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                                            style={{
                                                backgroundImage: 'linear-gradient(to bottom right, #8b5cf6, #d946ef, #facc15)',
                                                boxShadow: '0 8px 24px rgba(217, 70, 239, 0.4)'
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
                                            <div className="relative z-10">Sim, Usar Microfone</div>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMicPermissionDialog(false);
                                            }}
                                            className="px-6 py-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-600/50 text-slate-800 dark:text-slate-100 font-semibold transition-all shadow-md hover:bg-white/80 dark:hover:bg-slate-700/80 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Não, Continuar Sem
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};