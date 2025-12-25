
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Mic, Play, Pause, Volume2, VolumeX, MicOff, ChevronDown, ChevronUp, RotateCcw, Zap, ArrowLeft, Music, Activity, Grid, Sliders, X } from 'lucide-react';

/**
 * --- INTERFACES (v3.4 SPEC) ---
 */

export interface Theme {
    background: string;
    surface: string;
    gridLines: string;
    gridLabels: string;
    primary: string;
    secondary: string;
    success: string;
    text: string;
    textSubtle: string;
    notePreview: string;
}

export interface VocalRange {
    min: number; // MIDI
    max: number; // MIDI
}

export interface NoteEvent {
    type: 'note' | 'rest';
    semitone?: number;
    visual?: string;
    duration: number; // in beats
    lyric?: string;
}

export interface Exercise {
    exercise_id: string;
    name: string;
    category: string;
    tempo_bpm: number;
    description: string;
    notes: NoteEvent[];
}

export interface ExerciseGroup {
    group: string;
    exercises: Exercise[];
}


export interface EngineParams {
    bias: number;
    gateThreshold: number;
    verticalZoom: number;
    historyScale: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    decay: number;
    size: number;
    color: string;
}

export interface ExerciseGameViewALTProps {
    // Data
    exercise: Exercise;
    vocalRange: VocalRange;
    bpm: number;
    userPitch: number | null;
    engineParams: EngineParams;

    // Configuration
    currentTheme: Theme;
    audioContext: AudioContext | null; // Shared context needed for timing

    // State
    isPlaying: boolean;
    isExerciseComplete: boolean;

    // Audio / Callbacks
    playNote: (freq: number, startTime: number, duration: number, type?: OscillatorType, vol?: number) => void;
    stopAudio: () => void;
    onPlayPause: () => void;
    onRestart: () => void;
    onExit: () => void;
    onExerciseComplete: () => void;
    onNextExercise: () => void;

    micActive: boolean;
    onToggleMic: () => void;
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

// --- METRONOME SCHEDULER ---
const scheduleMetronome = (context: AudioContext, bpm: number, metronomeRef: any, isMetronomeOn: boolean, anchorTime: number) => {
    if (!isMetronomeOn || !context) return;

    const lookahead = 0.1;
    const beatDur = 60 / bpm;
    const now = context.currentTime;

    const beatsElapsedSinceAnchor = (now - anchorTime) / beatDur;
    const nextBeatCount = Math.ceil(beatsElapsedSinceAnchor);
    let nextBeatTime = anchorTime + (nextBeatCount * beatDur);

    if (metronomeRef.current.nextBeatTime === undefined || !metronomeRef.current.isPlaying) {
        metronomeRef.current.nextBeatTime = nextBeatTime;
    } else {
        while (metronomeRef.current.nextBeatTime < now + beatDur / 2) {
            metronomeRef.current.nextBeatTime += beatDur;
        }
    }

    const playClick = (time: number, beatCountFromAnchor: number) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        const isStrong = beatCountFromAnchor % 4 === 0;
        osc.type = 'square';
        osc.frequency.value = isStrong ? 1000 : 500;
        osc.connect(gain);
        gain.connect(context.destination);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(isStrong ? 0.3 : 0.1, time + 0.001);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        osc.start(time);
        osc.stop(time + 0.04);
    };

    const scheduler = () => {
        if (!metronomeRef.current.isPlaying || !context) {
            if (metronomeRef.current.timerId) clearTimeout(metronomeRef.current.timerId);
            metronomeRef.current.timerId = null;
            return;
        }

        let currentBeatTime = metronomeRef.current.nextBeatTime;
        const nowInScheduler = context.currentTime;

        while (currentBeatTime < nowInScheduler + lookahead) {
            const beatCount = Math.round((currentBeatTime - anchorTime) / beatDur);
            playClick(currentBeatTime, beatCount);
            currentBeatTime += beatDur;
        }
        metronomeRef.current.nextBeatTime = currentBeatTime;
        metronomeRef.current.timerId = window.setTimeout(scheduler, 25);
    };

    if (!metronomeRef.current.isPlaying) {
        metronomeRef.current.isPlaying = true;
        scheduler();
    }
};

/**
 * ------------------------------------------------------------------
 * pYIN PITCH DETECTION SYSTEM & AUDIO GRAPH CONFIGURATION
 * ------------------------------------------------------------------
 */

// 1. DEFAULT CONFIGURATION
export const PYIN_CONFIG = {
    // Audio Context Constraints (Critical for raw audio)
    audioConstraints: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        latency: 0
    },

    // Frequency Separator (High-Pass Filter)
    // Filters out low-end rumble/noise before pitch detection
    filter: {
        enabled: true,
        type: 'highpass',
        frequency: 700, // Hz
        Q: 0.7
    },

    // pYIN Algorithm Settings
    algorithm: 'pyin',
    noiseGateThreshold: 0.005, // Signal below this RMS is ignored
    pyinBias: 0.5,             // Bias towards previous note (0.0 - 10.0)
    pyinGateMode: 'smooth',    // 'smooth' (uses attack/release) or 'instant'

    // Internal Constants (from PitchProcessor)
    analysisBufferSize: 2048,
    smoothingFactor: 0.95      // For RMS smoothing
};

/**
 * COMPONENT: MicPermissionModal
 */
interface MicPermissionModalProps {
    onActivateAndStart: () => void;
    onContinueWithoutMic: () => void;
    onCancel: () => void;
}

const MicPermissionModal: React.FC<MicPermissionModalProps> = ({ onActivateAndStart, onContinueWithoutMic, onCancel }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-violet-100 p-3 rounded-full text-violet-600">
                        <Mic size={24} />
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">Enable Microphone?</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                    Pitch Perfector works best when it can hear you! Enabling your microphone allows for real-time pitch detection.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={onActivateAndStart}
                        className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <Mic size={18} /> Activate Mic & Start
                    </button>
                    <button
                        onClick={onContinueWithoutMic}
                        className="w-full py-3 px-4 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                        Continue Without Mic
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * COMPONENT: LandingPage
 */
interface LandingPageProps {
    exerciseGroups: ExerciseGroup[];
    selectedExerciseId: string;
    onSelectExercise: (id: string) => void;
    vocalRange: VocalRange;
    onRangeChange: (range: VocalRange) => void;
    bpm: number;
    onBpmChange: (bpm: number) => void;
    engineParams: EngineParams;
    onParamsChange: (params: EngineParams) => void;
    onStartGame: () => void;
    micActive: boolean;
    onToggleMic: () => void;
}

const GROUP_DESCRIPTIONS: { [key: string]: string } = {
    "Warmup": "Gentle exercises to safely prepare your voice for singing.",
    "Technique": "Build core vocal skills like resonance, breath control, and power.",
    "Agility": "Improve your ability to sing complex melodies and fast passages.",
    "Ear": "Sharpen your pitch accuracy and ability to recognize intervals.",
    "Style": "Explore exercises common in specific genres like Jazz and Pop."
};

const GROUP_COLORS: { [key: string]: { text: string; bg: string; border: string; hoverText: string; } } = {
    "Warmup": { text: "text-amber-600", bg: "bg-amber-100", border: "hover:border-amber-400", hoverText: "group-hover:text-amber-700" },
    "Technique": { text: "text-sky-600", bg: "bg-sky-100", border: "hover:border-sky-400", hoverText: "group-hover:text-sky-700" },
    "Agility": { text: "text-emerald-600", bg: "bg-emerald-100", border: "hover:border-emerald-400", hoverText: "group-hover:text-emerald-700" },
    "Ear": { text: "text-fuchsia-600", bg: "bg-fuchsia-100", border: "hover:border-fuchsia-400", hoverText: "group-hover:text-fuchsia-700" },
    "Style": { text: "text-rose-600", bg: "bg-rose-100", border: "hover:border-rose-400", hoverText: "group-hover:text-rose-700" },
    "Default": { text: "text-slate-600", bg: "bg-slate-100", border: "hover:border-violet-300", hoverText: "group-hover:text-violet-700" }
};

const LandingPage: React.FC<LandingPageProps> = (props) => {
    const {
        exerciseGroups, selectedExerciseId, onSelectExercise,
        vocalRange, onRangeChange,
        bpm, onBpmChange,
        engineParams, onParamsChange,
        onStartGame, micActive, onToggleMic
    } = props;

    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [showMicModal, setShowMicModal] = useState(false);

    const handleExerciseClick = (exId: string) => {
        onSelectExercise(exId);

        if (micActive) {
            onStartGame();
        } else {
            setShowMicModal(true);
        }
    };

    const handleActivateAndStart = () => {
        onToggleMic();
        onStartGame();
        setShowMicModal(false);
    };

    const handleContinueWithoutMic = () => {
        onStartGame();
        setShowMicModal(false);
    };

    const orderedGroups = ["Warmup", "Technique", "Agility", "Ear", "Style"];

    return (
        <div className="h-full w-full bg-slate-50 overflow-y-auto font-sans text-slate-800 p-6 md:p-10">
            {showMicModal && (
                <MicPermissionModal
                    onActivateAndStart={handleActivateAndStart}
                    onContinueWithoutMic={handleContinueWithoutMic}
                    onCancel={() => setShowMicModal(false)}
                />
            )}

            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">
                            Pitch Perfector
                        </h1>
                        <p className="text-slate-500 mt-1">Select an exercise to start practicing.</p>
                    </div>
                </div>

                {/* Exercise Selection by Group */}
                {orderedGroups.map(groupName => {
                    const group = exerciseGroups.find(g => g.group === groupName);
                    if (!group) return null;
                    const colors = GROUP_COLORS[group.group] || GROUP_COLORS.Default;
                    return (
                        <section key={group.group}>
                            <h2 className={`text-lg font-bold ${colors.text} mb-2 flex items-center gap-2`}>
                                <Music size={20} /> {group.group}
                            </h2>
                            <p className="text-sm text-slate-500 mb-4 -mt-1">{GROUP_DESCRIPTIONS[group.group] || ''}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.exercises.map(ex => (
                                    <button
                                        key={ex.exercise_id}
                                        onClick={() => handleExerciseClick(ex.exercise_id)}
                                        className={`text-left p-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden group hover:scale-[1.02] hover:shadow-xl ${selectedExerciseId === ex.exercise_id
                                            ? `border-violet-500 bg-white shadow-lg shadow-violet-200`
                                            : `border-slate-200 bg-white ${colors.border}`
                                            }`}
                                    >
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`font-bold text-slate-800 text-lg transition-colors ${colors.hoverText}`}>{ex.name}</h3>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{ex.category}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2">{ex.description}</p>
                                            <div className="mt-4 flex items-center text-violet-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                Start <Play size={14} className="ml-1 fill-current" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )
                })}


                {/* Advanced Configuration Toggle */}
                <div className="flex items-center justify-between border-t border-slate-200 pt-6">
                    <button
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="flex items-center gap-2 text-slate-600 font-semibold hover:text-violet-600 transition-colors"
                    >
                        <Sliders size={20} />
                        Configuration
                        {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {/* Settings Section (Collapsible) */}
                {showAdvancedSettings && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 fade-in duration-300">
                        {/* Game Settings */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                                <Settings size={20} className="text-fuchsia-500" /> Game Settings
                            </h2>

                            {/* Tempo */}
                            <div className="mb-6">
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-semibold text-slate-600">Global Tempo (BPM)</label>
                                    <span className="text-sm font-mono font-bold text-fuchsia-600">{bpm}</span>
                                </div>
                                <input
                                    type="range" min="40" max="200" step="5"
                                    value={bpm} onChange={(e) => onBpmChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                                    aria-label="Tempo BPM"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Exercises may override this with a suggested tempo.</p>
                            </div>

                            {/* Range */}
                            <div className="mb-2">
                                <label className="text-sm font-semibold text-slate-600 mb-3 block">Vocal Range</label>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Start: {getNoteNameFromMidi(vocalRange.min)}</span>
                                        </div>
                                        <input
                                            type="range" min="36" max="84"
                                            value={vocalRange.min}
                                            onChange={(e) => onRangeChange({ ...vocalRange, min: Math.min(parseInt(e.target.value), vocalRange.max - 1) })}
                                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                            aria-label="Vocal Range Min"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>End: {getNoteNameFromMidi(vocalRange.max)}</span>
                                        </div>
                                        <input
                                            type="range" min="36" max="84"
                                            value={vocalRange.max}
                                            onChange={(e) => onRangeChange({ ...vocalRange, max: Math.max(parseInt(e.target.value), vocalRange.min + 1) })}
                                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                            aria-label="Vocal Range Max"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Engine Settings */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                                <Zap size={20} className="text-indigo-500" /> Engine & Display
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-semibold text-slate-600">Vertical Zoom</label>
                                        <span className="text-xs font-mono text-indigo-600">{engineParams.verticalZoom} Octaves</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="4" step="0.5"
                                        value={engineParams.verticalZoom}
                                        onChange={(e) => onParamsChange({ ...engineParams, verticalZoom: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        aria-label="Vertical Zoom"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-semibold text-slate-600">Horizontal Zoom</label>
                                        <span className="text-xs font-mono text-indigo-600">{engineParams.historyScale.toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range" min="0.5" max="3.0" step="0.1"
                                        value={engineParams.historyScale}
                                        onChange={(e) => onParamsChange({ ...engineParams, historyScale: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        aria-label="Horizontal Zoom"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Lower values = Faster scrolling.</p>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-semibold text-slate-600">Pitch Bias</label>
                                        <span className="text-xs font-mono text-indigo-600">{engineParams.bias}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="10" step="0.5"
                                        value={engineParams.bias}
                                        onChange={(e) => onParamsChange({ ...engineParams, bias: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        aria-label="Pitch Bias"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Higher bias makes pitch "stick" to previous values more.</p>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-semibold text-slate-600">Noise Gate</label>
                                        <span className="text-xs font-mono text-indigo-600">{engineParams.gateThreshold}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="0.05" step="0.0001"
                                        value={engineParams.gateThreshold}
                                        onChange={(e) => onParamsChange({ ...engineParams, gateThreshold: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        aria-label="Noise Gate"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};


/**
 * COMPONENT: ExerciseGameViewALT
 */
const ExerciseGameViewALT: React.FC<ExerciseGameViewALTProps> = (props) => {
    const {
        exercise,
        vocalRange,
        bpm,
        userPitch,
        engineParams,
        currentTheme,
        audioContext,
        isPlaying,
        isExerciseComplete,
        playNote,
        stopAudio,
        onPlayPause,
        onRestart,
        onExit,
        onExerciseComplete,
        onNextExercise,
        micActive,
        onToggleMic
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<{ val: number, time: number }[]>([]);
    const particlesRef = useRef<Particle[]>([]);

    const [showControls, setShowControls] = useState(true);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
    const [isPaused, setIsPaused] = useState(false);

    const cursorRatio = 0.2;



    const [currentKeyMidi, setCurrentKeyMidi] = useState(vocalRange.min);

    const userPitchRef = useRef(userPitch);
    const currentKeyMidiRef = useRef(currentKeyMidi);
    const isPausedRef = useRef(isPaused);
    const lastPitchYRef = useRef<number | null>(null); // Ref to store last cursor Y position
    // Ref for phase overlay opacity
    const phaseOverlayOpacityRef = useRef<{ preview: number, target: number }>({ preview: 0, target: 0 });


    useEffect(() => { userPitchRef.current = userPitch; }, [userPitch]);
    useEffect(() => { currentKeyMidiRef.current = currentKeyMidi; }, [currentKeyMidi]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

    const notesRef = useRef<any[]>([]);
    const timeoutsRef = useRef<number[]>([]);
    const cameraRef = useRef<{ minF: number; maxF: number }>({ minF: getFrequency(45), maxF: getFrequency(75) });
    const metronomeRef = useRef<{ timerId: number | null, isPlaying: boolean, nextBeatTime: number | undefined }>({ timerId: null, isPlaying: false, nextBeatTime: undefined });
    const [isMetronomeOn, setIsMetronomeOn] = useState(true);

    const nextSequenceParamsRef = useRef<{ rootMidi: number, startTime: number } | null>(null);
    const directionRef = useRef<1 | -1>(1);
    const isLastSequenceScheduledRef = useRef(false);

    const stopAllLocalEvents = useCallback((options?: { preserveStateForPause?: boolean }) => {
        timeoutsRef.current.forEach(id => clearTimeout(id));
        timeoutsRef.current = [];

        metronomeRef.current.isPlaying = false;
        if (metronomeRef.current.timerId) clearTimeout(metronomeRef.current.timerId);
        metronomeRef.current.timerId = null;
        metronomeRef.current.nextBeatTime = undefined;

        stopAudio();

        if (!options?.preserveStateForPause) {
            nextSequenceParamsRef.current = null;
            notesRef.current = [];
            historyRef.current = [];
            particlesRef.current = [];
            directionRef.current = 1;
            isLastSequenceScheduledRef.current = false;
            lastPitchYRef.current = null; // Reset last pitch position
            phaseOverlayOpacityRef.current = { preview: 0, target: 0 };
        }
    }, [stopAudio]);

    const controlsTimeoutRef = useRef<number | null>(null);
    const toggleControls = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying && !isPaused && !isExerciseComplete) {
            controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 2000);
        }
    }, [isPlaying, isPaused, isExerciseComplete]);

    const getNoteStreamLeadTime = useCallback(() => {
        const timeWindow = 5.0 * engineParams.historyScale;
        return timeWindow * (1 - cursorRatio);
    }, [engineParams.historyScale, cursorRatio]);

    const createNotes = useCallback((rootMidi: number, anchorTime: number, type: 'preview' | 'target') => {
        const beatDur = 60 / exercise.tempo_bpm;

        const notes: any[] = [];
        let currentBeat = 0;

        for (const noteEvent of exercise.notes) {
            if (noteEvent.type === 'note' && typeof noteEvent.semitone === 'number') {
                const midi = rootMidi + noteEvent.semitone;
                const freq = getFrequency(midi);
                const dur = noteEvent.duration;
                const absoluteHitTime = anchorTime + (currentBeat * beatDur);

                const waveType: OscillatorType = type === 'preview' ? 'triangle' : 'sine';
                const volume = type === 'preview' ? 0.4 : 0.35;
                playNote(freq, absoluteHitTime, dur * beatDur, waveType, volume);

                notes.push({
                    id: Math.random(),
                    midi, freq,
                    lyric: noteEvent.lyric || null,
                    visual: noteEvent.visual || null,
                    startTime: absoluteHitTime,
                    duration: dur * beatDur,
                    type: type,
                    hit: false,
                    hitSegments: []
                });
            }
            currentBeat += noteEvent.duration;
        }
        return { notes, totalDuration: currentBeat * beatDur };
    }, [playNote, exercise]);

    const scheduleEvent = useCallback((callback: () => void, delayMs: number) => {
        if (!isPlaying || isPausedRef.current || isExerciseComplete) return;
        const id = window.setTimeout(() => {
            if (isPlaying && !isPausedRef.current && !isExerciseComplete) callback();
        }, delayMs);
        timeoutsRef.current.push(id);
    }, [isPlaying, isExerciseComplete]);

    const scheduleNextSequence = useCallback((rootMidi: number, sequenceStartTime: number) => {
        if (!isPlaying || isExerciseComplete || !audioContext) return;

        const now = audioContext.currentTime;

        const { notes, totalDuration } = createNotes(rootMidi, sequenceStartTime, 'target');
        notesRef.current = [...notesRef.current, ...notes];

        const beatDur = 60 / exercise.tempo_bpm;
        const gapDuration = 2.0 * beatDur;
        const nextSequenceAnchorTime = sequenceStartTime + totalDuration + gapDuration;

        const noteSemitones = exercise.notes.map(n => n.semitone || 0);
        const maxPatternInterval = Math.max(...noteSemitones);

        let nextRootMidi = rootMidi + directionRef.current;
        let shouldStop = false;

        if (directionRef.current === 1) {
            const projectedPeak = nextRootMidi + maxPatternInterval;
            if (projectedPeak > vocalRange.max) {
                directionRef.current = -1;
                nextRootMidi = rootMidi - 1;
            }
        }

        if (directionRef.current === -1) {
            if (nextRootMidi < vocalRange.min) {
                shouldStop = true;
            }
        }

        const willBeLastSequence = shouldStop;

        if (willBeLastSequence && !isLastSequenceScheduledRef.current) {
            isLastSequenceScheduledRef.current = true;
            const completionDelaySec = nextSequenceAnchorTime - now;
            scheduleEvent(() => {
                if (!isPlaying || isPausedRef.current || isExerciseComplete) return;
                stopAllLocalEvents();
                onExerciseComplete();
            }, Math.max(0, completionDelaySec * 1000));

            return;
        } else if (isLastSequenceScheduledRef.current) {
            return;
        }

        nextSequenceParamsRef.current = { rootMidi: nextRootMidi, startTime: nextSequenceAnchorTime };

        const timeToNextGenMs = (nextSequenceAnchorTime - getNoteStreamLeadTime() - now) * 1000;
        const safeDelayMs = Math.max(0, timeToNextGenMs);

        scheduleEvent(() => {
            if (!isPlaying || isPausedRef.current || isExerciseComplete) return;
            setCurrentKeyMidi(nextRootMidi);
            scheduleNextSequence(nextRootMidi, nextSequenceAnchorTime);
        }, safeDelayMs);

    }, [
        isPlaying, isExerciseComplete, vocalRange, exercise,
        getNoteStreamLeadTime, createNotes, onExerciseComplete, audioContext, stopAllLocalEvents,
        scheduleEvent
    ]);

    const startGame = useCallback(() => {
        stopAllLocalEvents();
        setIsPaused(false);
        directionRef.current = 1;

        if (!audioContext || audioContext.state === 'closed') return;

        const now = audioContext.currentTime;
        const leadTime = getNoteStreamLeadTime();
        const beatDur = 60 / exercise.tempo_bpm;

        const startKey = vocalRange.min;
        setCurrentKeyMidi(startKey);

        const anchorTime = now + leadTime;

        if (isMetronomeOn && audioContext) {
            scheduleMetronome(audioContext, exercise.tempo_bpm, metronomeRef, isMetronomeOn, anchorTime);
        }

        const previewData = createNotes(startKey, anchorTime, 'preview');
        notesRef.current = [...previewData.notes];

        const initialGapDuration = 2.0 * beatDur;
        const firstTargetStartTime = anchorTime + previewData.totalDuration + initialGapDuration;

        scheduleNextSequence(startKey, firstTargetStartTime);

        toggleControls();
    }, [audioContext, createNotes, getNoteStreamLeadTime, isMetronomeOn, scheduleNextSequence, stopAllLocalEvents, toggleControls, vocalRange, exercise]);

    // Refactored Pause/Resume Effect
    useEffect(() => {
        if (!isPlaying || isExerciseComplete) {
            return; // Only manage pause state if the game is active
        }

        if (isPaused) {
            // --- PAUSE ---
            stopAllLocalEvents({ preserveStateForPause: true });
            if (audioContext && audioContext.state === 'running') {
                audioContext.suspend();
            }
        } else {
            // --- RESUME ---
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    // This code runs *after* successful resume
                    if (isMetronomeOn && audioContext) {
                        scheduleMetronome(audioContext, exercise.tempo_bpm, metronomeRef, isMetronomeOn, audioContext.currentTime);
                    }

                    if (nextSequenceParamsRef.current) {
                        const { rootMidi, startTime } = nextSequenceParamsRef.current;
                        const now = audioContext.currentTime;
                        const leadTime = getNoteStreamLeadTime();

                        const timeToNextGenMs = (startTime - leadTime - now) * 1000;
                        const safeDelayMs = Math.max(0, timeToNextGenMs);

                        scheduleEvent(() => {
                            if (isPausedRef.current) return; // Final check before rescheduling
                            scheduleNextSequence(rootMidi, startTime);
                        }, safeDelayMs);
                    }
                });
            }
        }
    }, [isPaused, isPlaying, isExerciseComplete, audioContext, isMetronomeOn, exercise.tempo_bpm, stopAllLocalEvents, getNoteStreamLeadTime, scheduleNextSequence, scheduleEvent]);


    useEffect(() => {
        if (isPlaying) {
            if (isPaused) return;

            if (audioContext && audioContext.state !== 'closed') {
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        startGame();
                    }).catch(e => {
                        console.error("Failed to resume AudioContext", e);
                        startGame();
                    });
                } else {
                    startGame();
                }
            }
        } else {
            setIsPaused(false);
            stopAllLocalEvents();
            setShowControls(true);
        }
        return () => {
            stopAllLocalEvents();
        };
    }, [isPlaying, exercise, audioContext]); // Removed isPaused, startGame, stopAllLocalEvents to stabilize

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const handleCenterClick = () => {
        if (!isPlaying) {
            onPlayPause();
        } else {
            setIsPaused(!isPaused);
        }
    };

    const loopParamsRef = useRef({
        isPlaying, isPaused, isExerciseComplete, audioContext, bpm: exercise.tempo_bpm,
        engineParams, currentTheme, vocalRange, exercise, createNotes, onExerciseComplete,
        stopAllLocalEvents, scheduleNextSequence, getNoteStreamLeadTime, playNote, stopAudio,
        onPlayPause, onRestart, onExit, onNextExercise, micActive, onToggleMic,
        userPitchRef, currentKeyMidiRef, notesRef, historyRef, particlesRef, cameraRef, metronomeRef,
        phaseOverlayOpacityRef
    });

    useEffect(() => {
        loopParamsRef.current = {
            isPlaying, isPaused, isExerciseComplete, audioContext, bpm: exercise.tempo_bpm,
            engineParams, currentTheme, vocalRange, exercise, createNotes, onExerciseComplete,
            stopAllLocalEvents, scheduleNextSequence, getNoteStreamLeadTime, playNote, stopAudio,
            onPlayPause, onRestart, onExit, onNextExercise, micActive, onToggleMic,
            userPitchRef, currentKeyMidiRef, notesRef, historyRef, particlesRef, cameraRef, metronomeRef,
            phaseOverlayOpacityRef
        };
    }, [
        isPlaying, isPaused, isExerciseComplete, audioContext, exercise,
        engineParams, currentTheme, vocalRange, createNotes, onExerciseComplete, stopAllLocalEvents,
        scheduleNextSequence, getNoteStreamLeadTime, micActive, playNote, stopAudio,
        onPlayPause, onRestart, onExit, onNextExercise, onToggleMic,
        userPitchRef, currentKeyMidiRef, notesRef, historyRef, particlesRef, cameraRef, metronomeRef,
        phaseOverlayOpacityRef
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = dimensions.width;
        const height = dimensions.height;

        const extendedGrid = [];
        for (let m = 36; m <= 96; m++) {
            const midiIndex = m % 12;
            const isNatural = [0, 2, 4, 5, 7, 9, 11].includes(midiIndex);
            extendedGrid.push({ midi: m, freq: getFrequency(m), isNatural });
        }

        let animationFrameId: number;

        const loop = () => {
            const {
                isPlaying, isPaused, isExerciseComplete, audioContext, bpm,
                engineParams, currentTheme,
                userPitchRef, currentKeyMidiRef, notesRef, historyRef, particlesRef, cameraRef, phaseOverlayOpacityRef
            } = loopParamsRef.current;

            const currentPitch = userPitchRef.current || -1;
            const hasSignalNow = currentPitch > 50 && currentPitch < 2000;
            const cursorX = width * cursorRatio;
            const now = audioContext ? audioContext.currentTime : 0;

            const keyMidi = currentKeyMidiRef.current;
            let dynamicCenterMidi = keyMidi + 5;
            if (!isPlaying && hasSignalNow) {
                const { midi } = getNote(currentPitch);
                if (midi > 0) dynamicCenterMidi = midi;
            }

            const targetCenterFreq = getFrequency(dynamicCenterMidi);
            const octavesVisible = engineParams.verticalZoom;
            const freqRatio = Math.pow(2, octavesVisible / 2);
            const targetMinF = targetCenterFreq / freqRatio;
            const targetMaxF = targetCenterFreq * freqRatio;

            const DAMPING_FACTOR = 0.05;
            cameraRef.current.minF += (targetMinF - cameraRef.current.minF) * DAMPING_FACTOR;
            cameraRef.current.maxF += (targetMaxF - cameraRef.current.maxF) * DAMPING_FACTOR;

            const { minF, maxF } = cameraRef.current;

            const getLogY = (f: number) => {
                const safeF = Math.max(1, f);
                const safeMin = Math.max(1, minF);
                const safeMax = Math.max(1, maxF);
                if (safeMax === safeMin) return height / 2;
                const normalized = (Math.log(safeF) - Math.log(safeMin)) / (Math.log(safeMax) - Math.log(safeMin));
                return height - (normalized * height);
            }

            const pixelsPerSecond = (width / 5) / engineParams.historyScale;

            ctx.fillStyle = currentTheme.background;
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = currentTheme.surface;
            ctx.fillRect(0, 0, cursorX, height);

            ctx.font = '10px monospace';

            extendedGrid.forEach(item => {
                if (item.freq > maxF || item.freq < minF) return;
                const y = getLogY(item.freq);

                ctx.strokeStyle = currentTheme.gridLines;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();

                if (item.isNatural) {
                    const { note: gridNote, octave: gridOctave } = getNote(item.freq);
                    ctx.fillStyle = currentTheme.gridLabels;
                    ctx.fillText(`${gridNote}${gridOctave}`, 5, y - 2);
                }
            });

            // --- PHASE LABEL ANIMATION & DRAWING ---
            // Determine which phase is currently visible on screen
            let isPreviewVisible = false;
            let isTargetVisible = false;

            if (isPlaying && !isExerciseComplete && !isPaused) {
                const bufferX = 100; // Look slightly off screen to fade smoothly
                for (const note of notesRef.current) {
                    const deltaT = note.startTime - now;
                    const noteWidth = note.duration * pixelsPerSecond;
                    const noteX = cursorX + (deltaT * pixelsPerSecond);
                    // Check if note overlaps the visible area (0 to width)
                    if (noteX < width + bufferX && noteX + noteWidth > -bufferX) {
                        if (note.type === 'preview') isPreviewVisible = true;
                        if (note.type === 'target') isTargetVisible = true;
                    }
                }
            }

            // Smoothly interpolate opacities
            const OPACITY_SPEED = 0.05;
            phaseOverlayOpacityRef.current.preview += ((isPreviewVisible ? 1 : 0) - phaseOverlayOpacityRef.current.preview) * OPACITY_SPEED;
            phaseOverlayOpacityRef.current.target += ((isTargetVisible ? 1 : 0) - phaseOverlayOpacityRef.current.target) * OPACITY_SPEED;

            // Draw Phase Labels (Behind notes, but prominent)
            const drawPhaseLabel = (text: string, opacity: number, color: string, y: number) => {
                if (opacity < 0.01) return;
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.fillStyle = color;
                ctx.font = '900 60px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, width / 2, y);
                ctx.restore();
            };

            drawPhaseLabel("LISTEN", phaseOverlayOpacityRef.current.preview, 'rgba(251, 191, 36, 0.3)', height / 2); // Amber


            if (isPlaying && !isExerciseComplete) {
                notesRef.current = notesRef.current.filter(note => {
                    const deltaT = note.startTime - now;
                    const noteWidth = note.duration * pixelsPerSecond;
                    const noteX = cursorX + (deltaT * pixelsPerSecond);
                    return (noteX + noteWidth) > 0;
                });

                notesRef.current.forEach(note => {
                    const deltaT = note.startTime - now;
                    const noteWidth = note.duration * pixelsPerSecond;
                    const noteX = cursorX + (deltaT * pixelsPerSecond);
                    const noteY = getLogY(note.freq);

                    if (noteX > width) return;

                    const isCrossingCursor = noteX <= cursorX && (noteX + noteWidth) >= cursorX;

                    let isHittingThisFrame = false;
                    const timeInNote = now - note.startTime;

                    if (!isPaused && note.type === 'target' && isCrossingCursor && hasSignalNow) {
                        const { midi } = getNote(currentPitch);
                        if (Math.abs(midi - note.midi) < 0.6) {
                            note.hit = true;
                            isHittingThisFrame = true;

                            if (!note.hitSegments) note.hitSegments = [];
                            const segments = note.hitSegments;
                            const lastSeg = segments[segments.length - 1];
                            if (lastSeg && (timeInNote - lastSeg.end) < 0.1) {
                                lastSeg.end = timeInNote;
                            } else {
                                segments.push({ start: timeInNote, end: timeInNote });
                            }
                        }
                    }

                    if (noteY < -50 || noteY > height + 50) return;

                    const semitoneHeight = height / (engineParams.verticalZoom * 12);
                    const rectHeight = semitoneHeight * 0.8;
                    const radius = rectHeight / 2;
                    const drawWidth = Math.max(rectHeight, noteWidth);

                    const pillPath = new Path2D();
                    pillPath.roundRect(noteX, noteY - rectHeight / 2, drawWidth, rectHeight, radius);

                    ctx.save();
                    ctx.clip(pillPath);

                    const bgGrad = ctx.createLinearGradient(0, noteY - rectHeight / 2, 0, noteY + rectHeight / 2);
                    if (note.type === 'preview') {
                        bgGrad.addColorStop(0, 'rgba(251, 191, 36, 0.6)'); // Amber-400
                        bgGrad.addColorStop(1, 'rgba(217, 119, 6, 0.4)');  // Amber-600
                    } else {
                        bgGrad.addColorStop(0, '#a78bfa');
                        bgGrad.addColorStop(0.5, '#8b5cf6');
                        bgGrad.addColorStop(1, '#7c3aed');
                    }
                    ctx.fillStyle = bgGrad;
                    ctx.fill(pillPath);

                    if (note.hitSegments && note.hitSegments.length > 0) {
                        const successGrad = ctx.createLinearGradient(0, noteY - rectHeight / 2, 0, noteY + rectHeight / 2);
                        successGrad.addColorStop(0, '#34d399');
                        successGrad.addColorStop(0.5, '#10b981');
                        successGrad.addColorStop(1, '#059669');
                        ctx.fillStyle = successGrad;

                        for (const seg of note.hitSegments) {
                            const segX = cursorX + (note.startTime + seg.start - now) * pixelsPerSecond;
                            const segW = (seg.end - seg.start) * pixelsPerSecond;
                            if (segW > 0) {
                                ctx.fillRect(segX, noteY - rectHeight / 2, segW, rectHeight);
                            }
                        }
                    }

                    const shineGrad = ctx.createLinearGradient(0, noteY - rectHeight / 2, 0, noteY);
                    shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
                    shineGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
                    shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = shineGrad;
                    ctx.fillRect(noteX, noteY - rectHeight / 2, drawWidth, rectHeight);

                    const rimGrad = ctx.createLinearGradient(0, noteY, 0, noteY + rectHeight / 2);
                    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                    rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
                    ctx.fillStyle = rimGrad;
                    ctx.fillRect(noteX, noteY, drawWidth, rectHeight / 2);

                    ctx.restore();

                    ctx.strokeStyle = note.type === 'preview' ? 'rgba(217, 119, 6, 0.5)' : 'rgba(255,255,255,0.4)';
                    ctx.lineWidth = 1;
                    ctx.stroke(pillPath);

                    if (note.lyric && drawWidth > 20) {
                        ctx.fillStyle = 'rgba(255,255,255,0.9)';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(note.lyric, noteX + drawWidth / 2, noteY);
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'alphabetic';
                    }

                    if (isHittingThisFrame) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(0, 0, cursorX, height);
                        ctx.clip();
                        ctx.clip(pillPath);

                        const grd = ctx.createLinearGradient(cursorX - 50, 0, cursorX, 0);
                        grd.addColorStop(0, 'rgba(255, 255, 255, 0)');
                        grd.addColorStop(1, 'rgba(255, 255, 255, 0.4)');

                        ctx.fillStyle = grd;
                        ctx.fillRect(cursorX - 50, noteY - rectHeight / 2, 50, rectHeight);
                        ctx.restore();

                        if (Math.random() < 0.4) {
                            const pCount = Math.floor(Math.random() * 2) + 1;
                            for (let k = 0; k < pCount; k++) {
                                particlesRef.current.push({
                                    x: cursorX,
                                    y: noteY + (Math.random() - 0.5) * rectHeight * 0.8,
                                    vx: -(pixelsPerSecond * 0.015) - (Math.random() * 3),
                                    vy: (Math.random() - 0.5) * 4,
                                    life: 1.0,
                                    decay: 0.03 + Math.random() * 0.05,
                                    size: 1.5 + Math.random() * 3.0,
                                    color: currentTheme.success
                                });
                            }
                        }
                    }
                });
            }

            if (particlesRef.current.length > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, cursorX, height);
                ctx.clip();

                for (const p of particlesRef.current) {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life -= p.decay;

                    if (p.life > 0) {
                        ctx.globalAlpha = p.life;
                        ctx.fillStyle = p.color;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.restore();
                particlesRef.current = particlesRef.current.filter(p => p.life > 0);
            }

            const history = historyRef.current;
            const maxHistoryDuration = (width / pixelsPerSecond) * engineParams.historyScale;
            historyRef.current = historyRef.current.filter(point => (now - point.time) < maxHistoryDuration);

            if (!isPaused && !isExerciseComplete) {
                historyRef.current.push({ val: hasSignalNow ? currentPitch : 0, time: now });
            }

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, cursorX, height);
            ctx.clip();

            if (history.length > 1) {
                ctx.beginPath();
                const gradient = ctx.createLinearGradient(0, 0, cursorX, 0);
                gradient.addColorStop(0, `${currentTheme.secondary}00`);
                gradient.addColorStop(0.8, currentTheme.secondary);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;

                let startedPath = false;
                for (let i = history.length - 1; i >= 0; i--) {
                    const { val, time } = history[i];
                    if (val <= 0) {
                        startedPath = false;
                        continue;
                    }
                    const x = cursorX - (now - time) * pixelsPerSecond;
                    if (x < 0) break;
                    const y = getLogY(val);

                    if (!startedPath) {
                        ctx.moveTo(x, y);
                        startedPath = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            }
            ctx.restore();

            ctx.strokeStyle = currentTheme.primary;
            ctx.beginPath();
            ctx.moveTo(cursorX, 0);
            ctx.lineTo(cursorX, height);
            ctx.stroke();

            // --- Draw User Pitch Cursor (Persistent) ---
            if (!isPaused && !isExerciseComplete) {
                if (lastPitchYRef.current === null) {
                    lastPitchYRef.current = height / 2;
                }

                let cursorY;
                if (hasSignalNow) {
                    cursorY = getLogY(currentPitch);
                    lastPitchYRef.current = cursorY; // Update last known position
                } else {
                    cursorY = lastPitchYRef.current; // Use last known position
                }

                ctx.fillStyle = hasSignalNow ? currentTheme.primary : currentTheme.textSubtle;
                ctx.beginPath();
                ctx.arc(cursorX, cursorY, 6, 0, Math.PI * 2);
                ctx.fill();
            }

            if (isPaused && !isExerciseComplete) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(0, 0, width, height);

                ctx.fillStyle = currentTheme.text;
                ctx.font = 'bold 32px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText("PAUSED", width / 2, height / 2);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
            }

            if (isExerciseComplete) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(0, 0, width, height);
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [canvasRef, dimensions, cursorRatio]);

    const { note, octave, cents } = getNote(userPitch);
    const hasSignal = (userPitch || 0) > 50 && (userPitch || 0) < 2000;

    return (
        <div className="h-full w-full flex flex-col font-sans overflow-hidden" style={{ backgroundColor: currentTheme.background, color: currentTheme.text }}>
            <style>
                {`@keyframes shine { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}
            </style>

            <div className="flex-grow relative min-h-0" ref={containerRef}>
                <canvas
                    ref={canvasRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="block w-full h-full relative z-10"
                    style={{ cursor: 'default' }}
                />

                <div className="absolute top-2 left-2 md:top-4 md:left-4 z-50 pointer-events-auto">
                    <button onClick={onExit} className="w-10 h-10 bg-white/40 backdrop-blur-xl border border-slate-200/50 rounded-full flex items-center justify-center shadow-lg hover:bg-white/60 transition-all">
                        <ArrowLeft size={20} className="text-slate-700" />
                    </button>
                </div>

                <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="flex items-center justify-center w-32 h-12 bg-white/40 backdrop-blur-xl border border-slate-200/50 shadow-xl rounded-3xl">
                        <div className={`font-black tracking-tighter text-2xl ${hasSignal ? 'text-slate-900' : 'text-slate-400'}`}>
                            {hasSignal ? note : '--'}
                        </div>
                        {hasSignal && (
                            <div className="font-bold text-slate-500 text-sm ml-0.5 translate-y-[2px]">
                                {octave}
                            </div>
                        )}
                        {hasSignal && (<div className={`w-2 h-2 rounded-full ml-2 ${Math.abs(cents) < 10 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-violet-500'}`} />)}
                    </div>
                </div>

                <div className="absolute top-2 left-14 md:top-4 md:left-16 z-50 pointer-events-none">
                    <div className="bg-white/40 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-2 md:p-3 flex flex-col items-center shadow-xl">
                        <div className="flex items-center gap-1 md:gap-2 pointer-events-auto">
                            <span className="text-lg md:text-xl font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 leading-none min-w-[30px] text-center">{exercise.tempo_bpm}</span>
                        </div>
                        <span className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-0.5">Tempo</span>
                        <button onClick={() => setIsMetronomeOn(m => !m)} className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-white/50 backdrop-blur-md border border-slate-200/50 transition-all btn-interactive mt-2 ${isMetronomeOn ? 'text-violet-600' : 'text-slate-600 hover:text-slate-900'}`} aria-label={isMetronomeOn ? "Turn metronome off" : "Turn metronome on"}>
                            {isMetronomeOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>
                    </div>
                </div>

                <div className="absolute left-0 right-0 bottom-8 z-50 flex items-center justify-center gap-8 pointer-events-auto">
                    {/* Back Button */}
                    <button
                        onClick={onExit}
                        className="w-16 h-16 rounded-full bg-yellow-400 hover:bg-yellow-300 border-2 border-yellow-500/20 text-yellow-900 flex items-center justify-center shadow-xl hover:scale-105 transition-all"
                        aria-label="Exit exercise"
                    >
                        <ArrowLeft size={28} />
                    </button>

                    {/* Play/Pause Button */}
                    <button
                        onClick={handleCenterClick}
                        className="w-24 h-24 rounded-full group transition-all transform hover:scale-105 active:scale-95 text-white shadow-2xl overflow-hidden relative"
                        style={{
                            backgroundImage: `linear-gradient(to bottom right, #8b5cf6, #d946ef, #facc15)`,
                            boxShadow: `0 8px 32px rgba(217, 70, 239, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
                        <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine ${isPaused ? 'opacity-0' : 'opacity-100'}`} style={{ animationName: 'shine', animationDuration: '0.7s', animationDelay: '0s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationPlayState: 'running' }}></div>
                        <div className="relative z-10 flex items-center justify-center h-full w-full">
                            {isPlaying && !isPaused
                                ? <Pause size={36} fill="currentColor" />
                                : <Play size={36} fill="currentColor" className="ml-1" />}
                        </div>
                    </button>

                    {/* Restart Button */}
                    <button
                        onClick={onRestart}
                        className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 flex items-center justify-center shadow-lg hover:bg-white hover:scale-105 transition-all"
                        aria-label="Restart game"
                    >
                        <RotateCcw size={28} />
                    </button>
                </div>

                {isExerciseComplete && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <h3 className="text-white text-3xl md:text-4xl font-black mb-6 animate-in fade-in zoom-in-95 duration-300">
                            Good job!
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={onNextExercise}
                                className="py-3 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg transition-all btn-interactive flex items-center gap-2"
                            >
                                <Play size={20} className="fill-current" /> Next Exercise
                            </button>
                            <button
                                onClick={onRestart}
                                className="py-3 px-6 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-lg transition-all btn-interactive flex items-center gap-2"
                            >
                                <RotateCcw size={20} /> Restart Current
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- DATA ---

const EXERCISE_DATA: { exercises: ExerciseGroup[] } = {
    "exercises": [
        {
            "group": "Warmup",
            "exercises": [
                { "exercise_id": "EX_011", "name": "Messa di Voce", "category": "Breath", "tempo_bpm": 60, "description": "Long sustained note. Start soft, get loud, end soft.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 4, "lyric": "Ah" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 4, "lyric": "Ah" }] },
                { "exercise_id": "FAM_008", "name": "The Siren", "category": "Slides", "tempo_bpm": 60, "description": "Smooth slide. Connects bottom to top range.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ooo" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "Ooo" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 4, "lyric": "Ooo" }] },
                { "exercise_id": "FAM_002", "name": "Descending 5-Tone", "category": "Gentle", "tempo_bpm": 90, "description": "The classic 'Mum' warmup scale (5-4-3-2-1).", "notes": [{ "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Mum" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 1, "lyric": "Mum" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Mum" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Mum" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 4, "lyric": "Mum" }] },
                { "exercise_id": "COOL_001", "name": "Gentle Slide Down", "category": "Cool Down", "tempo_bpm": 80, "description": "Relaxing 5-3-1 pattern. Use at the end.", "notes": [{ "type": "note", "semitone": 7, "visual": "5", "duration": 2, "lyric": "Hum" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 2, "lyric": "Hum" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 4, "lyric": "Hum" }] }
            ]
        },
        {
            "group": "Technique",
            "exercises": [
                { "exercise_id": "EX_012", "name": "Vowel Purity Scale", "category": "Resonance", "tempo_bpm": 90, "description": "Focus on consistent vowel shape.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ah" }] },
                { "exercise_id": "EX_020", "name": "Vowel Uniformity", "category": "Resonance", "tempo_bpm": 100, "description": "Cycle vowels Ee-Ah-Oo while keeping tone consistent.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ee" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Oo" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "Ee" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Oo" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ee" }] },
                { "exercise_id": "FAM_006", "name": "Staccato Arpeggio", "category": "Diaphragm", "tempo_bpm": 90, "description": "Short notes to engage the diaphragm.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ha" }] },
                { "exercise_id": "FAM_007", "name": "The 'Neigh' Octave", "category": "Mix Voice", "tempo_bpm": 110, "description": "Pharyngeal sound to connect chest/head.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "Nay" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "Nay" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "Nay" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "Nay" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Nay" }] },
                { "exercise_id": "EX_026", "name": "Edgy Ah", "category": "Belting", "tempo_bpm": 100, "description": "Power exercise. 5-6-8-6-5.", "notes": [{ "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "AH" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 1, "lyric": "AH" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "AH" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 1, "lyric": "AH" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 2, "lyric": "AH" }] },
                { "exercise_id": "FAM_004", "name": "1.5 Octave Scale", "category": "Range", "tempo_bpm": 120, "description": "Extends to the 11th. Great for range.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 11, "visual": "7", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 14, "visual": "9", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 16, "visual": "10", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 17, "visual": "11", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 16, "visual": "10", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 14, "visual": "9", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 11, "visual": "7", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "La" }] }
            ]
        },
        {
            "group": "Agility",
            "exercises": [
                { "exercise_id": "EX_007", "name": "Major Arpeggio", "category": "Scales", "tempo_bpm": 100, "description": "1-3-5-8.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "La" }] },
                { "exercise_id": "EX_010", "name": "Minor Arpeggio", "category": "Scales", "tempo_bpm": 100, "description": "1-b3-5-8 (Minor).", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 3, "visual": "b3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 3, "visual": "b3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "La" }] },
                { "exercise_id": "FAM_001", "name": "Hanon Run (No. 1)", "category": "Pattern", "tempo_bpm": 70, "description": "Piano dexterity adapted for voice. 16th notes.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 0.25, "lyric": "Ha" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.25, "lyric": "Ha" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.25, "lyric": "Ha" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.25, "lyric": "Ha" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 0.25, "lyric": "Ha" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.25, "lyric": "Ha" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.25, "lyric": "Ha" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.25, "lyric": "Ha" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ha" }] },
                { "exercise_id": "FAM_005", "name": "The Rossini Scale", "category": "Pattern", "tempo_bpm": 115, "description": "Gold standard 9-tone scale.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 11, "visual": "7", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 14, "visual": "9", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 11, "visual": "7", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 0.5, "lyric": "A" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "A" }] },
                { "exercise_id": "EX_027", "name": "Descending Scale", "category": "Scales", "tempo_bpm": 90, "description": "Major Scale Down.", "notes": [{ "type": "note", "semitone": 12, "visual": "8", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 11, "visual": "7", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ah" }] },
                { "exercise_id": "EX_028", "name": "Descending Arpeggio", "category": "Scales", "tempo_bpm": 100, "description": "Control intervals going down.", "notes": [{ "type": "note", "semitone": 12, "visual": "8", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "La" }] },
                { "exercise_id": "EX_030", "name": "Rapid Consonants", "category": "Diction", "tempo_bpm": 110, "description": "Tongue coordination. Sing crisp 'Dig-Ga'.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 0.5, "lyric": "Dig" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 0.5, "lyric": "Ga" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "Dig" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.5, "lyric": "Ga" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "Dig" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.5, "lyric": "Ga" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "Dig" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 0.5, "lyric": "Ga" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Dig" }] },
                { "exercise_id": "ALT_001", "name": "Harmonic Minor", "category": "Scales", "tempo_bpm": 100, "description": "Raised 7th (Classical Minor).", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 3, "visual": "b3", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 8, "visual": "b6", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 11, "visual": "7", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 11, "visual": "7", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 8, "visual": "b6", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 3, "visual": "b3", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "La" }] },
                { "exercise_id": "ALT_003", "name": "Whole Tone Scale", "category": "Scales", "tempo_bpm": 90, "description": "Dreamy (Whole steps).", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 6, "visual": "#4", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 8, "visual": "#5", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 10, "visual": "b7", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "Ah" }] },
                { "exercise_id": "ALT_004", "name": "Major Pentatonic", "category": "Scales", "tempo_bpm": 100, "description": "1-2-3-5-6.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Oh" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Oh" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Oh" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Oh" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 1, "lyric": "Oh" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "Oh" }] }
            ]
        },
        {
            "group": "Ear",
            "exercises": [
                { "exercise_id": "EX_004", "name": "Octave Jumps", "category": "Intervals", "tempo_bpm": 90, "description": "Root to Octave.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ah" }] },
                { "exercise_id": "EX_006", "name": "Third Intervals", "category": "Intervals", "tempo_bpm": 100, "description": "Major 3rd interval.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "La" }] },
                { "exercise_id": "EX_021", "name": "Minor Third Intervals", "category": "Intervals", "tempo_bpm": 100, "description": "Minor 3rd (Sad).", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 3, "visual": "b3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 3, "visual": "b3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 3, "visual": "b3", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "La" }] },
                { "exercise_id": "EX_016", "name": "Sixth Intervals", "category": "Intervals", "tempo_bpm": 90, "description": "Major 6th.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ah" }] },
                { "exercise_id": "EX_022", "name": "Scale of Fifths", "category": "Intervals", "tempo_bpm": 90, "description": "Circle of Fifths pattern.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 11, "visual": "7", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "Ah" }] },
                { "exercise_id": "EX_032", "name": "Tritone Challenge", "category": "Intervals", "tempo_bpm": 80, "description": "The 'Simpsons' interval.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 6, "visual": "#4", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 6, "visual": "#4", "duration": 1, "lyric": "La" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "La" }] },
                { "exercise_id": "EX_008", "name": "Chromatic Scale", "category": "Pitch", "tempo_bpm": 120, "description": "Every semitone.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 1, "visual": "b2", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 3, "visual": "b3", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 6, "visual": "b5", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 8, "visual": "b6", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 10, "visual": "b7", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 11, "visual": "7", "duration": 0.5, "lyric": "La" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "La" }] }
            ]
        },
        {
            "group": "Style",
            "exercises": [
                { "exercise_id": "FAM_003", "name": "Dominant 7th Arp", "category": "Jazz/Pop", "tempo_bpm": 100, "description": "Essential for Jazz. Adds the flat 7.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 10, "visual": "b7", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 1.5, "lyric": "Nay" }, { "type": "note", "semitone": 10, "visual": "b7", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Nay" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Nay" }] },
                { "exercise_id": "ALT_002", "name": "Blues Scale", "category": "Jazz/Pop", "tempo_bpm": 90, "description": "1-b3-4-#4-5-b7.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Bah" }, { "type": "note", "semitone": 3, "visual": "b3", "duration": 1, "lyric": "Da" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 1, "lyric": "Bah" }, { "type": "note", "semitone": 6, "visual": "#4", "duration": 1, "lyric": "Da" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Bah" }, { "type": "note", "semitone": 10, "visual": "b7", "duration": 1, "lyric": "Da" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 3, "lyric": "Bah" }] },
                { "exercise_id": "EX_031", "name": "Jazz 6th Scat", "category": "Jazz/Pop", "tempo_bpm": 100, "description": "Classic Swing sound (1-3-5-6-8).", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 0.5, "lyric": "Doo" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "Bah" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "Doo" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 0.5, "lyric": "Bah" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "Dat" }, { "type": "note", "semitone": 9, "visual": "6", "duration": 0.5, "lyric": "Bah" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "Doo" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "Bah" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Doo" }] }
            ]
        }
    ]
};

const FLATTENED_EXERCISES: Exercise[] = EXERCISE_DATA.exercises.flatMap(group => group.exercises);

const DEFAULT_THEME: Theme = {
    background: '#f8fafc',
    surface: '#ffffff',
    gridLines: '#e2e8f0',
    gridLabels: '#94a3b8',
    primary: '#8b5cf6',
    secondary: '#cbd5e1',
    success: '#10b981',
    text: '#1e293b',
    textSubtle: '#64748b',
    notePreview: 'rgba(251, 191, 36, 0.8)', // Amber for preview
};

// --- MAIN APP COMPONENT ---

function App() {
    const [view, setView] = useState<'landing' | 'game'>('landing');
    const [exerciseGroups] = useState<ExerciseGroup[]>(EXERCISE_DATA.exercises);
    const [allExercises] = useState<Exercise[]>(FLATTENED_EXERCISES);
    const [currentExerciseId, setCurrentExerciseId] = useState<string>(FLATTENED_EXERCISES[0].exercise_id);
    const currentExercise = allExercises.find(ex => ex.exercise_id === currentExerciseId) || allExercises[0];

    const [vocalRange, setVocalRange] = useState<VocalRange>({ min: 48, max: 72 });
    const [globalBpm, setGlobalBpm] = useState(90);
    const [engineParams, setEngineParams] = useState<EngineParams>({
        bias: 0.5,
        gateThreshold: 0.005,
        verticalZoom: 1.5,
        historyScale: 1.5
    });

    const [micActive, setMicActive] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExerciseComplete, setIsExerciseComplete] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [userPitch, setUserPitch] = useState<number | null>(null);

    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const engineParamsRef = useRef(engineParams);
    const micActiveRef = useRef(micActive);
    const currentAudioNodesRef = useRef<Array<{ osc: OscillatorNode, gain: GainNode }>>([]);


    useEffect(() => { engineParamsRef.current = engineParams; }, [engineParams]);
    useEffect(() => { micActiveRef.current = micActive; }, [micActive]);

    const getAudioContext = useCallback(() => {
        if (audioContext) return audioContext;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
        return ctx;
    }, [audioContext]);

    const playNote = useCallback((freq: number, startTime: number, duration: number, type: OscillatorType = 'sine', vol: number = 0.1) => {
        const ctx = audioContext;
        if (!ctx || ctx.state === 'closed') return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Output Filter (The "Speaker") - Low-Pass at 700Hz
        const outputFilter = ctx.createBiquadFilter();
        outputFilter.type = 'lowpass';
        outputFilter.frequency.value = 700;
        outputFilter.Q.value = 0.7;

        osc.type = type;
        osc.frequency.value = freq;

        // Connect: Oscillator -> Filter -> Gain -> Destination
        osc.connect(outputFilter);
        outputFilter.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
        gain.gain.setValueAtTime(vol, startTime + duration - 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);

        currentAudioNodesRef.current.push({ osc, gain });
        const cleanupTime = startTime + duration + 0.2;
        setTimeout(() => {
            currentAudioNodesRef.current = currentAudioNodesRef.current.filter(node => node.osc !== osc);
            try { osc.disconnect(); outputFilter.disconnect(); gain.disconnect(); } catch (e) { }
        }, Math.max(0, (cleanupTime - ctx.currentTime) * 1000));

    }, [audioContext]);

    const stopAudio = useCallback(() => {
        currentAudioNodesRef.current.forEach(({ osc, gain }) => {
            try {
                // FIX: An OscillatorNode cannot have stop() called on it more than once.
                // The playNote function already schedules a stop time. Calling it again here throws an error.
                // Disconnecting the nodes is sufficient to silence them immediately.
                // osc.stop();
                osc.disconnect();
                gain.disconnect();
            } catch (e) {
                console.warn("Error stopping audio node:", e);
            }
        });
        currentAudioNodesRef.current = [];
    }, []);

    useEffect(() => {
        if (!audioContext) return;
        if (isPlaying && audioContext.state === 'suspended') {
            audioContext.resume().catch(e => console.error("Failed to resume AudioContext:", e));
        } else if (!isPlaying && audioContext.state === 'running') {
            audioContext.suspend().catch(e => console.error("Failed to suspend AudioContext:", e));
        }
    }, [isPlaying, audioContext]);

    const toggleMic = useCallback(async () => {
        if (micActiveRef.current) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (sourceRef.current) sourceRef.current.disconnect();
            if (workletNodeRef.current) {
                workletNodeRef.current.disconnect();
                workletNodeRef.current = null;
            }
            setMicActive(false);
            setUserPitch(null);
        } else {
            try {
                const ctx = getAudioContext();
                if (ctx.state === 'suspended') await ctx.resume();

                // Load Audio Worklet Module
                try {
                    await ctx.audioWorklet.addModule('/pitch-processor.js');
                } catch (e) {
                    console.error("Failed to load audio worklet:", e);
                    return;
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: PYIN_CONFIG.audioConstraints
                });
                streamRef.current = stream;

                const source = ctx.createMediaStreamSource(stream);
                sourceRef.current = source;
                let processingChain: AudioNode = source;

                // Apply Frequency Separator (High-Pass Filter)
                if (PYIN_CONFIG.filter.enabled) {
                    const highPassFilter = ctx.createBiquadFilter();
                    highPassFilter.type = PYIN_CONFIG.filter.type as BiquadFilterType;
                    highPassFilter.frequency.value = PYIN_CONFIG.filter.frequency;
                    highPassFilter.Q.value = PYIN_CONFIG.filter.Q;

                    processingChain.connect(highPassFilter);
                    processingChain = highPassFilter;
                }

                // Initialize Audio Worklet
                const workletNode = new AudioWorkletNode(ctx, 'pitch-processor', {
                    processorOptions: {
                        noiseGateThreshold: PYIN_CONFIG.noiseGateThreshold,
                        algorithm: PYIN_CONFIG.algorithm,
                        pyinBias: PYIN_CONFIG.pyinBias,
                        pyinGateMode: PYIN_CONFIG.pyinGateMode
                    }
                });

                workletNode.port.onmessage = (event) => {
                    const { pitch } = event.data;
                    if (pitch && pitch > 0) {
                        setUserPitch(pitch);
                    } else if (pitch === -1) {
                        setUserPitch(null);
                    }
                };

                processingChain.connect(workletNode);
                workletNodeRef.current = workletNode;

                setMicActive(true);
            } catch (error) {
                console.error("Error accessing microphone:", error);
                setMicActive(false);
            }
        }
    }, [getAudioContext]);

    const handleExerciseComplete = useCallback(() => {
        stopAudio();
        setIsPlaying(false);
        setIsExerciseComplete(true);
    }, [stopAudio]);

    const handleNextExercise = useCallback(() => {
        stopAudio();
        const currentIndex = allExercises.findIndex(ex => ex.exercise_id === currentExerciseId);
        const nextIndex = (currentIndex + 1) % allExercises.length;
        setCurrentExerciseId(allExercises[nextIndex].exercise_id);
        setIsExerciseComplete(false);
        setIsPlaying(true);
    }, [allExercises, currentExerciseId, stopAudio]);

    return (
        <div className="w-full h-screen bg-slate-50 text-slate-900 font-sans">
            {view === 'landing' ? (
                <LandingPage
                    exerciseGroups={exerciseGroups}
                    selectedExerciseId={currentExercise.exercise_id}
                    onSelectExercise={setCurrentExerciseId}
                    vocalRange={vocalRange}
                    onRangeChange={setVocalRange}
                    bpm={globalBpm}
                    onBpmChange={setGlobalBpm}
                    engineParams={engineParams}
                    onParamsChange={setEngineParams}
                    onStartGame={() => {
                        getAudioContext();
                        setIsExerciseComplete(false);
                        setView('game');
                        setIsPlaying(false);
                    }}
                    micActive={micActive}
                    onToggleMic={toggleMic}
                />
            ) : (
                <ExerciseGameViewALT
                    exercise={currentExercise}
                    vocalRange={vocalRange}
                    bpm={currentExercise.tempo_bpm || globalBpm}
                    userPitch={userPitch}
                    engineParams={engineParams}
                    currentTheme={DEFAULT_THEME}
                    audioContext={audioContext}
                    isPlaying={isPlaying}
                    isExerciseComplete={isExerciseComplete}
                    playNote={playNote}
                    stopAudio={stopAudio}
                    onPlayPause={() => {
                        if (audioContext && audioContext.state === 'suspended') {
                            audioContext.resume().then(() => setIsPlaying(!isPlaying));
                        } else {
                            setIsPlaying(!isPlaying);
                        }
                    }}
                    onRestart={() => {
                        stopAudio();
                        setIsPlaying(false);
                        setIsExerciseComplete(false);
                        setTimeout(() => setIsPlaying(true), 0);
                    }}
                    onExit={() => {
                        stopAudio();
                        setIsPlaying(false);
                        setIsExerciseComplete(false);
                        setView('landing');
                    }}
                    onExerciseComplete={handleExerciseComplete}
                    onNextExercise={handleNextExercise}
                    micActive={micActive}
                    onToggleMic={toggleMic}
                />
            )}
        </div>
    );
}

export default App;
