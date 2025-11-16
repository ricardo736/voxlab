

import React, { useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { Note, TestStep } from '../types';
import { frequencyToNote, detectPitch, calculateRMS, average, min, max, freqToNote, LOW_VOLUME_RMS_THRESHOLD } from '../utils';
import SimplePitchIndicator from './SimplePitchIndicator';
import { useTranslation } from '../hooks/useTranslation';
import { TranslationKey } from '../i18n';

interface VocalRangeTestScreenProps {
    micActive: boolean;
    userPitch: number | null;
    micGain: number;
    startMic: () => Promise<boolean>;
    onCompleteRangeDetection: (startNote: Note, endNote: Note) => void;
    onCancel: () => void;
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string, gradientText: { from: string, to: string, darkFrom: string, darkTo: string } };
}

// --- State Machine ---
interface State {
    step: TestStep;
    progress: number;
    currentLowestNote: Note | null;
    detectedRange: { start: Note; end: Note } | null;
    instruction: string;
    subInstruction: string;
    notHearingMessage: string | null;
    isFadingOut: boolean;
    showDetectionUI: boolean;
}

type Action =
    | { type: 'START_PHASE'; payload: { step: TestStep; instruction: string; subInstruction: string; showDetectionUI: boolean } }
    | { type: 'SET_PROGRESS'; payload: number }
    | { type: 'UPDATE_PROGRESS'; payload: number }
    | { type: 'SET_LOWEST_NOTE'; payload: Note | null }
    | { type: 'SET_DETECTED_RANGE'; payload: { start: Note; end: Note } }
    | { type: 'SET_NOT_HEARING_MESSAGE'; payload: string | null }
    | { type: 'SET_FADING_OUT'; payload: boolean }
    | { type: 'RESET' };

const initialState: State = {
    step: TestStep.LowestNote,
    progress: 0,
    currentLowestNote: null,
    detectedRange: null,
    instruction: '',
    subInstruction: '',
    notHearingMessage: null,
    isFadingOut: false,
    showDetectionUI: false,
};

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'START_PHASE':
            return {
                ...state,
                ...action.payload,
                progress: 0,
                notHearingMessage: null,
                isFadingOut: false,
            };
        case 'SET_PROGRESS':
            return { ...state, progress: action.payload };
        case 'UPDATE_PROGRESS':
            const newProgress = state.progress + action.payload;
            return { ...state, progress: newProgress >= 100 ? 100 : newProgress };
        case 'SET_LOWEST_NOTE':
            return { ...state, currentLowestNote: action.payload };
        case 'SET_DETECTED_RANGE':
            return { ...state, detectedRange: action.payload, step: TestStep.ConfirmResults };
        case 'SET_NOT_HEARING_MESSAGE':
            return { ...state, notHearingMessage: action.payload };
        case 'SET_FADING_OUT':
            return { ...state, isFadingOut: action.payload };
        case 'RESET':
            return { ...initialState, step: TestStep.LowestNote }; // Go back to the first step on reset
        default:
            return state;
    }
}

const VocalRangeTestScreen: React.FC<VocalRangeTestScreenProps> = (props) => {
    const { onCompleteRangeDetection, onCancel, currentTheme } = props;
    const { t } = useTranslation();
    const [state, dispatch] = useReducer(reducer, initialState);

    const timersRef = useRef<Set<number>>(new Set());
    const lowestNoteBufferRef = useRef<number[]>([]);
    const sirenPitchBufferRef = useRef<number[]>([]);
    const soundDetectedInPhaseRef = useRef(false);
    const propsRef = useRef(props);
    propsRef.current = props;

    const GAIN_THRESHOLD = 5;
    const FADE_DURATION_MS = 300;
    const MIN_LOWEST_NOTE_DATA = 10;
    const MIN_SIREN_SOUND_DATA = 20;

    const addTimer = useCallback((timerId: number) => {
        timersRef.current.add(timerId);
    }, []);

    const clearTimers = useCallback(() => {
        timersRef.current.forEach(timerId => {
            clearTimeout(timerId);
            clearInterval(timerId);
        });
        timersRef.current.clear();
    }, []);

    const startActualDetection = useCallback((durationMs: number, onComplete: () => void) => {
        soundDetectedInPhaseRef.current = false;
        let localLowestPitch = Infinity;
        const intervalDuration = 50;

        const detectionInterval = window.setInterval(() => {
            const { micGain, userPitch, micActive } = propsRef.current;
            const currentStep = state.step;

            if (!micActive) return;

            if (micGain > GAIN_THRESHOLD) {
                soundDetectedInPhaseRef.current = true;
                dispatch({ type: 'SET_NOT_HEARING_MESSAGE', payload: null });
                
                if (currentStep === TestStep.LowestNote && userPitch && userPitch > 25) {
                    lowestNoteBufferRef.current.push(userPitch);
                    if (userPitch < localLowestPitch) {
                        localLowestPitch = userPitch;
                        dispatch({ type: 'SET_LOWEST_NOTE', payload: frequencyToNote(localLowestPitch) });
                    }
                } else if (currentStep === TestStep.SirenSound && userPitch) {
                    sirenPitchBufferRef.current.push(userPitch);
                }
                
                dispatch({ type: 'UPDATE_PROGRESS', payload: (intervalDuration / durationMs) * 100 });
            } else {
                 dispatch({ type: 'SET_NOT_HEARING_MESSAGE', payload: t('notHearingGoAhead') });
            }
        }, intervalDuration);

        const detectionTimeout = window.setTimeout(() => {
            clearTimers();
            onComplete();
        }, durationMs + 200);

        addTimer(detectionInterval);
        addTimer(detectionTimeout);
    }, [addTimer, clearTimers, t, state.step]);

    // FIX: Update parameter type to allow an empty string for subInstructionKey.
    const setupDetectionPhase = useCallback((phaseConfig: { step: TestStep; instructionKey: TranslationKey; subInstructionKey: TranslationKey | ''; durationMs: number; onComplete: () => void; }, skipFade = false) => {
        clearTimers();
        if (skipFade) {
            dispatch({ type: 'START_PHASE', payload: { ...phaseConfig, instruction: t(phaseConfig.instructionKey), subInstruction: t(phaseConfig.subInstructionKey), showDetectionUI: true } });
            startActualDetection(phaseConfig.durationMs, phaseConfig.onComplete);
        } else {
            dispatch({ type: 'SET_FADING_OUT', payload: true });
            const fadeTimer = window.setTimeout(() => {
                if (phaseConfig.step === TestStep.LowestNote) lowestNoteBufferRef.current = [];
                if (phaseConfig.step === TestStep.SirenSound) sirenPitchBufferRef.current = [];
                dispatch({ type: 'START_PHASE', payload: { ...phaseConfig, instruction: t(phaseConfig.instructionKey), subInstruction: t(phaseConfig.subInstructionKey), showDetectionUI: true } });
                startActualDetection(phaseConfig.durationMs, phaseConfig.onComplete);
            }, FADE_DURATION_MS);
            addTimer(fadeTimer);
        }
    }, [addTimer, clearTimers, startActualDetection, t]);

    const handleNextStep = useCallback(() => {
        // FIX: Cast string literals to TranslationKey to satisfy TypeScript's type checker.
        const phases = {
            [TestStep.LowestNote]: { step: TestStep.SpeakNaturally, instructionKey: 'speakNaturallyInstructions' as TranslationKey, subInstructionKey: 'speakingNow' as TranslationKey, durationMs: 3000, onComplete: () => {} },
            [TestStep.SpeakNaturally]: { step: TestStep.SirenSound, instructionKey: 'sirenSoundInstructions' as TranslationKey, subInstructionKey: 'listeningInstruction' as TranslationKey, durationMs: 7000, onComplete: () => {} },
            // FIX: Cast empty string to its literal type to prevent widening to 'string'
            [TestStep.SirenSound]: { step: TestStep.Analyzing, instructionKey: 'analysisMessage' as TranslationKey, subInstructionKey: '' as '', durationMs: 0, onComplete: () => {} },
        };
        phases[TestStep.LowestNote].onComplete = () => {
             if (!soundDetectedInPhaseRef.current || lowestNoteBufferRef.current.length < MIN_LOWEST_NOTE_DATA) {
                return setupDetectionPhase(phases[TestStep.LowestNote], true);
            }
            dispatch({ type: 'SET_PROGRESS', payload: 100 });
            const completionTimer = setTimeout(handleNextStep, 1000);
            addTimer(completionTimer);
        };
        phases[TestStep.SpeakNaturally].onComplete = () => {
             if (!soundDetectedInPhaseRef.current) {
                return setupDetectionPhase(phases[TestStep.SpeakNaturally], true);
            }
            dispatch({ type: 'SET_PROGRESS', payload: 100 });
            const completionTimer = setTimeout(handleNextStep, 1000);
            addTimer(completionTimer);
        };
        phases[TestStep.SirenSound].onComplete = () => {
            dispatch({ type: 'SET_PROGRESS', payload: 100 });
            const completionTimer = setTimeout(handleNextStep, 1000);
            addTimer(completionTimer);
        };

        const currentPhase = state.step;
        if ((phases as any)[currentPhase]) {
             if (currentPhase === TestStep.SirenSound) { // Move to analysis
                clearTimers();
                dispatch({ type: 'START_PHASE', payload: { step: TestStep.Analyzing, instruction: t('analysisMessage'), subInstruction: '', showDetectionUI: false } });
                const analysisTimer = setTimeout(() => {
                    // FIX: Changed sirenPitchesRef to sirenPitchBufferRef
                    const validPitches = sirenPitchBufferRef.current.filter(p => p > 0);
                    if (!soundDetectedInPhaseRef.current || validPitches.length < MIN_SIREN_SOUND_DATA) {
                        return setupDetectionPhase(phases[TestStep.SirenSound], true);
                    }
                    validPitches.sort((a, b) => a - b);
                    const percentile = (arr: number[], p: number) => {
                        if (arr.length === 0) return 0;
                        const pos = (arr.length - 1) * p;
                        const base = Math.floor(pos);
                        const rest = pos - base;
                        return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
                    };
                    const startNote = frequencyToNote(percentile(validPitches, 0.05));
                    const endNote = frequencyToNote(percentile(validPitches, 0.95));

                    if (startNote && endNote && endNote.semitone > startNote.semitone) {
                        dispatch({ type: 'SET_DETECTED_RANGE', payload: { start: startNote, end: endNote } });
                    } else {
                        setupDetectionPhase(phases[TestStep.SirenSound], true);
                    }
                }, 500);
                addTimer(analysisTimer);
            } else {
                 setupDetectionPhase((phases as any)[currentPhase]);
            }
        }
    }, [state.step, setupDetectionPhase, clearTimers, addTimer, t]);

    useEffect(() => {
        const { startMic, micActive } = propsRef.current;
        if (state.step === TestStep.LowestNote && !state.instruction) {
             handleNextStep();
        }
        if (!micActive && state.step !== TestStep.Analyzing && state.step !== TestStep.ConfirmResults) {
            startMic();
        }
        return () => clearTimers();
    }, [state.step, state.instruction, handleNextStep, clearTimers]);
    
    const handleConfirm = useCallback(() => {
        if (state.detectedRange) {
            onCompleteRangeDetection(state.detectedRange.start, state.detectedRange.end);
            dispatch({ type: 'RESET' });
        }
    }, [state.detectedRange, onCompleteRangeDetection]);

    const handleCancelAndReset = () => {
        onCancel();
        dispatch({ type: 'RESET' });
    };
    
    const handleTryAgain = () => {
        dispatch({ type: 'RESET' });
    };

    const indicatorProps = useMemo(() => ({
        micGain: props.micGain, userPitch: props.userPitch, currentTheme
    }), [props.micGain, props.userPitch, currentTheme]);

    const renderContent = () => {
        switch (state.step) {
            case TestStep.Analyzing:
                return <p className="text-2xl font-semibold text-slate-800 dark:text-slate-200">{state.instruction}</p>;
            case TestStep.ConfirmResults:
                return (
                    <div className="text-center">
                        <h3 className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-2`}>{t('resultsTitle')}</h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">{t('resultsSubtitle')}</p>
                        <p className={`text-5xl font-black ${currentTheme.primary} mb-8`}>{state.detectedRange?.start.name} - {state.detectedRange?.end.name}</p>
                    </div>
                );
            default: // Handles LowestNote, SpeakNaturally, SirenSound
                return (
                    <>
                        <h3 className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-4`}>{state.instruction}</h3>
                        {state.showDetectionUI && (
                            <>
                                <div className="w-full max-w-lg my-4"><SimplePitchIndicator {...indicatorProps} /></div>
                                <div className="relative w-full max-w-xs h-4 bg-slate-200 rounded-full overflow-hidden my-2 border border-slate-300/50">
                                    <div className={`absolute top-0 left-0 h-full ${state.progress >= 100 ? 'bg-green-500' : currentTheme.primary.replace('text-','bg-')} rounded-full transition-all duration-100 ease-linear`} style={{ width: `${state.progress}%` }}></div>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 h-6 mt-2">
                                    {state.notHearingMessage || (state.step === TestStep.LowestNote && state.currentLowestNote ? `${t('lowestNoteDetected')}: ${state.currentLowestNote.name}` : state.subInstruction)}
                                </p>
                            </>
                        )}
                    </>
                );
        }
    };
    
    const baseButtonClasses = "btn-interactive flex items-center justify-center h-12 px-6 rounded-full border border-slate-300/60 backdrop-blur-lg font-semibold";

    return (
        <div className={`fixed inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-xl z-[100] p-6 transition-opacity duration-${FADE_DURATION_MS} ${state.isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex-grow flex flex-col items-center justify-center text-center max-w-2xl w-full">
                {renderContent()}
            </div>
            <div className="flex justify-center gap-4 fixed bottom-8 w-full max-w-lg px-6">
                 {state.step !== TestStep.ConfirmResults && state.step !== TestStep.Analyzing && (
                    <>
                        <button onClick={handleCancelAndReset} className={`${baseButtonClasses} text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 border-slate-300/50 dark:border-white/10 shadow-sm`}>
                            {t('cancel')}
                        </button>
                        {state.progress < 100 && (
                            <button onClick={handleNextStep} className={`${baseButtonClasses} bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/80`}>
                                {t('skipStep')}
                            </button>
                        )}
                    </>
                )}
                 {state.step !== TestStep.ConfirmResults && state.step !== TestStep.Analyzing && state.progress >= 100 && (
                     <button 
                        onClick={handleNextStep} 
                        className={`
                            px-8 py-3 rounded-full font-medium text-base text-white
                            flex items-center justify-center gap-2
                            relative overflow-hidden group 
                            transition-all transform hover:scale-105 active:scale-95
                            bg-gradient-to-br ${currentTheme.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-').replace(/\/10/g, '')}
                            shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb,139_92_246),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
                            backdrop-blur-sm
                        `}
                        style={{'--shadow-rgb': currentTheme.shadowRgb} as React.CSSProperties}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative z-10 flex items-center gap-2">
                            <span>{t('nextStep')}</span>
                        </span>
                    </button>
                )}
                {state.step === TestStep.ConfirmResults && (
                    <>
                        <button onClick={handleTryAgain} className={`${baseButtonClasses} text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 border-slate-300/50 dark:border-white/10 shadow-sm`}>
                            {t('tryAgain')}
                        </button>
                        <button 
                            onClick={handleConfirm} 
                            className={`
                                px-8 py-3 rounded-full font-medium text-base text-white
                                flex items-center justify-center gap-2
                                relative overflow-hidden group 
                                transition-all transform hover:scale-105 active:scale-95
                                bg-gradient-to-br ${currentTheme.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-').replace(/\/10/g, '')}
                                shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb,139_92_246),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
                                backdrop-blur-sm
                            `}
                            style={{'--shadow-rgb': currentTheme.shadowRgb} as React.CSSProperties}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <span className="relative z-10 flex items-center gap-2">
                                <span>{t('confirmRange')}</span>
                            </span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default VocalRangeTestScreen;