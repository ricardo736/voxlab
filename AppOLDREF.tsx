import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Note, VocalRange, Exercise, NoteNodes, VocalRangeEntry, Language, Theme, TestStep, Routine, ActiveView, AppMode } from './types';
import { TranslationKey } from './i18n';
import { EXERCISES, LANGUAGES, THEMES, ROUTINES } from './constants';
import { generateNotes, noteToFrequency, frequencyToNote, lerp, semitoneToNoteName } from './utils';
import Piano from './components/Piano';
import ExerciseView from './components/ExerciseView';
import ExerciseGameViewALT from './components/ExerciseGameViewALT';
import SharedPitchVisualizer from './components/SharedPitchVisualizer';
import InputVolumeMeter from './components/InputVolumeMeter';
import PitchViewControls from './components/PitchViewControls';
import FloatingMenu from './components/FloatingMenu';
// Fix: Use default import for VocalRangeTestScreen.
import VocalRangeTestScreen from './components/VocalRangeTestScreen';
import SettingsOverlay from './components/SettingsOverlay';
import { useTranslation } from './hooks/useTranslation';
import RoutineView from './components/RoutineView';
import ComingSoonView from './components/ComingSoonView';
import VoxLabAIView from './components/AIStudioView';
import FavoritesView from './components/FavoritesView';
import InstrumentTuner from './components/InstrumentTuner';
import ThemedButton from './components/ThemedButton';
import OrbVisualizer from './components/OrbVisualizer';
import FeedbackOverlay from './components/FeedbackOverlay';
import splashVideo from './visuals/sphere_v2.mp4';

// --- CONFIGURATION FOR CUSTOM SOUNDS ---
// 1. Create a folder named "sounds" in your project root (next to index.html).
// 2. Put your MP3 files there.
// 3. Name them exactly like the note names (e.g., "C4.mp3", "C#4.mp3", "Ab4.mp3").
//    Note: Use "s" instead of "#" if you prefer (e.g. "Cs4.mp3"), just update the fetching logic.
const CUSTOM_SAMPLES_URL = "/sounds/";
// ---------------------------------------

const pitchProcessorCode = `
class PitchProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.analysisBufferSize = 2048;
        this.buffer = new Float32Array(this.analysisBufferSize);
        this.bufferPos = 0;
        this.lastGain = 0;
        this.noiseGateThreshold = options.processorOptions.noiseGateThreshold || 0.004;
        this.algorithm = options.processorOptions.algorithm || 'mpm'; // 'mpm' or 'yin'
        this.port.onmessage = (event) => {
            if (event.data.noiseGateThreshold) {
                this.noiseGateThreshold = event.data.noiseGateThreshold;
            }
            if (event.data.algorithm) {
                this.algorithm = event.data.algorithm;
            }
        };
    }

    static get parameterDescriptors() {
        return [];
    }
    
    // McLeod Pitch Method (MPM) - professional-grade pitch detection for voice
    mcleodPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const minPeriod = Math.floor(sampleRate / 2000); // 2000 Hz max
        const maxPeriod = Math.floor(sampleRate / 30);   // 30 Hz min
        
        // Step 1: Normalized Square Difference Function (NSDF)
        const nsdf = new Array(maxPeriod + 1).fill(0);
        
        for (let tau = 0; tau <= maxPeriod; tau++) {
            let acf = 0;
            let divisorM = 0;
            
            for (let i = 0; i < bufferSize - tau; i++) {
                acf += buffer[i] * buffer[i + tau];
                divisorM += buffer[i] * buffer[i] + buffer[i + tau] * buffer[i + tau];
            }
            
            nsdf[tau] = divisorM > 0 ? (2 * acf) / divisorM : 0;
        }
        
        // Step 2: Peak picking - find positive zero crossings
        const peaks = [];
        for (let tau = minPeriod; tau < maxPeriod - 1; tau++) {
            if (nsdf[tau] > 0 && nsdf[tau] > nsdf[tau - 1] && nsdf[tau] >= nsdf[tau + 1]) {
                peaks.push({ period: tau, clarity: nsdf[tau] });
            }
        }
        
        if (peaks.length === 0) return -1;
        
        // Step 3: Find the best peak (highest clarity above threshold)
        peaks.sort((a, b) => b.clarity - a.clarity);
        const bestPeak = peaks[0];
        
        if (bestPeak.clarity < 0.90) return -1; // Very strong clarity threshold for stability
        
        // Step 4: Parabolic interpolation for sub-sample accuracy
        const tau = bestPeak.period;
        const y1 = nsdf[tau - 1];
        const y2 = nsdf[tau];
        const y3 = nsdf[tau + 1];
        
        const delta = 0.5 * (y3 - y1) / (2 * y2 - y1 - y3);
        const refinedPeriod = tau + delta;
        
        return sampleRate / refinedPeriod;
    }

    // YIN Algorithm - simpler, faster alternative
    yinPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const threshold = 0.15; // Lower = more strict
        const minPeriod = Math.floor(sampleRate / 2000);
        const maxPeriod = Math.floor(sampleRate / 30);
        
        // Step 1: Difference function
        const diff = new Float32Array(maxPeriod + 1);
        for (let tau = 0; tau <= maxPeriod; tau++) {
            let sum = 0;
            for (let i = 0; i < bufferSize - tau; i++) {
                const delta = buffer[i] - buffer[i + tau];
                sum += delta * delta;
            }
            diff[tau] = sum;
        }
        
        // Step 2: Cumulative mean normalized difference
        const cmndf = new Float32Array(maxPeriod + 1);
        cmndf[0] = 1;
        let runningSum = 0;
        for (let tau = 1; tau <= maxPeriod; tau++) {
            runningSum += diff[tau];
            cmndf[tau] = diff[tau] / (runningSum / tau);
        }
        
        // Step 3: Absolute threshold
        let tau = minPeriod;
        while (tau < maxPeriod) {
            if (cmndf[tau] < threshold) {
                while (tau + 1 < maxPeriod && cmndf[tau + 1] < cmndf[tau]) {
                    tau++;
                }
                break;
            }
            tau++;
        }
        
        if (tau >= maxPeriod || cmndf[tau] >= threshold) return -1;
        
        // Step 4: Parabolic interpolation
        let betterTau = tau;
        if (tau > 0 && tau < maxPeriod) {
            const s0 = cmndf[tau - 1];
            const s1 = cmndf[tau];
            const s2 = cmndf[tau + 1];
            betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
        
        return sampleRate / betterTau;
    }

    // PYIN Algorithm - Probabilistic YIN with better accuracy
    pyinPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const threshold = 0.1;
        const minPeriod = Math.floor(sampleRate / 2000);
        const maxPeriod = Math.floor(sampleRate / 30);
        
        // Run YIN to get candidates
        const diff = new Float32Array(maxPeriod + 1);
        for (let tau = 0; tau <= maxPeriod; tau++) {
            let sum = 0;
            for (let i = 0; i < bufferSize - tau; i++) {
                const delta = buffer[i] - buffer[i + tau];
                sum += delta * delta;
            }
            diff[tau] = sum;
        }
        
        const cmndf = new Float32Array(maxPeriod + 1);
        cmndf[0] = 1;
        let runningSum = 0;
        for (let tau = 1; tau <= maxPeriod; tau++) {
            runningSum += diff[tau];
            cmndf[tau] = diff[tau] / (runningSum / tau);
        }
        
        // Find ALL candidates below threshold (not just first)
        const candidates = [];
        for (let tau = minPeriod; tau < maxPeriod; tau++) {
            if (cmndf[tau] < threshold) {
                // Local minimum
                if (tau > 0 && tau < maxPeriod - 1 && cmndf[tau] < cmndf[tau - 1] && cmndf[tau] < cmndf[tau + 1]) {
                    candidates.push({ tau: tau, score: 1 - cmndf[tau] });
                }
            }
        }
        
        if (candidates.length === 0) return -1;
        
        // Pick best candidate (highest score)
        candidates.sort((a, b) => b.score - a.score);
        const bestTau = candidates[0].tau;
        
        // Parabolic interpolation
        let refinedTau = bestTau;
        if (bestTau > 0 && bestTau < maxPeriod) {
            const s0 = cmndf[bestTau - 1];
            const s1 = cmndf[bestTau];
            const s2 = cmndf[bestTau + 1];
            refinedTau = bestTau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
        
        return sampleRate / refinedTau;
    }

    // SWIPE Algorithm - Sawtooth Waveform Inspired Pitch Estimator
    swipePitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const minFreq = 30;
        const maxFreq = 2000;
        const numCandidates = 100;
        
        // Generate candidate frequencies (log-spaced)
        const candidates = [];
        const logMin = Math.log(minFreq);
        const logMax = Math.log(maxFreq);
        for (let i = 0; i < numCandidates; i++) {
            const logFreq = logMin + (logMax - logMin) * i / (numCandidates - 1);
            candidates.push(Math.exp(logFreq));
        }
        
        // Calculate strength for each candidate
        let maxStrength = 0;
        let bestFreq = -1;
        
        for (const freq of candidates) {
            const period = sampleRate / freq;
            let strength = 0;
            let count = 0;
            
            // Prime-based subharmonic summation
            for (let k = 1; k <= 5; k++) {
                const tau = Math.round(period * k);
                if (tau < bufferSize) {
                    let localSum = 0;
                    for (let i = 0; i < bufferSize - tau; i++) {
                        localSum += buffer[i] * buffer[i + tau];
                    }
                    strength += localSum / k;
                    count++;
                }
            }
            
            if (count > 0) {
                strength /= count;
                if (strength > maxStrength) {
                    maxStrength = strength;
                    bestFreq = freq;
                }
            }
        }
        
        return maxStrength > 0.01 ? bestFreq : -1;
    }

    // HPS Algorithm - Harmonic Product Spectrum
    hpsPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const fftSize = 2048;
        
        // Simple FFT approximation using autocorrelation
        const spectrum = new Float32Array(fftSize / 2);
        for (let k = 0; k < fftSize / 2; k++) {
            let real = 0, imag = 0;
            for (let n = 0; n < Math.min(bufferSize, fftSize); n++) {
                const angle = -2 * Math.PI * k * n / fftSize;
                real += buffer[n] * Math.cos(angle);
                imag += buffer[n] * Math.sin(angle);
            }
            spectrum[k] = Math.sqrt(real * real + imag * imag);
        }
        
        // Harmonic Product Spectrum (multiply downsampled versions)
        const hps = new Float32Array(fftSize / 2);
        for (let i = 0; i < fftSize / 2; i++) {
            hps[i] = spectrum[i];
        }
        
        // Multiply with 2nd, 3rd, 4th harmonics
        for (let harmonic = 2; harmonic <= 4; harmonic++) {
            for (let i = 0; i < fftSize / (2 * harmonic); i++) {
                hps[i] *= spectrum[i * harmonic];
            }
        }
        
        // Find peak in HPS
        let maxVal = 0;
        let maxIdx = 0;
        const minBin = Math.floor(30 * fftSize / sampleRate);
        const maxBin = Math.floor(2000 * fftSize / sampleRate);
        
        for (let i = minBin; i < maxBin && i < hps.length; i++) {
            if (hps[i] > maxVal) {
                maxVal = hps[i];
                maxIdx = i;
            }
        }
        
        if (maxVal < 0.01) return -1;
        
        // Convert bin to frequency
        return maxIdx * sampleRate / fftSize;
    }


    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];
            let sum = 0;
            for (let i = 0; i < channelData.length; i++) {
                sum += channelData[i] * channelData[i];
            }
            this.lastGain = Math.sqrt(sum / channelData.length);
            const remainingSpace = this.analysisBufferSize - this.bufferPos;
            const toCopy = Math.min(channelData.length, remainingSpace);
            this.buffer.set(channelData.subarray(0, toCopy), this.bufferPos);
            this.bufferPos += toCopy;
            
            if (this.bufferPos >= this.analysisBufferSize) {
                let pitch = -1;
                if (this.lastGain > this.noiseGateThreshold) { 
                    // Select algorithm
                    if (this.algorithm === 'yin') {
                        pitch = this.yinPitchMethod(this.buffer, sampleRate);
                    } else if (this.algorithm === 'pyin') {
                        pitch = this.pyinPitchMethod(this.buffer, sampleRate);
                    } else if (this.algorithm === 'swipe') {
                        pitch = this.swipePitchMethod(this.buffer, sampleRate);
                    } else if (this.algorithm === 'hps') {
                        pitch = this.hpsPitchMethod(this.buffer, sampleRate);
                    } else {
                        pitch = this.mcleodPitchMethod(this.buffer, sampleRate);
                    }
                }
                this.port.postMessage({ pitch, gain: this.lastGain });
                this.bufferPos = 0;
            } else {
                 this.port.postMessage({ gain: this.lastGain });
            }
        }
        return true;
    }
}
try {
    registerProcessor('pitch-processor', PitchProcessor);
} catch (e) {
    // Processor already registered, this is fine
    console.log('Pitch processor already registered (reusing existing)');
}
`;

const VocalRangeDisplay: React.FC<{ range: VocalRange, theme: Theme, onClick: () => void }> = React.memo(({ range, theme, onClick }) => {
    const { t } = useTranslation();
    const isSet = range.start && range.end;
    const rangeText = isSet ? `${range.start.name} - ${range.end.name}` : t('rangeNotSet');

    return (
        <button
            onClick={onClick}
            className={`btn-interactive text-xs font-bold z-10 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm ${isSet
                ? `bg-white/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700`
                : `text-slate-500 bg-slate-200/50 hover:bg-slate-200/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80 border border-slate-300/50 dark:border-slate-600`
                }`}
        >
            <span className={`bg-clip-text text-transparent bg-gradient-to-br ${theme.gradientText.from} ${theme.gradientText.to} ${theme.gradientText.darkFrom} ${theme.gradientText.darkTo}`}>{rangeText}</span>
        </button>
    );
});

const RangeCheckModal: React.FC<{ onDefine: () => void, onContinue: () => void, theme: Theme }> = React.memo(({ onDefine, onContinue, theme }) => {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);

    useEffect(() => {
        const timer = requestAnimationFrame(() => setShow(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    const handleClose = useCallback((callback: () => void) => {
        setShow(false);
        setTimeout(callback, 300);
    }, []);

    return (
        <div className={`fixed inset-0 bg-black/20 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${show ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full shadow-lg text-center transition-all duration-300 ease-out ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">{t('rangeCheckTitle')}</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6">{t('rangeCheckPrompt')}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => handleClose(onContinue)} className="btn-interactive flex-1 px-4 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-transparent backdrop-blur-sm border border-slate-400 dark:border-slate-500 shadow-sm hover:bg-slate-400/10 dark:hover:bg-slate-800/20">
                        {t('continueAnyway')}
                    </button>
                    <ThemedButton theme={theme} onClick={() => handleClose(onDefine)}>
                        {t('defineRange')}
                    </ThemedButton>
                </div>
            </div>
        </div>
    );
});

const RoutineCompleteModal: React.FC<{ onFinish: () => void; theme: Theme }> = React.memo(({ onFinish, theme }) => {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);

    useEffect(() => {
        const timer = requestAnimationFrame(() => setShow(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    const handleClose = useCallback(() => {
        setShow(false);
        setTimeout(onFinish, 300); // Animation duration
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 bg-black/20 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${show ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full shadow-lg text-center transition-all duration-300 ease-out ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">{t('routineComplete')}</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6">{t('drinkWaterSuggestion')}</p>
                <ThemedButton onClick={handleClose} theme={theme} className="w-full">{t('finish')}</ThemedButton>
            </div>
        </div>
    );
});

// Optimization: Static Regex patterns defined outside component
const NOTE_REGEX = /([a-gA-G])(#{1,2}|s|b{1,2})?\s*(-?\d+)$/;
const MIDI_NOTE_REGEX = /(?:^|\D)(2[1-9]|[3-9]\d|10[0-8])(?:\D|$)/;
const NORMALIZE_REGEX = /[_.-]/g;
const SHARP_REGEX = /sharp/gi;
const FLAT_REGEX = /flat/gi;

// Beta Mode Feature Flag - Only show beta features when this is true
const IS_BETA_MODE = (import.meta as any).env?.VITE_BETA_BUILD === 'true';

export default function App() {
    // Splash screen state
    const [showSplash, setShowSplash] = useState(true);

    // Hide splash after video completes (2.5 seconds)
    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 2500);
        return () => clearTimeout(timer);
    }, []);

    const { t, language, setLanguage } = useTranslation();
    const [uiView, setUiView] = useState<'main' | 'exercise'>('main');
    const [isMenuVisible, setIsMenuVisible] = useState(true);
    const [activeView, setActiveView] = useState<ActiveView>('home');
    const [vocalRange, setVocalRange] = useState<VocalRange>({ start: null, end: null });
    const [vocalRangeHistory, setVocalRangeHistory] = useState<VocalRangeEntry[]>([]);
    const [exerciseRange, setExerciseRange] = useState<VocalRange>({ start: null, end: null });
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExerciseComplete, setIsExerciseComplete] = useState(false);
    const [isRoutineComplete, setIsRoutineComplete] = useState(false);
    const [exerciseKey, setExerciseKey] = useState(0);
    const [currentRoutine, setCurrentRoutine] = useState<{ routine: Routine; exerciseIndex: number } | null>(null);

    const [exerciseNoteVolume, setExerciseNoteVolume] = useState(1.0);
    const [metronomeVolume, setMetronomeVolume] = useState(0.3);

    const [micActive, setMicActive] = useState(false);
    const [userPitch, setUserPitch] = useState<number | null>(null);
    const [micGain, setMicGain] = useState(0);
    const [micStatus, setMicStatus] = useState(t('micStatusActivate'));

    const [isRangeTestActive, setIsRangeTestActive] = useState(false);
    const [showPianoForRangeSelection, setShowPianoForRangeSelection] = useState(false);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [themeId, setThemeId] = useState<string>(THEMES[0].id);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');

    const [isRangeCheckModalOpen, setIsRangeCheckModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [postRangeTestAction, setPostRangeTestAction] = useState<(() => void) | null>(null);

    const [savedAIExercises, setSavedAIExercises] = useState<Exercise[]>([]);
    const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<number[]>([]);
    const [favoriteRoutineIds, setFavoriteRoutineIds] = useState<string[]>([]);

    const [isFullscreen, setIsFullscreen] = useState(false);

    // New states for cancellable preview and leave confirmation
    const [isPreviewing, setIsPreviewing] = useState(false);

    // New state for MVP vs Full mode
    const [appMode, setAppMode] = useState<AppMode>('mvp');

    // Loaded samples count for settings UI
    const [loadedSampleCount, setLoadedSampleCount] = useState(0);



    const audioCtxRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const workletModuleAddedRef = useRef(false); // Track if pitch-processor module is registered
    const masterGainRef = useRef<GainNode | null>(null);
    const currentPlayingExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set());
    const currentNonExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set());
    const audioInitPromiseRef = useRef<Promise<boolean> | null>(null);
    const previewTimersRef = useRef<number[]>([]);
    const latestPlayRequestRef = useRef<number>(0);

    // 🎯 AUDIO FEEDBACK PREVENTION: Track currently playing notes to filter from pitch detection
    const currentlyPlayingNotesRef = useRef<Set<number>>(new Set()); // Store semitones of currently playing exercise notes

    // Sample Management
    // Changed from simple map to Library of instruments
    const instrumentLibraryRef = useRef<Record<string, Map<number, AudioBuffer>>>({});
    const failedSamplesRef = useRef<Set<number>>(new Set()); // We track failed fetches generally, less critical for local

    const [activeInstrument, setActiveInstrument] = useState<string>('Default');
    const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);

    // Centralized View & Audio Controls State
    const [centerSemitone, setCenterSemitone] = useState(0);
    const [visibleOctaves, setVisibleOctaves] = useState(0.7);
    const [autoFitEnabled, setAutoFitEnabled] = useState(true);
    const [gainValue, setGainValue] = useState(1);
    const [noiseGateThreshold, setNoiseGateThreshold] = useState(0.01); // Increased from 0.006 for better noise filtering
    const [compressorThreshold, setCompressorThreshold] = useState(-24);
    const [compressorRatio, setCompressorRatio] = useState(4); // Calibrated default
    const [compressorRelease, setCompressorRelease] = useState(0.25);
    const [autoGainEnabled, setAutoGainEnabled] = useState(true);
    const [eqLowGain, setEqLowGain] = useState(0);
    const [eqMidGain, setEqMidGain] = useState(0);
    const [eqHighGain, setEqHighGain] = useState(0);

    // --- COMPRESSOR CONTROL ---
    const [compressorEnabled, setCompressorEnabled] = useState(false);

    // --- FREQUENCY SEPARATION (Anti-Feedback) ---
    const [frequencySeparationEnabled, setFrequencySeparationEnabled] = useState(true);

    // --- PITCH DETECTION ALGORITHM ---
    const [pitchAlgorithm, setPitchAlgorithm] = useState<'mpm' | 'yin' | 'pyin' | 'swipe' | 'hps'>('pyin'); // PYIN as default

    // --- PITCH SMOOTHING ---
    const [pitchSmoothingFactor, setPitchSmoothingFactor] = useState(0.15); // 0 = no smoothing, 1 = max smoothing


    // Store the last valid pitch for sanity checks
    const lastPitchRef = useRef<number | null>(null);

    const [autoFitTarget, setAutoFitTarget] = useState<number | null>(null);
    const [exerciseNoteCenter, setExerciseNoteCenter] = useState<number | null>(null);
    const viewControlTargetsRef = useRef({ center: 0, octaves: 0.7 });
    const needsCameraSnapRef = useRef(false);

    // Refs for audio processing nodes
    const gainNodeRef = useRef<GainNode | null>(null);
    const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
    const eqLowNodeRef = useRef<BiquadFilterNode | null>(null);
    const eqMidNodeRef = useRef<BiquadFilterNode | null>(null);
    const eqHighNodeRef = useRef<BiquadFilterNode | null>(null);

    // For Smoothing input
    const lastSmoothedPitchRef = useRef<number | null>(null);
    const pitchBufferRef = useRef<number[]>([]);

    const activeTheme = useMemo(() => THEMES.find(p => p.id === themeId) || THEMES[0], [themeId]);

    const pianoNotes = useMemo(() => generateNotes(-24, 24), []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', themeMode === 'dark');
    }, [themeMode]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);



    useEffect(() => {
        const load = (k: string, s: (v: any) => void, d: any) => { try { const v = localStorage.getItem(k); if (v) s(JSON.parse(v)); } catch (e) { console.error(`Failed to load ${k}`, e); s(d); } };
        load('vocalRange', setVocalRange, { start: null, end: null });
        load('savedAIExercises', setSavedAIExercises, []);
        load('favoriteExerciseIds', setFavoriteExerciseIds, []);
        load('favoriteRoutineIds', setFavoriteRoutineIds, []);
        load('appMode', setAppMode, 'full'); // Default to 'full' version for beta testers
    }, []);

    useEffect(() => {
        const save = (k: string, v: any) => { try { if (v !== null && v !== undefined) localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error(`Failed to save ${k}`, e); } };
        if (vocalRange.start && vocalRange.end) save('vocalRange', vocalRange);
        save('savedAIExercises', savedAIExercises);
        save('favoriteExerciseIds', favoriteExerciseIds);
        save('favoriteRoutineIds', favoriteRoutineIds);
        save('appMode', appMode);
    }, [vocalRange, savedAIExercises, favoriteExerciseIds, favoriteRoutineIds, appMode]);

    useEffect(() => {
        if (!isRangeCheckModalOpen && vocalRange.start && pendingAction) {
            pendingAction(); setPendingAction(null);
        }
    }, [isRangeCheckModalOpen, vocalRange, pendingAction]);

    useEffect(() => {
        // When switching to MVP mode, if the current view is not an MVP view, switch to home.
        if (appMode === 'mvp' && !['home', 'range', 'exercises', 'pitch'].includes(activeView)) {
            setActiveView('home');
        }
    }, [appMode, activeView]);

    useEffect(() => {
        if (activeView !== 'range') setShowPianoForRangeSelection(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
    }, [activeView]);

    useEffect(() => {
        setMicStatus(micActive ? t('micStatusListening') : t('micStatusActivate'));
    }, [micActive, t]);

    const initAudio = useCallback(() => {
        if (!audioInitPromiseRef.current) {
            audioInitPromiseRef.current = (async () => {
                if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                    if (audioCtxRef.current.state === 'suspended') {
                        await audioCtxRef.current.resume();
                    }
                    return true;
                }
                try {
                    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const gain = context.createGain(); gain.gain.value = 0.5;
                    masterGainRef.current = gain; masterGainRef.current.connect(context.destination);
                    const blob = new Blob([pitchProcessorCode], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    await context.audioWorklet.addModule(url);
                    URL.revokeObjectURL(url);
                    audioCtxRef.current = context;

                    // Check if audio context is suspended (common on mobile)
                    // if (context.state !== 'suspended') {
                    //     setAudioUnlocked(true);
                    // }

                    // Initialize compressor and EQ
                    compressorNodeRef.current = context.createDynamicsCompressor();
                    compressorNodeRef.current.threshold.value = compressorThreshold;
                    compressorNodeRef.current.ratio.value = compressorRatio;
                    compressorNodeRef.current.release.value = compressorRelease;
                    return true;
                } catch (e) { console.error("Error initializing audio.", e); setMicStatus(t('micStatusError')); return false; }
            })();
        }
        return audioInitPromiseRef.current;
    }, [t, compressorThreshold, compressorRatio, compressorRelease]);

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
                        if (!audioCtxRef.current) return null;
                        const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);

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

    const checkAudioBuffers = useCallback(async (semitones: number[]): Promise<void> => {
        const audioReady = await initAudio();
        if (!audioReady) return;

        // For local files, they are already loaded.
        // For cloud files, we'd fetch them here. 
        // If using "Default" instrument and it's empty, try fetch.

        if (activeInstrument === 'Default' && (!instrumentLibraryRef.current['Default'] || instrumentLibraryRef.current['Default'].size === 0)) {
            const uniqueSemitones = [...new Set(semitones)];
            // Only fetch what we don't have
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
        // 1. Remove extension
        const name = filename.replace(/\.[^/.]+$/, "");

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
                    const prefix = name.substring(0, splitIndex).replace(/[_.-]+$/, '').trim();
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
    }, [initAudio, parseSampleInfo, activeInstrument]);

    const loadBuiltInPianoSamples = useCallback(async () => {
        const audioReady = await initAudio();
        if (!audioReady || !audioCtxRef.current) return { loaded: 0, errors: 0 };

        // Define the built-in piano samples
        const pianoSamples = [
            { filename: 'C1.wav', semitone: -36 },  // C1 = C4 - 3 octaves = 0 - 36
            { filename: 'C2.wav', semitone: -24 },  // C2 = C4 - 2 octaves = 0 - 24
            { filename: 'C4.wav', semitone: 0 },    // C4 = reference (0 semitones)
            { filename: 'C5.wav', semitone: 12 },   // C5 = C4 + 1 octave = 0 + 12
            { filename: 'C6.wav', semitone: 24 }    // C6 = C4 + 2 octaves = 0 + 24
        ];

        let loadedCount = 0;
        let errors = 0;

        // Create the Piano instrument map
        if (!instrumentLibraryRef.current['Piano']) {
            instrumentLibraryRef.current['Piano'] = new Map();
        }

        for (const sample of pianoSamples) {
            try {
                const response = await fetch(`/sounds/Piano/${sample.filename}`);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);

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
            console.log(`✅ Loaded ${loadedCount} Piano samples with automatic repitching`);
        }

        return { loaded: loadedCount, errors };
    }, [initAudio]);

    const getAudioTime = useCallback(() => {
        return audioCtxRef.current?.currentTime || 0;
    }, []);

    const playNote = useCallback(async (semitone: number, duration: number, forExercise: boolean = false, startTime?: number) => {
        // Safety check: Ensure duration is valid and positive
        if (!isFinite(duration) || duration <= 0) {
            console.warn(`Invalid duration: ${duration}, using default 500ms`);
            duration = 500; // Default to 500ms
        }

        const audioReady = await initAudio();
        const audioCtx = audioCtxRef.current;
        const masterGain = masterGainRef.current;
        if (!audioReady || !audioCtx || !masterGain) return;

        // Use provided startTime or default to now
        const now = startTime !== undefined ? startTime : audioCtx.currentTime;

        const noteSet = forExercise ? currentPlayingExerciseNoteNodesRef.current : currentNonExerciseNoteNodesRef.current;


        // PREVENT OVERLAPPING: Stop any previous notes of the same semitone
        noteSet.forEach(existingNode => {
            // Check if this node is playing the same semitone (stored in a custom property)
            if ((existingNode as any).semitone === semitone) {
                // Quickly fade out and stop
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

        // Get the map for the current instrument
        const currentMap = instrumentLibraryRef.current[activeInstrument];

        // --- TRY PLAYING SAMPLE WITH NEAREST NEIGHBOR SEARCH (SCOPED TO INSTRUMENT) ---
        let buffer: AudioBuffer | null = null;
        let playbackRate = 1.0;

        if (currentMap && currentMap.size > 0) {
            // 1. Check exact match
            if (currentMap.has(semitone)) {
                buffer = currentMap.get(semitone)!;
            }
            // 2. Fallback: Search for nearest neighbor in THIS instrument's map
            else {
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
            // Legacy fallback/Cloud behavior if Default is empty (try to fetch)
            // Only logic remains for compat if user didn't load local files
            try {
                const fetched = await fetchAndDecodeSample(semitone);
                if (fetched) buffer = fetched;
            } catch (e) { }
        }

        if (buffer) {
            // Play Sample
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = playbackRate;

            const sampleGain = audioCtx.createGain();
            sampleGain.gain.setValueAtTime(forExercise ? exerciseNoteVolume : 0.5, now);
            sampleGain.gain.exponentialRampToValueAtTime(0.001, now + (duration / 1000) + 0.5);

            source.connect(sampleGain);

            const nodes: NoteNodes = { oscillators: [], gainNodes: [sampleGain], allNodes: [source, sampleGain] };

            // FREQUENCY SEPARATION: Low-pass filter for piano output (warm, bass-heavy sound)
            if (frequencySeparationEnabled) {
                const lowPassFilter = audioCtx.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 700; // Keep bass/warmth, cut highs
                lowPassFilter.Q.value = 0.7; // Gentle slope
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

            // Store semitone for overlap detection
            (nodes as any).semitone = semitone;
            source.onended = () => { nodes.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } }); noteSet.delete(nodes); };
            noteSet.add(nodes);

        } else {
            // --- FALLBACK: SYNTHESIS ---
            const freq = noteToFrequency(semitone);
            const totalDurationSecs = duration / 1000;
            const ATTACK_TIME = 0.01; const DECAY_TIME = 0.1; const SUSTAIN_LEVEL = 0.1;

            const mainGainNode = audioCtx.createGain();
            mainGainNode.gain.setValueAtTime(0, now);
            mainGainNode.gain.linearRampToValueAtTime(forExercise ? exerciseNoteVolume * 0.8 : 0.4, now + ATTACK_TIME);
            mainGainNode.gain.exponentialRampToValueAtTime(SUSTAIN_LEVEL, now + ATTACK_TIME + DECAY_TIME);
            mainGainNode.gain.exponentialRampToValueAtTime(0.0001, now + totalDurationSecs);

            const nodes: NoteNodes = { oscillators: [], gainNodes: [mainGainNode], allNodes: [mainGainNode] };

            // FREQUENCY SEPARATION: Low-pass filter for synthesized piano
            if (frequencySeparationEnabled) {
                const lowPassFilter = audioCtx.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 700;
                lowPassFilter.Q.value = 0.7;
                mainGainNode.connect(lowPassFilter);
                lowPassFilter.connect(masterGain);
                nodes.allNodes.push(lowPassFilter);
            } else {
                mainGainNode.connect(masterGain);
            }

            // Store semitone for overlap detection
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
    }, [initAudio, exerciseNoteVolume, fetchAndDecodeSample, activeInstrument]);

    const playMetronomeClick = useCallback(async () => {
        const audioReady = await initAudio(); const audioCtx = audioCtxRef.current;
        if (!audioReady || !audioCtx || !masterGainRef.current) return;
        const now = audioCtx.currentTime; const clickGain = audioCtx.createGain();
        clickGain.gain.setValueAtTime(metronomeVolume, now); clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        clickGain.connect(masterGainRef.current);
        const osc = audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now); osc.connect(clickGain);
        osc.start(now); osc.stop(now + 0.1);
        osc.onended = () => { try { osc.disconnect(); clickGain.disconnect(); } catch (e) { } };
    }, [initAudio, metronomeVolume]);

    const stopAllExerciseNotes = useCallback(() => {
        const audioCtx = audioCtxRef.current; if (!audioCtx) return;
        currentPlayingExerciseNoteNodesRef.current.forEach(n => {
            // RAMP DOWN INSTEAD OF INSTANT STOP
            const now = audioCtx.currentTime;
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

            // Cleanup later (simple timeout for now)
            setTimeout(() => {
                n.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } });
            }, 200);
        });
        currentPlayingExerciseNoteNodesRef.current.clear();
    }, []);

    const stopAllNonExerciseNotes = useCallback(() => {
        const audioCtx = audioCtxRef.current; if (!audioCtx) return;
        currentNonExerciseNoteNodesRef.current.forEach(n => { n.allNodes.forEach(node => { if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) { try { node.stop(audioCtx.currentTime); } catch (e) { } } try { node.disconnect(); } catch (e) { } }); });
        currentNonExerciseNoteNodesRef.current.clear();
    }, []);

    const startPitchDetection = useCallback(async (): Promise<boolean> => {
        const audioReady = await initAudio(); const audioCtx = audioCtxRef.current;
        if (!audioReady || !audioCtx) { setMicStatus(t('micStatusError')); return false; }
        try {
            console.log('🎙️ Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    // 🎯 AGGRESSIVE ECHO CANCELLATION for feedback prevention
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: autoGainEnabled },
                    // @ts-ignore - Chrome/Chromium specific constraints for stronger echo cancellation
                    googEchoCancellation: { exact: true },
                    // @ts-ignore
                    googExperimentalEchoCancellation: { exact: true },
                    // @ts-ignore
                    googAutoGainControl: { exact: autoGainEnabled },
                    // @ts-ignore
                    googNoiseSuppression: { exact: true },
                    // @ts-ignore
                    googExperimentalNoiseSuppression: { exact: true },
                    // @ts-ignore
                    googHighpassFilter: { exact: true },
                    // @ts-ignore - Safari-specific constraint
                    echoCancelation: { ideal: true }
                }
            });
            micStreamRef.current = stream;
            console.log('✅ Microphone permission granted, creating audio graph...');
            console.log('🎙️ Stream tracks:', stream.getTracks().map(t => ({
                kind: t.kind,
                label: t.label,
                enabled: t.enabled,
                muted: t.muted,
                readyState: t.readyState
            })));
            const source = audioCtx.createMediaStreamSource(stream);
            console.log('🔊 Clean audio pipeline: Mic → Pitch Detector (no processing)');
            console.log('🎵 AudioContext state:', audioCtx.state, '| Sample rate:', audioCtx.sampleRate);

            // Resume AudioContext if suspended
            if (audioCtx.state === 'suspended') {
                console.log('⚠️ AudioContext is suspended, resuming...');
                await audioCtx.resume();
                console.log('✅ AudioContext resumed, state:', audioCtx.state);
            }

            // Initialize AudioWorklet (McLeod Pitch Method) - only add module once
            if (!workletModuleAddedRef.current) {
                try {
                    await audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([pitchProcessorCode], { type: 'application/javascript' })));
                    workletModuleAddedRef.current = true;
                    console.log('✅ Pitch processor (MPM) registered successfully');
                } catch (e) {
                    console.error('❌ Failed to register pitch processor:', e);
                    setMicStatus(t('micStatusError'));
                    return false;
                }
            }

            const workletNode = new AudioWorkletNode(audioCtx, 'pitch-processor', {
                processorOptions: {
                    noiseGateThreshold,
                    algorithm: pitchAlgorithm
                }
            });
            workletNodeRef.current = workletNode;

            // FREQUENCY SEPARATION: High-pass filter for mic input (blocks piano frequencies)
            let micInputNode: AudioNode = source;
            if (frequencySeparationEnabled) {
                const highPassFilter = audioCtx.createBiquadFilter();
                highPassFilter.type = 'highpass';
                highPassFilter.frequency.value = 700; // Block piano (below 700Hz), keep voice (above 700Hz)
                highPassFilter.Q.value = 0.7; // Gentle slope
                source.connect(highPassFilter);
                micInputNode = highPassFilter;
                console.log('✅ Frequency separation enabled: Mic → High-pass (700Hz) → Pitch Detector');
            }

            // Connect to pitch detector
            micInputNode.connect(workletNode);
            console.log('✅ Audio graph connected:', frequencySeparationEnabled ? 'Mic → HPF → Detector' : 'Mic → Detector');

            workletNode.port.onmessage = (event) => {
                const { pitch, gain } = event.data;
                const adjustedGain = gain;
                setMicGain(Math.min(1, adjustedGain * 100) * 100);

                if (pitch !== undefined && pitch > 60) {
                    // Reject impossible octave jumps (likely pitch detection errors)
                    if (lastPitchRef.current !== null) {
                        const semitoneJump = Math.abs(12 * Math.log2(pitch / lastPitchRef.current));
                        if (semitoneJump > 12) {
                            // Reject jumps larger than an octave - these are detection errors
                            return;
                        }
                    }

                    // Configurable smoothing for stable movement
                    // 0 = no smoothing (instant), 1 = max smoothing (very slow)
                    const smoothedPitch = pitchSmoothingFactor > 0 && lastPitchRef.current !== null
                        ? lastPitchRef.current * (1 - pitchSmoothingFactor) + pitch * pitchSmoothingFactor
                        : pitch;

                    setUserPitch(smoothedPitch);
                    lastPitchRef.current = smoothedPitch;
                } else {
                    // No valid pitch - keep last position so circle stays in place (grey)
                }
            };
            console.log('🎧 Worklet message handler attached, mic should be active now');
            setMicActive(true); return true;
        } catch (err) { console.error("Mic Error:", err); setMicStatus(t('micStatusPermissionDenied')); }
        return false;
    }, [initAudio, t, autoGainEnabled, noiseGateThreshold, gainValue, compressorEnabled]);

    // Effects to update audio node parameters when state changes
    useEffect(() => { if (gainNodeRef.current) gainNodeRef.current.gain.value = autoGainEnabled ? 1 : gainValue; }, [gainValue, autoGainEnabled]);
    useEffect(() => { if (workletNodeRef.current) workletNodeRef.current.port.postMessage({ noiseGateThreshold }); }, [noiseGateThreshold]);
    useEffect(() => { if (workletNodeRef.current) workletNodeRef.current.port.postMessage({ algorithm: pitchAlgorithm }); }, [pitchAlgorithm]);
    useEffect(() => { if (compressorNodeRef.current) { compressorNodeRef.current.threshold.value = compressorThreshold; compressorNodeRef.current.ratio.value = compressorRatio; compressorNodeRef.current.release.value = compressorRelease; } }, [compressorThreshold, compressorRatio, compressorRelease]);
    useEffect(() => { if (eqLowNodeRef.current) eqLowNodeRef.current.gain.value = eqLowGain; }, [eqLowGain]);
    useEffect(() => { if (eqMidNodeRef.current) eqMidNodeRef.current.gain.value = eqMidGain; }, [eqMidGain]);
    useEffect(() => { if (eqHighNodeRef.current) eqHighNodeRef.current.gain.value = eqHighGain; }, [eqHighGain]);

    const stopPitchDetection = useCallback(() => {
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        if (workletNodeRef.current) { workletNodeRef.current.port.onmessage = null; workletNodeRef.current.disconnect(); workletNodeRef.current = null; }
        workletModuleAddedRef.current = false; // Reset so worklet can be re-registered on next start
        setMicActive(false); setUserPitch(null); setMicGain(0);
        lastSmoothedPitchRef.current = null;
        pitchBufferRef.current = [];
    }, []);

    useEffect(() => () => stopPitchDetection(), [stopPitchDetection]);

    // AUTO-START DISABLED - User must manually click mic button
    // useEffect(() => {
    //     const autoStart = async () => {
    //         console.log('🔍 Auto-start check:', { activeView, uiView, micActive });
    //         if (((activeView === 'pitch' || activeView === 'instrumentTuner') || uiView === 'exercise') && !micActive) {
    //             console.log('🎤 Auto-starting microphone...');
    //             await startPitchDetection();
    //         } else if (micActive) {
    //             console.log('✅ Microphone already active');
    //         } else {
    //             console.log('⏸️  No auto-start needed for current view');
    //         }
    //     };
    //     autoStart();
    // }, [activeView, uiView, micActive, startPitchDetection]);

    const handleMicToggle = useCallback(() => {
        console.log('🔘 Mic button clicked! Current state:', { micActive });
        micActive ? stopPitchDetection() : startPitchDetection();
    }, [micActive, startPitchDetection, stopPitchDetection]);




    const handlePianoKeyClick = useCallback((note: Note) => {
        stopAllNonExerciseNotes(); playNote(note.semitone, 300, false);
        setVocalRange(prev => {
            if (!prev.start || prev.end) return { start: note, end: null };
            return note.semitone > prev.start.semitone ? { start: prev.start, end: note } : { start: note, end: prev.start };
        });
    }, [playNote, stopAllNonExerciseNotes]);

    const executeExerciseAction = useCallback((action: () => void) => {
        if (appMode === 'mvp' && (!vocalRange.start || !vocalRange.end)) {
            action();
            return;
        }
        if (vocalRange.start && vocalRange.end) {
            action();
        } else {
            setPendingAction(() => action);
            setIsRangeCheckModalOpen(true);
        }
    }, [vocalRange.start, vocalRange.end, appMode]);

    const selectExercise = useCallback((ex: Exercise) => {
        executeExerciseAction(() => {
            let currentExerciseRange = vocalRange;
            if (!vocalRange.start || !vocalRange.end) {
                currentExerciseRange = { start: { semitone: -12, name: 'C3', isSharp: false }, end: { semitone: 12, name: 'C5', isSharp: false } };
            }
            setExerciseRange(currentExerciseRange);

            // Predict and center on the first note of the exercise
            const firstNoteSemitone = (currentExerciseRange.start?.semitone ?? -12) + ex.pattern[0];
            viewControlTargetsRef.current.center = firstNoteSemitone;
            viewControlTargetsRef.current.octaves = 1.5; // Keep the 1.5 octave zoom
            needsCameraSnapRef.current = true; // Snap camera immediately

            setIsPlaying(false);
            setIsExerciseComplete(false);
            setExerciseKey(k => k + 1);
            setSelectedExercise(ex);
            setIsMenuVisible(false);
            setUiView('exercise');
        });
    }, [vocalRange, executeExerciseAction]);

    const handleStartGeneratedExercise = useCallback((ex: Exercise) => selectExercise(ex), [selectExercise]);

    const resetCameraToDefault = useCallback(() => {
        viewControlTargetsRef.current.octaves = 0.7;
        viewControlTargetsRef.current.center = 0;
        setAutoFitTarget(null);
        needsCameraSnapRef.current = true;
    }, []);

    const handleStop = useCallback(() => {
        if (isPreviewing) stopPreview();
        setIsPlaying(false);
        setIsExerciseComplete(false);
        stopAllExerciseNotes();
        stopAllNonExerciseNotes();
        setSelectedExercise(null);
        setExerciseRange({ start: null, end: null });
        setExerciseNoteCenter(null);
        setUiView('main');
        setIsMenuVisible(true);
        if (currentRoutine) {
            setCurrentRoutine(null);
            setActiveView('routines');
        }
        resetCameraToDefault();
    }, [currentRoutine, stopAllExerciseNotes, stopAllNonExerciseNotes, isPreviewing, resetCameraToDefault]);

    const handleNextExerciseInRoutine = useCallback(() => {
        if (!currentRoutine) return;
        const nextIndex = currentRoutine.exerciseIndex + 1;
        if (nextIndex < currentRoutine.routine.exerciseIds.length) {
            const nextExId = currentRoutine.routine.exerciseIds[nextIndex];
            const nextEx = EXERCISES.find(ex => ex.id === nextExId);
            if (nextEx) {
                setCurrentRoutine({ ...currentRoutine, exerciseIndex: nextIndex });
                selectExercise(nextEx);
                setTimeout(() => setIsPlaying(true), 200);
            } else handleStop();
        } else {
            setIsPlaying(false); setIsExerciseComplete(false); setIsRoutineComplete(true);
        }
    }, [currentRoutine, selectExercise, handleStop]);

    const handleStartRoutine = useCallback((routine: Routine) => {
        executeExerciseAction(() => {
            const firstEx = EXERCISES.find(ex => ex.id === routine.exerciseIds[0]);
            if (firstEx) { setCurrentRoutine({ routine, exerciseIndex: 0 }); selectExercise(firstEx); }
        });
    }, [selectExercise, executeExerciseAction]);

    const handleExerciseComplete = useCallback(() => { setIsPlaying(false); setIsExerciseComplete(true); }, []);

    const handlePlayPause = useCallback(() => {
        // Initialize audio and mic in the background, don't wait
        initAudio().then(() => {
            if (!micActive) startPitchDetection();
        });

        // Immediately update playing state for instant UI response
        if (isExerciseComplete) {
            setIsExerciseComplete(false);
            setExerciseKey(k => k + 1);
            setIsPlaying(true);
        } else {
            setIsPlaying(p => !p);
        }
    }, [isExerciseComplete, initAudio, micActive, startPitchDetection]);

    // Fix: Moved the 'stopPreview' function declaration before 'handleStop' to resolve a "used before its declaration" error.
    const stopPreview = useCallback(() => {
        previewTimersRef.current.forEach(clearTimeout);
        previewTimersRef.current = [];
        stopAllExerciseNotes();
        setIsPreviewing(false);
    }, [stopAllExerciseNotes]);

    const handlePreview = useCallback(async () => {
        if (!selectedExercise || !exerciseRange.start) return;
        if (isPreviewing) {
            stopPreview();
            return;
        }

        await initAudio();
        setIsPreviewing(true);

        const timers: number[] = [];
        let delay = 0;

        selectedExercise.pattern.forEach(offset => {
            const timer = window.setTimeout(() => {
                playNote(exerciseRange.start!.semitone + offset, selectedExercise.duration, true);
            }, delay);
            timers.push(timer);
            delay += selectedExercise.duration;
        });

        const finalTimer = window.setTimeout(() => {
            setIsPreviewing(false);
            previewTimersRef.current = [];
        }, delay + 100);
        timers.push(finalTimer);
        previewTimersRef.current = timers;

    }, [selectedExercise, exerciseRange, initAudio, playNote, isPreviewing, stopPreview]);

    const handleSaveAIExercise = useCallback((ex: Exercise) => { setSavedAIExercises(p => p.some(e => e.id === ex.id) ? p : [...p, ex]); }, []);

    const handleToggleFavoriteExercise = useCallback((exId: number) => {
        const ex = savedAIExercises.find(e => e.id === exId);
        if (ex && !savedAIExercises.some(e => e.id === exId)) handleSaveAIExercise(ex);
        setFavoriteExerciseIds(p => p.includes(exId) ? p.filter(id => id !== exId) : [...p, exId]);
    }, [savedAIExercises, handleSaveAIExercise]);

    // Fix: Correct typo from 'id' to 'rId' to ensure the new routine ID is added correctly.
    const handleToggleFavoriteRoutine = useCallback((rId: string) => { setFavoriteRoutineIds(p => p.includes(rId) ? p.filter(id => id !== rId) : [...p, rId]); }, []);

    const handleToggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    useEffect(() => {
        const detectedNote = userPitch ? frequencyToNote(userPitch) : null;
        if (detectedNote) {
            const newPitch = detectedNote.preciseSemitone;
            if (activeView === 'pitch' || (uiView === 'exercise' && autoFitEnabled)) {
                // Reduced smoothing: 25% new value for more responsive grid movement
                const targetSmooth = 0.25;
                setAutoFitTarget(p => (p === null) ? newPitch : (targetSmooth * newPitch) + (1 - targetSmooth) * p);
            }
        }
    }, [userPitch, activeView, uiView, autoFitEnabled]);

    useEffect(() => {
        const animId = requestAnimationFrame(animateView);
        function animateView() {
            let finalTargetCenter = viewControlTargetsRef.current.center;
            const finalTargetOctaves = viewControlTargetsRef.current.octaves;

            if (needsCameraSnapRef.current) {
                setCenterSemitone(finalTargetCenter);
                setVisibleOctaves(finalTargetOctaves);
                needsCameraSnapRef.current = false;
                setAutoFitTarget(null);
            } else {
                if (autoFitEnabled && autoFitTarget !== null) {
                    if (uiView === 'exercise' && exerciseNoteCenter !== null) {
                        finalTargetCenter = exerciseNoteCenter;
                    } else {
                        finalTargetCenter = autoFitTarget;
                    }
                }
                setCenterSemitone(p => lerp(p, finalTargetCenter, 0.25)); // 25% = faster centering
                setVisibleOctaves(p => lerp(p, finalTargetOctaves, 0.03));
            }
            requestAnimationFrame(animateView);
        }
        return () => cancelAnimationFrame(animId);
    }, [autoFitEnabled, autoFitTarget, uiView, exerciseNoteCenter]);

    const handleManualCenterChange = useCallback((v: number) => { setAutoFitEnabled(false); viewControlTargetsRef.current.center = v; }, []);
    const handleManualOctaveChange = useCallback((v: number) => { viewControlTargetsRef.current.octaves = v; }, []);

    const handleStartRangeTest = useCallback(async (isModal = false) => {
        if (!micActive) { const micOk = await startPitchDetection(); if (!micOk) return; }
        if (isModal && pendingAction) setPostRangeTestAction(() => pendingAction);
        setIsRangeTestActive(true);
    }, [micActive, startPitchDetection, pendingAction]);

    const handleCompleteRangeDetection = useCallback((start: Note, end: Note) => {
        console.log("Completing range detection", start, end);
        const newRange = { start, end }; setVocalRange(newRange);
        setVocalRangeHistory(p => [...p, { ...newRange, timestamp: Date.now() }]);
        setIsRangeTestActive(false);

        if (postRangeTestAction) { postRangeTestAction(); setPostRangeTestAction(null); setPendingAction(null); }
    }, [postRangeTestAction]);

    const handleCancelRangeTest = useCallback(() => {
        setIsRangeTestActive(false);
        setPostRangeTestAction(null);
        setPendingAction(null);
    }, []);

    const handleGoHomeFromRangeTest = useCallback(() => {
        setIsRangeTestActive(false);
        setActiveView('home');
    }, []);

    const handleViewChange = useCallback((view: ActiveView) => {
        if (appMode === 'mvp' && !['home', 'range', 'exercises', 'pitch', 'tokens'].includes(view)) {
            return; // In MVP mode, block navigation to non-MVP views
        }
        if (uiView === 'exercise') {
            handleStop();
        }
        if (isRangeTestActive) {
            handleCancelRangeTest();
        }
        setActiveView(view);
    }, [uiView, isRangeTestActive, handleCancelRangeTest, handleStop, appMode]);

    const titleMap: Record<string, TranslationKey> = { home: 'VoxLab' as TranslationKey, range: 'vocalRangeTitle', routines: 'routinesTitle', exercises: 'exercisesTitle', favorites: 'favorites', pitch: 'livePitchDetector', voxlabai: 'voxlabaiTitle', instrumentTuner: 'instrumentTuner', studies: 'studiesTitle', tokens: 'tokensTitle' };
    const currentTitle = titleMap[activeView] || '';

    // Load built-in Piano samples on app initialization
    useEffect(() => {
        loadBuiltInPianoSamples();
    }, [loadBuiltInPianoSamples]);

    return (
        <>
            {/* Splash screen - 1080x1920 portrait MP4 */}
            {showSplash && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        backgroundColor: '#F3F4F6',
                        opacity: showSplash ? 1 : 0,
                        transition: 'opacity 0.5s ease-out',
                        pointerEvents: showSplash ? 'auto' : 'none',
                    }}
                >
                    <video
                        src={splashVideo}
                        autoPlay
                        muted
                        playsInline
                        onLoadedData={() => console.log('Splash video loaded')}
                        onError={(e) => console.error('Splash video error:', e)}
                        onEnded={() => console.log('Splash video ended')}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                        }}
                    />
                </div>
            )}

            <div
                className="relative min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300"
                style={{
                    opacity: showSplash ? 0 : 1,
                    transition: 'opacity 1s ease-in',
                    transitionDelay: '0.2s'
                }}
            >
                {activeView === 'home' && <div className="fixed inset-0 bg-[#F3F4F6] dark:bg-gray-900 -z-10 transition-colors duration-300" />}
                {activeView !== 'home' && <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 -z-10 transition-colors duration-300" />}
                {activeView !== 'home' && <OrbVisualizer micGain={micGain} visualizerTheme={activeTheme.visualizer} />}

                <div className="relative z-10 flex flex-col min-h-screen">



                    {isSettingsOpen && <SettingsOverlay {...{ setIsSettingsOpen, setActiveView: handleViewChange, language, setLanguage, activeTheme, setThemeId, themeMode, setThemeMode, appMode, setAppMode, onLoadSamples: handleLoadLocalSamples, loadedSampleCount, availableInstruments, activeInstrument, setActiveInstrument, compressorEnabled, setCompressorEnabled, frequencySeparationEnabled, setFrequencySeparationEnabled, pitchAlgorithm, setPitchAlgorithm, pitchSmoothingFactor, setPitchSmoothingFactor }} />}
                    {appMode === 'full' && isRangeCheckModalOpen && <RangeCheckModal theme={activeTheme} onDefine={() => { setIsRangeCheckModalOpen(false); handleStartRangeTest(true); }} onContinue={() => { setVocalRange({ start: { semitone: -12, name: 'C3', isSharp: false }, end: { semitone: 12, name: 'C5', isSharp: false } }); setIsRangeCheckModalOpen(false); }} />}
                    {isRoutineComplete && <RoutineCompleteModal onFinish={handleStop} theme={activeTheme} />}

                    {isRangeTestActive && <VocalRangeTestScreen onCancel={handleCancelRangeTest} onComplete={handleCompleteRangeDetection} currentTheme={activeTheme} />}

                    {uiView !== 'exercise' && !isRangeTestActive && (
                        <header className="flex-shrink-0 z-[60] bg-white/30 dark:bg-black/30 backdrop-blur-md h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-700/80">
                            <h1 className="text-4xl sm:text-4xl font-black bg-gradient-to-r from-gray-600 to-gray-900 dark:from-gray-400 dark:to-gray-100 bg-clip-text text-transparent truncate">
                                {activeView === 'home' ? 'VoxLab' : t(currentTitle)}
                            </h1>
                            <div className="flex items-center gap-2 sm:gap-4">
                                <VocalRangeDisplay range={vocalRange} theme={activeTheme} onClick={() => setActiveView('range')} />
                                <div className="relative">
                                    <button onClick={handleToggleFullscreen} className="btn-interactive flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-md text-slate-700 dark:text-slate-200 text-[10px] sm:text-xs font-semibold border border-slate-300/50 dark:border-slate-600">
                                        {isFullscreen ? (
                                            <>
                                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H4v4m12 4h4v-4M8 20H4v-4m12 4h4v-4" /></svg>
                                                <span className="hidden sm:inline">{t('exitFullscreen')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" /></svg>
                                                <span className="hidden sm:inline">{t('enterFullscreen')}</span>
                                            </>
                                        )}
                                    </button>
                                    {!isFullscreen && !isRangeTestActive && (
                                        <div className="hidden sm:flex absolute top-full left-1/2 -translate-x-1/2 mt-2 flex-col items-center z-50 pointer-events-none w-max">
                                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-violet-500 -mb-0.5"></div>
                                            <div className="bg-violet-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap animate-pulse">
                                                {t('immersiveMode')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>
                    )}

                    <main className={`flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col pt-8 pb-8 ${isRangeTestActive ? 'hidden' : ''}`}>
                        {uiView === 'main' && (
                            <div key={activeView} className="flex-grow flex flex-col animate-fade-in">
                                {activeView === 'home' && (
                                    <section className="relative flex-grow flex flex-col items-center justify-center text-center"><div className="relative z-10"><h1 className={`text-5xl md:text-6xl font-black bg-gradient-to-br ${activeTheme.gradientText.from} ${activeTheme.gradientText.to} ${activeTheme.gradientText.darkFrom} ${activeTheme.gradientText.darkTo} bg-clip-text text-transparent`}>{IS_BETA_MODE ? t('helloSinger') : 'Olá, vocalista!'}</h1>

                                        {/* Beta Tester Subtitle & Version Selector */}
                                        {IS_BETA_MODE && (
                                            <div className="mt-4 flex flex-col items-center">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 max-w-xs mx-auto">
                                                    {t('betaTestInvite')}
                                                </p>
                                                <div className="p-1 rounded-full bg-slate-200 dark:bg-slate-800 flex w-48 shadow-inner">
                                                    <button onClick={() => setAppMode('mvp')} className={`flex-1 flex justify-center items-center py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${appMode === 'mvp' ? 'bg-white shadow-sm text-violet-700 scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('mvp')}</button>
                                                    <button onClick={() => setAppMode('full')} className={`flex-1 flex justify-center items-center py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${appMode === 'full' ? 'bg-slate-700 shadow-sm text-violet-400 scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('fullFeatures')}</button>
                                                </div>
                                            </div>
                                        )}

                                        {!IS_BETA_MODE && <p className="mt-2 text-slate-600/60 dark:text-slate-400/60 text-xl">{t('letsPractice')}</p>}</div></section>
                                )}
                                {activeView === 'range' && <section className="flex-grow flex flex-col items-center justify-center">{showPianoForRangeSelection ? (<><Piano notes={pianoNotes} onKeyClick={handlePianoKeyClick} vocalRange={vocalRange} currentTheme={activeTheme} /><div className="flex flex-col items-center text-center mt-8"><p className="text-slate-600 dark:text-slate-300 text-lg mb-4">{t('selectRangeOnPiano')}</p><button onClick={() => { setShowPianoForRangeSelection(false); setVocalRange({ start: null, end: null }); }} className="btn-interactive px-6 py-2 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-600 shadow-sm">{t('goBack')}</button></div></>) : (<div className="flex flex-col items-center text-center"><p className="text-slate-600 dark:text-slate-300 text-lg mb-4">{t('vocalRangePrompt')}</p><div className="flex flex-col sm:flex-row gap-4"><ThemedButton onClick={() => handleStartRangeTest()} theme={activeTheme}>{t('detectMyRange')}</ThemedButton><button onClick={() => setShowPianoForRangeSelection(true)} className="btn-interactive px-6 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-600 shadow-sm">{t('iKnowMyRange')}</button></div></div>)}</section>}
                                {/* Fix: Pass correct handler function 'handleToggleFavoriteRoutine' to 'onToggleFavorite' prop. */}
                                {activeView === 'routines' && <RoutineView onStartRoutine={handleStartRoutine} currentTheme={activeTheme} favoriteRoutineIds={favoriteRoutineIds} onToggleFavorite={handleToggleFavoriteRoutine} />}
                                {activeView === 'exercises' && <ExerciseView onSelectExercise={selectExercise} currentTheme={activeTheme} savedAIExercises={savedAIExercises} favoriteExerciseIds={favoriteExerciseIds} onToggleFavorite={handleToggleFavoriteExercise} appMode={appMode} />}
                                {/* Fix: Pass correct variables and handlers to FavoritesView props instead of using shorthand for undefined variables. */}
                                {activeView === 'favorites' && <FavoritesView {...{ currentTheme: activeTheme, favoriteRoutineIds, favoriteExerciseIds, savedAIExercises, onStartRoutine: handleStartRoutine, onSelectExercise: selectExercise, onToggleFavoriteRoutine: handleToggleFavoriteRoutine, onToggleFavoriteExercise: handleToggleFavoriteExercise }} />}
                                {activeView === 'pitch' && (
                                    <div className="flex-grow flex flex-col items-center justify-center space-y-4">
                                        <div className="flex items-center gap-4 mb-2">
                                            <button
                                                onClick={() => { console.log('🎤 MIC BUTTON CLICKED'); handleMicToggle(); }}
                                                className="btn-interactive px-8 py-3 rounded-full font-bold text-base bg-violet-500 text-white border border-violet-600 shadow-lg hover:bg-violet-600"
                                            >
                                                {micActive ? '🎤 Stop Microphone' : '🎤 Start Microphone'}
                                            </button>
                                        </div>
                                        <div className="w-full h-64 md:h-80 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-300/50 dark:border-slate-700/50 shadow-inner">
                                            <SharedPitchVisualizer notes={[]} userPitch={userPitch} micGain={micGain} centerSemitone={centerSemitone} visibleOctaves={visibleOctaves} currentTheme={activeTheme} />
                                        </div>
                                        <PitchViewControls {...{ appMode, centerSemitone, setCenterSemitone: handleManualCenterChange, visibleOctaves, setVisibleOctaves: handleManualOctaveChange, autoFitEnabled, setAutoFitEnabled, gainValue, setGainValue, noiseGateThreshold, setNoiseGateThreshold, compressorThreshold, setCompressorThreshold, compressorRatio, setCompressorRatio, compressorRelease, setCompressorRelease, compressorEnabled, setCompressorEnabled, autoGainEnabled, setAutoGainEnabled, eqLowGain, setEqLowGain, eqMidGain, setEqMidGain, eqHighGain, setEqHighGain }} />
                                        <InputVolumeMeter micGain={micGain} />
                                    </div>
                                )}
                                {activeView === 'voxlabai' && <VoxLabAIView currentTheme={activeTheme} onStartExercise={handleStartGeneratedExercise} onSave={handleSaveAIExercise} savedAIExercises={savedAIExercises} favoriteExerciseIds={favoriteExerciseIds} onToggleFavorite={handleToggleFavoriteExercise} />}
                                {activeView === 'studies' && <ComingSoonView title={t('studiesTitle')} description={t('studiesDesc')} currentTheme={activeTheme} isStudies />}
                                {activeView === 'instrumentTuner' && <InstrumentTuner userPitch={userPitch} micActive={micActive} micGain={micGain} onBack={() => setActiveView('home')} currentTheme={activeTheme} />}
                                {activeView === 'tokens' && <ComingSoonView title={t('tokensTitle')} description={t('tokensDesc')} currentTheme={activeTheme} />}
                            </div>
                        )}
                        {uiView === 'exercise' && selectedExercise && (
                            <ExerciseGameViewALT
                                key={exerciseKey}
                                exercise={selectedExercise}
                                vocalRange={exerciseRange}
                                userPitch={userPitch}
                                centerSemitone={centerSemitone}
                                visibleOctaves={visibleOctaves}
                                currentTheme={activeTheme}
                                isPlaying={isPlaying}
                                playNote={playNote}
                                getAudioTime={getAudioTime}
                                playMetronomeClick={playMetronomeClick}
                                onPlayPause={handlePlayPause}
                                onRestart={handleStop}
                                micActive={micActive}
                                onToggleMic={handleMicToggle}
                            />
                        )}
                    </main>
                    {(
                        <FloatingMenu
                            activeView={activeView}
                            setActiveView={handleViewChange}
                            setIsSettingsOpen={setIsSettingsOpen}
                            currentTheme={activeTheme}
                            uiView={uiView}
                            isVisible={isMenuVisible}
                            appMode={appMode}
                        />
                    )}
                </div>
                {IS_BETA_MODE && <FeedbackOverlay currentTheme={activeTheme} />}
            </div>
        </>
    );
}
