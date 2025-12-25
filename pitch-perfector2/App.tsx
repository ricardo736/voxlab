


import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Settings, Mic, Play, Pause, Volume2, VolumeX, MicOff, ChevronDown, ChevronUp, RotateCcw, Zap, ArrowLeft, Music, Activity, Grid, Sliders, X, Star } from 'lucide-react';

/**
 * PT-BR TRANSLATIONS
 */
const PT_BR_TRANSLATIONS = {
    "Pitch Perfector": "Afinador Vocal",
    "Select an exercise to start practicing.": "Selecione um exerc\u00edcio para come\u00e7ar a praticar.",
    "Warmup": "Aquecimento",
    "Technique": "Técnica",
    "Agility": "Agilidade",
    "Ear": "Ouvido",
    "Style": "Estilo",
    "Gentle exercises to safely prepare your voice for singing.": "Exerc\u00edcios suaves para preparar sua voz com seguran\u00e7a.",
    "Build core vocal skills like resonance, breath control, and power.": "Desenvolva habilidades vocais essenciais como resson\u00e2ncia, controle de respira\u00e7\u00e3o e pot\u00eancia.",
    "Improve your ability to sing complex melodies and fast passages.": "Melhore sua capacidade de cantar melodias complexas e passagens r\u00e1pidas.",
    "Sharpen your pitch accuracy and ability to recognize intervals.": "Afine sua precis\u00e3o de tom e capacidade de reconhecer intervalos.",
    "Explore exercises common in specific genres like Jazz and Pop.": "Explore exerc\u00edcios comuns em g\u00eaneros espec\u00edficos como Jazz e Pop.",
    "Configuration": "Configura\u00e7\u00e3o",
    "Game Settings": "Configura\u00e7\u00f5es do Jogo",
    "Global Tempo (BPM)": "Tempo Global (BPM)",
    "Exercises may override this with a suggested tempo.": "Os exerc\u00edcios podem substituir isto com um tempo sugerido.",
    "Vocal Range": "Extens\u00e3o Vocal",
    "Start:": "In\u00edcio:",
    "End:": "Fim:",
    "Engine & Display": "Motor e Visualiza\u00e7\u00e3o",
    "Vertical Zoom": "Zoom Vertical",
    "Octaves": "Oitavas",
    "Horizontal Zoom": "Zoom Horizontal",
    "Lower values = Faster scrolling.": "Valores menores = Rolagem mais r\u00e1pida.",
    "Pitch Bias": "Vi\u00e9s de Tom",
    "Higher bias makes pitch \"stick\" to previous values more.": "Vi\u00e9s maior faz o tom \"grudar\" mais aos valores anteriores.",
    "Noise Gate": "Porta de Ru\u00eddo",
    "LISTEN": "OUÇA",
    "PAUSED": "PAUSADO",
    "Good job!": "Bom trabalho!",
    "Next Exercise": "Pr\u00f3ximo Exerc\u00edcio",
    "Restart Current": "Reiniciar Atual",
    "Listening": "Ouvindo",
    "Detecting": "Detectando",
    // Categories
    "Scales": "Escalas",
    "Pattern": "Padr\u00e3o",
    "Diction": "Dic\u00e7\u00e3o",
    "Intervals": "Intervalos",
    "Pitch": "Afina\u00e7\u00e3o",
    "Jazz/Pop": "Jazz/Pop",
    "Breath": "Respira\u00e7\u00e3o",
    "Slides": "Glissandos",
    "Gentle": "Suave",
    "Cool Down": "Desaquecimento",
    "Resonance": "Resson\u00e2ncia",
    "Diaphragm": "Diafragma",
    "Mix Voice": "Voz Mista",
    "Belting": "Belting",
    "Range": "Extens\u00e3o",
    // Exercise Names & Descriptions
    "Messa di Voce": "Messa di Voce",
    "Long sustained note. Start soft, get loud, end soft.": "Nota longa sustentada. Comece suave, aumente, termine suave.",
    "The Siren": "A Sirene",
    "Smooth slide. Connects bottom to top range.": "Deslize suave. Conecta graves aos agudos.",
    "Descending 5-Tone": "5 Tons Descendentes",
    "Sing 'Mum' on each note going down (5-4-3-2-1). Great warmup!": "Cante 'Mum' em cada nota descendo (5-4-3-2-1). Ótimo aquecimento!",
    "Gentle Slide Down": "Deslize Suave Descendente",
    "Hum gently on 5-3-1. Relax your voice.": "Cantarole suavemente em 5-3-1. Relaxe sua voz.",
    "Vowel Purity Scale": "Escala de Pureza das Vogais",
    "Sing 'Ah' up and down the scale. Keep your vowel shape consistent.": "Cante 'Ah' subindo e descendo a escala. Mantenha a forma da vogal consistente.",
    "Vowel Uniformity": "Uniformidade das Vogais",
    "Cycle vowels Ee-Ah-Oo while keeping tone consistent.": "Alterne vogais Ee-Ah-Oo mantendo o tom consistente.",
    "Staccato Arpeggio": "Arpejo em Staccato",
    "Sing short 'Ha' on each note, like a laugh. Engages your diaphragm.": "Cante 'Ha' curto em cada nota, como uma risada. Engaja seu diafragma.",
    "The 'Neigh' Octave": "A Oitava 'Neigh'",
    "Pharyngeal sound to connect chest/head.": "Som far\u00edngeo para conectar peito/cabe\u00e7a.",
    "Edgy Ah": "Ah Incisivo",
    "Power exercise. 5-6-8-6-5.": "Exerc\u00edcio de pot\u00eancia. 5-6-8-6-5.",
    "1.5 Octave Scale": "Escala de 1,5 Oitava",
    "Extends to the 11th. Great for range.": "Estende at\u00e9 a 11\u00aa. \u00d3timo para extens\u00e3o.",
    // Mic Modal
    "Enable Microphone?": "Habilitar Microfone?",
    "Pitch Perfector works best when it can hear you! Enabling your microphone allows for real-time pitch detection.": "O Pitch Perfector funciona melhor quando pode te ouvir! Habilitar seu microfone permite a detec\u00e7\u00e3o de tom em tempo real.",
    "Activate Mic & Start": "Ativar Microfone e Começar",
    "Continue Without Mic": "Continuar Sem Microfone",
    "Initializing microphone...": "Inicializando microfone...",
    // Voice Types
    "Voice Type": "Tipo de Voz",
    "Baixo": "Baixo",
    "Barítono": "Barítono",
    "Tenor": "Tenor",
    "Contralto": "Contralto",
    "Mezzo-Soprano": "Mezzo-Soprano",
    "Soprano": "Soprano",
    // Lyrics/Syllables
    "Nay": "Nee",
    "Mum": "Mum",
    "Ha": "Rá",
    "Hum": "Hum",
    "Ah": "Ah",
    "Ee": "Ii",
    "Oo": "Uu",
    "La": "Lá",
    "Oh": "Ôa",
    "Dig": "Dig",
    "Ga": "Ga",
    "AH": "ÁH",
    "A": "Á",
    // Exercise Names & Descriptions
    "Major Arpeggio": "Arpejo Maior",
    "1-3-5-8.": "1-3-5-8.",
    "Minor Arpeggio": "Arpejo Menor",
    "1-b3-5-8 (Minor).": "1-b3-5-8 (Menor).",
    "Hanon Run (No. 1)": "Corrida Hanon (N\u00ba 1)",
    "Piano dexterity adapted for voice. 16th notes.": "Destreza de piano adaptada para voz. Semicolcheias.",
    "The Rossini Scale": "A Escala Rossini",
    "Gold standard 9-tone scale.": "Escala padr\u00e3o ouro de 9 tons.",
    "Descending Scale": "Escala Descendente",
    "Major Scale Down.": "Escala Maior Descendo.",
    "Descending Arpeggio": "Arpejo Descendente",
    "Control intervals going down.": "Controle intervalos descendo.",
    "Rapid Consonants": "Consoantes R\u00e1pidas",
    "Tongue coordination. Sing crisp 'Dig-Ga'.": "Coordena\u00e7\u00e3o da l\u00edngua. Cante 'Dig-Ga' n\u00edtido.",
    "Harmonic Minor": "Menor Harm\u00f4nica",
    "Raised 7th (Classical Minor).": "7\u00aa Aumentada (Menor Cl\u00e1ssica).",
    "Whole Tone Scale": "Escala de Tons Inteiros",
    "Dreamy (Whole steps).": "Sonhadora (Tons inteiros).",
    "Major Pentatonic": "Pentat\u00f4nica Maior",
    "1-2-3-5-6.": "1-2-3-5-6.",
    "Octave Jumps": "Saltos de Oitava",
    "Root to Octave.": "T\u00f4nica para Oitava.",
    "Third Intervals": "Intervalos de Ter\u00e7a",
    "Major 3rd interval.": "Intervalo de 3\u00aa Maior.",
    "Minor Third Intervals": "Intervalos de 3\u00aa Menor",
    "Minor 3rd (Sad).": "3\u00aa Menor (Triste).",
    "Sixth Intervals": "Intervalos de Sexta",
    "Major 6th.": "6\u00aa Maior.",
    "Scale of Fifths": "Escala de Quintas",
    "Circle of Fifths pattern.": "Padr\u00e3o do C\u00edrculo de Quintas.",
    "Tritone Challenge": "Desafio do Tritono",
    "The 'Simpsons' interval.": "O intervalo dos 'Simpsons'.",
    "Chromatic Scale": "Escala Crom\u00e1tica",
    "Every semitone.": "Cada semitom.",
    "Dominant 7th Arp": "Arpejo Dominante 7\u00aa",
    "Essential for Jazz. Adds the flat 7.": "Essencial para Jazz. Adiciona a 7\u00aa menor.",
    "Blues Scale": "Escala de Blues",
    "1-b3-4-#4-5-b7.": "1-b3-4-#4-5-b7.",
    "Jazz 6th Scat": "Jazz 6th Scat",
    "Classic Swing sound (1-3-5-6-8).": "Som cl\u00e1ssico de Swing (1-3-5-6-8)."
} as const;

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

export type VoiceType = 'bass' | 'baritone' | 'tenor' | 'alto' | 'mezzo-soprano' | 'soprano' | 'guitar';

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
    frequencySeparation: boolean;
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

    // Favorites
    onToggleFavorite: (id: string) => void;
    isFavorite: boolean;
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
// Voice Type Ranges (MIDI note numbers)
// Based on classical vocal ranges with flexibility for modern singing
const VOICE_TYPE_RANGES: Record<VoiceType, VocalRange> = {
    'bass': { min: 40, max: 64 },          // E2 to E4
    'baritone': { min: 45, max: 69 },      // A2 to A4
    'tenor': { min: 48, max: 72 },         // C3 to C5
    'alto': { min: 55, max: 79 },          // G3 to G5
    'mezzo-soprano': { min: 57, max: 81 }, // A3 to A5
    'soprano': { min: 60, max: 84 },       // C4 to C6
    'guitar': { min: 40, max: 88 }         // E2 to E6 (Standard Tuning 24 frets)
};

const VOICE_TYPE_NAMES: Record<VoiceType, string> = {
    'bass': 'Baixo',
    'baritone': 'Barítono',
    'tenor': 'Tenor',
    'alto': 'Contralto',
    'mezzo-soprano': 'Mezzo-Soprano',
    'soprano': 'Soprano',
    'guitar': 'Guitarra'
};

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
        echoCancellation: true, // Enable to prevent feedback on mobile
        autoGainControl: true,  // Enable to boost quiet mics
        noiseSuppression: true, // Enable to reduce background noise
        latency: 0
    },

    // Frequency Separator (High-Pass Filter)
    // Filters out low-end rumble/noise before pitch detection
    filter: {
        enabled: true,
        type: 'highpass',
        frequency: 100,  // Hz (Standard vocal HPF)
        Q: 0.7           // Quality factor
    },

    // pYIN Algorithm Settings
    algorithm: 'pyin',
    noiseGateThreshold: 0.002, // Lower threshold for mobile mics
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-1000">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-1000">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-violet-100 p-3 rounded-full text-violet-600">
                        <Mic size={24} />
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">{PT_BR_TRANSLATIONS["Enable Microphone?"]}</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                    {PT_BR_TRANSLATIONS["Pitch Perfector works best when it can hear you! Enabling your microphone allows for real-time pitch detection."]}
                </p>

                <div className="space-y-3">
                    <button
                        onClick={onActivateAndStart}
                        className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <Mic size={18} /> {PT_BR_TRANSLATIONS["Activate Mic & Start"]}
                    </button>
                    <button
                        onClick={onContinueWithoutMic}
                        className="w-full py-3 px-4 bg-white/50 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                        {PT_BR_TRANSLATIONS["Continue Without Mic"]}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * COMPONENT: ErrorModal
 */
interface ErrorModalProps {
    message: string;
    onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ message, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-red-100 p-3 rounded-full text-red-600">
                        <X size={24} />
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">Error</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

/**
 * COMPONENT: LoadingModal
 */
interface LoadingModalProps {
    message: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ message }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-700 font-semibold text-center">{message}</p>
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
    voiceType: VoiceType;
    onVoiceTypeChange: (voiceType: VoiceType) => void;
    vocalRange: VocalRange;
    onRangeChange: (range: VocalRange) => void;
    bpm: number;
    onBpmChange: (bpm: number) => void;
    engineParams: EngineParams;
    onParamsChange: (params: EngineParams) => void;
    onStartGame: () => void;
    micActive: boolean;
    onToggleMic: () => void;
    favorites: Set<string>;
    onToggleFavorite: (exerciseId: string) => void;
    currentTheme: Theme;
}

const GROUP_DESCRIPTIONS: { [key: string]: string } = {
    "Warmup": "Gentle exercises to safely prepare your voice for singing.",
    "Technique": "Build core vocal skills like resonance, breath control, and power.",
    "Agility": "Improve your ability to sing complex melodies and fast passages.",
    "Ear": "Sharpen your pitch accuracy and ability to recognize intervals.",
    "Style": "Explore exercises common in specific genres like Jazz and Pop.",
    "Guitar": "Exercises specifically designed for guitar practice."
};

const GROUP_COLORS: { [key: string]: { text: string; bg: string; border: string; hoverText: string; } } = {
    "Warmup": { text: "text-amber-600", bg: "bg-amber-100", border: "hover:border-amber-400", hoverText: "group-hover:text-amber-700" },
    "Technique": { text: "text-sky-600", bg: "bg-sky-100", border: "hover:border-sky-400", hoverText: "group-hover:text-sky-700" },
    "Agility": { text: "text-emerald-600", bg: "bg-emerald-100", border: "hover:border-emerald-400", hoverText: "group-hover:text-emerald-700" },
    "Ear": { text: "text-fuchsia-600", bg: "bg-fuchsia-100", border: "hover:border-fuchsia-400", hoverText: "group-hover:text-fuchsia-700" },
    "Style": { text: "text-rose-600", bg: "bg-rose-100", border: "hover:border-rose-400", hoverText: "group-hover:text-rose-700" },
    "Guitar": { text: "text-orange-600", bg: "bg-orange-100", border: "hover:border-orange-400", hoverText: "group-hover:text-orange-700" },
    "Default": { text: "text-slate-600", bg: "bg-slate-100", border: "hover:border-violet-300", hoverText: "group-hover:text-violet-700" }
};

const LandingPage: React.FC<LandingPageProps> = (props) => {
    const {
        exerciseGroups, selectedExerciseId, onSelectExercise,
        voiceType, onVoiceTypeChange,
        vocalRange, onRangeChange,
        bpm, onBpmChange,
        engineParams, onParamsChange,
        onStartGame, micActive, onToggleMic,
        favorites, onToggleFavorite, currentTheme
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

    const orderedGroups = ["Warmup", "Technique", "Agility", "Ear", "Style", "Guitar"];

    return (
        <div
            className="h-full w-full overflow-y-auto font-sans p-6 md:p-10 transition-colors duration-300"
            style={{ backgroundColor: currentTheme.background, color: currentTheme.text }}
        >
            {showMicModal && (
                <MicPermissionModal
                    onActivateAndStart={handleActivateAndStart}
                    onContinueWithoutMic={handleContinueWithoutMic}
                    onCancel={() => setShowMicModal(false)}
                />
            )}

            <div className="max-w-4xl mx-auto space-y-8 pb-32">
                {/* Header */}
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="text-center">
                        <p className="text-xs mt-1" style={{ color: currentTheme.textSubtle }}>{PT_BR_TRANSLATIONS["Select an exercise to start practicing."]}</p>
                    </div>
                </div>

                {/* Exercise Selection by Group */}
                {orderedGroups.map(groupName => {
                    const group = exerciseGroups.find(g => g.group === groupName);
                    if (!group) return null;
                    const colors = GROUP_COLORS[group.group] || GROUP_COLORS.Default;
                    return (
                        <section key={group.group}>
                            <h2 className="text-base font-bold mb-2 flex items-center gap-2" style={{ color: currentTheme.text }}>
                                <Music size={18} /> {PT_BR_TRANSLATIONS[group.group as keyof typeof PT_BR_TRANSLATIONS] || group.group}
                            </h2>
                            <p className="text-xs mb-3 -mt-1" style={{ color: currentTheme.textSubtle }}>{PT_BR_TRANSLATIONS[GROUP_DESCRIPTIONS[group.group] as keyof typeof PT_BR_TRANSLATIONS] || GROUP_DESCRIPTIONS[group.group] || ''}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {group.exercises.map(ex => (
                                    <button
                                        key={ex.exercise_id}
                                        onClick={() => handleExerciseClick(ex.exercise_id)}
                                        className={`text-left p-3 rounded-xl border-2 transition-all duration-200 relative overflow-hidden hover:scale-[1.02] hover:shadow-lg ${selectedExerciseId === ex.exercise_id
                                            ? `shadow-lg`
                                            : `${colors.border}`
                                            }`}
                                        style={{
                                            backgroundColor: currentTheme.surface,
                                            borderColor: selectedExerciseId === ex.exercise_id ? currentTheme.primary : currentTheme.gridLines,
                                            boxShadow: selectedExerciseId === ex.exercise_id ? `0 10px 15px -3px ${currentTheme.primary}40` : undefined
                                        }}
                                    >
                                        {/* Star button - Top Right (Visual Priority) */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(ex.exercise_id); }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm text-slate-400 hover:text-amber-500 transition-all hover:scale-110 z-20"
                                            aria-label={favorites.has(ex.exercise_id) ? "Remove from favorites" : "Add to favorites"}
                                        >
                                            {favorites.has(ex.exercise_id) ? <Star size={16} fill="currentColor" className="text-amber-400" /> : <Star size={16} />}
                                        </button>

                                        <div className="relative z-10">
                                            <h3 className={`font-bold text-base mb-1.5 transition-colors ${colors.hoverText} pr-8`} style={{ color: currentTheme.text }}>{PT_BR_TRANSLATIONS[ex.name as keyof typeof PT_BR_TRANSLATIONS] || ex.name}</h3>
                                            <p className="text-xs line-clamp-2 pb-6" style={{ color: currentTheme.textSubtle }}>{PT_BR_TRANSLATIONS[ex.description as keyof typeof PT_BR_TRANSLATIONS] || ex.description}</p>
                                        </div>

                                        {/* Category tag - Bottom Right */}
                                        <span className={`absolute bottom-2 right-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} z-20`}>{PT_BR_TRANSLATIONS[ex.category as keyof typeof PT_BR_TRANSLATIONS] || ex.category}</span>
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
                        {PT_BR_TRANSLATIONS["Configuration"]}
                        {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {/* Settings Section (Collapsible) */}
                {showAdvancedSettings && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 fade-in duration-300">
                        {/* Game Settings */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                                <Settings size={20} className="text-fuchsia-500" /> {PT_BR_TRANSLATIONS["Game Settings"]}
                            </h2>

                            {/* Tempo */}
                            <div className="mb-6">
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-semibold text-slate-600">{PT_BR_TRANSLATIONS["Global Tempo (BPM)"]}</label>
                                    <span className="text-sm font-mono font-bold text-fuchsia-600">{bpm}</span>
                                </div>
                                <input
                                    type="range" min="40" max="200" step="5"
                                    value={bpm} onChange={(e) => onBpmChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                                    aria-label="Tempo BPM"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">{PT_BR_TRANSLATIONS["Exercises may override this with a suggested tempo."]}</p>
                            </div>

                            {/* Voice Type */}
                            <div className="mb-6">
                                <label htmlFor="voice-type-select" className="text-sm font-semibold text-slate-600 mb-2 block">
                                    {PT_BR_TRANSLATIONS["Voice Type"]}
                                </label>
                                <select
                                    id="voice-type-select"
                                    value={voiceType}
                                    onChange={(e) => onVoiceTypeChange(e.target.value as VoiceType)}
                                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-violet-500 focus:border-violet-500"
                                >
                                    {Object.entries(VOICE_TYPE_NAMES).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {PT_BR_TRANSLATIONS[value as keyof typeof PT_BR_TRANSLATIONS] || value}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Range */}
                            <div className="mb-2">
                                <label className="text-sm font-semibold text-slate-600 mb-3 block">{PT_BR_TRANSLATIONS["Vocal Range"]}</label>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>{PT_BR_TRANSLATIONS["Start:"]} {getNoteNameFromMidi(vocalRange.min)}</span>
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
                                            <span>{PT_BR_TRANSLATIONS["End:"]} {getNoteNameFromMidi(vocalRange.max)}</span>
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
                                <Zap size={20} className="text-indigo-500" /> {PT_BR_TRANSLATIONS["Engine & Display"]}
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-semibold text-slate-600">{PT_BR_TRANSLATIONS["Vertical Zoom"]}</label>
                                        <span className="text-xs font-mono text-indigo-600">{engineParams.verticalZoom} {PT_BR_TRANSLATIONS["Octaves"]}</span>
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
                                        <label className="text-sm font-semibold text-slate-600">{PT_BR_TRANSLATIONS["Horizontal Zoom"]}</label>
                                        <span className="text-xs font-mono text-indigo-600">{engineParams.historyScale.toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range" min="0.5" max="3.0" step="0.1"
                                        value={engineParams.historyScale}
                                        onChange={(e) => onParamsChange({ ...engineParams, historyScale: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        aria-label="Horizontal Zoom"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">{PT_BR_TRANSLATIONS["Lower values = Faster scrolling."]}</p>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-semibold text-slate-600">{PT_BR_TRANSLATIONS["Pitch Bias"]}</label>
                                        <span className="text-xs font-mono text-indigo-600">{engineParams.bias}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="10" step="0.5"
                                        value={engineParams.bias}
                                        onChange={(e) => onParamsChange({ ...engineParams, bias: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        aria-label="Pitch Bias"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">{PT_BR_TRANSLATIONS["Higher bias makes pitch \"stick\" to previous values more."]}</p>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-semibold text-slate-600">{PT_BR_TRANSLATIONS["Noise Gate"]}</label>
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

    // Normalize notes to handle both new (notes array) and old (pattern array) formats
    const normalizedNotes = useMemo(() => {
        if (exercise.notes) return exercise.notes;
        if (exercise.pattern) {
            return exercise.pattern.map((semitone: number) => ({
                type: 'note',
                semitone: semitone,
                duration: exercise.duration || 1,
                lyric: null
            }));
        }
        return [];
    }, [exercise]);

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
    const scheduledEventRef = useRef<{ callback: () => void, fireAtAudioTime: number, timerId: number | null } | null>(null);
    const cameraRef = useRef<{ minF: number; maxF: number }>({ minF: getFrequency(45), maxF: getFrequency(75) });
    const metronomeRef = useRef<{ timerId: number | null, isPlaying: boolean, nextBeatTime: number | undefined }>({ timerId: null, isPlaying: false, nextBeatTime: undefined });
    const metronomeAnchorTimeRef = useRef<number>(0);
    const [isMetronomeOn, setIsMetronomeOn] = useState(true);

    const nextSequenceParamsRef = useRef<{ rootMidi: number, startTime: number } | null>(null);
    const directionRef = useRef<1 | -1>(1);
    const isLastSequenceScheduledRef = useRef(false);
    const currentChordNodesRef = useRef<Array<{ source: AudioBufferSourceNode | OscillatorNode, gain: GainNode, key: number }>>([]);

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
        const beatDur = 60 / (exercise.tempo_bpm || (exercise as any).bpm || 120);

        const notes: any[] = [];
        let currentBeat = 0;

        for (const noteEvent of normalizedNotes) {
            if (noteEvent.type === 'note' && typeof noteEvent.semitone === 'number') {
                const midi = rootMidi + noteEvent.semitone;
                const freq = getFrequency(midi);
                const dur = noteEvent.duration;
                const absoluteHitTime = anchorTime + (currentBeat * beatDur);

                const waveType: OscillatorType = type === 'preview' ? 'triangle' : 'sine';
                const volume = type === 'preview' ? 0.8 : 0.75; // High volume for mobile
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
    }, [playNote, exercise, normalizedNotes]);

    const scheduleEvent = useCallback((callback: () => void, delayMs: number) => {
        if (!isPlaying || isPausedRef.current || isExerciseComplete) return;

        const fireAtAudioTime = audioContext ? audioContext.currentTime + (delayMs / 1000) : 0;
        const id = window.setTimeout(() => {
            scheduledEventRef.current = null;
            if (isPlaying && !isPausedRef.current && !isExerciseComplete) callback();
        }, delayMs);

        scheduledEventRef.current = { callback, fireAtAudioTime, timerId: id };
        timeoutsRef.current.push(id);
    }, [isPlaying, isExerciseComplete, audioContext]);

    const scheduleNextSequence = useCallback((rootMidi: number, sequenceStartTime: number) => {
        if (!isPlaying || isExerciseComplete || !audioContext) return;

        const now = audioContext.currentTime;
        const beatDur = 60 / (exercise.tempo_bpm || (exercise as any).bpm || 120);

        // Detect chord quality from exercise intervals
        const noteSemitones = normalizedNotes.map(n => n.semitone || 0).filter(s => s > 0);
        const hasMinorThird = noteSemitones.includes(3);
        const thirdInterval = hasMinorThird ? 3 : 4; // minor 3rd or major 3rd

        // Create and schedule the sequence
        const { notes, totalDuration } = createNotes(rootMidi, sequenceStartTime, 'target');
        notesRef.current = [...notesRef.current, ...notes];

        // Calculate total beats in the sequence
        const sequenceBeats = totalDuration / beatDur;

        // Round up to next measure boundary (multiple of 4)
        let beatsToNextMeasure = Math.ceil(sequenceBeats / 4) * 4;
        let paddingBeats = beatsToNextMeasure - sequenceBeats;

        // Ensure there is enough padding for chords (at least 2 beats)
        // If the sequence fills the measure (padding=0) or is close to full, add another measure
        if (paddingBeats < 2) {
            beatsToNextMeasure += 4;
            paddingBeats = beatsToNextMeasure - sequenceBeats;
        }

        // Divide padding into transition chords:
        // - Current key chord (shorter)
        // - Next key chord (longer, preparing for next sequence)
        const currentChordBeats = Math.min(2, Math.floor(paddingBeats / 2));
        const nextChordBeats = paddingBeats - currentChordBeats;

        // Fade out previous chord if key changed
        if (currentChordNodesRef.current.length > 0) {
            const previousKey = currentChordNodesRef.current[0]?.key;
            if (previousKey !== undefined && previousKey !== rootMidi) {
                // Key changed - fade out old chord
                currentChordNodesRef.current.forEach(({ source, gain }) => {
                    const ctx = audioContext;
                    if (ctx) {
                        const now = ctx.currentTime;
                        gain.gain.cancelScheduledValues(now);
                        gain.gain.setValueAtTime(gain.gain.value, now);
                        gain.gain.linearRampToValueAtTime(0.001, now + 0.3); // 300ms fade
                    }
                });
                currentChordNodesRef.current = [];
            }
        }

        // Play current key chord after sequence ends (no overlap with next chord)
        if (currentChordBeats > 0) {
            const currentChordTime = sequenceStartTime + totalDuration;
            const currentChordDur = currentChordBeats * beatDur; // Only its allocated time

            // Store chord nodes for potential fade-out
            const chordNodes = [
                { freq: getFrequency(rootMidi), vol: 0.3 },
                { freq: getFrequency(rootMidi + thirdInterval), vol: 0.3 },
                { freq: getFrequency(rootMidi + 7), vol: 0.3 }
            ];

            chordNodes.forEach(({ freq, vol }) => {
                const ctx = audioContext;
                if (!ctx) return;

                const source = ctx.createBufferSource();
                const gain = ctx.createGain();
                gain.gain.value = vol;
                source.connect(gain).connect(ctx.destination);

                // Use placeholder - will be replaced with actual sample
                playNote(freq, currentChordTime, currentChordDur, 'sine', vol);

                // Track for fade-out (simplified - using playNote handles this)
            });
        }

        const nextSequenceAnchorTime = sequenceStartTime + (beatsToNextMeasure * beatDur);

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

        // Play next key chord (prepares for next sequence, brief overlap)
        if (nextChordBeats > 0) {
            const nextChordTime = sequenceStartTime + totalDuration + (currentChordBeats * beatDur);
            const nextChordDur = nextChordBeats * beatDur + (1 * beatDur); // Sustains 1 beat into next sequence

            // Determine chord quality for next key
            const nextThirdInterval = hasMinorThird ? 3 : 4;
            playNote(getFrequency(nextRootMidi), nextChordTime, nextChordDur, 'sine', 0.35);
            playNote(getFrequency(nextRootMidi + nextThirdInterval), nextChordTime, nextChordDur, 'sine', 0.35);
            playNote(getFrequency(nextRootMidi + 7), nextChordTime, nextChordDur, 'sine', 0.35);
        }


        const timeToNextGenMs = (nextSequenceAnchorTime - getNoteStreamLeadTime() - now) * 1000;
        const safeDelayMs = Math.max(0, timeToNextGenMs);

        scheduleEvent(() => {
            if (!isPlaying || isPausedRef.current || isExerciseComplete) return;
            setCurrentKeyMidi(nextRootMidi);
            scheduleNextSequence(nextRootMidi, nextSequenceAnchorTime);
        }, safeDelayMs);

    }, [
        isPlaying, isExerciseComplete, vocalRange, exercise, normalizedNotes,
        getNoteStreamLeadTime, createNotes, onExerciseComplete, audioContext, stopAllLocalEvents,
        scheduleEvent, playNote
    ]);

    const startGame = useCallback(() => {
        stopAllLocalEvents();
        setIsPaused(false);
        directionRef.current = 1;

        if (!audioContext || audioContext.state === 'closed') return;

        const now = audioContext.currentTime;
        const leadTime = getNoteStreamLeadTime();
        const beatDur = 60 / (exercise.tempo_bpm || (exercise as any).bpm || 120);

        // Use same anchor for both metronome and notes to ensure sync
        const anchorTime = now + leadTime;
        metronomeAnchorTimeRef.current = anchorTime;

        // Adapt exercise starting keys based on vocalRange.min
        const startKey = vocalRange.min;
        setCurrentKeyMidi(startKey);

        if (isMetronomeOn && audioContext) {
            scheduleMetronome(audioContext, exercise.tempo_bpm || (exercise as any).bpm || 120, metronomeRef, isMetronomeOn, anchorTime);
        }

        const previewData = createNotes(startKey, anchorTime, 'preview');
        notesRef.current = [...previewData.notes];

        // Play intro chord 1 full measure (4 beats) before first note
        // This ensures first note lands on beat 1 (the strong beat in 4/4)
        const introChordTime = anchorTime - (4 * beatDur);
        const introChordDur = 4 * beatDur; // Sustains through first note
        const firstThird = normalizedNotes.map(n => n.semitone || 0).includes(3) ? 3 : 4;
        playNote(getFrequency(startKey), introChordTime, introChordDur, 'sine', 0.35);
        playNote(getFrequency(startKey + firstThird), introChordTime, introChordDur, 'sine', 0.35);
        playNote(getFrequency(startKey + 7), introChordTime, introChordDur, 'sine', 0.35);

        // Calculate first target start time aligned to measure boundary
        const previewEndTime = anchorTime + previewData.totalDuration;
        const beatsFromAnchor = (previewEndTime - anchorTime) / beatDur;
        const measuresNeeded = Math.ceil((beatsFromAnchor + 2) / 4); // +2 for gap, round up to next measure
        const firstTargetStartTime = anchorTime + (measuresNeeded * 4 * beatDur); // Always on measure boundary

        // Play intro chord before FIRST TARGET cycle (4 beats before, sustains 4 beats)
        const firstTargetChordTime = firstTargetStartTime - (4 * beatDur);
        const firstTargetChordDur = 4 * beatDur;
        playNote(getFrequency(startKey), firstTargetChordTime, firstTargetChordDur, 'sine', 0.35);
        playNote(getFrequency(startKey + firstThird), firstTargetChordTime, firstTargetChordDur, 'sine', 0.35);
        playNote(getFrequency(startKey + 7), firstTargetChordTime, firstTargetChordDur, 'sine', 0.35);

        scheduleNextSequence(startKey, firstTargetStartTime);

        toggleControls();
    }, [audioContext, createNotes, getNoteStreamLeadTime, isMetronomeOn, scheduleNextSequence, stopAllLocalEvents, toggleControls, vocalRange, exercise]);

    // Refactored Pause/Resume Effect (Freeze Strategy)
    useEffect(() => {
        if (!isPlaying || isExerciseComplete) {
            return;
        }

        if (isPaused) {
            // --- PAUSE (FREEZE) ---
            if (audioContext && audioContext.state === 'running') {
                audioContext.suspend();
            }

            // Pause the metronome
            metronomeRef.current.isPlaying = false;
            if (metronomeRef.current.timerId) {
                clearTimeout(metronomeRef.current.timerId);
                metronomeRef.current.timerId = null;
            }

            // Pause the scheduled event timer
            if (scheduledEventRef.current && scheduledEventRef.current.timerId !== null) {
                clearTimeout(scheduledEventRef.current.timerId);
                scheduledEventRef.current.timerId = null;
            }
        } else {
            // --- RESUME (UNFREEZE) ---
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }

            // Resume the metronome
            if (isMetronomeOn && audioContext) {
                scheduleMetronome(audioContext, exercise.tempo_bpm, metronomeRef, isMetronomeOn, metronomeAnchorTimeRef.current);
            }

            // Resume the scheduled event timer
            if (scheduledEventRef.current && audioContext) {
                const { callback, fireAtAudioTime } = scheduledEventRef.current;
                const now = audioContext.currentTime;
                const delay = Math.max(0, (fireAtAudioTime - now) * 1000);
                scheduleEvent(callback, delay);
            }
        }
    }, [isPaused, isPlaying, isExerciseComplete, audioContext, scheduleEvent, isMetronomeOn, exercise.tempo_bpm]);



    useEffect(() => {
        if (isPlaying) {
            if (isPaused) return;

            // Only start game if not already started (prevents restart on unpause)
            if (!isLastSequenceScheduledRef.current && notesRef.current.length === 0) {
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
            }
        } else {
            setIsPaused(false);
            stopAllLocalEvents();
            setShowControls(true);
        }
        return () => {
            if (!isPlaying) {
                stopAllLocalEvents();
            }
        };
    }, [isPlaying, exercise, normalizedNotes, audioContext, isPaused, startGame, stopAllLocalEvents]);

    // Reset metronome state when exercise changes
    useEffect(() => {
        metronomeRef.current.isPlaying = false;
        if (metronomeRef.current.timerId) {
            clearTimeout(metronomeRef.current.timerId);
            metronomeRef.current.timerId = null;
        }
        metronomeRef.current.nextBeatTime = undefined;
        metronomeAnchorTimeRef.current = 0;
    }, [exercise.exercise_id]); // Reset when switching exercises


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
                    ctx.fillText(`${gridNote}${gridOctave} `, 5, y - 2);
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
                    // Check if note overlaps the visible area
                    // For preview (LISTEN), fade out as soon as it passes the cursor (cursorX)
                    if (note.type === 'preview') {
                        if (noteX < width + bufferX && noteX + noteWidth > cursorX) {
                            isPreviewVisible = true;
                        }
                    } else {
                        // For target (SING), keep standard visibility
                        if (noteX < width + bufferX && noteX + noteWidth > -bufferX) {
                            isTargetVisible = true;
                        }
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

            drawPhaseLabel(PT_BR_TRANSLATIONS["LISTEN"], phaseOverlayOpacityRef.current.preview, 'rgba(251, 191, 36, 0.3)', height / 2);


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
                        ctx.fillStyle = 'rgba(255,255,255,0.95)';
                        ctx.font = 'bold 18px sans-serif'; // Increased from 12px to 18px
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        // Translate lyric if available
                        const translatedLyric = PT_BR_TRANSLATIONS[note.lyric as keyof typeof PT_BR_TRANSLATIONS] || note.lyric;
                        ctx.fillText(translatedLyric, noteX + drawWidth / 2, noteY);
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
                ctx.fillText(PT_BR_TRANSLATIONS["PAUSED"], width / 2, height / 2);
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


    return (
        <div className="h-full w-full flex flex-col font-sans overflow-hidden" style={{ backgroundColor: currentTheme.background, color: currentTheme.text }}>
            <style>
                {`@keyframes shine { 0 % { transform: translateX(-100 %); } 100 % { transform: translateX(100 %); } } `}
            </style>

            <div className="flex-grow relative min-h-0" ref={containerRef}>
                <canvas
                    ref={canvasRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="block w-full h-full relative z-10"
                    style={{ cursor: 'default' }}
                />

                {/* Exercise Title & Description */}
                {/* Exercise Title & Description & Favorite */}
                <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4 flex justify-center pointer-events-none">
                    <div className="bg-white/40 backdrop-blur-xl border border-slate-200/50 shadow-xl rounded-2xl px-4 py-2 flex items-center gap-3 pointer-events-auto">
                        <div className="flex-grow text-center">
                            <h2 className="font-bold text-slate-900 text-sm md:text-base leading-tight">
                                {PT_BR_TRANSLATIONS[exercise.name as keyof typeof PT_BR_TRANSLATIONS] || exercise.name}
                            </h2>
                            {exercise.description && (
                                <p className="text-slate-600 text-xs md:text-sm mt-1 leading-snug">
                                    {PT_BR_TRANSLATIONS[exercise.description as keyof typeof PT_BR_TRANSLATIONS] || exercise.description}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); props.onToggleFavorite(exercise.exercise_id); }}
                            className="p-1.5 rounded-full hover:bg-white/50 transition-colors text-slate-500 hover:text-amber-500"
                        >
                            {props.isFavorite ? <Star size={18} fill="currentColor" className="text-amber-400" /> : <Star size={18} />}
                        </button>
                    </div>
                </div>

                <div className="absolute top-2 left-2 md:top-4 md:left-4 z-50 pointer-events-none">
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

                <div className="absolute left-0 right-0 bottom-24 z-50 flex items-center justify-center gap-8 pointer-events-auto">
                    {/* Back Button */}
                    <button
                        onClick={onExit}
                        className={`w-16 h-16 rounded-full bg-yellow-400 hover:bg-yellow-300 border-2 border-yellow-500/20 text-yellow-900 flex items-center justify-center shadow-xl hover:scale-105 transition-all backdrop-blur-sm ${isPlaying && !isPaused ? 'opacity-30 hover:opacity-100' : 'opacity-100'}`}
                        aria-label="Exit exercise"
                    >
                        <ArrowLeft size={28} />
                    </button>

                    {/* Play/Pause Button */}
                    <button
                        onClick={handleCenterClick}
                        className={`w-24 h-24 rounded-full group transition-all transform hover:scale-105 active:scale-95 text-white shadow-2xl overflow-hidden relative backdrop-blur-sm ${isPlaying && !isPaused ? 'opacity-30 hover:opacity-100' : 'opacity-100'}`}
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
                        className={`w-16 h-16 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 flex items-center justify-center shadow-lg hover:bg-white hover:scale-105 transition-all ${isPlaying && !isPaused ? 'opacity-30 hover:opacity-100' : 'opacity-100'}`}
                        aria-label="Restart game"
                    >
                        <RotateCcw size={28} />
                    </button>
                </div>

                {isExerciseComplete && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <h3 className="text-white text-3xl md:text-4xl font-black mb-6 animate-in fade-in zoom-in-95 duration-300">
                            {PT_BR_TRANSLATIONS["Good job!"]}
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={onNextExercise}
                                className="py-3 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg transition-all btn-interactive flex items-center gap-2"
                            >
                                <Play size={20} className="fill-current" /> {PT_BR_TRANSLATIONS["Next Exercise"]}
                            </button>
                            <button
                                onClick={onRestart}
                                className="py-3 px-6 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-lg transition-all btn-interactive flex items-center gap-2"
                            >
                                <RotateCcw size={20} /> {PT_BR_TRANSLATIONS["Restart Current"]}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- DATA ---

const EXERCISE_DATA: { exercises: ExerciseGroup[] } = {
    "exercises": [
        {
            "group": "Warmup",
            "exercises": [
                { "exercise_id": "FAM_002", "name": "Descending 5-Tone", "category": "Gentle", "tempo_bpm": 90, "description": "Sing 'Mum' on each note going down (5-4-3-2-1). Great warmup!", "notes": [{ "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Mum" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 1, "lyric": "Mum" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Mum" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Mum" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 4, "lyric": "Mum" }] },
                { "exercise_id": "COOL_001", "name": "Gentle Slide Down", "category": "Cool Down", "tempo_bpm": 80, "description": "Hum gently on 5-3-1. Relax your voice.", "notes": [{ "type": "note", "semitone": 7, "visual": "5", "duration": 2, "lyric": "Hum" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 2, "lyric": "Hum" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 4, "lyric": "Hum" }] }
            ]
        },
        {
            "group": "Technique",
            "exercises": [
                { "exercise_id": "EX_012", "name": "Vowel Purity Scale", "category": "Resonance", "tempo_bpm": 90, "description": "Sing 'Ah' up and down the scale. Keep your vowel shape consistent.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 5, "visual": "4", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 2, "visual": "2", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ah" }] },
                { "exercise_id": "EX_020", "name": "Vowel Uniformity", "category": "Resonance", "tempo_bpm": 100, "description": "Cycle vowels Ee-Ah-Oo while keeping tone consistent.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 1, "lyric": "Ee" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Oo" }, { "type": "note", "semitone": 12, "visual": "8", "duration": 2, "lyric": "Ee" }, { "type": "note", "semitone": 7, "visual": "5", "duration": 1, "lyric": "Ah" }, { "type": "note", "semitone": 4, "visual": "3", "duration": 1, "lyric": "Oo" }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ee" }] },
                { "exercise_id": "FAM_006", "name": "Staccato Arpeggio", "category": "Diaphragm", "tempo_bpm": 90, "description": "Sing short 'Ha' on each note, like a laugh. Engages your diaphragm.", "notes": [{ "type": "note", "semitone": 0, "visual": "1", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 12, "visual": "8", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 7, "visual": "5", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 4, "visual": "3", "duration": 0.5, "lyric": "Ha" }, { "type": "rest", "duration": 0.5 }, { "type": "note", "semitone": 0, "visual": "1", "duration": 2, "lyric": "Ha" }] },
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
        },
        {
            "group": "Guitar",
            "exercises": [
                { "exercise_id": "GTR_001", "name": "Chromatic Warmup", "category": "Technique", "tempo_bpm": 80, "description": "1-2-3-4 on each string.", "notes": [{ "type": "note", "semitone": 0, "duration": 1 }, { "type": "note", "semitone": 1, "duration": 1 }, { "type": "note", "semitone": 2, "duration": 1 }, { "type": "note", "semitone": 3, "duration": 1 }] },
                { "exercise_id": "GTR_002", "name": "Major Scale", "category": "Scales", "tempo_bpm": 90, "description": "Standard Major Scale pattern.", "notes": [{ "type": "note", "semitone": 0, "duration": 1 }, { "type": "note", "semitone": 2, "duration": 1 }, { "type": "note", "semitone": 4, "duration": 1 }, { "type": "note", "semitone": 5, "duration": 1 }, { "type": "note", "semitone": 7, "duration": 1 }, { "type": "note", "semitone": 9, "duration": 1 }, { "type": "note", "semitone": 11, "duration": 1 }, { "type": "note", "semitone": 12, "duration": 1 }] },
                { "exercise_id": "GTR_003", "name": "Minor Pentatonic", "category": "Scales", "tempo_bpm": 100, "description": "Essential rock/blues scale.", "notes": [{ "type": "note", "semitone": 0, "duration": 1 }, { "type": "note", "semitone": 3, "duration": 1 }, { "type": "note", "semitone": 5, "duration": 1 }, { "type": "note", "semitone": 7, "duration": 1 }, { "type": "note", "semitone": 10, "duration": 1 }, { "type": "note", "semitone": 12, "duration": 1 }] }
            ]
        }
    ]
};

const FLATTENED_EXERCISES: Exercise[] = EXERCISE_DATA.exercises.flatMap(group => group.exercises);

const getDefaultTheme = (): Theme => {
    const isDark = document.documentElement.classList.contains('dark');
    console.log('🎨 getDefaultTheme called, isDark:', isDark);
    if (isDark) {
        return {
            background: '#0f172a',      // slate-900
            surface: '#1e293b',         // slate-800
            gridLines: '#334155',       // slate-700
            gridLabels: '#64748b',      // slate-500
            primary: '#8b5cf6',         // violet-500
            secondary: '#475569',       // slate-600
            success: '#10b981',         // emerald-500
            text: '#f1f5f9',           // slate-100
            textSubtle: '#94a3b8',     // slate-400
            notePreview: 'rgba(251, 191, 36, 0.8)', // Amber for preview
        };
    }

    return {
        background: '#f8fafc',          // slate-50
        surface: '#ffffff',             // white
        gridLines: '#e2e8f0',          // slate-200
        gridLabels: '#94a3b8',         // slate-400
        primary: '#8b5cf6',            // violet-500
        secondary: '#cbd5e1',          // slate-300
        success: '#10b981',            // emerald-500
        text: '#1e293b',              // slate-800
        textSubtle: '#64748b',        // slate-500
        notePreview: 'rgba(251, 191, 36, 0.8)', // Amber for preview
    };
};

// --- MAIN APP COMPONENT ---

function App() {
    // Check for AI mode in URL to prevent flickering
    const urlParams = new URLSearchParams(window.location.search);
    const initialIsAIMode = urlParams.get('mode') === 'ai';

    const [isAIMode, setIsAIMode] = useState(initialIsAIMode);
    // If in AI mode, start in 'loading' (or 'game' but hidden) to avoid showing landing
    const [view, setView] = useState<'landing' | 'game' | 'loading'>(initialIsAIMode ? 'loading' : 'landing');
    const [opacity, setOpacity] = useState(1);
    const [whiteOverlayOpacity, setWhiteOverlayOpacity] = useState(0);

    const transitionToView = useCallback((newView: 'landing' | 'game') => {
        // Fade to white
        setWhiteOverlayOpacity(1);
        setTimeout(() => {
            // Switch view while white overlay is fully visible
            setView(newView);
            setTimeout(() => {
                // Fade from white
                setWhiteOverlayOpacity(0);
            }, 800);
        }, 1500); // Match CSS duration
    }, []);
    const [exerciseGroups] = useState<ExerciseGroup[]>(EXERCISE_DATA.exercises);
    const [allExercises, setAllExercises] = useState<Exercise[]>(FLATTENED_EXERCISES);
    const [selectedExerciseId, setSelectedExerciseId] = useState<string>(FLATTENED_EXERCISES[0].exercise_id);
    const currentExercise = allExercises.find(ex => ex.exercise_id === selectedExerciseId) || allExercises[0];
    const [voiceType, setVoiceType] = useState<VoiceType>(() => {
        const saved = localStorage.getItem('voiceType');
        return (saved as VoiceType) || 'tenor'; // Default to tenor (middle range)
    });
    const [vocalRange, setVocalRange] = useState<VocalRange>(() => {
        const savedVoiceType = localStorage.getItem('voiceType') as VoiceType;
        return VOICE_TYPE_RANGES[savedVoiceType] || VOICE_TYPE_RANGES.tenor;
    });
    const [globalBpm, setGlobalBpm] = useState(90);
    const [engineParams, setEngineParams] = useState<EngineParams>({
        bias: 0.5,
        gateThreshold: 0.005,
        verticalZoom: 1.5,
        historyScale: 1.5,
        frequencySeparation: true
    });

    const [showMicPermissionModal, setShowMicPermissionModal] = useState(false);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [currentTheme, setCurrentTheme] = useState<Theme>(getDefaultTheme());
    const [themeReady, setThemeReady] = useState(window.parent === window); // Ready immediately if not in iframe

    const [micActive, setMicActive] = useState(false);
    const [micLoading, setMicLoading] = useState(false);
    const [micError, setMicError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExerciseComplete, setIsExerciseComplete] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [userPitch, setUserPitch] = useState<number | null>(null);
    const [isPitchDetecting, setIsPitchDetecting] = useState(false);

    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const engineParamsRef = useRef(engineParams);
    const micActiveRef = useRef(micActive);
    const currentAudioNodesRef = useRef<Array<{ source: AudioNode, gain: GainNode }>>([]);
    const currentlyPlayingNotesRef = useRef<Set<number>>(new Set());
    const sampleCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

    // ===== VOXLAB INTEGRATION =====
    // Notify parent that we are ready to receive messages
    useEffect(() => {
        if (window.parent !== window) {
            console.log('🚀 Pitch Perfector Ready, notifying parent...');
            window.parent.postMessage({ type: 'PITCH_PERFECTOR_READY' }, window.location.origin);
        }
    }, []);

    // Watch for dark mode changes on own document
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const newTheme = getDefaultTheme();
            setCurrentTheme(newTheme);
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    // Listen for configuration and AI exercises from VoxLab parent window
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Security: Verify origin
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'VOXLAB_CONFIG') {
                const { mode, language, vocalRange, theme } = event.data;

                console.log('📨 VOXLAB_CONFIG received:', { theme, mode });

                // Use mode to determine dark/light theme
                if (mode === 'dark') {
                    console.log('✅ Applying DARK theme');
                    setCurrentTheme({
                        background: '#0f172a',      // slate-900
                        surface: '#1e293b',         // slate-800
                        gridLines: '#334155',       // slate-700
                        gridLabels: '#64748b',      // slate-500
                        primary: theme?.primary || '#8b5cf6',
                        secondary: '#475569',       // slate-600
                        success: '#10b981',         // emerald-500
                        text: '#f1f5f9',           // slate-100
                        textSubtle: '#94a3b8',     // slate-400
                        notePreview: 'rgba(251, 191, 36, 0.8)',
                    });
                } else {
                    console.log('✅ Applying LIGHT theme');
                    setCurrentTheme({
                        background: '#f8fafc',          // slate-50
                        surface: '#ffffff',             // white
                        gridLines: '#e2e8f0',          // slate-200
                        gridLabels: '#94a3b8',         // slate-400
                        primary: theme?.primary || '#8b5cf6',
                        secondary: '#cbd5e1',          // slate-300
                        success: '#10b981',            // emerald-500
                        text: '#1e293b',              // slate-800
                        textSubtle: '#64748b',        // slate-500
                        notePreview: 'rgba(251, 191, 36, 0.8)',
                    });
                }

                setThemeReady(true);

                // You can use vocalRange.safe for exercises if needed
                // vocalRange.detected has the full range, vocalRange.safe has pedagogical range
            } else if (event.data.type === 'VOXLAB_AI_EXERCISE') {
                // Received an AI-generated exercise from VoxLab
                const { exercise } = event.data;
                console.log('📥 AI Exercise received:', exercise);

                // Set AI Mode flag
                setIsAIMode(true);

                // Add the new exercise to the list of all exercises if it's not already there
                setAllExercises(prev => {
                    if (!prev.some(ex => ex.exercise_id === exercise.exercise_id)) {
                        return [...prev, exercise];
                    }
                    return prev;
                });
                // Convert VoxLab AI exercise to Pitch Perfector format
                setSelectedExerciseId(exercise.exercise_id);
                transitionToView('game');
                setIsPlaying(false); // Start paused

                // Check mic status before starting - delay to show after transition
                if (!micActiveRef.current) {
                    setTimeout(() => {
                        setShowMicPermissionModal(true);
                    }, 1200); // Show after view switch + small delay
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Notify VoxLab when exercise state changes (playing/stopped)
    useEffect(() => {
        // Only send if we're in an iframe (VoxLab integration)
        if (window.parent === window) return;

        // Hide VoxLab header/menu when in game view (exercise screen)
        // Show them again when back on landing (exercise list)
        const isInExercise = view === 'game';

        console.log('📤 Sending to VoxLab:', { view, isInExercise });

        window.parent.postMessage({
            type: 'PITCH_PERFECTOR_STATE',
            isPlayingExercise: isInExercise
        }, window.location.origin);
    }, [view]); // Only depend on view, not isPlaying
    // ===== END VOXLAB INTEGRATION =====




    useEffect(() => { engineParamsRef.current = engineParams; }, [engineParams]);
    useEffect(() => { micActiveRef.current = micActive; }, [micActive]);

    // Preload Salamander Grand Piano samples
    // Using samples every 3 semitones (minor thirds) for minimal pitch shifting
    useEffect(() => {
        const loadSamples = async () => {
            const ctx = getAudioContext();
            if (!ctx) return;

            // Salamander Piano samples: C, D#(Ds), F#(Fs), A across octaves 1-7
            const notes = ['C', 'Ds', 'Fs', 'A'];
            const octaves = [1, 2, 3, 4, 5, 6, 7];

            for (const octave of octaves) {
                for (const note of notes) {
                    try {
                        const response = await fetch(`./sounds/Salamander_Piano/${note}${octave}.mp3`);
                        const arrayBuffer = await response.arrayBuffer();
                        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                        sampleCacheRef.current.set(`${note}${octave}`, audioBuffer);
                        console.log(`Loaded: ${note}${octave}`);
                    } catch (error) {
                        // Some high octave samples might not exist, skip silently
                    }
                }
            }
            console.log(`Salamander Piano loaded: ${sampleCacheRef.current.size} samples`);
        };
        loadSamples();
    }, []);

    const getAudioContext = useCallback(() => {
        if (audioContext) return audioContext;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
        return ctx;
    }, [audioContext]);

    const playNote = useCallback((freq: number, startTime: number, duration: number, type: OscillatorType = 'sine', vol: number = 0.75) => {
        const ctx = audioContext;
        if (!ctx || ctx.state === 'closed') return;

        try {
            // Calculate MIDI note from frequency
            const midi = Math.round(12 * Math.log2(freq / 440) + 69);

            // Salamander samples: C, D#, F#, A (every 3 semitones)
            // MIDI values within octave: C=0, Ds=3, Fs=6, A=9
            const noteNames = ['C', 'Ds', 'Fs', 'A'];
            const noteMidi = [0, 3, 6, 9]; // Semitone offsets within octave

            // Find octave and note within octave
            const octave = Math.floor(midi / 12) - 1; // MIDI 12 = C0, so subtract 1
            const semitoneInOctave = midi % 12;

            // Find closest sample note
            let closestNoteIndex = 0;
            let minDist = Math.abs(semitoneInOctave - noteMidi[0]);

            for (let i = 1; i < noteMidi.length; i++) {
                const dist = Math.abs(semitoneInOctave - noteMidi[i]);
                if (dist < minDist) {
                    minDist = dist;
                    closestNoteIndex = i;
                }
            }

            // Build sample key
            const sampleNote = noteNames[closestNoteIndex];
            const sampleOctave = Math.max(1, Math.min(7, octave)); // Clamp to available range
            const sampleKey = `${sampleNote}${sampleOctave}`;

            // Get cached sample
            const audioBuffer = sampleCacheRef.current.get(sampleKey);
            if (!audioBuffer) {
                throw new Error(`Sample ${sampleKey} not loaded`);
            }

            // Calculate exact MIDI of the sample
            const sampleMidi = (sampleOctave + 1) * 12 + noteMidi[closestNoteIndex];

            // Create source
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;

            // Calculate playback rate for pitch shifting
            const semitoneDiff = midi - sampleMidi;
            const playbackRate = Math.pow(2, semitoneDiff / 12);
            source.playbackRate.value = playbackRate;

            // Create gain node
            const gain = ctx.createGain();

            // COMPLEMENTARY FREQUENCY SEPARATION:
            // Output Low-Pass Filter (RED curve) - Exercise notes stay in low frequencies (below 1200Hz)
            // This complements the Input High-Pass Filter (BLUE curve) on the microphone (above 1200Hz)
            let audioChain: AudioNode = source;

            if (engineParams.frequencySeparation) {
                const outputFilter = ctx.createBiquadFilter();
                outputFilter.type = 'lowpass';
                outputFilter.frequency.value = 12000; // Raised to restore brightness/volume (relying on echo cancellation)
                outputFilter.Q.value = 1.0;

                source.connect(outputFilter);
                audioChain = outputFilter;
            }

            // Connect chain
            audioChain.connect(gain);
            gain.connect(ctx.destination);

            // Smooth fade in/out envelope
            const fadeTime = 0.02;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(vol, startTime + fadeTime);
            gain.gain.setValueAtTime(vol, startTime + duration - fadeTime);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);

            // Start playback
            source.start(startTime);
            source.stop(startTime + duration);

            // Track frequency for feedback prevention
            currentlyPlayingNotesRef.current.add(freq);

            // Cleanup on end
            source.onended = () => {
                currentlyPlayingNotesRef.current.delete(freq);
                currentAudioNodesRef.current = currentAudioNodesRef.current.filter(node => node.source !== source);
                try {
                    audioChain.disconnect();
                    gain.disconnect();
                } catch (e) { }
            };

            // Track for cleanup
            currentAudioNodesRef.current.push({ source, gain });
        } catch (error) {
            console.error('Error playing piano sample:', error);
            // Fallback to oscillator if sample loading fails
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
            gain.gain.setValueAtTime(vol, startTime + duration - 0.02);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration + 0.1);
            currentAudioNodesRef.current.push({ source: osc, gain }); // Track oscillator fallback
        }
    }, [audioContext, engineParams.frequencySeparation]);

    const stopAudio = useCallback(() => {
        currentAudioNodesRef.current.forEach(({ source, gain }) => {
            try {
                const ctx = audioContext;
                if (ctx) {
                    const now = ctx.currentTime;
                    gain.gain.cancelScheduledValues(now);
                    gain.gain.setValueAtTime(gain.gain.value, now);
                    gain.gain.linearRampToValueAtTime(0.001, now + 0.02);

                    // Stop source (works for both OscillatorNode and AudioBufferSourceNode)
                    if ('stop' in source && typeof source.stop === 'function') {
                        try {
                            source.stop(now + 0.03);
                        } catch (e) {
                            // Already stopped
                        }
                    }
                }
            } catch (e) {
                console.error('Error stopping audio:', e);
            }
        });
        currentAudioNodesRef.current = [];
        currentlyPlayingNotesRef.current.clear();
    }, [audioContext]);

    useEffect(() => {
        if (!audioContext) return;
        if (isPlaying && audioContext.state === 'suspended') {
            audioContext.resume().catch(e => console.error("Failed to resume AudioContext:", e));
        } else if (!isPlaying && audioContext.state === 'running') {
            audioContext.suspend().catch(e => console.error("Failed to suspend AudioContext:", e));
        }
    }, [isPlaying, audioContext]);

    const toggleFavorite = useCallback((exerciseId: string) => {
        setFavorites(prev => {
            const newFavs = new Set(prev);
            if (newFavs.has(exerciseId)) {
                newFavs.delete(exerciseId);
            } else {
                newFavs.add(exerciseId);
            }
            // Expose to parent window for main app
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'FAVORITES_UPDATE', favorites: Array.from(newFavs) }, '*');
            }
            return newFavs;
        });
    }, []);

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
            setIsPitchDetecting(false);
        } else {
            setMicLoading(true);
            setMicError(null);

            try {
                const ctx = getAudioContext();
                if (ctx.state === 'suspended') await ctx.resume();

                // Load Audio Worklet Module
                // Safari requires relative paths instead of absolute paths starting with /
                try {
                    // Always use relative path to respect base path in vite.config
                    const workletPath = './pitch-processor.js';
                    await ctx.audioWorklet.addModule(workletPath);
                } catch (e) {
                    console.error("Failed to load audio worklet:", e);
                    // Try alternative path for Safari
                    try {
                        await ctx.audioWorklet.addModule('pitch-processor.js');
                    } catch (e2) {
                        console.error("Failed with alternative path:", e2);
                        setMicError("Failed to load pitch detection engine. Please refresh the page and try again.");
                        setMicLoading(false);
                        return;
                    }
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: PYIN_CONFIG.audioConstraints
                });
                streamRef.current = stream;

                const source = ctx.createMediaStreamSource(stream);
                sourceRef.current = source;
                let processingChain: AudioNode = source;

                // FREQUENCY SEPARATION: High-pass filter for mic input
                // Purpose: Blocks piano frequencies (below 1200Hz) to prevent feedback,
                // while keeping voice frequencies (above 1200Hz) for pitch detection.
                // Increased to 1200Hz with steep slope (Q=2.0) for strong separation.
                if (engineParams.frequencySeparation) {
                    const highPassFilter = ctx.createBiquadFilter();
                    highPassFilter.type = PYIN_CONFIG.filter.type as BiquadFilterType;

                    // Adjust filter for lower range instruments/voices
                    let filterFreq = PYIN_CONFIG.filter.frequency;
                    if (voiceType === 'bass' || voiceType === 'baritone' || voiceType === 'guitar') {
                        filterFreq = 60; // Lower to 60Hz to capture E2 (82Hz) and potentially Drop D
                    }

                    highPassFilter.frequency.value = filterFreq;
                    highPassFilter.Q.value = PYIN_CONFIG.filter.Q;
                    // Note: Mic input passes only ABOVE 2000Hz (upper voice harmonics only)
                    // Audio output passes only BELOW 2000Hz (piano with full harmonic range)

                    processingChain.connect(highPassFilter);
                    processingChain = highPassFilter;
                }

                // Initialize Audio Worklet
                const workletNode = new AudioWorkletNode(ctx, 'pitch-processor', {
                    processorOptions: {
                        noiseGateThreshold: engineParams.gateThreshold,
                        algorithm: PYIN_CONFIG.algorithm,
                        pyinBias: engineParams.bias,
                        pyinGateMode: PYIN_CONFIG.pyinGateMode
                    }
                });

                workletNode.port.onmessage = (event) => {
                    const { pitch } = event.data;

                    // Smooth pitch updates to reduce visual flickering
                    // Only update if pitch changed significantly (>5 cents difference)
                    const currentPitch = userPitch;
                    const pitchChanged = !currentPitch || Math.abs(pitch - currentPitch) > (currentPitch * 0.003); // ~5 cents

                    // Check if detected pitch is too close to any currently playing exercise note
                    // Using 5% tolerance - wider window to account for harmonics and overtones
                    let isFeedback = false;
                    if (pitch && pitch > 0) {
                        for (const playingFreq of currentlyPlayingNotesRef.current) {
                            const ratio = pitch / playingFreq;
                            // Ignore if within 5% of playing frequency
                            if ((ratio > 0.95 && ratio < 1.05)) {  // 5% tolerance
                                isFeedback = true;
                                break;
                            }
                        }
                    }

                    if (pitch && pitch > 0 && !isFeedback && pitchChanged) {
                        setUserPitch(pitch);
                        setIsPitchDetecting(true);
                    } else if (pitch === -1 || isFeedback) {
                        setUserPitch(null);
                        setIsPitchDetecting(false);
                    }
                };

                processingChain.connect(workletNode);
                workletNodeRef.current = workletNode;

                setMicActive(true);
                setMicLoading(false);
            } catch (error: any) {
                console.error("Error accessing microphone:", error);
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    setMicError("Microphone access denied. Please allow microphone permissions and try again.");
                } else if (error.name === 'NotFoundError') {
                    setMicError("No microphone found. Please connect a microphone and try again.");
                } else {
                    setMicError("Could not access microphone. Please check your settings and try again.");
                }
                setMicActive(false);
                setMicLoading(false);
            }
        }
    }, [getAudioContext, engineParams]);

    const handleExerciseComplete = useCallback(() => {
        stopAudio();
        setIsPlaying(false);
        setIsExerciseComplete(true);
    }, [stopAudio]);

    const handleNextExercise = useCallback(() => {
        stopAudio();
        const currentIndex = allExercises.findIndex(ex => ex.exercise_id === selectedExerciseId);
        const nextIndex = (currentIndex + 1) % allExercises.length;
        setSelectedExerciseId(allExercises[nextIndex].exercise_id);
        setIsExerciseComplete(false);
        setIsPlaying(true);
    }, [allExercises, selectedExerciseId, stopAudio]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore shortcuts if user is typing in an input
            if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') {
                return;
            }

            if (view !== 'game' || isExerciseComplete) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    if (audioContext && audioContext.state === 'suspended') {
                        audioContext.resume().then(() => setIsPlaying(!isPlaying));
                    } else {
                        setIsPlaying(!isPlaying);
                    }
                    break;
                case 'r':
                    e.preventDefault();
                    stopAudio();
                    setIsPlaying(false);
                    setIsExerciseComplete(false);
                    setTimeout(() => setIsPlaying(true), 0);
                    break;
                case 'escape':
                    e.preventDefault();
                    stopAudio();
                    setIsPlaying(false);
                    setIsExerciseComplete(false);
                    setView('landing');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, isPlaying, isExerciseComplete, audioContext, stopAudio]);

    return (
        <div
            className="w-full h-screen font-sans transition-all duration-300"
            style={{
                color: currentTheme.text,
                opacity: themeReady ? 1 : 0
            }}
        >
            {/* Modals */}
            {micError && <ErrorModal message={micError} onClose={() => setMicError(null)} />}
            {micLoading && <LoadingModal message="Initializing microphone..." />}
            {showMicPermissionModal && (
                <MicPermissionModal
                    onActivateAndStart={async () => {
                        await toggleMic();
                        setShowMicPermissionModal(false);
                        // User must click play manually
                    }}
                    onContinueWithoutMic={() => {
                        setShowMicPermissionModal(false);
                        // User must click play manually
                    }}
                    onCancel={() => {
                        setShowMicPermissionModal(false);
                    }}
                />
            )}

            {/* Mic Status Indicator */}
            {micActive && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full px-4 py-2 shadow-lg">
                    <Mic size={16} className="text-violet-600" />
                    <div className={`w-2 h-2 rounded-full ${isPitchDetecting ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="text-sm font-semibold text-slate-700">
                        {isPitchDetecting ? PT_BR_TRANSLATIONS["Detecting"] : PT_BR_TRANSLATIONS["Listening"]}
                    </span>
                </div>
            )}

            {/* Theme-aware overlay for smooth transitions */}
            <div
                className="fixed inset-0 pointer-events-none transition-opacity duration-1500 ease-in-out z-[200]"
                style={{
                    backgroundColor: currentTheme.background,
                    opacity: whiteOverlayOpacity
                }}
            />

            <div className="h-full w-full">
                {view === 'loading' ? (
                    <div className="flex items-center justify-center h-full bg-slate-50">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                    </div>
                ) : view === 'landing' ? (
                    <LandingPage
                        exerciseGroups={exerciseGroups}
                        selectedExerciseId={selectedExerciseId}
                        onSelectExercise={setSelectedExerciseId}
                        voiceType={voiceType}
                        onVoiceTypeChange={(newVoiceType) => {
                            setVoiceType(newVoiceType);
                            setVocalRange(VOICE_TYPE_RANGES[newVoiceType]);
                            localStorage.setItem('voiceType', newVoiceType);
                        }}
                        vocalRange={vocalRange}
                        onRangeChange={setVocalRange}
                        bpm={globalBpm}
                        onBpmChange={setGlobalBpm}
                        engineParams={engineParams}
                        onParamsChange={setEngineParams}
                        currentTheme={currentTheme}
                        onStartGame={() => {
                            getAudioContext();
                            setIsExerciseComplete(false);
                            setIsPlaying(false);
                            transitionToView('game');
                        }}
                        micActive={micActive}
                        onToggleMic={toggleMic}
                        favorites={favorites}
                        onToggleFavorite={toggleFavorite}
                    />
                ) : (
                    <ExerciseGameViewALT
                        exercise={currentExercise}
                        vocalRange={vocalRange}
                        bpm={currentExercise.tempo_bpm || globalBpm}
                        userPitch={userPitch}
                        engineParams={engineParams}
                        currentTheme={getDefaultTheme()}
                        audioContext={audioContext}
                        isPlaying={isPlaying}
                        isExerciseComplete={isExerciseComplete}
                        playNote={playNote}
                        stopAudio={stopAudio}
                        onPlayPause={() => {
                            // Ensure mic is active when playing
                            if (!isPlaying && !micActive) {
                                toggleMic();
                            }

                            if (audioContext && audioContext.state === 'suspended') {
                                audioContext.resume().then(() => setIsPlaying(!isPlaying));
                            } else {
                                setIsPlaying(!isPlaying);
                            }
                        }}
                        onRestart={() => {
                            // Pass the exercise's stopAllLocalEvents from ExerciseGameViewALT
                            // to ensure complete cleanup before restart
                            setIsPlaying(false);
                            setIsExerciseComplete(false);
                            // Small delay to ensure cleanup completes
                            setTimeout(() => setIsPlaying(true), 50);
                        }}
                        onExit={() => {
                            // Ensure complete cleanup when exiting
                            setIsPlaying(false);
                            setIsExerciseComplete(false);

                            // Check if we're in an iframe (VoxLab integration) with an AI exercise
                            if (window.parent !== window && isAIMode) {
                                // Send back message to VoxLab
                                window.parent.postMessage({
                                    type: 'PP_BACK_TO_AI'
                                }, window.location.origin);
                            } else {
                                // Normal exit to landing screen
                                transitionToView('landing');
                            }
                        }}
                        onExerciseComplete={handleExerciseComplete}
                        onNextExercise={handleNextExercise}
                        micActive={micActive}
                        onToggleMic={toggleMic}
                        onToggleFavorite={toggleFavorite}
                        isFavorite={favorites.has(selectedExerciseId)}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
