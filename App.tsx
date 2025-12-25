import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Note, VocalRange, Exercise, VocalRangeEntry, Theme, Routine, ActiveView, isMidiExercise } from './types';
import { EXERCISES, THEMES, ROUTINES } from './constants';
import { generateNotes } from './utils';
import { getExercisePattern, getExerciseId } from './exerciseUtils';
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
import { useSettings } from './hooks/useSettings';
import { useExercise } from './hooks/useExercise';
import { useSampleLoader } from './hooks/useSampleLoader';
import { useAudio } from './hooks/useAudio';
import { usePitchDetection } from './hooks/usePitchDetection';

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

    // Initialize custom hooks
    const { t, language, setLanguage } = useTranslation();
    
    // Settings hook
    const settings = useSettings();
    const {
        themeId,
        setThemeId,
        themeMode,
        setThemeMode,
        compressorEnabled,
        setCompressorEnabled,
        frequencySeparationEnabled,
        setFrequencySeparationEnabled,
        pyinBias,
        setPyinBias,
        pyinTolerance,
        setPyinTolerance,
        pyinGateMode,
        setPyinGateMode,
        noiseGateThreshold,
        setNoiseGateThreshold,
        vocalRange,
        setVocalRange,
        favoriteExerciseIds,
        setFavoriteExerciseIds,
        favoriteRoutineIds,
        setFavoriteRoutineIds,
    } = settings;
    
    // Exercise hook
    const exercise = useExercise();
    const {
        selectedExercise,
        setSelectedExercise,
        isPlaying,
        setIsPlaying,
        isExerciseComplete,
        setIsExerciseComplete,
        exerciseKey,
        setExerciseKey,
        exerciseRange,
        setExerciseRange,
        currentRoutine,
        setCurrentRoutine,
        isRoutineComplete,
        setIsRoutineComplete,
        savedAIExercises,
        setSavedAIExercises,
        aiResult,
        setAiResult,
        isPreviewing,
        setIsPreviewing,
    } = exercise;
    
    // Sample loader hook
    const sampleLoader = useSampleLoader();
    const {
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
        handleLoadLocalSamples: loadLocalSamples,
        loadBuiltInPianoSamples,
    } = sampleLoader;
    
    // Audio hook (needs some settings values)
    const [compressorThreshold, setCompressorThreshold] = useState(-24);
    const [compressorRatio, setCompressorRatio] = useState(4);
    const [compressorRelease, setCompressorRelease] = useState(0.25);
    
    // Create a micStatus state for usePitchDetection
    const [micStatus, setMicStatus] = useState(t('micStatusActivate'));
    
    const audio = useAudio(
        t,
        setMicStatus,
        compressorThreshold,
        compressorRatio,
        compressorRelease
    );
    const {
        audioCtxRef,
        masterGainRef,
        currentPlayingExerciseNoteNodesRef,
        currentNonExerciseNoteNodesRef,
        audioInitPromiseRef,
        previewTimersRef,
        latestPlayRequestRef,
        currentlyPlayingNotesRef,
        compressorNodeRef,
        exerciseNoteVolume,
        setExerciseNoteVolume,
        metronomeVolume,
        setMetronomeVolume,
        initAudio,
        playNote: audioPlayNote,
        playMetronomeClick,
        stopAllExerciseNotes,
        stopAllNonExerciseNotes,
    } = audio;
    
    // Pitch detection hook
    const [gainValue, setGainValue] = useState(1);
    const [autoGainEnabled, setAutoGainEnabled] = useState(true);
    const [eqLowGain, setEqLowGain] = useState(0);
    const [eqMidGain, setEqMidGain] = useState(0);
    const [eqHighGain, setEqHighGain] = useState(0);
    const pitchAlgorithm = 'yin'; // YIN is the best
    
    const pitchDetection = usePitchDetection(
        t,
        initAudio,
        audioCtxRef,
        autoGainEnabled,
        noiseGateThreshold,
        gainValue,
        compressorEnabled,
        frequencySeparationEnabled,
        pyinBias,
        pyinGateMode,
        pitchAlgorithm,
        compressorThreshold,
        compressorRatio,
        compressorRelease,
        eqLowGain,
        eqMidGain,
        eqHighGain
    );
    const {
        micActive,
        setMicActive,
        userPitch,
        setUserPitch,
        micGain,
        setMicGain,
        micStreamRef,
        workletNodeRef,
        workletModuleAddedRef,
        lastPitchRef,
        lastSmoothedPitchRef,
        pitchBufferRef,
        gainNodeRef,
        eqLowNodeRef,
        eqMidNodeRef,
        eqHighNodeRef,
        startPitchDetection,
        stopPitchDetection,
        handleMicToggle,
    } = pitchDetection;
    
    // UI state
    const [uiView, setUiView] = useState<'main' | 'exercise'>('main');
    const uiViewRef = useRef<'main' | 'exercise'>('main'); // Track current uiView without dependency
    const [isMenuVisible, setIsMenuVisible] = useState(true);
    const [activeView, setActiveView] = useState<ActiveView>('home');
    const [vocalRangeHistory, setVocalRangeHistory] = useState<VocalRangeEntry[]>([]);
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showEngineSettings, setShowEngineSettings] = useState(false);
    const [isTunerExpanded, setIsTunerExpanded] = useState(false);
    const [showMicPermissionDialog, setShowMicPermissionDialog] = useState(true);

    const [isRangeTestActive, setIsRangeTestActive] = useState(false);
    const [showPianoForRangeSelection, setShowPianoForRangeSelection] = useState(false);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [isRangeCheckModalOpen, setIsRangeCheckModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [postRangeTestAction, setPostRangeTestAction] = useState<(() => void) | null>(null);

    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Centralized View & Audio Controls State
    const [centerSemitone, setCenterSemitone] = useState(0);
    const [visibleOctaves, setVisibleOctaves] = useState(0.7);
    const [autoFitEnabled, setAutoFitEnabled] = useState(false); // Disabled by default so notes are visible
    const [isPitchGridExpanded, setIsPitchGridExpanded] = useState(false);

    const [autoFitTarget, setAutoFitTarget] = useState<number | null>(null);
    const [exerciseNoteCenter, setExerciseNoteCenter] = useState<number | null>(null);
    const viewControlTargetsRef = useRef({ center: 0, octaves: 0.7 });
    const needsCameraSnapRef = useRef(false);

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
        if (!isRangeCheckModalOpen && vocalRange.start && pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    }, [isRangeCheckModalOpen, vocalRange, pendingAction]);

    useEffect(() => {
        if (activeView !== 'range') setShowPianoForRangeSelection(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
    }, [activeView, isSettingsOpen]);


    // Wrapper for playNote to inject dependencies
    const playNote = useCallback(async (semitone: number, duration: number, forExercise: boolean = false) => {
        return audioPlayNote(
            semitone,
            duration,
            forExercise,
            instrumentLibraryRef.current,
            activeInstrument,
            fetchAndDecodeSample,
            frequencySeparationEnabled
        );
    }, [audioPlayNote, activeInstrument, fetchAndDecodeSample, frequencySeparationEnabled]);

    // Wrapper for handleLoadLocalSamples to inject dependencies
    const handleLoadLocalSamples = useCallback(async (fileList: FileList) => {
        return loadLocalSamples(fileList, audioCtxRef.current, initAudio);
    }, [loadLocalSamples, initAudio]);

    // Wrapper for loadBuiltInPianoSamples
    const wrappedLoadBuiltInPianoSamples = useCallback(async () => {
        return loadBuiltInPianoSamples(audioCtxRef.current, initAudio);
    }, [loadBuiltInPianoSamples, initAudio]);

    // Use the checkAudioBuffers with proper injection
    const wrappedCheckAudioBuffers = useCallback(async (semitones: number[]) => {
        return checkAudioBuffers(semitones, audioCtxRef.current, initAudio);
    }, [checkAudioBuffers, initAudio]);

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
