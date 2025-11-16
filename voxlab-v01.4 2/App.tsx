
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Note, VocalRange, Exercise, NoteNodes, VocalRangeEntry, Language, ColorPalette, TestStep, Routine, ActiveView, PlaybackState } from './types';
import { EXERCISES, LANGUAGES, COLOR_PALETTES, ROUTINES } from './constants';
import { generateNotes, noteToFrequency, frequencyToNote, lerp, semitoneToNoteName, detectPitch, calculateRMS, LOW_VOLUME_RMS_THRESHOLD } from './utils';
import Piano from './components/Piano';
import ExerciseView from './components/ExerciseView';
import ExerciseGameView from './components/ExerciseGameView';
import PitchVisualizer from './components/PitchVisualizer';
import PitchViewControls from './components/PitchViewControls';
import FloatingMenu from './components/FloatingMenu';
import VocalRangeTestScreen from './components/VocalRangeTestScreen';
import SettingsOverlay from './components/SettingsOverlay';
import { useTranslation } from './hooks/useTranslation';
import RoutineView from './components/RoutineView';
import ComingSoonView from './components/ComingSoonView';
import VoxLabAIView from './components/AIStudioView';
import FavoritesView from './components/FavoritesView';
import InstrumentTuner from './components/InstrumentTuner';
import { RangeDetectorV2View } from './components/RangeDetectorV2View'; // Import new component
import { TranslationKey } from './i18n'; // Import TranslationKey

const pitchProcessorCode = `
// YIN algorithm from utils.ts, duplicated here for AudioWorklet scope
// Define helper functions and constants outside the PitchProcessor class,
// within the AudioWorklet module's global scope.
${detectPitch.toString()}
${calculateRMS.toString()} 
const LOW_VOLUME_RMS_THRESHOLD = ${LOW_VOLUME_RMS_THRESHOLD};


class PitchProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.analysisBufferSize = 2048;
        this.buffer = new Float32Array(this.analysisBufferSize);
        this.bufferPos = 0;
        this.lastGain = 0;
        this.noiseGateThreshold = options.processorOptions.noiseGateThreshold || 0.004;
        this.port.onmessage = (event) => {
            if (event.data.noiseGateThreshold) {
                this.noiseGateThreshold = event.data.noiseGateThreshold;
            }
        };
    }

    static get parameterDescriptors() {
        return [];
    }
    
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];
            this.lastGain = calculateRMS(channelData); // Use the calculateRMS utility

            const remainingSpace = this.analysisBufferSize - this.bufferPos;
            const toCopy = Math.min(channelData.length, remainingSpace);
            this.buffer.set(channelData.subarray(0, toCopy), this.bufferPos);
            this.bufferPos += toCopy;
            
            if (this.bufferPos >= this.analysisBufferSize) {
                let pitch = -1;
                if (this.lastGain > this.noiseGateThreshold) { 
                    pitch = detectPitch(this.buffer, sampleRate);
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
registerProcessor('pitch-processor', PitchProcessor);
`;

const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" strokeWidth="2.5" className="w-8 h-8 ml-1"><path d="M8 5v14l11-7z"></path></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" strokeWidth="2.5" className="w-8 h-8"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>;

const VocalRangeDisplay: React.FC<{ range: VocalRange, theme: { primary: string }, onClick: () => void }> = ({ range, theme, onClick }) => {
    const { t } = useTranslation();
    const isSet = range.start && range.end;
    const rangeText = isSet ? `${range.start.name} - ${range.end.name}` : t('rangeNotSet');
    
    return (
        <button 
            onClick={onClick}
            className={`btn-interactive text-xs font-bold z-10 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm ${
                isSet 
                    ? `${theme.primary} bg-white/60 dark:bg-black/20 border border-slate-200/50 dark:border-white/10` 
                    : `text-slate-500 bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-300/50 dark:border-slate-600/50`
            }`}
        >
            {rangeText}
        </button>
    );
};

const RangeCheckModal: React.FC<{ onDefine: () => void, onContinue: () => void, theme: { gradient: string, shadowRgb: string } }> = ({ onDefine, onContinue, theme }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <div className="bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">{t('rangeCheckTitle')}</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6">{t('rangeCheckPrompt')}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={onContinue} className="btn-interactive flex-1 px-4 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40">
                        {t('continueAnyway')}
                    </button>
                    <button 
                        onClick={onDefine} 
                        className={`
                            px-8 py-3 rounded-full font-medium text-base text-white
                            flex items-center justify-center gap-2
                            relative overflow-hidden group 
                            transition-all transform hover:scale-105 active:scale-95
                            bg-gradient-to-br ${theme.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-').replace(/\/10/g, '')}
                            shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
                            backdrop-blur-sm
                        `}
                        style={{
                            '--shadow-rgb': theme.shadowRgb 
                        } as React.CSSProperties}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative z-10 flex items-center gap-2">
                            <span>{t('defineRange')}</span>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function App() {
    const { t, language, setLanguage } = useTranslation();
    const [uiView, setUiView] = useState<'main' | 'exercise'>('main'); 
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
    
    const [exerciseNoteVolume, setExerciseNoteVolume] = useState(0.5);
    const [metronomeVolume, setMetronomeVolume] = useState(0.2);

    const [micActive, setMicActive] = useState(false);
    const [userPitch, setUserPitch] = useState<number | null>(null);
    const [micGain, setMicGain] = useState(0); // This is 0-100 scale
    const [micStatus, setMicStatus] = useState(t('micStatusActivate'));
    const [elapsedTime, setElapsedTime] = useState(0); // Displayed elapsed time

    const [isRangeTestActive, setIsRangeTestActive] = useState(false);
    const [showPianoForRangeSelection, setShowPianoForRangeSelection] = useState(false);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [colorPalette, setColorPalette] = useState<ColorPalette>(COLOR_PALETTES[0]);
    // New state for dark mode
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        try {
            const storedValue = localStorage.getItem('isDarkMode');
            return storedValue ? JSON.parse(storedValue) : window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch (e) {
            console.error("Failed to load dark mode preference", e);
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    });
    
    const [isRangeCheckModalOpen, setIsRangeCheckModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [postRangeTestAction, setPostRangeTestAction] = useState<(() => void) | null>(null);

    const [savedAIExercises, setSavedAIExercises] = useState<Exercise[]>([]);
    const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<number[]>([]);
    const [favoriteRoutineIds, setFavoriteRoutineIds] = useState<string[]>([]);
    
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [practiceStarted, setPracticeStarted] = useState(false);
    
    const [showWelcome, setShowWelcome] = useState(false);
    const [showStartButton, setShowStartButton] = useState(false);

    // Audio Context and Nodes Refs - Centralized
    const audioCtxRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
    const eqLowNodeRef = useRef<BiquadFilterNode | null>(null);
    const eqMidNodeRef = useRef<BiquadFilterNode | null>(null);
    const eqHighNodeRef = useRef<BiquadFilterNode | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);

    const currentPlayingExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set()); 
    const currentNonExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set()); 
    
    // Centralized View & Audio Controls State
    const [centerSemitone, setCenterSemitone] = useState(0); 
    const [visibleOctaves, setVisibleOctaves] = useState(2);
    const [autoFitEnabled, setAutoFitEnabled] = useState(true);
    const [gainValue, setGainValue] = useState(1);
    const [noiseGateThreshold, setNoiseGateThreshold] = useState(0.006); // Calibrated default
    const [compressorThreshold, setCompressorThreshold] = useState(-24);
    const [compressorRatio, setCompressorRatio] = useState(4); // Calibrated default
    const [compressorRelease, setCompressorRelease] = useState(0.25);
    const [autoGainEnabled, setAutoGainEnabled] = useState(true);
    const [eqLowGain, setEqLowGain] = useState(0);
    const [eqMidGain, setEqMidGain] = useState(0);
    const [eqHighGain, setEqHighGain] = useState(0);

    
    const [smoothedSemitone, setSmoothedSemitone] = useState<number | null>(null);
    const [autoFitTarget, setAutoFitTarget] = useState<number | null>(null);
    const [exerciseNoteCenter, setExerciseNoteCenter] = useState<number | null>(null);
    const viewControlTargetsRef = useRef({ center: 0, octaves: 2 });
    
    // Playback state for ExerciseGameView, managed by App.tsx
    const [playbackState, setPlaybackState] = useState<PlaybackState>({
        sessionStartTime: 0, // Absolute timestamp when *exercise content* started/resumed (0 if not started/paused with 0 content time)
        pausedTime: 0, // Cumulative elapsed time *into exercise content* when paused (0 if not paused)
        isCountingDown: false, // Flag for countdown active
        countdownStartedAt: 0, // Absolute timestamp when countdown started (0 if not active)
    });

    const pianoNotes = useMemo(() => generateNotes(-24, 24), []);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
    useEffect(() => {
        if (!practiceStarted) {
            setShowWelcome(false); setShowStartButton(false);
            const welcomeTimer = setTimeout(() => setShowWelcome(true), 500);
            const buttonTimer = setTimeout(() => setShowStartButton(true), 1500);
            return () => { clearTimeout(welcomeTimer); clearTimeout(buttonTimer); };
        }
    }, [practiceStarted]);

    useEffect(() => {
        const load = (k: string, s: (v: any) => void, d: any) => { try { const v = localStorage.getItem(k); if (v) s(JSON.parse(v)); } catch (e) { console.error(`Failed to load ${k}`, e); s(d); }};
        load('vocalRange', setVocalRange, { start: null, end: null });
        load('savedAIExercises', setSavedAIExercises, []);
        load('favoriteExerciseIds', setFavoriteExerciseIds, []);
        load('favoriteRoutineIds', setFavoriteRoutineIds, []);
        load('colorPalette', setColorPalette, COLOR_PALETTES[0]); // Load color palette
        load('language', (code: string) => setLanguage(LANGUAGES.find(l => l.code === code) || LANGUAGES[0]), LANGUAGES[0].code); // Load language
        
        // Load dark mode preference
        load('isDarkMode', setIsDarkMode, window.matchMedia('(prefers-color-scheme: dark)').matches);
    }, []);

    useEffect(() => {
        const save = (k: string, v: any) => { try { if (v !== null && v !== undefined) localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error(`Failed to save ${k}`, e); }};
        if (vocalRange.start && vocalRange.end) save('vocalRange', vocalRange);
        save('savedAIExercises', savedAIExercises);
        save('favoriteExerciseIds', favoriteExerciseIds);
        save('favoriteRoutineIds', favoriteRoutineIds);
        save('colorPalette', colorPalette); // Save color palette
        save('language', language.code); // Save language code
        // Save dark mode preference
        save('isDarkMode', isDarkMode);
    }, [vocalRange, savedAIExercises, favoriteExerciseIds, favoriteRoutineIds, colorPalette, language, isDarkMode]);
    
    // Effect to apply/remove dark class to document.documentElement
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (!isRangeCheckModalOpen && vocalRange.start && pendingAction) {
            pendingAction(); setPendingAction(null);
        }
    }, [isRangeCheckModalOpen, vocalRange, pendingAction]);

    useEffect(() => {
        if (activeView !== 'range' && activeView !== 'rangedetector2') setShowPianoForRangeSelection(false);
        if(isSettingsOpen) setIsSettingsOpen(false);
    }, [activeView]);

    useEffect(() => {
        setMicStatus(micActive ? t('micStatusListening') : t('micStatusActivate'));
    }, [micActive, t]);

    const initAudio = useCallback(async () => {
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
            return true;
        }

        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Create all core audio nodes once
            masterGainRef.current = context.createGain();
            masterGainRef.current.gain.value = 0.5;
            masterGainRef.current.connect(context.destination);

            gainNodeRef.current = context.createGain();
            gainNodeRef.current.gain.value = gainValue;

            compressorNodeRef.current = context.createDynamicsCompressor();
            compressorNodeRef.current.threshold.value = compressorThreshold;
            compressorNodeRef.current.ratio.value = compressorRatio;
            compressorNodeRef.current.release.value = compressorRelease;

            eqLowNodeRef.current = new BiquadFilterNode(context, { type: 'lowshelf', frequency: 300, gain: eqLowGain });
            eqMidNodeRef.current = new BiquadFilterNode(context, { type: 'peaking', frequency: 1500, Q: 1.2, gain: eqMidGain });
            eqHighNodeRef.current = new BiquadFilterNode(context, { type: 'highshelf', frequency: 5000, gain: eqHighGain });

            const blob = new Blob([pitchProcessorCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await context.audioWorklet.addModule(url);
            workletNodeRef.current = new AudioWorkletNode(context, 'pitch-processor', { processorOptions: { noiseGateThreshold } });
            
            // Connect worklet to master gain, so any audio output from worklet could also be heard (if needed)
            // For pitch detection, it usually just posts messages, not outputs audio.
            // workletNodeRef.current.connect(masterGainRef.current); 

            audioCtxRef.current = context;
            return true;
        } catch (e) {
            console.error("Error initializing audio.", e);
            setMicStatus(t('micStatusError'));
            return false;
        }
    }, [t, gainValue, compressorThreshold, compressorRatio, compressorRelease, eqLowGain, eqMidGain, eqHighGain, noiseGateThreshold]);

    const playNote = useCallback(async (semitone: number, duration: number, forExercise: boolean = false) => {
        const audioReady = await initAudio();
        const audioCtx = audioCtxRef.current; const masterGain = masterGainRef.current;
        if (!audioReady || !audioCtx || !masterGain) return;
        const freq = noteToFrequency(semitone); const now = audioCtx.currentTime; const totalDurationSecs = duration / 1000;
        const ATTACK_TIME = 0.01; const DECAY_TIME = 0.1; const SUSTAIN_LEVEL = 0.1;
        const noteSet = forExercise ? currentPlayingExerciseNoteNodesRef.current : currentNonExerciseNoteNodesRef.current;
        noteSet.forEach(n => { n.allNodes.forEach(node => { if (node instanceof OscillatorNode) { try { node.stop(now); } catch (e) {} } try { node.disconnect(); } catch (e) {} }); });
        noteSet.clear();
        const mainGainNode = audioCtx.createGain();
        mainGainNode.gain.setValueAtTime(0, now); mainGainNode.gain.linearRampToValueAtTime(forExercise ? exerciseNoteVolume * 0.8 : 0.4, now + ATTACK_TIME);
        mainGainNode.gain.exponentialRampToValueAtTime(SUSTAIN_LEVEL, now + ATTACK_TIME + DECAY_TIME); mainGainNode.gain.exponentialRampToValueAtTime(0.0001, now + totalDurationSecs);
        mainGainNode.connect(masterGain);
        const nodes: NoteNodes = { oscillators: [], gainNodes: [mainGainNode], allNodes: [mainGainNode] };
        const osc1 = audioCtx.createOscillator(); osc1.type = 'sine'; osc1.frequency.setValueAtTime(freq, now); osc1.connect(mainGainNode);
        nodes.oscillators.push(osc1); nodes.allNodes.push(osc1);
        const brightOscGain = audioCtx.createGain(); brightOscGain.gain.setValueAtTime(0, now); brightOscGain.gain.linearRampToValueAtTime(0.1, now + 0.005); brightOscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        brightOscGain.connect(mainGainNode); nodes.gainNodes.push(brightOscGain); nodes.allNodes.push(brightOscGain);
        const osc2 = audioCtx.createOscillator(); osc2.type = 'square'; osc2.frequency.setValueAtTime(freq * 2, now); osc2.connect(brightOscGain);
        nodes.oscillators.push(osc2); nodes.allNodes.push(osc2);
        nodes.oscillators.forEach(osc => { osc.start(now); osc.stop(now + totalDurationSecs); });
        osc1.onended = () => { nodes.allNodes.forEach(node => { try { node.disconnect(); } catch (e) {} }); noteSet.delete(nodes); };
        noteSet.add(nodes);
    }, [initAudio, exerciseNoteVolume]);

    const playMetronomeClick = useCallback(async () => {
        const audioReady = await initAudio(); const audioCtx = audioCtxRef.current;
        if (!audioReady || !audioCtx || !masterGainRef.current) return;
        const now = audioCtx.currentTime; const clickGain = audioCtx.createGain();
        clickGain.gain.setValueAtTime(metronomeVolume, now); clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        clickGain.connect(masterGainRef.current);
        const osc = audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now); osc.connect(clickGain);
        osc.start(now); osc.stop(now + 0.1);
        osc.onended = () => { try { osc.disconnect(); clickGain.disconnect(); } catch (e) {} };
    }, [initAudio, metronomeVolume]);

    const stopAllExerciseNotes = useCallback(() => {
        const audioCtx = audioCtxRef.current; if (!audioCtx) return;
        currentPlayingExerciseNoteNodesRef.current.forEach(n => { n.allNodes.forEach(node => { if (node instanceof OscillatorNode) { try { node.stop(audioCtx.currentTime); } catch (e) {} } try { node.disconnect(); } catch (e) {} }); });
        currentPlayingExerciseNoteNodesRef.current.clear();
    }, []);

    const stopAllNonExerciseNotes = useCallback(() => {
        const audioCtx = audioCtxRef.current; if (!audioCtx) return;
        currentNonExerciseNoteNodesRef.current.forEach(n => { n.allNodes.forEach(node => { if (node instanceof OscillatorNode) { try { node.stop(audioCtx.currentTime); } catch (e) {} } try { node.disconnect(); } catch (e) {} }); });
        currentNonExerciseNoteNodesRef.current.clear();
    }, []);

    const startPitchDetection = useCallback(async (): Promise<boolean> => {
        // Only start if activeView is one that requires it and it's not already active
        if (!['pitch', 'instrumentTuner', 'range', 'exercise'].includes(activeView) || micActive) return true;

        const audioReady = await initAudio(); // Ensure audio context and static nodes are ready
        const audioCtx = audioCtxRef.current;
        if (!audioReady || !audioCtx || !gainNodeRef.current || !compressorNodeRef.current || !eqLowNodeRef.current || !eqMidNodeRef.current || !eqHighNodeRef.current || !workletNodeRef.current) {
            setMicStatus(t('micStatusError'));
            return false;
        }

        try {
            micStreamRef.current?.getTracks().forEach(track => track.stop());

            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: autoGainEnabled } });
            micStreamRef.current = stream;
            const source = audioCtx.createMediaStreamSource(stream);
            
            source.connect(gainNodeRef.current)
                  .connect(eqLowNodeRef.current)
                  .connect(eqMidNodeRef.current)
                  .connect(eqHighNodeRef.current)
                  .connect(compressorNodeRef.current)
                  .connect(workletNodeRef.current);

            workletNodeRef.current.port.onmessage = (event) => {
                const { pitch, gain } = event.data;
                const adjustedGain = autoGainEnabled ? gain * (1/gainValue) : gain;
                setMicGain(Math.min(1, adjustedGain * 15) * 100); 
                if (pitch !== undefined) setUserPitch(pitch > 25 ? pitch : null);
            };
            setMicActive(true);
            return true;
        } catch (err) {
            console.error("Mic Error:", err);
            setMicStatus(t('micStatusPermissionDenied'));
        }
        return false;
    }, [activeView, micActive, initAudio, t, autoGainEnabled, gainValue]);
    
    // Effects to update audio node parameters when state changes
    useEffect(() => { if (gainNodeRef.current) gainNodeRef.current.gain.value = gainValue; }, [gainValue]);
    useEffect(() => { if (workletNodeRef.current) workletNodeRef.current.port.postMessage({ noiseGateThreshold }); }, [noiseGateThreshold]);
    useEffect(() => { if (compressorNodeRef.current) { compressorNodeRef.current.threshold.value = compressorThreshold; compressorNodeRef.current.ratio.value = compressorRatio; compressorNodeRef.current.release.value = compressorRelease; } }, [compressorThreshold, compressorRatio, compressorRelease]);
    useEffect(() => { if (eqLowNodeRef.current) eqLowNodeRef.current.gain.value = eqLowGain; }, [eqLowGain]);
    useEffect(() => { if (eqMidNodeRef.current) eqMidNodeRef.current.gain.value = eqMidGain; }, [eqMidGain]);
    useEffect(() => { if (eqHighNodeRef.current) eqHighNodeRef.current.gain.value = eqHighGain; }, [eqHighGain]);

    const stopPitchDetection = useCallback(() => {
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        if (workletNodeRef.current) {
            workletNodeRef.current.port.onmessage = null; // Clear message handler
        }
        setMicActive(false); setUserPitch(null); setMicGain(0);
    }, []);
    
    useEffect(() => () => stopPitchDetection(), [stopPitchDetection]);
    
    useEffect(() => {
        const autoStart = async () => { 
            // Only start mic if the current activeView requires it AND the mic is not already active AND it's not the RangeDetectorV2View (which manages its own mic)
            if (['pitch', 'instrumentTuner', 'range', 'exercise'].includes(activeView) && !micActive && activeView !== 'rangedetector2') {
                 await startPitchDetection(); 
            } else if (activeView === 'rangedetector2' && micActive) {
                // If we navigate to RangeDetectorV2View, stop VoxLab's mic
                stopPitchDetection();
            }
        };
        autoStart();
    }, [activeView, micActive, startPitchDetection, stopPitchDetection]);

    const handleMicToggle = useCallback(() => { micActive ? stopPitchDetection() : startPitchDetection(); }, [micActive, startPitchDetection, stopPitchDetection]);

    const handlePianoKeyClick = useCallback((note: Note) => {
        stopAllNonExerciseNotes(); playNote(note.semitone, 300, false);
        setVocalRange(prev => {
            if (!prev.start || prev.end) return { start: note, end: null };
            return note.semitone > prev.start.semitone ? { start: prev.start, end: note } : { start: note, end: prev.start };
        });
    }, [playNote, stopAllNonExerciseNotes]);

    const executeExerciseAction = useCallback((action: () => void) => {
        if (vocalRange.start && vocalRange.end) action(); else { setPendingAction(() => action); setIsRangeCheckModalOpen(true); }
    }, [vocalRange.start, vocalRange.end]);

    const selectExercise = useCallback((ex: Exercise) => {
         executeExerciseAction(() => {
            let currentExerciseRange = vocalRange;
            if (!vocalRange.start || !vocalRange.end) currentExerciseRange = { start: { semitone: -12, name: 'C3', isSharp: false }, end: { semitone: 12, name: 'C5', isSharp: false } };
            setExerciseRange(currentExerciseRange);
            if (currentExerciseRange.start) {
                const avgOffset = ex.pattern.reduce((s, v) => s + v, 0) / ex.pattern.length;
                viewControlTargetsRef.current.center = currentExerciseRange.start.semitone + avgOffset;
                setExerciseNoteCenter(viewControlTargetsRef.current.center);
            }
            // Reset playback state for a new exercise
            setPlaybackState({
                sessionStartTime: 0,
                pausedTime: 0,
                isCountingDown: false,
                countdownStartedAt: 0,
            });
            setElapsedTime(0); // Reset displayed timer
            setIsPlaying(false); setIsExerciseComplete(false); setExerciseKey(k => k + 1);
            setSelectedExercise(ex); setUiView('exercise');
        });
    }, [vocalRange]);

    const currentTheme = useMemo(() => {
        const selectedPalette = colorPalette;
        // Construct `buttonGradient` and `gradientText` based on the selected palette and dark mode.
        // For gradientText, define both light and dark mode colors for dynamic Tailwind classes.
        // Example for violet-wave:
        // Light: from-violet-600 to-fuchsia-600
        // Dark: from-violet-400 to-fuchsia-400
        const gradientTextFrom = selectedPalette.primary.replace('text-', 'from-').replace('600', '600'); // Assuming default is 600
        const gradientTextTo = selectedPalette.secondary.replace('text-', 'to-').replace('600', '600');
        // Dark mode gradients often use lighter shades
        const gradientTextDarkFrom = selectedPalette.primary.replace('text-', 'dark:from-').replace('600', '400');
        const gradientTextDarkTo = selectedPalette.secondary.replace('text-', 'dark:to-').replace('600', '400');

        return {
            ...selectedPalette,
            buttonGradient: selectedPalette.gradient.replace(/\/10/g, ''), // Remove opacity for solid button
            gradientText: {
                from: gradientTextFrom,
                to: gradientTextTo,
                darkFrom: gradientTextDarkFrom,
                darkTo: gradientTextDarkTo,
            }
        };
    }, [colorPalette]);

    const toggleFavoriteExercise = useCallback((exerciseId: number) => {
        setFavoriteExerciseIds(prev =>
            prev.includes(exerciseId)
                ? prev.filter(id => id !== exerciseId)
                : [...prev, exerciseId]
        );
    }, []);

    const toggleFavoriteRoutine = useCallback((routineId: string) => {
        setFavoriteRoutineIds(prev =>
            prev.includes(routineId)
                ? prev.filter(id => id !== routineId)
                : [...prev, routineId]
        );
    }, []);

    const handleStartRoutine = useCallback((routine: Routine) => {
         executeExerciseAction(() => {
            setCurrentRoutine({ routine: routine, exerciseIndex: 0 });
            selectExercise(EXERCISES.find(ex => ex.id === routine.exerciseIds[0])!);
            setUiView('exercise');
        });
    }, [executeExerciseAction, selectExercise]);

    const handleNextExercise = useCallback(() => {
        if (currentRoutine) {
            const nextIndex = currentRoutine.exerciseIndex + 1;
            if (nextIndex < currentRoutine.routine.exerciseIds.length) {
                setCurrentRoutine(prev => prev ? { ...prev, exerciseIndex: nextIndex } : null);
                selectExercise(EXERCISES.find(ex => ex.id === currentRoutine.routine.exerciseIds[nextIndex])!);
            } else {
                setIsRoutineComplete(true);
                setIsPlaying(false);
                setCurrentRoutine(null); // End the routine
                setSelectedExercise(null);
            }
        }
    }, [currentRoutine, selectExercise]);

    const handlePlayPause = useCallback(() => {
        if (!selectedExercise) return;

        if (isExerciseComplete) {
            // Restart the current exercise
            selectExercise(selectedExercise);
            return;
        }

        setIsPlaying(prevIsPlaying => {
            const now = performance.now();
            if (prevIsPlaying) {
                // Pausing
                stopAllExerciseNotes();
                setPlaybackState(prev => ({
                    ...prev,
                    pausedTime: prev.pausedTime + (now - prev.sessionStartTime),
                    sessionStartTime: 0, // Reset session start
                    isCountingDown: false, // Ensure countdown is off
                    countdownStartedAt: 0, // Reset countdown start
                }));
            } else {
                // Starting or Resuming
                if (playbackState.pausedTime === 0) {
                    // Starting fresh, initiate countdown
                    setPlaybackState({
                        sessionStartTime: 0, // Will be set after countdown
                        pausedTime: 0,
                        isCountingDown: true,
                        countdownStartedAt: now,
                    });
                } else {
                    // Resuming from pause
                    setPlaybackState(prev => ({
                        ...prev,
                        sessionStartTime: now, // New session start time
                        isCountingDown: false, // Ensure countdown is off
                        countdownStartedAt: 0, // Reset countdown start
                    }));
                }
            }
            return !prevIsPlaying;
        });
    }, [isExerciseComplete, selectedExercise, playbackState, stopAllExerciseNotes, selectExercise]);
    
    // Metronome tick handler
    const handleMetronomeTick = useCallback(() => {
        playMetronomeClick();
    }, [playMetronomeClick]);

    const handleExerciseStop = useCallback(() => {
        stopAllExerciseNotes();
        setIsPlaying(false);
        setIsExerciseComplete(false); // Fix: Corrected state setter
        setIsRoutineComplete(false);
        setCurrentRoutine(null);
        setSelectedExercise(null);
        setPlaybackState({
            sessionStartTime: 0,
            pausedTime: 0,
            isCountingDown: false,
            countdownStartedAt: 0,
        });
        setElapsedTime(0);
        setUiView('main');
        setActiveView('exercises'); // Or whatever is appropriate after stopping
    }, [stopAllExerciseNotes]);

    const handleExercisePreview = useCallback(() => {
        if (!selectedExercise) return;
        // This will be handled by the ExerciseGameView internally playing the notes
    }, [selectedExercise]);
    
    const handleExerciseComplete = useCallback(() => {
        stopAllExerciseNotes();
        setIsExerciseComplete(true);
        setIsPlaying(false);
        if (currentRoutine) {
            // Check if there are more exercises in the routine
            if (currentRoutine.exerciseIndex + 1 < currentRoutine.routine.exerciseIds.length) {
                // Routine continues, but exercise is complete
            } else {
                // Last exercise of the routine is complete
                setIsRoutineComplete(true);
                setCurrentRoutine(null);
            }
        }
    }, [currentRoutine, stopAllExerciseNotes]);

    const updateCenterAndOctaves = useCallback((pitch: number | null) => {
        if (autoFitEnabled && pitch !== null) {
            // Apply smoothing for centerSemitone to avoid jitter
            setSmoothedSemitone(prev => lerp(prev === null ? pitch : prev, pitch, 0.1));
            const newCenter = Math.round(pitch); // Snap to nearest semitone
            viewControlTargetsRef.current.center = newCenter; // Update ref for immediate use
            setCenterSemitone(newCenter);

            // Also dynamically adjust visible octaves, if needed
            // This logic can be refined based on desired zoom behavior
            // setVisibleOctaves(prev => lerp(prev, Math.max(1, (maxPitch - minPitch) / 12 + 0.5), 0.1));
        } else if (!autoFitEnabled && autoFitTarget !== null) {
            // If auto-fit was just disabled and there was a target, snap to it
            setCenterSemitone(Math.round(autoFitTarget));
            setAutoFitTarget(null); // Clear target
        }
    }, [autoFitEnabled, autoFitTarget]);

    useEffect(() => {
        if (!autoFitEnabled && viewControlTargetsRef.current.center !== centerSemitone) {
            // When auto-fit is disabled, and manual adjustment happens, stop auto-fit influence
            setSmoothedSemitone(null); // Reset smoothing buffer
        }
    }, [autoFitEnabled, centerSemitone]);

    const homeView = (
        <section className="flex-grow flex flex-col justify-center items-center w-full px-4 pt-8 animate-fade-in">
            <div className="text-center mb-8">
                {showWelcome && (
                    <h1 className={`text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-2 animate-fade-in`}>
                        {t('welcomeTitle')}
                    </h1>
                )}
                {showWelcome && (
                    <p className="text-lg text-slate-600 dark:text-slate-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        {t('welcomeSubtitle')}
                    </p>
                )}
            </div>

            {practiceStarted && (
                <div className="relative w-full max-w-sm mx-auto p-6 bg-white/30 dark:bg-black/20 backdrop-blur-lg rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('helloSinger')}</h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">{t('letsPractice')}</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setActiveView('routines')}
                            className="btn-interactive flex-1 px-4 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40"
                        >
                            {t('routines')}
                        </button>
                        <button
                            onClick={() => setActiveView('exercises')}
                            className="btn-interactive flex-1 px-4 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40"
                        >
                            {t('exercises')}
                        </button>
                        <button
                            onClick={() => setActiveView('voxlabai')}
                            className="btn-interactive flex-1 px-4 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40"
                        >
                            {t('voxlabai')}
                        </button>
                    </div>
                </div>
            )}
            
            {!practiceStarted && showStartButton && (
                <div className="animate-fade-in" style={{ animationDelay: '0.8s' }}>
                    <button 
                        onClick={() => setPracticeStarted(true)} 
                        className={`
                            px-8 py-3 rounded-full font-medium text-base text-white
                            flex items-center justify-center gap-2
                            relative overflow-hidden group 
                            transition-all transform hover:scale-105 active:scale-95
                            bg-gradient-to-br ${currentTheme.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-').replace(/\/10/g, '')}
                            shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
                            backdrop-blur-sm
                        `}
                        style={{
                            '--shadow-rgb': currentTheme.shadowRgb 
                        } as React.CSSProperties}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative z-10 flex items-center gap-2">
                            <PlayIcon />
                            <span>{t('startPractice')}</span>
                        </span>
                    </button>
                </div>
            )}

            {/* Exit Fullscreen Button */}
            {isFullscreen && (
                <button
                    onClick={() => document.exitFullscreen()}
                    className="btn-interactive absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/60 dark:bg-black/20 text-slate-700 dark:text-slate-200 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40 text-sm font-semibold"
                >
                    {t('exitFullscreen')}
                </button>
            )}
        </section>
    );

    const mainViewContent = () => {
        switch (activeView) {
            case 'home':
                return homeView;
            case 'range':
                return (
                    <section className="flex-grow flex flex-col justify-center items-center w-full px-4 pt-8">
                        <div className="text-center mb-6">
                            <h1 className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-2`}>
                                {t('vocalRangeTitle')}
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300">{t('vocalRangePrompt')}</p>
                        </div>
                        <div className="w-full max-w-lg mx-auto space-y-4">
                            <div className="relative p-6 bg-white/30 dark:bg-black/20 backdrop-blur-lg rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 text-center flex flex-col items-center">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">{t('findYourRange')}</h3>
                                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                                    <button
                                        onClick={() => {
                                            setIsRangeTestActive(true);
                                            setPostRangeTestAction(() => () => setActiveView('home')); // Go home after test
                                        }}
                                        className="btn-interactive flex-1 px-4 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40"
                                    >
                                        {t('startTest')}
                                    </button>
                                    <button
                                        onClick={() => setShowPianoForRangeSelection(true)}
                                        className={`
                                            px-4 py-2.5 rounded-full font-medium text-base text-white
                                            flex items-center justify-center flex-1 gap-2
                                            relative overflow-hidden group 
                                            transition-all transform hover:scale-105 active:scale-95
                                            bg-gradient-to-br ${currentTheme.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-').replace(/\/10/g, '')}
                                            shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
                                            backdrop-blur-sm
                                        `}
                                        style={{'--shadow-rgb': currentTheme.shadowRgb} as React.CSSProperties}
                                    >
                                        <span>{t('iKnowMyRange')}</span>
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveView('rangedetector2')}
                                className="btn-interactive w-full text-center py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40"
                            >
                                {t('rangeDetector2')}
                            </button>
                        </div>
                    </section>
                );
            case 'routines':
                return <RoutineView onStartRoutine={handleStartRoutine} currentTheme={currentTheme} favoriteRoutineIds={favoriteRoutineIds} onToggleFavorite={toggleFavoriteRoutine} />;
            case 'exercises':
                return <ExerciseView onSelectExercise={selectExercise} currentTheme={currentTheme} savedAIExercises={savedAIExercises} favoriteExerciseIds={favoriteExerciseIds} onToggleFavorite={toggleFavoriteExercise} />;
            case 'pitch':
                return (
                    <section className="flex-grow flex flex-col items-center w-full px-4 pt-8">
                        <h1 className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-6`}>
                            {t('livePitchDetector')}
                        </h1>
                        <PitchVisualizer micActive={micActive} micGain={micGain} smoothedSemitone={smoothedSemitone} centerSemitone={centerSemitone} visibleOctaves={visibleOctaves} primaryColor={currentTheme.primary} />
                        <PitchViewControls 
                            centerSemitone={centerSemitone} setCenterSemitone={setCenterSemitone}
                            visibleOctaves={visibleOctaves} setVisibleOctaves={setVisibleOctaves}
                            autoFitEnabled={autoFitEnabled} setAutoFitEnabled={setAutoFitEnabled}
                            gainValue={gainValue} setGainValue={setGainValue}
                            noiseGateThreshold={noiseGateThreshold} setNoiseGateThreshold={setNoiseGateThreshold}
                            compressorThreshold={compressorThreshold} setCompressorThreshold={setCompressorThreshold}
                            compressorRatio={compressorRatio} setCompressorRatio={setCompressorRatio}
                            compressorRelease={compressorRelease} setCompressorRelease={setCompressorRelease}
                            autoGainEnabled={autoGainEnabled} setAutoGainEnabled={setAutoGainEnabled}
                            eqLowGain={eqLowGain} setEqLowGain={setEqLowGain}
                            eqMidGain={eqMidGain} setEqMidGain={setEqMidGain}
                            eqHighGain={eqHighGain} setEqHighGain={setEqHighGain}
                        />
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 px-4 text-center">{t('pitchFooter')}</p>
                    </section>
                );
            case 'studies':
                return <ComingSoonView title={t('studiesTitle')} description={t('studiesDesc')} currentTheme={currentTheme} isStudies={true} />;
            case 'tokens':
                return <ComingSoonView title={t('tokensTitle')} description={t('tokensDesc')} currentTheme={currentTheme} />;
            case 'voxlabai':
                return <VoxLabAIView currentTheme={currentTheme} onStartExercise={selectExercise} onSave={(ex) => setSavedAIExercises(prev => [...prev, ex])} onToggleFavorite={toggleFavoriteExercise} savedAIExercises={savedAIExercises} favoriteExerciseIds={favoriteExerciseIds} />;
            case 'favorites':
                return <FavoritesView currentTheme={currentTheme} favoriteRoutineIds={favoriteRoutineIds} favoriteExerciseIds={favoriteExerciseIds} savedAIExercises={savedAIExercises} onStartRoutine={handleStartRoutine} onSelectExercise={selectExercise} onToggleFavoriteRoutine={toggleFavoriteRoutine} onToggleFavoriteExercise={toggleFavoriteExercise} />;
            case 'instrumentTuner':
                 return <InstrumentTuner userPitch={userPitch} micActive={micActive} micGain={micGain} onBack={() => setActiveView('home')} currentTheme={currentTheme} />;
            case 'rangedetector2':
                return <RangeDetectorV2View currentTheme={currentTheme} onBack={() => setActiveView('range')} stopVoxLabMic={stopPitchDetection} startVoxLabMic={startPitchDetection} />;
            default:
                return homeView;
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
            <header className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                {activeView !== 'home' && !isRangeTestActive && uiView !== 'exercise' && (
                    <button 
                        onClick={() => {
                            if (activeView === 'rangedetector2') {
                                // If coming from RangeDetectorV2, go back to 'range' view specifically
                                setActiveView('range');
                            } else {
                                setActiveView('home');
                            }
                        }}
                        className="btn-interactive p-2 rounded-full text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-200/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40"
                        aria-label={t('goBack')}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}
                {activeView !== 'range' && <VocalRangeDisplay range={vocalRange} theme={currentTheme} onClick={() => setActiveView('range')} />}
            </header>

            <main className="flex-grow flex flex-col items-center pt-20 pb-28 max-w-4xl mx-auto w-full">
                {uiView === 'main' && mainViewContent()}
                {uiView === 'exercise' && selectedExercise && (
                    <ExerciseGameView
                        key={exerciseKey}
                        exercise={selectedExercise}
                        vocalRange={exerciseRange}
                        userPitch={userPitch}
                        micGain={micGain}
                        isPlaying={isPlaying}
                        onStop={handleExerciseStop}
                        onPreview={handleExercisePreview}
                        onComplete={handleExerciseComplete}
                        centerSemitone={centerSemitone}
                        visibleOctaves={visibleOctaves}
                        onNotePositionUpdate={setExerciseNoteCenter}
                        currentTheme={currentTheme}
                        currentRoutine={currentRoutine}
                        onToggleFavoriteExercise={toggleFavoriteExercise}
                        isExerciseFavorite={favoriteExerciseIds.includes(selectedExercise.id)}
                        onToggleFavoriteRoutine={toggleFavoriteRoutine}
                        isRoutineFavorite={currentRoutine ? favoriteRoutineIds.includes(currentRoutine.routine.id) : false}
                        onPlayPause={handlePlayPause}
                        isExerciseComplete={isExerciseComplete}
                        onPlayExerciseNote={playNote}
                        playbackState={playbackState}
                        setPlaybackState={setPlaybackState}
                        setElapsedTime={setElapsedTime}
                        elapsedTime={elapsedTime}
                        onMetronomeTick={handleMetronomeTick}
                        t={t}
                    />
                )}
            </main>

            {/* Piano for Range Selection */}
            {showPianoForRangeSelection && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[50] flex flex-col items-center justify-center p-4">
                    <div className="relative bg-white/30 dark:bg-black/20 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 max-w-4xl w-full">
                        <h2 className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-4`}>
                            {t('selectRangeOnPiano')}
                        </h2>
                        <Piano notes={pianoNotes} onKeyClick={handlePianoKeyClick} vocalRange={vocalRange} currentTheme={currentTheme} />
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setShowPianoForRangeSelection(false);
                                    setVocalRange({ start: null, end: null }); // Clear selection on cancel
                                }}
                                className="btn-interactive px-6 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => setShowPianoForRangeSelection(false)}
                                disabled={!vocalRange.start || !vocalRange.end}
                                className={`
                                    px-6 py-2.5 rounded-full font-medium text-base text-white
                                    flex items-center justify-center gap-2
                                    relative overflow-hidden group 
                                    transition-all transform hover:scale-105 active:scale-95
                                    bg-gradient-to-br ${currentTheme.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-').replace(/\/10/g, '')}
                                    shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
                                    backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                                style={{'--shadow-rgb': currentTheme.shadowRgb} as React.CSSProperties}
                            >
                                <span>{t('save')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isRangeTestActive && (
                <VocalRangeTestScreen
                    micActive={micActive}
                    userPitch={userPitch}
                    micGain={micGain}
                    startMic={startPitchDetection}
                    onCompleteRangeDetection={(start, end) => {
                        setVocalRange({ start, end });
                        setVocalRangeHistory(prev => [...prev, { start, end, timestamp: Date.now() }]);
                        setIsRangeTestActive(false);
                        if (postRangeTestAction) {
                            postRangeTestAction();
                            setPostRangeTestAction(null);
                        }
                    }}
                    onCancel={() => setIsRangeTestActive(false)}
                    currentTheme={currentTheme}
                />
            )}

            {isRangeCheckModalOpen && (
                <RangeCheckModal
                    onDefine={() => {
                        setIsRangeCheckModalOpen(false);
                        setIsRangeTestActive(true);
                    }}
                    onContinue={() => setIsRangeCheckModalOpen(false)}
                    theme={currentTheme}
                />
            )}
            
            {/* Routine/Exercise Complete Modal */}
            {(isExerciseComplete || isRoutineComplete) && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[500] flex items-center justify-center p-4">
                    <div className="bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
                        <h3 className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-2`}>
                            {isRoutineComplete ? t('routineComplete') : t('exerciseComplete')}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">{t('drinkWaterSuggestion')}</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={handleExerciseStop} 
                                className="btn-interactive flex-1 px-4 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40"
                            >
                                {t('finish')}
                            </button>
                            {isExerciseComplete && !isRoutineComplete && currentRoutine && (
                                <button
                                    onClick={handleNextExercise}
                                    className={`
                                        px-4 py-2.5 rounded-full font-medium text-base text-white
                                        flex items-center justify-center flex-1 gap-2
                                        relative overflow-hidden group 
                                        transition-all transform hover:scale-105 active:scale-95
                                        bg-gradient-to-br ${currentTheme.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-').replace(/\/10/g, '')}
                                        shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
                                        backdrop-blur-sm
                                    `}
                                    style={{'--shadow-rgb': currentTheme.shadowRgb} as React.CSSProperties}
                                >
                                    <span>{t('nextExercise')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <FloatingMenu 
                activeView={activeView} 
                setActiveView={setActiveView} 
                setIsSettingsOpen={setIsSettingsOpen} 
                currentTheme={currentTheme} 
            />
            {isSettingsOpen && (
                <SettingsOverlay 
                    setIsSettingsOpen={setIsSettingsOpen} 
                    setActiveView={setActiveView} 
                    language={language}
                    setLanguage={setLanguage}
                    colorPalette={colorPalette}
                    setColorPalette={setColorPalette}
                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                />
            )}
        </div>
    );
}
