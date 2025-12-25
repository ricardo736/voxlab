import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Note, VocalRange, Exercise, VocalRangeEntry, Theme, Routine, ActiveView } from './types';
import { TranslationKey } from './i18n';
import { EXERCISES, THEMES, ROUTINES } from './constants';
import { generateNotes, frequencyToNote, lerp } from './utils';
import { getExerciseId } from './exerciseUtils';
import Piano from './components/Piano';
import ExerciseView from './components/ExerciseView';
import ExerciseGameViewALTWrapper from './components/ExerciseGameViewALTWrapper';
import ErrorBoundary from './components/ErrorBoundary';
import AIExerciseView from './components/AIExerciseView';
import FloatingMenu from './components/FloatingMenu';
import VocalRangeTestScreen from './components/VocalRangeTestScreen';
import SettingsOverlay from './components/SettingsOverlay';
import { useTranslation } from './hooks/useTranslation';
import RoutineView from './components/RoutineView';
import ComingSoonView from './components/ComingSoonView';
import VoxLabAIView from './components/AIStudioView';
import TestModeView from './components/TestModeView';
import FavoritesView from './components/FavoritesView';
import ThemedButton from './components/ThemedButton';
import FeedbackOverlay from './components/FeedbackOverlay';
import splashVideo from './visuals/sphere_v2.mp4';

// Import custom hooks
import { useAudio } from './hooks/useAudio';
import { usePitchDetection } from './hooks/usePitchDetection';
import { useSampleLoader } from './hooks/useSampleLoader';
import { useSettings } from './hooks/useSettings';
import { useExercise } from './hooks/useExercise';

// Beta Mode Feature Flag - Only show beta features when this is true
const IS_BETA_MODE = (import.meta as any).env?.VITE_BETA_BUILD === 'true';

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
    const uiViewRef = useRef<'main' | 'exercise'>('main'); // Track current uiView without dependency
    const [isMenuVisible, setIsMenuVisible] = useState(true);
    const [activeView, setActiveView] = useState<ActiveView>('home');
    const [vocalRange, setVocalRange] = useState<VocalRange>({ start: null, end: null });
    const [vocalRangeHistory, setVocalRangeHistory] = useState<VocalRangeEntry[]>([]);
    const [exerciseRange, setExerciseRange] = useState<VocalRange>({ start: null, end: null });
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showEngineSettings, setShowEngineSettings] = useState(false);
    const [isTunerExpanded, setIsTunerExpanded] = useState(false);
    const [showMicPermissionDialog, setShowMicPermissionDialog] = useState(true);
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
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

    const [isRangeCheckModalOpen, setIsRangeCheckModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [postRangeTestAction, setPostRangeTestAction] = useState<(() => void) | null>(null);

    const [savedAIExercises, setSavedAIExercises] = useState<Exercise[]>([]);
    const [aiResult, setAiResult] = useState<Exercise | null>(null); // Persist AI result
    const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([]);
    const [favoriteRoutineIds, setFavoriteRoutineIds] = useState<string[]>([]);

    const [isFullscreen, setIsFullscreen] = useState(false);

    // New states for cancellable preview and leave confirmation
    const [isPreviewing, setIsPreviewing] = useState(false);

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
    const [autoFitEnabled, setAutoFitEnabled] = useState(false); // Disabled by default so notes are visible
    const [isPitchGridExpanded, setIsPitchGridExpanded] = useState(false);
    const [gainValue, setGainValue] = useState(1);
    const [noiseGateThreshold, setNoiseGateThreshold] = useState(0.008); // Default from pYIN tuner
    const [compressorThreshold, setCompressorThreshold] = useState(-24);
    const [compressorRatio, setCompressorRatio] = useState(4); // Calibrated default
    const [compressorRelease, setCompressorRelease] = useState(0.25);
    const [autoGainEnabled, setAutoGainEnabled] = useState(true);
    const [eqLowGain, setEqLowGain] = useState(0);
    const [eqMidGain, setEqMidGain] = useState(0);
    const [eqHighGain, setEqHighGain] = useState(0);

    // pYIN-specific parameters
    const [pyinBias, setPyinBias] = useState<number>(2.0); // Default stickiness
    const [pyinTolerance, setPyinTolerance] = useState<number>(0.3); // Default tolerance (30%)
    const [pyinGateMode, setPyinGateMode] = useState<'smooth' | 'instant'>('smooth');

    // --- COMPRESSOR CONTROL ---
    const [compressorEnabled, setCompressorEnabled] = useState(false);


    // --- FREQUENCY SEPARATION (Anti-Feedback) ---
    const [frequencySeparationEnabled, setFrequencySeparationEnabled] = useState(true);


    // --- PITCH DETECTION ALGORITHM ---
    const pitchAlgorithm = 'yin'; // YIN is the best

    // --- VISUALIZER MODE ---


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
        const handleFullscreenChange = () => {
            const docEl = document.documentElement as any;
            setIsFullscreen(!!(document.fullscreenElement || docEl.webkitFullscreenElement));
        };

        // Listen to both standard and webkit fullscreen events
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);



    useEffect(() => {
        const load = (k: string, s: (v: any) => void, d: any) => {
            try {
                const v = localStorage.getItem(k);
                if (v) {
                    const parsed = JSON.parse(v);
                    // Fix: Validate and migrate legacy vocal range data (relative semitones -> MIDI)
                    if (k === 'vocalRange' && parsed.start && parsed.start.semitone < 0) {
                        console.warn('⚠️ Found legacy relative vocal range. Migrating to MIDI...');
                        // Assuming -12 was C3 (48) and 12 was C5 (72)
                        if (parsed.start.semitone < 24) parsed.start.semitone += 60;
                        if (parsed.end && parsed.end.semitone < 24) parsed.end.semitone += 60;

                        // Safety check: if still invalid, use defaults
                        if (parsed.start.semitone < 0 || parsed.start.semitone > 127) {
                            parsed.start = { note: 'C3', semitone: 48, frequency: 130.81 };
                            parsed.end = { note: 'C5', semitone: 72, frequency: 523.25 };
                        }
                    }
                    s(parsed);
                } else {
                    s(d);
                }
            } catch (e) {
                console.error(`Error loading ${k}:`, e);
                s(d);
            }
        };

        load('language', setLanguage, LANGUAGES[0]);
        load('themeId', setThemeId, THEMES[0].id);
        load('themeMode', setThemeMode, 'light');
        load('vocalRange', setVocalRange, { start: { note: 'C3', semitone: 48, frequency: 130.81 }, end: { note: 'C5', semitone: 72, frequency: 523.25 } });
        load('micGain', setMicGain, 1.0);
        load('compressorEnabled', setCompressorEnabled, false);
        load('frequencySeparationEnabled', setFrequencySeparationEnabled, true);
        load('pyinBias', setPyinBias, 2.0);
        load('pyinTolerance', setPyinTolerance, 0.3);
        load('pyinGateMode', setPyinGateMode, 'smooth');
        load('noiseGateThreshold', setNoiseGateThreshold, 0.008);
        load('favoriteExerciseIds', setFavoriteExerciseIds, []);
        load('favoriteRoutineIds', setFavoriteRoutineIds, []);
    }, []);

    useEffect(() => {
        localStorage.setItem('language', JSON.stringify(language));
    }, [language]);

    useEffect(() => {
        localStorage.setItem('themeId', JSON.stringify(themeId));
    }, [themeId]);

    useEffect(() => {
        localStorage.setItem('themeMode', JSON.stringify(themeMode));
    }, [themeMode]);

    useEffect(() => {
        localStorage.setItem('vocalRange', JSON.stringify(vocalRange));
    }, [vocalRange]);

    useEffect(() => {
        localStorage.setItem('micGain', JSON.stringify(micGain));
    }, [micGain]);

    useEffect(() => {
        localStorage.setItem('compressorEnabled', JSON.stringify(compressorEnabled));
    }, [compressorEnabled]);

    useEffect(() => {
        localStorage.setItem('frequencySeparationEnabled', JSON.stringify(frequencySeparationEnabled));
    }, [frequencySeparationEnabled]);

    useEffect(() => {
        localStorage.setItem('pyinBias', JSON.stringify(pyinBias));
    }, [pyinBias]);

    useEffect(() => {
        localStorage.setItem('pyinTolerance', JSON.stringify(pyinTolerance));
    }, [pyinTolerance]);

    useEffect(() => {
        localStorage.setItem('pyinGateMode', JSON.stringify(pyinGateMode));
    }, [pyinGateMode]);

    useEffect(() => {
        localStorage.setItem('noiseGateThreshold', JSON.stringify(noiseGateThreshold));
    }, [noiseGateThreshold]);

    useEffect(() => {
        localStorage.setItem('favoriteExerciseIds', JSON.stringify(favoriteExerciseIds));
    }, [favoriteExerciseIds]);

    useEffect(() => {
        localStorage.setItem('favoriteRoutineIds', JSON.stringify(favoriteRoutineIds));
    }, [favoriteRoutineIds]);


    useEffect(() => {
        if (!isRangeCheckModalOpen && vocalRange.start && pendingAction) {
            pendingAction(); setPendingAction(null);
        }
    }, [isRangeCheckModalOpen, vocalRange, pendingAction]);



    useEffect(() => {
        if (activeView !== 'range') setShowPianoForRangeSelection(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
    }, [activeView]);

    useEffect(() => {
        setMicStatus(micActive ? t('micStatusListening') : t('micStatusActivate'));
    }, [micActive, t]);

    const initAudio = useCallback(async () => {

        // 1. Initialize if needed
        if (!audioCtxRef.current) {

            if (!audioInitPromiseRef.current) {
                audioInitPromiseRef.current = (async () => {
                    try {
                        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                        if (!AudioContextClass) {
                            console.error('❌ AudioContext not supported');
                            return false;
                        }
                        const context = new AudioContextClass();


                        const gain = context.createGain(); gain.gain.value = 0.8; // Increased from 0.5 for better mobile volume
                        masterGainRef.current = gain; masterGainRef.current.connect(context.destination);


                        const blob = new Blob([pitchProcessorCode], { type: 'application/javascript' });
                        const url = URL.createObjectURL(blob);
                        try {
                            await context.audioWorklet.addModule(url);

                        } catch (e) {
                            console.error('❌ AudioWorklet error:', e);
                        }
                        URL.revokeObjectURL(url);
                        audioCtxRef.current = context;

                        // Initialize compressor and EQ
                        compressorNodeRef.current = context.createDynamicsCompressor();
                        compressorNodeRef.current.threshold.value = compressorThreshold;
                        compressorNodeRef.current.ratio.value = compressorRatio;
                        compressorNodeRef.current.release.value = compressorRelease;
                        return true;
                    } catch (e) { console.error("❌ Error initializing audio.", e); setMicStatus(t('micStatusError')); return false; }
                })();
            }
            await audioInitPromiseRef.current;
        }

        // 2. Always check and resume if suspended
        if (audioCtxRef.current) {

            if (audioCtxRef.current.state === 'suspended') {

                try {
                    await audioCtxRef.current.resume();

                } catch (e) {
                    console.warn('❌ Failed to resume audio context', e);
                }
            }
        }

        return !!audioCtxRef.current;
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

        }

        return { loaded: loadedCount, errors };
    }, [initAudio]);

    const playNote = useCallback(async (semitone: number, duration: number, forExercise: boolean = false) => {
        const audioReady = await initAudio();
        const audioCtx = audioCtxRef.current;
        const masterGain = masterGainRef.current;
        if (!audioReady || !audioCtx || !masterGain) return;

        const now = audioCtx.currentTime;
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
            sampleGain.gain.setValueAtTime(forExercise ? exerciseNoteVolume * 1.5 : 0.8, now);
            sampleGain.gain.exponentialRampToValueAtTime(0.001, now + (duration / 1000) + 0.5);

            source.connect(sampleGain);

            const nodes: NoteNodes = { oscillators: [], gainNodes: [sampleGain], allNodes: [source, sampleGain] };

            // FREQUENCY SEPARATION: Low-pass filter for piano output (warm, bass-heavy sound)
            if (frequencySeparationEnabled) {
                const lowPassFilter = audioCtx.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 900; // Piano plays only below 900Hz
                lowPassFilter.Q.value = 1.0; // Sharp cutoff
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
            mainGainNode.gain.linearRampToValueAtTime(forExercise ? exerciseNoteVolume * 1.5 : 0.8, now + ATTACK_TIME);
            mainGainNode.gain.exponentialRampToValueAtTime(SUSTAIN_LEVEL, now + ATTACK_TIME + DECAY_TIME);
            mainGainNode.gain.exponentialRampToValueAtTime(0.0001, now + totalDurationSecs);

            const nodes: NoteNodes = { oscillators: [], gainNodes: [mainGainNode], allNodes: [mainGainNode] };

            // FREQUENCY SEPARATION: Low-pass filter for synthesized piano
            if (frequencySeparationEnabled) {
                const lowPassFilter = audioCtx.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 900; // Piano plays only below 900Hz
                lowPassFilter.Q.value = 1.0;
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
    }, [initAudio, exerciseNoteVolume, fetchAndDecodeSample, activeInstrument, frequencySeparationEnabled]);

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
            const source = audioCtx.createMediaStreamSource(stream);

            // Resume AudioContext if suspended
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            // Initialize AudioWorklet (McLeod Pitch Method) - only add module once
            if (!workletModuleAddedRef.current) {
                try {
                    await audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([pitchProcessorCode], { type: 'application/javascript' })));
                    workletModuleAddedRef.current = true;

                } catch (e) {
                    console.error('❌ Failed to register pitch processor:', e);
                    setMicStatus(t('micStatusError'));
                    return false;
                }
            }

            const workletNode = new AudioWorkletNode(audioCtx, 'pitch-processor', {
                processorOptions: {
                    noiseGateThreshold,
                    algorithm: pitchAlgorithm,
                    pyinBias,
                    pyinGateMode
                }
            });
            workletNodeRef.current = workletNode;

            // FREQUENCY SEPARATION: High-pass filter - App deaf to piano frequencies
            let micInputNode: AudioNode = source;
            if (frequencySeparationEnabled) {
                const highPassFilter = audioCtx.createBiquadFilter();
                highPassFilter.type = 'highpass';
                highPassFilter.frequency.value = 950; // App deaf below 950Hz
                highPassFilter.Q.value = 1.0;
                source.connect(highPassFilter);
                micInputNode = highPassFilter;
            }

            // Connect to pitch detector
            micInputNode.connect(workletNode);


            workletNode.port.onmessage = (event) => {
                const { pitch, gain } = event.data;
                const adjustedGain = gain;
                setMicGain(Math.min(1, adjustedGain * 100) * 100);

                if (pitch !== undefined && pitch > 60) {
                    // Reject impossible octave jumps (likely pitch detection errors)
                    if (lastPitchRef.current !== null) {
                        const semitoneJump = Math.abs(12 * Math.log2(pitch / lastPitchRef.current));
                        if (semitoneJump > 36) {
                            // Reject jumps larger than 3 octaves - these are detection errors
                            return;
                        }
                    }

                    // Pass raw pitch data - smoothing handled by visualizer
                    setUserPitch(pitch);
                    lastPitchRef.current = pitch;
                } else {
                    // No valid pitch - keep last position so circle stays in place (grey)
                }
            };

            setMicActive(true); return true;
        } catch (err) { console.error("Mic Error:", err); setMicStatus(t('micStatusPermissionDenied')); }
        return false;
    }, [initAudio, t, autoGainEnabled, noiseGateThreshold, gainValue, compressorEnabled, frequencySeparationEnabled, pyinBias, pyinGateMode, pitchAlgorithm]);

    // Effects to update audio node parameters when state changes
    useEffect(() => { if (gainNodeRef.current) gainNodeRef.current.gain.value = autoGainEnabled ? 1 : gainValue; }, [gainValue, autoGainEnabled]);
    useEffect(() => {
        if (workletNodeRef.current) {
            console.log('🎛️ Sending noiseGateThreshold to worklet:', noiseGateThreshold);
            workletNodeRef.current.port.postMessage({ noiseGateThreshold });
        }
    }, [noiseGateThreshold]);
    useEffect(() => { if (workletNodeRef.current) workletNodeRef.current.port.postMessage({ algorithm: pitchAlgorithm }); }, [pitchAlgorithm]);
    useEffect(() => {
        if (workletNodeRef.current) {
            console.log('🎛️ Sending pyinBias to worklet:', pyinBias);
            workletNodeRef.current.port.postMessage({ pyinBias });
        }
    }, [pyinBias]);
    useEffect(() => {
        if (workletNodeRef.current) {
            console.log('🎛️ Sending pyinGateMode to worklet:', pyinGateMode);
            workletNodeRef.current.port.postMessage({ pyinGateMode });
        }
    }, [pyinGateMode]);
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

        micActive ? stopPitchDetection() : startPitchDetection();
    }, [micActive, startPitchDetection, stopPitchDetection]);




    const handlePianoKeyClick = useCallback((note: Note) => {
        stopAllNonExerciseNotes(); playNote(note.semitone, 300, false);
        setVocalRange(prev => {
            if (!prev.start || prev.end) return { start: note, end: null };
            return note.semitone > prev.start.semitone ? { start: prev.start, end: note } : { start: note, end: prev.start };
        });
    }, [playNote, stopAllNonExerciseNotes]);

    /**
     * Returns the user's vocal range for exercises.
     * Uses the actual range the user defined, or defaults to E3-G4 if not set.
     */
    const getSafeExerciseRange = useCallback((fullRange: VocalRange): VocalRange => {
        const { start, end } = fullRange;

        if (!start || !end) {
            // Default to safe beginner range (E3 - G4)
            return {
                start: { semitone: -9, name: 'E3', isSharp: false },
                end: { semitone: 7, name: 'G4', isSharp: false }
            };
        }

        // Use the user's actual range directly
        return fullRange;
    }, []);

    const executeExerciseAction = useCallback((action: () => void) => {
        // Always execute action immediately.
        // If vocal range is missing, selectExercise will use defaults.
        action();
    }, []);

    const selectExercise = useCallback((ex: Exercise) => {


        // GUARD: Prevent calling if already transitioning to or in exercise view with this exercise
        if (uiViewRef.current === 'exercise' && selectedExercise && getExerciseId(selectedExercise) === getExerciseId(ex)) {

            return;
        }

        // Calculate SAFE range for exercises (not raw detection extremes)
        let currentExerciseRange: VocalRange;

        if (vocalRange.start && vocalRange.end && vocalRange.start.semitone >= 0 && vocalRange.end.semitone >= 0) {
            // Use safe pedagogical range derived from user's full range
            currentExerciseRange = getSafeExerciseRange(vocalRange);
        } else {
            // Use default safe beginner range (E3 to G4) if not set
            currentExerciseRange = {
                start: { semitone: -9, name: 'E3', isSharp: false },
                end: { semitone: 7, name: 'G4', isSharp: false }
            };
        }

        setExerciseRange(currentExerciseRange);

        executeExerciseAction(() => {
            // Reset state for new exercise
            setIsPlaying(false);
            setIsExerciseComplete(false);

            setSelectedExercise(ex);
            // Always increment key to force full remount (ensures clean AudioContext)
            setExerciseKey(prev => prev + 1);
            uiViewRef.current = 'exercise'; // Update ref
            setUiView('exercise');

            // Hide menu when entering exercise
            setIsMenuVisible(false);

            // Calculate view center based on exercise pattern and vocal range
            const startSemitone = currentExerciseRange.start?.semitone ?? 52;
            const endSemitone = currentExerciseRange.end?.semitone ?? 67;
            const rangeSpan = endSemitone - startSemitone;
            const rangeMidpoint = startSemitone + Math.floor(rangeSpan / 2);
            const comfortableStart = rangeMidpoint - 6;

            const pattern = getExercisePattern(ex);
            const firstNoteSemitone = pattern && pattern.length > 0
                ? comfortableStart + pattern[0]
                : rangeMidpoint;
            viewControlTargetsRef.current.center = firstNoteSemitone;
            viewControlTargetsRef.current.octaves = 1.5;
            needsCameraSnapRef.current = true;
        });
    }, [vocalRange, executeExerciseAction, selectedExercise, getSafeExerciseRange]);

    const handleStartGeneratedExercise = useCallback((ex: Exercise) => selectExercise(ex), [selectExercise]);

    const handleRefineExercise = useCallback(async (currentExercise: Exercise, refinePrompt: string) => {
        try {
            // Import Google AI
            const { GoogleGenAI, Type } = await import("@google/genai");

            // Get API key
            const envKey = process.env.API_KEY;
            const apiKey = (envKey && envKey.length > 0 && envKey !== 'undefined') ? envKey : '';

            if (!apiKey) {
                console.error('No API key available for refinement');
                return;
            }

            const ai = new GoogleGenAI({ apiKey });

            // Create refine prompt
            const fullPrompt = `
                I have a vocal exercise defined in JSON: ${JSON.stringify(currentExercise)}.
                Please modify this exercise based on this request: "${refinePrompt}".
                
                IMPORTANT FORMAT RULES:
                1. Use the "notes" array, NOT "pattern".
                2. Each note must have: type ("note" or "rest"), semitone (0-12+), duration (in beats), lyric (optional).
                3. Use "tempo_bpm" for speed.
                
                Keep the pedagogical goal but adjust parameters as requested.
            `;

            // Define schema (same as in AIStudioView)
            // Define schema (updated to match new format with notes)
            const noteSchema = {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: "Either 'note' or 'rest'" },
                    semitone: { type: Type.INTEGER, description: "Semitones from root (0-12+)" },
                    duration: { type: Type.NUMBER, description: "Duration in BEATS" },
                    lyric: { type: Type.STRING, description: "Optional syllable" }
                },
                required: ["type", "duration"]
            };

            const schema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    desc: { type: Type.STRING },
                    category: { type: Type.STRING },
                    instructions: { type: Type.STRING },
                    notes: { type: Type.ARRAY, items: noteSchema },
                    tempo_bpm: { type: Type.INTEGER }
                },
                required: ["name", "desc", "category", "instructions", "notes", "tempo_bpm"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const jsonResult = JSON.parse(response.text);
            const refinedExercise: Exercise = {
                ...jsonResult,
                // Keep same ID - use exercise_id for MIDI, id for Legacy
                ...(isMidiExercise(currentExercise)
                    ? { exercise_id: currentExercise.exercise_id }
                    : { id: currentExercise.id }),
                isAIGenerated: true,
            };

            // Update the AI result state
            setAiResult(refinedExercise);

            // Update the current exercise
            setSelectedExercise(refinedExercise);
            setExerciseKey(prev => prev + 1); // Force remount

        } catch (e) {
            console.error("Error refining exercise:", e);
        }
    }, [setAiResult, setSelectedExercise, setExerciseKey]);


    const resetCameraToDefault = useCallback(() => {
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

        // Check if this is an AI-generated exercise
        const isAIExercise = selectedExercise?.isAIGenerated;

        setSelectedExercise(null);
        setExerciseRange({ start: null, end: null });
        setExerciseNoteCenter(null);
        uiViewRef.current = 'main'; // Update ref
        setUiView('main');
        setIsMenuVisible(true);

        // Return to appropriate view
        if (currentRoutine) {
            setCurrentRoutine(null);
            setActiveView('routines');
        } else if (isAIExercise) {
            setActiveView('voxlabai');
        }

        resetCameraToDefault();
    }, [currentRoutine, selectedExercise, stopAllExerciseNotes, stopAllNonExerciseNotes, isPreviewing, resetCameraToDefault]);

    const handleNotePositionUpdate = useCallback((center: number, octaves: number) => {
        viewControlTargetsRef.current = { center, octaves };
    }, []);

    const handleNextExerciseInRoutine = useCallback(() => {
        if (!currentRoutine) return;
        const nextIndex = currentRoutine.exerciseIndex + 1;
        if (nextIndex < currentRoutine.routine.exerciseIds.length) {
            const nextExId = currentRoutine.routine.exerciseIds[nextIndex];
            const nextEx = EXERCISES.find(ex => getExerciseId(ex) === nextExId);
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

        // selectExercise already handles the range check via executeExerciseAction
        const firstEx = EXERCISES.find(ex => getExerciseId(ex) === routine.exerciseIds[0]);

        if (firstEx) {
            setCurrentRoutine({ routine, exerciseIndex: 0 });
            selectExercise(firstEx);
        } else {
            console.error('Could not find first exercise for routine', routine.id);
        }
    }, [selectExercise]);

    const handleExerciseComplete = useCallback(() => { setIsPlaying(false); setIsExerciseComplete(true); }, []);

    const handlePlayPause = useCallback(() => {
        // Auto-start mic logic removed - handled by ALT wrapper

        // Immediately update playing state for instant UI response
        if (isExerciseComplete) {
            setIsExerciseComplete(false);
            setExerciseKey(k => k + 1);
            setIsPlaying(true);
        } else {
            const newPlayingState = !isPlaying;
            setIsPlaying(newPlayingState);

            // If pausing, stop all exercise notes immediately
            if (!newPlayingState) {
                stopAllExerciseNotes();
            }
        }
    }, [isExerciseComplete, isPlaying, stopAllExerciseNotes]);

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

    const handleSaveAIExercise = useCallback((ex: Exercise) => { setSavedAIExercises(p => p.some(e => getExerciseId(e) === getExerciseId(ex)) ? p : [...p, ex]); }, []);

    const handleToggleFavoriteExercise = useCallback((exId: string) => {

        if (!exId) return;

        setFavoriteExerciseIds(prev => {
            const newIds = prev.includes(exId)
                ? prev.filter(id => id !== exId)
                : [...prev, exId];

            return newIds;
        });
    }, []);

    // Fix: Correct typo from 'id' to 'rId' to ensure the new routine ID is added correctly.
    const handleToggleFavoriteRoutine = useCallback((rId: string) => { setFavoriteRoutineIds(p => p.includes(rId) ? p.filter(id => id !== rId) : [...p, rId]); }, []);

    const handleToggleFullscreen = useCallback(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (!isFullscreen) {
            // On mobile, just use UI-only immersive mode
            if (isMobile) {
                setIsFullscreen(true);
                // Try to hide address bar
                window.scrollTo(0, 1);
                return;
            }

            // Desktop: Try fullscreen API
            const docEl = document.documentElement as any;
            const requestFullscreen =
                docEl.requestFullscreen ||
                docEl.webkitRequestFullscreen ||
                docEl.mozRequestFullScreen ||
                docEl.msRequestFullscreen;

            if (requestFullscreen) {
                requestFullscreen.call(docEl).then(() => {
                    setIsFullscreen(true);
                }).catch(() => {
                    setIsFullscreen(true);
                });
            } else {
                setIsFullscreen(true);
            }
        } else {
            // Exit immersive mode
            if (isMobile) {
                setIsFullscreen(false);
                return;
            }

            const doc = document as any;
            const exitFullscreen =
                doc.exitFullscreen ||
                doc.webkitExitFullscreen ||
                doc.mozCancelFullScreen ||
                doc.msExitFullscreen;

            if (exitFullscreen) {
                exitFullscreen.call(doc).then(() => {
                    setIsFullscreen(false);
                }).catch(() => {
                    setIsFullscreen(false);
                });
            } else {
                setIsFullscreen(false);
            }
        }
    }, [isFullscreen]);

    // Listen for fullscreen changes from browser
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement
            );
            setIsFullscreen(isCurrentlyFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
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
            let finalTargetOctaves = viewControlTargetsRef.current.octaves;

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
        if (uiView === 'exercise') {
            handleStop();
        }
        if (isRangeTestActive) {
            handleCancelRangeTest();
        }
        setActiveView(view);
    }, [uiView, isRangeTestActive, handleCancelRangeTest, handleStop]);

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
                        transition: 'opacity 1s ease-out',
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
                className="relative h-full text-slate-800 transition-colors duration-300"
                style={{
                    opacity: showSplash ? 0 : 1,
                    transition: 'opacity 1.5s ease-in',
                    transitionDelay: '0.3s'
                }}
            >
                <div className="relative z-10 flex flex-col h-full">




                    {isSettingsOpen && <SettingsOverlay {...{ setIsSettingsOpen, setActiveView: handleViewChange, language, setLanguage, activeTheme, setThemeId, themeMode, setThemeMode, onLoadSamples: handleLoadLocalSamples, loadedSampleCount, availableInstruments, activeInstrument, setActiveInstrument, compressorEnabled, setCompressorEnabled, frequencySeparationEnabled, setFrequencySeparationEnabled, pyinBias, setPyinBias, pyinGateMode, setPyinGateMode, noiseGateThreshold, setNoiseGateThreshold }} />}
                    {isRangeCheckModalOpen && <RangeCheckModal theme={activeTheme} onDefine={() => { setIsRangeCheckModalOpen(false); handleStartRangeTest(true); }} onContinue={() => { setVocalRange({ start: { semitone: -12, name: 'C3', isSharp: false }, end: { semitone: 12, name: 'C5', isSharp: false } }); setIsRangeCheckModalOpen(false); }} />}
                    {isRoutineComplete && <RoutineCompleteModal onFinish={handleStop} theme={activeTheme} />}

                    {isRangeTestActive && <VocalRangeTestScreen onCancel={handleCancelRangeTest} onComplete={handleCompleteRangeDetection} currentTheme={activeTheme} pyinBias={pyinBias} pyinTolerance={pyinTolerance} pyinGateMode={pyinGateMode} noiseGateThreshold={noiseGateThreshold} />}

                    {/* Static Header - Hidden during exercise */}
                    {uiView !== 'exercise' && !isRangeTestActive && (
                        <header
                            className="sticky top-0 z-40 flex items-end px-4 sm:px-6 lg:px-8 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md"
                            style={{
                                paddingTop: 'max(1rem, env(safe-area-inset-top))',
                                paddingBottom: '0.5rem'
                            }}
                        >
                            <h1 className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-slate-200">
                                {activeView === 'home' ? 'VoxLab' : t(currentTitle)}
                            </h1>
                        </header>
                    )}

                    <main className={`flex-grow w-full ${activeView !== 'test' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 md:pt-4 pb-8' : ''} flex flex-col ${isRangeTestActive ? 'hidden' : ''}`} style={{ maxWidth: uiView === 'exercise' ? '100%' : '1280px' }}>
                        {uiView === 'main' && (
                            <div key={activeView} className="flex-grow flex flex-col animate-fade-in">
                                {activeView === 'home' && (
                                    <section className="relative flex-grow flex flex-col items-center justify-center text-center -mt-24 md:mt-0"><div className="relative z-10"><h1 className={`text-5xl md:text-6xl font-black bg-gradient-to-br ${activeTheme.gradientText.from} ${activeTheme.gradientText.to} ${activeTheme.gradientText.darkFrom} ${activeTheme.gradientText.darkTo} bg-clip-text text-transparent`}>{IS_BETA_MODE ? t('helloSinger') : 'Olá, vocalista!'}</h1>

                                        {/* Beta Tester Subtitle */}
                                        {IS_BETA_MODE && (
                                            <div className="mt-4 flex flex-col items-center">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 max-w-xs mx-auto">
                                                    {t('betaTestInvite')}
                                                </p>
                                            </div>
                                        )}

                                        {!IS_BETA_MODE && <p className="mt-2 text-slate-600/60 dark:text-slate-400/60 text-xl">{t('letsPractice')}</p>}</div></section>
                                )}
                                {activeView === 'range' && <section className="flex-grow flex flex-col items-center justify-center -mt-24 md:mt-0">{showPianoForRangeSelection ? (<><Piano notes={pianoNotes} onKeyClick={handlePianoKeyClick} vocalRange={vocalRange} currentTheme={activeTheme} /><div className="flex flex-col items-center text-center mt-8"><p className="text-slate-600 dark:text-slate-300 text-lg mb-4">{t('selectRangeOnPiano')}</p><button onClick={() => { setShowPianoForRangeSelection(false); setVocalRange({ start: null, end: null }); }} className="btn-interactive px-6 py-2 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-600 shadow-sm">{t('goBack')}</button></div></>) : (<div className="flex flex-col items-center text-center"><p className="text-slate-600 dark:text-slate-300 text-lg mb-4">{t('vocalRangePrompt')}</p><div className="flex flex-col sm:flex-row gap-4"><ThemedButton onClick={() => handleStartRangeTest()} theme={activeTheme}>{t('detectMyRange')}</ThemedButton><button onClick={() => setShowPianoForRangeSelection(true)} className="btn-interactive px-6 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-600 shadow-sm">{t('iKnowMyRange')}</button></div></div>)}</section>}
                                {/* Fix: Pass correct handler function 'handleToggleFavoriteRoutine' to 'onToggleFavorite' prop. */}
                                {activeView === 'routines' && <RoutineView onStartRoutine={handleStartRoutine} currentTheme={activeTheme} favoriteRoutineIds={favoriteRoutineIds} onToggleFavorite={handleToggleFavoriteRoutine} />}
                                {activeView === 'exercises' && <ExerciseView onSelectExercise={selectExercise} currentTheme={activeTheme} savedAIExercises={savedAIExercises} favoriteExerciseIds={favoriteExerciseIds} onToggleFavorite={handleToggleFavoriteExercise} />}
                                {/* Fix: Pass correct variables and handlers to FavoritesView props instead of using shorthand for undefined variables. */}
                                {activeView === 'favorites' && <FavoritesView {...{ currentTheme: activeTheme, favoriteRoutineIds, favoriteExerciseIds, savedAIExercises, onStartRoutine: handleStartRoutine, onSelectExercise: selectExercise, onToggleFavoriteRoutine: handleToggleFavoriteRoutine, onToggleFavoriteExercise: handleToggleFavoriteExercise }} />}
                                {/* Pitch detector and instrument tuner removed to simplify app */}
                                {activeView === 'voxlabai' && <VoxLabAIView currentTheme={activeTheme} onStartExercise={handleStartGeneratedExercise} onSave={handleSaveAIExercise} savedAIExercises={savedAIExercises} favoriteExerciseIds={favoriteExerciseIds} onToggleFavorite={handleToggleFavoriteExercise} playNote={playNote} aiResult={aiResult} setAiResult={setAiResult} />}

                                {activeView === 'test' && <TestModeView currentTheme={activeTheme} vocalRange={exerciseRange} userPitch={userPitch} micGain={micGain} playNote={playNote} onToggleMic={handleMicToggle} micActive={micActive} compressorEnabled={compressorEnabled} setCompressorEnabled={setCompressorEnabled} frequencySeparationEnabled={frequencySeparationEnabled} setFrequencySeparationEnabled={setFrequencySeparationEnabled} pyinBias={pyinBias} setPyinBias={setPyinBias} pyinTolerance={pyinTolerance} setPyinTolerance={setPyinTolerance} pyinGateMode={pyinGateMode} setPyinGateMode={setPyinGateMode} noiseGateThreshold={noiseGateThreshold} setNoiseGateThreshold={setNoiseGateThreshold} onBack={() => setActiveView('home')} />}
                                {activeView === 'studies' && <ComingSoonView title={t('studiesTitle')} description={t('studiesDesc')} currentTheme={activeTheme} />}
                                {activeView === 'tokens' && <ComingSoonView title={t('tokensTitle')} description={t('tokensDesc')} currentTheme={activeTheme} />}
                            </div>
                        )}
                        {uiView === 'exercise' && selectedExercise && (
                            selectedExercise.isAIGenerated ? (
                                // Use Pitch Perfector for AI exercises
                                <AIExerciseView
                                    exercise={selectedExercise}
                                    currentTheme={activeTheme}
                                    themeMode={themeMode}
                                    language={language}
                                    vocalRange={vocalRange}
                                    onBack={() => {
                                        handleStop();
                                        setActiveView('voxlabai');
                                    }}
                                    onEdit={() => {
                                        handleStop();
                                        setActiveView('voxlabai');
                                    }}
                                />
                            ) : (
                                <ErrorBoundary>
                                    <ExerciseGameViewALTWrapper
                                        key={exerciseKey}
                                        exercise={selectedExercise}
                                        vocalRange={vocalRange}
                                        userPitch={userPitch}
                                        micGain={micGain}
                                        isPlaying={isPlaying}
                                        isExerciseComplete={isExerciseComplete}
                                        onStop={handleStop}
                                        onBack={handleStop}
                                        onComplete={handleExerciseComplete}
                                        onPlayPause={handlePlayPause}
                                        onPreview={handlePreview}
                                        isPreviewing={isPreviewing}
                                        playNote={playNote}
                                        centerSemitone={viewControlTargetsRef.current.center}
                                        visibleOctaves={viewControlTargetsRef.current.octaves}
                                        onNotePositionUpdate={handleNotePositionUpdate}
                                        onEdit={() => {
                                            handleStop();
                                            setActiveView('voxlabai');
                                        }}
                                        onRefine={handleRefineExercise}
                                        currentRoutine={currentRoutine}
                                        onNextInRoutine={handleNextExerciseInRoutine}
                                        isFullscreen={isFullscreen}
                                        onToggleFullscreen={handleToggleFullscreen}
                                        isExerciseFavorite={favoriteExerciseIds.includes(getExerciseId(selectedExercise))}
                                        isRoutineFavorite={currentRoutine ? favoriteRoutineIds.includes(currentRoutine.routine.id) : false}
                                        onToggleFavoriteExercise={() => handleToggleFavoriteExercise(selectedExercise)}
                                        onToggleFavoriteRoutine={() => currentRoutine && handleToggleFavoriteRoutine(currentRoutine.routine.id)}
                                        onRestart={() => setExerciseKey(prev => prev + 1)}
                                        checkAudioBuffers={checkAudioBuffers}
                                        pyinBias={pyinBias}
                                        pyinTolerance={pyinTolerance}
                                        pyinGateMode={pyinGateMode}
                                        noiseGateThreshold={noiseGateThreshold}
                                    />
                                </ErrorBoundary>
                            )
                        )}
                    </main>
                    <FloatingMenu
                        activeView={activeView}
                        setActiveView={handleViewChange}
                        setIsSettingsOpen={setIsSettingsOpen}
                        currentTheme={activeTheme}
                        uiView={uiView}
                        isVisible={isMenuVisible}
                    />
                </div>
                {IS_BETA_MODE && <FeedbackOverlay currentTheme={activeTheme} activeView={activeView} currentExercise={selectedExercise} currentRoutine={currentRoutine} uiView={uiView} />}
            </div >
        </>
    );
}
