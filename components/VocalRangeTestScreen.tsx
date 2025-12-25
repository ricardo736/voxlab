import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { Note } from "../types";
import { detectPitchPYIN, resetPYINHistory } from '../utils/pitchDetection';

// --- START OF TYPES ---
interface Theme {
  name: string;
  visualizer: { name: string; gradient: string }[];
  button: {
    from: string;
    via: string;
    to: string;
    shadow: string;
    shadowRgb: string;
  };
  gradientText: {
    from: string;
    to: string;
    darkFrom: string;
    darkTo: string;
  };
  resultsRange: {
    from: string;
    to: string;
  };
  progress: {
    from: string;
    to: string;
  };
}

interface AdvancedVocalRangeResult {
  lowestNoteHz: number | null;
  speakingHz: number | null;
  overallMinHz: number | null;
  overallMaxHz: number | null;
  lowestNoteNote?: string | null;
  speakingNote?: string | null;
  overallMinNote?: string | null;
  overallMaxNote?: string | null;
}

interface SimpleVocalRangeResult {
  lowestNoteHz: number | null;
  highestNoteHz: number | null;
  lowestNoteNote: string | null;
  highestNoteNote: string | null;
}

interface VocalFeedback {
  analysis: string;
  singers: string[];
  tip: string;
  disclaimer: string;
}

type AppStatus = "modeSelection" | "instructions" | "countdown" | "recording" | "results" | "waitingForInputRetry";
type AdvancedStep = 0 | 1 | 2 | 3; // 0: initial/idle, 1: lowest note, 2: speaking, 3: siren
type SimpleStep = 0 | 1; // 0: idle, 1: siren
type Step = AdvancedStep | SimpleStep;
type Mode = "simple" | "advanced";

interface VocalRangeTestScreenProps {
  onCancel: () => void;
  onComplete: (start: Note, end: Note) => void;
  currentTheme: Theme;
  pyinBias?: number;
  pyinTolerance?: number;
  pyinGateMode?: 'smooth' | 'instant';
  noiseGateThreshold?: number;
}



declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
// --- END OF TYPES ---

// --- START OF APP LOGIC ---
function average(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function min(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a, b) => (a < b ? a : b));
}

function max(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a, b) => (a > b ? a : b));
}

function calculateRMS(arr: Float32Array): number {
  if (!arr || arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i] * arr[i];
  }
  return Math.sqrt(sum / arr.length);
}

function midiToNoteName(m: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(m / 12) - 1;
  const name = names[((m % 12) + 12) % 12];
  return `${name}${octave}`;
}

function freqToNote(freq: number | null): string | null {
  if (!freq) return null;
  const midi = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  return midiToNoteName(rounded);
}

const YIN_THRESHOLD = 0.12;
const YIN_MIN_FREQ = 50;
const YIN_MAX_FREQ = 2000;
const LOW_VOLUME_RMS_THRESHOLD = 0.002;
const LOW_VOLUME_FRAME_COUNT_THRESHOLD = 120;

function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const bufferSize = buffer.length;
  const halfBufferSize = Math.floor(bufferSize / 2);
  let rms = 0;
  for (let i = 0; i < bufferSize; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / bufferSize);
  if (rms < LOW_VOLUME_RMS_THRESHOLD) {
    return null;
  }

  const maxPeriod = Math.round(sampleRate / YIN_MIN_FREQ);
  const minPeriod = Math.round(sampleRate / YIN_MAX_FREQ);
  const actualMaxPeriod = Math.min(maxPeriod, halfBufferSize - 1);
  const yinBuffer = new Float32Array(actualMaxPeriod);

  for (let tau = 1; tau < actualMaxPeriod; tau++) {
    for (let j = 0; j < bufferSize - tau; j++) {
      const delta = buffer[j] - buffer[j + tau];
      yinBuffer[tau] += delta * delta;
    }
  }

  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < actualMaxPeriod; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum === 0 ? 1 : yinBuffer[tau] * tau / runningSum;
  }

  let tau = 0;
  for (tau = minPeriod; tau < actualMaxPeriod; tau++) {
    if (yinBuffer[tau] < YIN_THRESHOLD) {
      while (tau + 1 < actualMaxPeriod && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      break;
    }
  }

  if (tau === actualMaxPeriod || yinBuffer[tau] >= YIN_THRESHOLD || tau < minPeriod) {
    return null;
  }

  let interpolatedTau = tau;
  if (tau > 0 && tau < actualMaxPeriod - 1) {
    const x1 = yinBuffer[tau - 1];
    const x2 = yinBuffer[tau];
    const x3 = yinBuffer[tau + 1];
    if ((x1 - 2 * x2 + x3) !== 0) {
      interpolatedTau = tau + (x1 - x3) / (2 * (x1 - 2 * x2 + x3));
    }
  }

  const freq = sampleRate / interpolatedTau;
  if (freq < YIN_MIN_FREQ || freq > YIN_MAX_FREQ) {
    return null;
  }
  return freq;
}

const translations = {
  en: {
    title1: "Vocal Range",
    selectMode: "Select an analysis mode",
    simpleMode: "Simple Mode",
    advancedMode: "Advanced Mode",
    simpleModeDesc: "A quick 1-step test using a vocal siren.",
    advancedModeDesc: "A detailed 3-step analysis of your voice.",
    startDetection: "Start Analysis",
    micDenied: "Microphone access denied. Please allow microphone access in your browser settings.",
    advancedStepHeader: "STEP {step} OF 3",
    simpleStepHeader: "STEP 1 OF 1",
    step1Title: "Lowest Note",
    step2Title: "Speaking Voice",
    step3Title: "Siren",
    simpleStep1Title: "Vocal Siren",
    step1Instruction: "Sing your LOWEST note.\nHold it steady.",
    step2Instruction: "Speak NATURALLY.\nTalk or read aloud.",
    step3Instruction: "Perform a SIREN.\nLow to high, then back down.",
    simpleStep1Instruction: "Sing a smooth siren from low to high in one breath.",
    countdownGo: "GO!",
    notHearingYou: "I'm not hearing you...",
    noInputTitle: "No Input Heard",
    noInputDescription: "Couldn't hear you. Try again?",
    tryAgain: "Try Again",
    continueAnyway: "Continue Anyway",
    resultsTitle: "Your Vocal Analysis",
    simpleResultsTitle: "Your Vocal Range",
    resultsRange: "Analysis Complete",
    resultsLowestSung: "Lowest Sung Note",
    resultsHighestSung: "Highest Sung Note",
    resultsAvgSpeaking: "Avg. Speaking Voice",
    startNew: "Start New Analysis",
    switchToLight: "Switch to light mode",
    switchToDark: "Switch to dark mode",
    feedbackTitle: "Your Vocal Analysis",
    generatingFeedback: "Generating feedback...",
    goBack: 'Go Back',
    saveAndContinue: 'Save & Continue',
    voiceClassification: "Suggested Classification:",
    classificationDisclaimer: "Voice classifications are traditional references. Modern vocal science recognizes that range is flexible and can be developed over time with proper training. These categories are guides, not limitations.",
    bass: "Bass",
    baritone: "Baritone",
    tenor: "Tenor",
    alto: "Alto / Contralto",
    mezzo: "Mezzo-Soprano",
    soprano: "Soprano"
  },
  'pt-BR': {
    title1: "Extensão Vocal",
    selectMode: "Selecione um modo de análise",
    simpleMode: "Modo Simples",
    advancedMode: "Modo Avançado",
    simpleModeDesc: "Um teste rápido de 1 etapa usando uma sirene vocal.",
    advancedModeDesc: "Uma análise detalhada de 3 etapas da sua voz.",
    startDetection: "Iniciar Análise",
    micDenied: "Acesso ao microfone negado. Por favor, permita o acesso ao microfone nas configurações do seu navegador.",
    advancedStepHeader: "ETAPA {step} DE 3",
    simpleStepHeader: "ETAPA 1 DE 1",
    step1Title: "Nota Mais Grave",
    step2Title: "Voz Falada",
    step3Title: "Sirene",
    simpleStep1Title: "Sirene Vocal",
    step1Instruction: "Cante sua nota mais GRAVE.\nMantenha-a estável.",
    step2Instruction: "Fale NATURALMENTE.\nConverse ou leia em voz alta.",
    step3Instruction: "Faça uma SIRENE.\nDo grave ao agudo, e de volta.",
    simpleStep1Instruction: "Cante uma sirene suave, do grave ao agudo, em um só fôlego.",
    countdownGo: "VAI!",
    notHearingYou: "Não estou te ouvindo...",
    noInputTitle: "Nenhum Som Captado",
    noInputDescription: "Não consegui te ouvir. Tentar novamente?",
    tryAgain: "Tentar Novamente",
    continueAnyway: "Continuar Mesmo Assim",
    resultsTitle: "Sua Análise Vocal",
    simpleResultsTitle: "Sua Extensão Vocal",
    resultsRange: "Análise Concluída",
    resultsLowestSung: "Nota Mais Grave Cantada",
    resultsHighestSung: "Nota Mais Aguda Cantada",
    resultsAvgSpeaking: "Voz Falada Média",
    startNew: "Iniciar Nova Análise",
    switchToLight: "Mudar para o modo claro",
    switchToDark: "Mudar para o modo escuro",
    feedbackTitle: "Sua Análise Vocal",
    generatingFeedback: "Gerando feedback...",
    goBack: 'Voltar',
    saveAndContinue: 'Salvar e Continuar',
    voiceClassification: "Classificação Sugerida:",
    classificationDisclaimer: "Classificações vocais são referências tradicionais. A ciência vocal moderna reconhece que a extensão é flexível e pode ser desenvolvida ao longo do tempo com treinamento adequado. Estas categorias são guias, não limitações.",
    bass: "Baixo",
    baritone: "Barítono",
    tenor: "Tenor",
    alto: "Contralto",
    mezzo: "Meio-Soprano",
    soprano: "Soprano"
  }
};

// Voice Classification Constants
const VOICE_CLASSIFICATIONS = {
  bass: {
    typical: { min: 40, max: 64 },  // E2 - E4
    color: '#1e3a8a'
  },
  baritone: {
    typical: { min: 45, max: 69 },  // A2 - A4
    color: '#1e40af'
  },
  tenor: {
    typical: { min: 48, max: 72 },  // C3 - C5
    color: '#2563eb'
  },
  alto: {
    typical: { min: 53, max: 77 },  // F3 - F5
    color: '#7c3aed'
  },
  mezzo: {
    typical: { min: 57, max: 81 },  // A3 - A5
    color: '#a855f7'
  },
  soprano: {
    typical: { min: 60, max: 84 },  // C4 - C6
    color: '#c084fc'
  }
};

function getVoiceClassification(minHz: number | null, maxHz: number | null): keyof typeof VOICE_CLASSIFICATIONS | null {
  if (!minHz || !maxHz) return null;

  const minMidi = Math.round(12 * Math.log2(minHz / 440) + 69);
  const maxMidi = Math.round(12 * Math.log2(maxHz / 440) + 69);
  const midpoint = (minMidi + maxMidi) / 2;

  let bestMatch: keyof typeof VOICE_CLASSIFICATIONS | null = null;
  let smallestDiff = Infinity;

  Object.entries(VOICE_CLASSIFICATIONS).forEach(([key, voice]) => {
    const voiceMid = (voice.typical.min + voice.typical.max) / 2;
    const diff = Math.abs(midpoint - voiceMid);

    if (diff < smallestDiff) {
      smallestDiff = diff;
      bestMatch = key as keyof typeof VOICE_CLASSIFICATIONS;
    }
  });

  return bestMatch;
}

const ThemeToggle: React.FC<{ theme: 'light' | 'dark'; toggleTheme: () => void; 'aria-label': string; }> = ({ theme, toggleTheme, 'aria-label': ariaLabel }) => (
  <button
    onClick={toggleTheme}
    className="p-2 rounded-full bg-black/5 dark:bg-black/20 backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-all duration-200 ease-in-out transform origin-center hover:scale-110 active:scale-90 active:translate-y-px hover:brightness-95 dark:hover:brightness-125 active:brightness-110"
    aria-label={ariaLabel}
  >
    {theme === 'dark' ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    )}
  </button>
);

const LanguageToggle: React.FC<{ language: 'en' | 'pt-BR'; toggleLanguage: () => void; }> = ({ language, toggleLanguage }) => (
  <button
    onClick={toggleLanguage}
    className="p-2 rounded-full bg-black/5 dark:bg-black/20 backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-all duration-200 ease-in-out font-normal text-sm w-10 h-10 flex items-center justify-center transform origin-center hover:scale-110 active:scale-90 active:translate-y-px hover:brightness-95 dark:hover:brightness-125 active:brightness-110"
    aria-label={`Switch language to ${language === 'en' ? 'Portuguese' : 'English'}`}
  >
    {language === 'en' ? 'PT' : 'EN'}
  </button>
);

const VocalRangeTestScreen: React.FC<VocalRangeTestScreenProps> = memo(({ onCancel, onComplete, currentTheme, pyinBias, pyinTolerance, pyinGateMode, noiseGateThreshold }) => {
  console.log("VocalRangeTestScreen Props:", { onCancel: !!onCancel, onComplete: !!onComplete, currentTheme: !!currentTheme });
  const [permission, setPermission] = useState<boolean | null>(null);
  const [status, setStatus] = useState<AppStatus>("modeSelection");
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [instructionMessage, setInstructionMessage] = useState("");
  const [instructionOpacityClass, setInstructionOpacityClass] = useState("opacity-100");
  const [countdownDisplay, setCountdownDisplay] = useState<string | null>(null);
  const [countdownOpacity, setCountdownOpacity] = useState(0);
  const [rmsVolume, setRmsVolume] = useState(0);
  const [isNotHearingYou, setIsNotHearingYou] = useState(false);
  const [showNotHearingYouMessage, setShowNotHearingYou] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  // Sync with app's dark mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  const [language, setLanguage] = useState<'en' | 'pt-BR'>('pt-BR');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [generatedFeedback, setGeneratedFeedback] = useState<VocalFeedback | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);
  const bufferLengthRef = useRef(0);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const metronomeAudioCtxRef = useRef<AudioContext | null>(null);
  const lowVolumeFrameCountRef = useRef(0);
  const currentStepRecordedPitchesRef = useRef<number[]>([]);
  const lastAttemptedStepRef = useRef<Step | null>(null);
  const lastAttemptedDurationRef = useRef<number | null>(null);

  const notHearingYouFadeOutTimerRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);

  // Advanced Mode State
  const [lowNotePitches, setLowNotePitches] = useState<number[]>([]);
  const [speakingPitches, setSpeakingPitches] = useState<number[]>([]);
  const [sirenPitches, setSirenPitches] = useState<number[]>([]);
  const [advancedResult, setAdvancedResult] = useState<AdvancedVocalRangeResult | null>(null);

  // Simple Mode State
  const [simpleSirenPitches, setSimpleSirenPitches] = useState<number[]>([]);
  const [simpleResult, setSimpleResult] = useState<SimpleVocalRangeResult | null>(null);

  const activeTheme = currentTheme;

  const changeStatus = useCallback((newStatus: AppStatus, stateUpdateFn?: () => void) => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      if (stateUpdateFn) stateUpdateFn();
      setStatus(newStatus);
      setIsAnimatingOut(false);
    }, 300);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === 'en' ? 'pt-BR' : 'en'));
  }, []);

  const t = useCallback((key: keyof typeof translations['en'], replacements?: Record<string, string | number>) => {
    let text = translations[language][key] || translations.en[key]; // Fallback to English
    if (replacements) {
      Object.keys(replacements).forEach(rKey => {
        text = text.replace(`{${rKey}}`, String(replacements[rKey]));
      });
    }
    return text;
  }, [language]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const playMetronomeSound = useCallback(() => {
    if (!metronomeAudioCtxRef.current) {
      metronomeAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = metronomeAudioCtxRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(220, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.stop(ctx.currentTime + 0.3);
  }, []);

  const stopAll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(e => console.error("Error closing audio context:", e));
    }
    audioCtxRef.current = null;
    if (notHearingYouFadeOutTimerRef.current) clearTimeout(notHearingYouFadeOutTimerRef.current);

    // Call the onCancel prop if it's the start new analysis button
    onCancel();

    changeStatus("modeSelection", () => {
      setMode(null);
      setStep(0);
      setInstructionMessage("");
      setRmsVolume(0);
      setProgressPercentage(0);
      setLowNotePitches([]);
      setSpeakingPitches([]);
      setSirenPitches([]);
      setSimpleSirenPitches([]);
      setAdvancedResult(null);
      setSimpleResult(null);
      setGeneratedFeedback(null);
      setIsGeneratingFeedback(false);
    });
  }, [changeStatus, onCancel]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(e => console.error("Error closing audio context on unmount:", e));
      }
    }
  }, []);

  const initAudio = useCallback(async () => {
    try {
      // Close existing context if any to prevent resource leaks
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        await audioCtxRef.current.close();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      sourceNodeRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      gainNodeRef.current = audioCtxRef.current.createGain();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      sourceNodeRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);
      gainNodeRef.current.gain.setValueAtTime(5, audioCtxRef.current.currentTime);
      analyserRef.current.fftSize = 2048;
      bufferLengthRef.current = analyserRef.current.fftSize;
      dataArrayRef.current = new Float32Array(bufferLengthRef.current);
      setPermission(true);
      return true;
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setPermission(false);
      changeStatus("modeSelection", () => {
        setInstructionMessage(t('micDenied'));
      });
      return false;
    }
  }, [changeStatus, t]);

  const getInstructionForStep = useCallback((currentMode: Mode, stepNumber: Step) => {
    if (currentMode === 'advanced') {
      if (stepNumber === 1) return t('step1Instruction');
      if (stepNumber === 2) return t('step2Instruction');
      if (stepNumber === 3) return t('step3Instruction');
    } else if (currentMode === 'simple') {
      if (stepNumber === 1) return t('simpleStep1Instruction');
    }
    return "";
  }, [t]);

  const computeAdvancedResults = useCallback((finalSirenPitches: number[]) => {
    const filteredLow = lowNotePitches.filter(f => f >= YIN_MIN_FREQ && f <= YIN_MAX_FREQ);
    const filteredSpeaking = speakingPitches.filter(f => f >= YIN_MIN_FREQ && f <= YIN_MAX_FREQ);
    const filteredSiren = finalSirenPitches.filter(f => f >= YIN_MIN_FREQ && f <= YIN_MAX_FREQ);

    const avgLowest = min(filteredLow);
    const avgSpeaking = average(filteredSpeaking);
    const minSiren = min(filteredSiren);
    const maxSiren = max(filteredSiren);

    const allMin = [
      ...(avgLowest !== null ? [avgLowest] : []),
      ...(minSiren !== null ? [minSiren] : [])
    ].filter(f => f > 0);
    const overallMin = min(allMin);

    const allMax = [
      ...(avgSpeaking !== null ? [avgSpeaking] : []),
      ...(maxSiren !== null ? [maxSiren] : [])
    ].filter(f => f > 0);
    const overallMax = max(allMax);

    changeStatus("results", () => {
      setAdvancedResult({
        lowestNoteHz: avgLowest, speakingHz: avgSpeaking,
        overallMinHz: overallMin, overallMaxHz: overallMax,
        lowestNoteNote: freqToNote(avgLowest),
        speakingNote: freqToNote(avgSpeaking),
        overallMinNote: freqToNote(overallMin),
        overallMaxNote: freqToNote(overallMax),
      });
    });
  }, [lowNotePitches, speakingPitches, changeStatus]);

  const computeSimpleResults = useCallback((pitches: number[]) => {
    const filteredPitches = pitches.filter(f => f >= YIN_MIN_FREQ && f <= YIN_MAX_FREQ)
    const lowHz = min(filteredPitches);
    const highHz = max(filteredPitches);

    changeStatus("results", () => {
      setSimpleResult({
        lowestNoteHz: lowHz,
        highestNoteHz: highHz,
        lowestNoteNote: freqToNote(lowHz),
        highestNoteNote: freqToNote(highHz),
      });
    });
  }, [changeStatus]);


  const showInstructionsWithFadeRef = useRef<((currentMode: Mode, targetStep: Step, durationMs: number) => Promise<void>) | null>(null);

  const startProcessStep = useCallback(async (currentMode: Mode, targetStep: Step, durationMs: number) => {
    setStatus("recording");
    setCountdownDisplay(null);
    setInstructionOpacityClass("opacity-100 text-black dark:text-white");
    if (notHearingYouFadeOutTimerRef.current) clearTimeout(notHearingYouFadeOutTimerRef.current);

    setIsNotHearingYou(false);
    setShowNotHearingYou(false);
    lowVolumeFrameCountRef.current = 0;
    currentStepRecordedPitchesRef.current = [];
    setProgressPercentage(0);

    lastAttemptedStepRef.current = targetStep;

    // Validate duration
    const validDuration = (!durationMs || durationMs <= 0) ? 10000 : durationMs;
    lastAttemptedDurationRef.current = validDuration;

    const startTime = performance.now();
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const audioCtx = audioCtxRef.current;

    const recentPitches: number[] = [];
    const PITCH_BUFFER_SIZE = 3;
    const PITCH_FILTER_RATIO = 2.5;

    const tick = async () => {
      if (!analyser || !dataArray || !audioCtx) {
        console.warn("Tick skipped: missing audio context or analyser", { analyser: !!analyser, dataArray: !!dataArray, audioCtx: !!audioCtx });
        return;
      }

      const elapsedTime = performance.now() - startTime;
      const newProgress = Math.min(100, (elapsedTime / validDuration) * 100);

      // Throttle progress updates to avoid excessive re-renders (update every 1% or so)
      if (Math.abs(newProgress - lastProgressRef.current) > 0.5 || newProgress >= 100 || newProgress === 0) {
        setProgressPercentage(newProgress);
        lastProgressRef.current = newProgress;
      }
      // console.log("Progress:", newProgress, "Elapsed:", elapsedTime, "Duration:", durationMs);

      analyser.getFloatTimeDomainData(dataArray);
      const freq = detectPitchPYIN(dataArray, audioCtx.sampleRate, {
        bias: pyinBias ?? 0.1,
        tolerance: pyinTolerance ?? 0.3,
        gateThreshold: noiseGateThreshold ?? 0.008,
        gateMode: pyinGateMode ?? 'smooth'
      });
      // Filter out unrealistic frequencies (below 70Hz is likely noise/artifacts)
      // Most male voices are 85-180Hz, female 165-255Hz
      const validFreq = (freq > 70 && freq < 2000) ? freq : null;
      const rms = calculateRMS(dataArray);
      setRmsVolume(prev => prev * 0.95 + rms * 0.05);

      if (rms < LOW_VOLUME_RMS_THRESHOLD) {
        lowVolumeFrameCountRef.current++;
        if (lowVolumeFrameCountRef.current >= LOW_VOLUME_FRAME_COUNT_THRESHOLD && !isNotHearingYou) {
          setIsNotHearingYou(true);
          setShowNotHearingYou(true);
          if (notHearingYouFadeOutTimerRef.current) clearTimeout(notHearingYouFadeOutTimerRef.current);
        }
      } else {
        lowVolumeFrameCountRef.current = 0;
        if (isNotHearingYou) {
          setIsNotHearingYou(false);
          if (notHearingYouFadeOutTimerRef.current) clearTimeout(notHearingYouFadeOutTimerRef.current);
          notHearingYouFadeOutTimerRef.current = window.setTimeout(() => setShowNotHearingYou(false), 300);
        }
      }

      if (validFreq !== null && validFreq > 0) {
        let acceptPitch = true;
        if (recentPitches.length >= PITCH_BUFFER_SIZE) {
          const sortedRecent = [...recentPitches].sort((a, b) => a - b);
          const median = sortedRecent[Math.floor(PITCH_BUFFER_SIZE / 2)];
          const ratio = freq / median;
          if (ratio > PITCH_FILTER_RATIO || ratio < (1 / PITCH_FILTER_RATIO)) {
            acceptPitch = false;
          }
        }

        if (acceptPitch) {
          currentStepRecordedPitchesRef.current.push(validFreq);
          recentPitches.push(validFreq);
          if (recentPitches.length > PITCH_BUFFER_SIZE) {
            recentPitches.shift();
          }
        }
      }

      if (elapsedTime < validDuration) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        setRmsVolume(0);

        const recordedPitches = currentStepRecordedPitchesRef.current;

        if (currentMode === 'advanced') {
          if (targetStep === 1) setLowNotePitches(recordedPitches);
          else if (targetStep === 2) setSpeakingPitches(recordedPitches);
          else if (targetStep === 3) setSirenPitches(recordedPitches);
        } else if (currentMode === 'simple') {
          if (targetStep === 1) setSimpleSirenPitches(recordedPitches);
        }

        await new Promise(resolve => setTimeout(resolve, 700));

        if (recordedPitches.length === 0) {
          changeStatus("waitingForInputRetry", () => {
            setInstructionMessage(t('noInputDescription'));
          });
          return;
        }

        if (currentMode === 'advanced') {
          if (targetStep === 1) await showInstructionsWithFadeRef.current?.(currentMode, 2, 12000);
          else if (targetStep === 2) await showInstructionsWithFadeRef.current?.(currentMode, 3, 15000);
          else if (targetStep === 3) computeAdvancedResults(recordedPitches);
        } else if (currentMode === 'simple') {
          if (targetStep === 1) computeSimpleResults(recordedPitches);
        }
      }
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [isNotHearingYou, t, computeAdvancedResults, computeSimpleResults, changeStatus]);

  const startRecordingCountdown = useCallback(async (currentMode: Mode, targetStep: Step, durationMs: number, instruction: string) => {
    setInstructionMessage(instruction);
    setInstructionOpacityClass("opacity-100");
    setStatus("countdown");
    setRmsVolume(0);

    for (let i = 3; i > 0; i--) {
      setCountdownDisplay(String(i));
      setCountdownOpacity(1);
      playMetronomeSound();
      await new Promise(resolve => setTimeout(resolve, 800));
      setCountdownOpacity(0);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    setCountdownDisplay(t('countdownGo'));
    setCountdownOpacity(1);
    playMetronomeSound();
    await new Promise(resolve => setTimeout(resolve, 500));
    setCountdownOpacity(0);
    await new Promise(resolve => setTimeout(resolve, 200));

    setCountdownDisplay(null);
    await startProcessStep(currentMode, targetStep, durationMs);
  }, [playMetronomeSound, startProcessStep, t]);

  const showInstructionsWithFade = useCallback(async (currentMode: Mode, targetStep: Step, durationMs: number) => {
    const instructionText = getInstructionForStep(currentMode, targetStep);

    changeStatus("instructions", () => {
      setInstructionMessage(instructionText);
      setStep(targetStep);
    });

    // Wait for fade-in animation to complete before starting countdown
    await new Promise(resolve => setTimeout(resolve, 400));
    await startRecordingCountdown(currentMode, targetStep, durationMs, instructionText);
  }, [getInstructionForStep, startRecordingCountdown, changeStatus]);

  useEffect(() => {
    showInstructionsWithFadeRef.current = showInstructionsWithFade;
  }, [showInstructionsWithFade]);

  const startDetection = useCallback(async (selectedMode: Mode) => {
    if (isInitializing) return;
    setIsInitializing(true);
    setMode(selectedMode);

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const success = await initAudio();
      if (!success) {
        setIsInitializing(false);
        setMode(null);
        return;
      }
    }

    // Reset pitches
    setLowNotePitches([]);
    setSpeakingPitches([]);
    setSirenPitches([]);
    setSimpleSirenPitches([]);
    setAdvancedResult(null);
    setSimpleResult(null);
    setGeneratedFeedback(null);
    setIsGeneratingFeedback(false);

    const duration = selectedMode === 'advanced' ? 10000 : 9000;

    await showInstructionsWithFade(selectedMode, 1, duration);
    setTimeout(() => setIsInitializing(false), 500);

  }, [isInitializing, initAudio, showInstructionsWithFade]);


  const handleTryAgain = useCallback(async () => {
    if (mode && lastAttemptedStepRef.current !== null && lastAttemptedDurationRef.current !== null) {
      if (showInstructionsWithFadeRef.current) {
        await showInstructionsWithFadeRef.current(mode, lastAttemptedStepRef.current, lastAttemptedDurationRef.current);
      }
    }
  }, [mode]);

  const handleContinueAnyway = useCallback(async () => {
    if (mode === 'advanced' && lastAttemptedStepRef.current !== null && showInstructionsWithFadeRef.current) {
      if (lastAttemptedStepRef.current === 1) await showInstructionsWithFadeRef.current?.(mode, 2, 12000);
      else if (lastAttemptedStepRef.current === 2) await showInstructionsWithFadeRef.current?.(mode, 3, 15000);
      else if (lastAttemptedStepRef.current === 3) computeAdvancedResults([]);
    } else if (mode === 'simple' && lastAttemptedStepRef.current !== null) {
      if (lastAttemptedStepRef.current === 1) computeSimpleResults([]);
    }
  }, [mode, computeAdvancedResults, computeSimpleResults]);



  const handleSave = useCallback(() => {
    console.log("handleSave called");
    setIsSaving(true);
    let minHz: number | null = null;
    let maxHz: number | null = null;

    if (mode === 'advanced' && advancedResult) {
      minHz = advancedResult.overallMinHz;
      maxHz = advancedResult.overallMaxHz;
    } else if (mode === 'simple' && simpleResult) {
      minHz = simpleResult.lowestNoteHz;
      maxHz = simpleResult.highestNoteHz;
    }

    if (minHz && maxHz) {
      console.log("Saving results:", minHz, maxHz);
      const minMidi = Math.round(12 * Math.log2(minHz / 440) + 69);
      const maxMidi = Math.round(12 * Math.log2(maxHz / 440) + 69);
      const minSemitone = minMidi - 60; // C4 is semitone 0
      const maxSemitone = maxMidi - 60;

      if (onComplete) {
        onComplete(
          { semitone: minSemitone, name: freqToNote(minHz) || 'C3', isSharp: (freqToNote(minHz) || '').includes('#') },
          { semitone: maxSemitone, name: freqToNote(maxHz) || 'C5', isSharp: (freqToNote(maxHz) || '').includes('#') }
        );
        // Force close the screen to ensure "Save & Continue" works visually
        onCancel();
      } else {
        console.error("onComplete prop is missing!");
        alert("Error: Could not save results (missing callback).");
        setIsSaving(false);
      }
    } else {
      console.warn("No results to save, cancelling");
      setIsSaving(false);
      onCancel();
    }
  }, [mode, advancedResult, simpleResult, onComplete, onCancel]);

  const getStepTitle = useCallback(() => {
    if (mode === 'advanced') {
      if (step === 1) return t('step1Title');
      if (step === 2) return t('step2Title');
      if (step === 3) return t('step3Title');
    } else if (mode === 'simple') {
      if (step === 1) return t('simpleStep1Title');
    }
    return "";
  }, [mode, step, t]);

  const generateVocalFeedback = useCallback(async () => {
    if (!advancedResult && !simpleResult) return;

    setIsGeneratingFeedback(true);
    setGeneratedFeedback(null);

    let vocalData: object;
    if (mode === 'advanced' && advancedResult) {
      vocalData = {
        testMode: 'Advanced Analysis',
        vocalRangeDetected: `${advancedResult.overallMinNote || '?'} to ${advancedResult.overallMaxNote || '?'}`,
        lowestNote: `${advancedResult.lowestNoteNote || '?'}`,
        averageSpeakingPitch: `${advancedResult.speakingNote || '?'}`,
      };
    } else if (mode === 'simple' && simpleResult) {
      vocalData = {
        testMode: 'Simple Siren Test',
        vocalRangeDetected: `${simpleResult.lowestNoteNote || '?'} to ${simpleResult.highestNoteNote || '?'}`,
      };
    } else {
      setIsGeneratingFeedback(false);
      return; // No data
    }

    const lang = language === 'pt-BR' ? 'Brazilian Portuguese' : 'English';
    const prompt = `
        You are a vocal analysis assistant. Provide brief, synthesized feedback on a vocal range test. Your response must be in ${lang}.

        Vocal test data:
        ${JSON.stringify(vocalData, null, 2)}

        Based on the data, provide a very concise analysis (1-2 sentences). Keep the tone positive and direct.

        IMPORTANT: For the "singers" field, provide 3-4 well-known professional singers with similar vocal ranges. 
        - Include a balanced mix of genders (at least 1-2 male and 1-2 female artists)
        - Choose internationally recognized artists known for their vocal ability
        - Ensure the singers actually have similar ranges to the detected range
        - Do NOT segregate by gender in the display - mix them naturally
        - Prioritize vocal quality and range similarity over other factors

        Your response MUST be a valid JSON object with short, synthesized values.

        Example in English:
        {
          "analysis": "Your voice showed a well-defined lower range with a smooth transition. The recorded vocal extension is quite interesting.",
          "singers": ["Adele", "Sam Smith", "Christina Aguilera", "John Legend"],
          "tip": "Stay hydrated before singing exercises.",
          "disclaimer": "Vocal performance can vary naturally. This is a snapshot of your voice right now."
        }
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          singers: { type: Type.ARRAY, items: { type: Type.STRING } },
          tip: { type: Type.STRING },
          disclaimer: { type: Type.STRING },
        },
        required: ['analysis', 'singers', 'tip', 'disclaimer']
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const feedbackObject = JSON.parse(response.text);
      setGeneratedFeedback(feedbackObject);
    } catch (error) {
      console.error("Error generating vocal feedback:", error);
      // You could set an error message in the state to display to the user
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [advancedResult, simpleResult, mode, language]);

  useEffect(() => {
    if (status === 'results' && (advancedResult || simpleResult) && !generatedFeedback && !isGeneratingFeedback) {
      generateVocalFeedback();
    }
  }, [status, advancedResult, simpleResult, generatedFeedback, isGeneratingFeedback, generateVocalFeedback]);

  const mainContent = () => {
    if (status === 'modeSelection') {
      return (
        <>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-400 mb-4">{t('title1')}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 max-w-md">{t('selectMode')}</p>
          {permission === false && instructionMessage && <p className="text-lg text-red-500 dark:text-red-400 mb-10 max-w-md">{instructionMessage}</p>}
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => startDetection('simple')}
                disabled={isInitializing}
                className={`
                                px-8 py-3 rounded-full font-medium text-base text-white
                                flex items-center justify-center gap-2
                                relative overflow-hidden group 
                                transition-all transform hover:scale-105 active:scale-95
                                bg-gradient-to-br ${activeTheme.button.from} ${activeTheme.button.via} ${activeTheme.button.to}
                                shadow-2xl ${activeTheme.button.shadow} 
                                backdrop-blur-sm
                            `}
                style={{
                  boxShadow: `0 8px 32px rgba(${activeTheme.button.shadowRgb}, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="relative z-10 flex items-center gap-2">
                  <span>{t('simpleMode')}</span>
                </span>
              </button>
              <p className="font-light text-sm text-gray-600 dark:text-gray-400">{t('simpleModeDesc')}</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => startDetection('advanced')}
                disabled={isInitializing}
                className={`
                                px-8 py-3 rounded-full font-medium text-base text-white
                                flex items-center justify-center gap-2
                                relative overflow-hidden group 
                                transition-all transform hover:scale-105 active:scale-95
                                bg-gradient-to-br ${activeTheme.button.from} ${activeTheme.button.via} ${activeTheme.button.to}
                                shadow-2xl ${activeTheme.button.shadow} 
                                backdrop-blur-sm
                            `}
                style={{
                  boxShadow: `0 8px 32px rgba(${activeTheme.button.shadowRgb}, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="relative z-10 flex items-center gap-2">
                  <span>{t('advancedMode')}</span>
                </span>
              </button>
              <p className="font-light text-sm text-gray-600 dark:text-gray-400">{t('advancedModeDesc')}</p>
            </div>
          </div>
        </>
      )
    }

    if (['instructions', 'countdown', 'recording'].includes(status)) {
      const gradientTextClasses = `text-transparent bg-clip-text bg-gradient-to-r ${activeTheme.gradientText.from} ${activeTheme.gradientText.to} ${activeTheme.gradientText.darkFrom} ${activeTheme.gradientText.darkTo}`;

      return (
        <div className="flex flex-col items-center justify-center transition-all duration-500 min-h-[32rem]">
          <div className={`absolute top-6 text-lg font-bold ${gradientTextClasses} tracking-widest`}>{mode === 'advanced' ? t('advancedStepHeader', { step }) : t('simpleStepHeader')}</div>
          <div className="text-3xl font-extrabold text-black dark:text-white mb-6 mt-12">{getStepTitle()}</div>
          <div className="relative w-full h-40 flex items-center justify-center mb-6">
            {status === 'countdown' && countdownDisplay ? (
              <div className="absolute text-9xl font-black text-black dark:text-white transition-opacity duration-300" style={{ opacity: countdownOpacity }}>
                {countdownDisplay}
              </div>
            ) : (
              <div className={`text-4xl font-bold text-gray-700 dark:text-gray-200 whitespace-pre-wrap transition-opacity duration-700 px-4 ${instructionOpacityClass}`}>
                {status === 'recording' && instructionMessage}
              </div>
            )}
          </div>
          {status === 'recording' && (
            <div className="w-full max-w-md flex flex-col items-center mt-4 space-y-4">
              <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${activeTheme.progress.from} ${activeTheme.progress.to} transition-all duration-100 ease-linear`} style={{ width: `${progressPercentage}%` }}></div>
              </div>
              {showNotHearingYouMessage && (
                <div className={`text-xl font-bold ${gradientTextClasses} transition-opacity duration-300 ease-in-out animate-pulse text-center w-full`}>
                  {t('notHearingYou')}
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    if (status === 'waitingForInputRetry') {
      return (
        <div className="flex flex-col items-center justify-center transition-all duration-500 min-h-[32rem]">
          <h3 className="text-3xl font-bold text-black dark:text-white mb-4">{t('noInputTitle')}</h3>
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 max-w-md">{instructionMessage}</p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleTryAgain}
              className={`
                      px-8 py-3 rounded-full font-medium text-base text-white
                      flex items-center justify-center gap-2
                      relative overflow-hidden group 
                      transition-all transform hover:scale-105 active:scale-95
                      bg-gradient-to-br ${activeTheme.button.from} ${activeTheme.button.via} ${activeTheme.button.to}
                      shadow-2xl ${activeTheme.button.shadow} 
                      backdrop-blur-sm
                  `}
              style={{
                boxShadow: `0 8px 32px rgba(${activeTheme.button.shadowRgb}, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative z-10 flex items-center gap-2">
                <span>{t('tryAgain')}</span>
              </span>
            </button>
            <button
              onClick={handleContinueAnyway}
              className={`
                      px-8 py-3 rounded-full font-medium text-base text-white
                      flex items-center justify-center gap-2
                      relative overflow-hidden group 
                      transition-all transform hover:scale-105 active:scale-95
                      bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700
                      shadow-2xl shadow-gray-600/40
                      backdrop-blur-sm
                  `}
              style={{
                boxShadow: '0 8px 32px rgba(75, 85, 99, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative z-10 flex items-center gap-2">
                <span>{t('continueAnyway')}</span>
              </span>
            </button>
          </div>
        </div>
      )
    }

    if (status === "results") {
      const resultsTitleClasses = `text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${activeTheme.gradientText.from} ${activeTheme.gradientText.to} ${activeTheme.gradientText.darkFrom} ${activeTheme.gradientText.darkTo} mb-8`;
      const resultsRangeClasses = `flex-grow h-1 bg-gradient-to-r ${activeTheme.resultsRange.from} ${activeTheme.resultsRange.to} mx-4 rounded-full`;

      return mode === 'advanced' && advancedResult ? (
        <div className="w-full max-w-lg text-center bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center justify-center transition-all duration-500 min-h-[32rem]">
          <h2 className={resultsTitleClasses}>{t('resultsTitle')}</h2>
          <div className="w-full mb-8">
            <p className="text-lg font-semibold text-green-600 dark:text-green-500 mb-4">{t('resultsRange')}</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-5xl font-black text-black dark:text-white">{advancedResult.overallMinNote || 'N/A'}</p>
                <p className="text-md text-gray-500 dark:text-gray-400">({advancedResult.overallMinHz?.toFixed(1) || '--'} Hz)</p>
              </div>
              <div className={resultsRangeClasses}></div>
              <div className="text-center">
                <p className="text-5xl font-black text-black dark:text-white">{advancedResult.overallMaxNote || 'N/A'}</p>
                <p className="text-md text-gray-500 dark:text-gray-400">({advancedResult.overallMaxHz?.toFixed(1) || '--'} Hz)</p>
              </div>
            </div>
            {advancedResult.overallMinHz && advancedResult.overallMaxHz && (() => {
              const minMidi = Math.round(12 * Math.log2(advancedResult.overallMinHz / 440) + 69);
              const maxMidi = Math.round(12 * Math.log2(advancedResult.overallMaxHz / 440) + 69);
              const semitones = maxMidi - minMidi;
              const octaves = (semitones / 12).toFixed(1);
              return (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 font-medium">
                  Range: {semitones} semitones ({octaves} octaves)
                </p>
              );
            })()}

            {/* Voice Classification */}
            {(() => {
              const classification = getVoiceClassification(advancedResult.overallMinHz, advancedResult.overallMaxHz);
              if (!classification) return null;

              return (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-purple-100/50 to-blue-100/50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200/50 dark:border-purple-700/50 backdrop-blur-sm animate-slide-up">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-lg"
                      style={{ backgroundColor: VOICE_CLASSIFICATIONS[classification].color }}
                    />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('voiceClassification')}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {t(classification)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t('classificationDisclaimer')}
                  </p>
                </div>
              );
            })()}
          </div>
          <div className="w-3/4 h-px bg-black/10 dark:bg-white/10 my-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 w-full pt-4 text-center sm:text-left">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('resultsLowestSung')}</p>
              <p className="text-xl font-bold text-black dark:text-white">{advancedResult.lowestNoteNote || 'N/A'} <span className="text-base text-gray-600 dark:text-gray-400">({advancedResult.lowestNoteHz?.toFixed(1) || '--'} Hz)</span></p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('resultsAvgSpeaking')}</p>
              <p className="text-xl font-bold text-black dark:text-white">{advancedResult.speakingNote || 'N/A'} <span className="text-base text-gray-600 dark:text-gray-400">({advancedResult.speakingHz?.toFixed(1) || '--'} Hz)</span></p>
            </div>
          </div>
          <div className="w-3/4 h-px bg-black/10 dark:bg-white/10 my-4"></div>
          <div className="w-full px-2 sm:px-4 text-left mt-2">
            <h3 className="text-lg font-bold text-black dark:text-white mb-2">{t('feedbackTitle')}</h3>
            {isGeneratingFeedback && <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t('generatingFeedback')}</p>}
            {generatedFeedback && (
              <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm">
                <p>{generatedFeedback.analysis}</p>
                {generatedFeedback.singers.length > 0 && (
                  <p>
                    <span className="font-semibold text-black dark:text-white">Similar Range:</span> {generatedFeedback.singers.join(', ')}
                  </p>
                )}
                <p>
                  <span className={`font-semibold text-transparent bg-clip-text bg-gradient-to-r ${activeTheme.gradientText.from} ${activeTheme.gradientText.to} ${activeTheme.gradientText.darkFrom} ${activeTheme.gradientText.darkTo}`}>Pro Tip:</span> {generatedFeedback.tip}
                </p>
                <p className="text-xs italic text-gray-500 dark:text-gray-400 pt-2">{generatedFeedback.disclaimer}</p>
              </div>
            )}
          </div>
          <div className="pt-10 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`
                      px-8 py-3 rounded-full font-medium text-base text-white
                      flex items-center justify-center gap-2
                      relative overflow-hidden group
                      transition-all transform hover:scale-105 active:scale-95
                      bg-gradient-to-br from-green-500 to-emerald-600
                      shadow-2xl shadow-green-500/30
                      backdrop-blur-sm
                      ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}
                  `}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>{isSaving ? "Saving..." : (t('saveAndContinue') || "Save & Continue")}</span>
              </span>
            </button>
            <button
              onClick={stopAll}
              className={`
                      px-8 py-3 rounded-full font-medium text-base text-white
                      flex items-center justify-center gap-2
                      relative overflow-hidden group 
                      transition-all transform hover:scale-105 active:scale-95
                      bg-gradient-to-br ${activeTheme.button.from} ${activeTheme.button.via} ${activeTheme.button.to}
                      shadow-2xl ${activeTheme.button.shadow} 
                      backdrop-blur-sm
                  `}
              style={{
                boxShadow: `0 8px 32px rgba(${activeTheme.button.shadowRgb}, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative z-10 flex items-center gap-2">
                <span>{t('startNew')}</span>
              </span>
            </button>
          </div>
        </div>
      ) : mode === 'simple' && simpleResult ? (
        <div className="w-full max-w-md text-center bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col items-center justify-center transition-all duration-500">
          <h2 className={`text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${activeTheme.gradientText.from} ${activeTheme.gradientText.to} ${activeTheme.gradientText.darkFrom} ${activeTheme.gradientText.darkTo} mb-4`}>{t('simpleResultsTitle')}</h2>
          <div className="w-full mb-4">
            <p className="text-sm font-semibold text-green-600 dark:text-green-500 mb-2">{t('resultsRange')}</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-4xl font-black text-black dark:text-white">{simpleResult.lowestNoteNote || 'N/A'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">({simpleResult.lowestNoteHz?.toFixed(1) || '--'} Hz)</p>
              </div>
              <div className={resultsRangeClasses}></div>
              <div className="text-center">
                <p className="text-4xl font-black text-black dark:text-white">{simpleResult.highestNoteNote || 'N/A'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">({simpleResult.highestNoteHz?.toFixed(1) || '--'} Hz)</p>
              </div>
            </div>
            {simpleResult.lowestNoteHz && simpleResult.highestNoteHz && (() => {
              const minMidi = Math.round(12 * Math.log2(simpleResult.lowestNoteHz / 440) + 69);
              const maxMidi = Math.round(12 * Math.log2(simpleResult.highestNoteHz / 440) + 69);
              const semitones = maxMidi - minMidi;
              const octaves = (semitones / 12).toFixed(1);
              return (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Range: {semitones} semitones ({octaves} octaves)
                </p>
              );
            })()}

            {/* Voice Classification */}
            {(() => {
              const classification = getVoiceClassification(simpleResult.lowestNoteHz, simpleResult.highestNoteHz);
              if (!classification) return null;

              return (
                <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-purple-100/50 to-blue-100/50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200/50 dark:border-purple-700/50 backdrop-blur-sm animate-slide-up">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full shadow-lg"
                      style={{ backgroundColor: VOICE_CLASSIFICATIONS[classification].color }}
                    />
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {t('voiceClassification')}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {t(classification)}
                  </p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t('classificationDisclaimer')}
                  </p>
                </div>
              );
            })()}
          </div>
          <div className="w-full h-px bg-black/10 dark:bg-white/10 my-2"></div>
          <div className="w-full px-1 text-left">
            <h3 className="text-sm font-bold text-black dark:text-white mb-1">{t('feedbackTitle')}</h3>
            {isGeneratingFeedback && <p className="text-gray-500 dark:text-gray-400 animate-pulse text-xs">{t('generatingFeedback')}</p>}
            {generatedFeedback && (
              <div className="text-gray-700 dark:text-gray-300 space-y-1.5 text-xs">
                <p>{generatedFeedback.analysis}</p>
                {generatedFeedback.singers.length > 0 && (
                  <p>
                    <span className="font-semibold text-black dark:text-white">Similar Range:</span> {generatedFeedback.singers.join(', ')}
                  </p>
                )}
                <p>
                  <span className={`font-semibold text-transparent bg-clip-text bg-gradient-to-r ${activeTheme.gradientText.from} ${activeTheme.gradientText.to} ${activeTheme.gradientText.darkFrom} ${activeTheme.gradientText.darkTo}`}>Pro Tip:</span> {generatedFeedback.tip}
                </p>
                <p className="text-[10px] italic text-gray-500 dark:text-gray-400 pt-1">{generatedFeedback.disclaimer}</p>
              </div>
            )}
          </div>
          <div className="pt-4 pb-16 flex flex-row gap-3 w-full justify-center">
            <button
              onClick={handleSave}
              className={`
                          px-5 py-2.5 rounded-full font-medium text-sm text-white
                          flex items-center justify-center gap-2
                          relative overflow-hidden group
                          transition-all transform hover:scale-105 active:scale-95
                          bg-gradient-to-br from-green-500 to-emerald-600
                          shadow-xl shadow-green-500/30
                          backdrop-blur-sm
                      `}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>{t('saveAndContinue') || "Save & Continue"}</span>
              </span>
            </button>
            <button
              onClick={stopAll}
              className={`
                          px-5 py-2.5 rounded-full font-medium text-sm text-white
                          flex items-center justify-center gap-2
                          relative overflow-hidden group 
                          transition-all transform hover:scale-105 active:scale-95
                          bg-gradient-to-br ${activeTheme.button.from} ${activeTheme.button.via} ${activeTheme.button.to}
                          shadow-xl ${activeTheme.button.shadow} 
                          backdrop-blur-sm
                      `}
              style={{
                boxShadow: `0 6px 24px rgba(${activeTheme.button.shadowRgb}, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative z-10 flex items-center gap-2">
                <span>{t('startNew')}</span>
              </span>
            </button>
          </div>
        </div>
      ) : null;
    }

    return null;
  }

  const BackIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>;

  return (
    <div className="fixed inset-0 z-40 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden transition-colors duration-300">
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden"
        style={{ transform: 'translateZ(0)' }}
      >
        {activeTheme.visualizer.map((color, index) => {
          const baseSize = 200;
          const scale = 1 + rmsVolume * 8;
          const positionType = index % 3; // 0: bottom, 1: left, 2: right

          let dynamicStyle: React.CSSProperties = {
            width: `${baseSize}px`,
            height: `${baseSize}px`,
            opacity: Math.min(0.7, 0.35 + rmsVolume * 25),
            background: color.gradient,
            willChange: 'transform, opacity',
            filter: 'blur(50px)',
          };

          switch (positionType) {
            case 0: // Bottom
              dynamicStyle = {
                ...dynamicStyle,
                bottom: '-100px',
                left: `calc(50% + ${Math.sin(performance.now() / (4000 + index * 500)) * 35}vw)`,
                transform: `translate(-50%, 50%) scale(${scale})`,
              };
              break;
            case 1: // Left
              dynamicStyle = {
                ...dynamicStyle,
                left: '-100px',
                top: `calc(50% + ${Math.cos(performance.now() / (4500 + index * 500)) * 35}vh)`,
                transform: `translate(-50%, -50%) scale(${scale})`,
              };
              break;
            case 2: // Right
            default:
              dynamicStyle = {
                ...dynamicStyle,
                right: '-100px',
                top: `calc(50% + ${Math.sin(performance.now() / (5000 + index * 500)) * 35}vh)`,
                transform: `translate(50%, -50%) scale(${scale})`,
              };
              break;
          }

          return (
            <div
              key={color.name}
              className="absolute rounded-full mix-blend-hard-light"
              style={dynamicStyle}
            />
          );
        })}
      </div>
      <div className={`relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center transition-all duration-300 ease-in-out ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {mainContent()}
      </div>
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center space-x-4 z-20">
        <LanguageToggle language={language} toggleLanguage={toggleLanguage} />
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} aria-label={t(theme === 'dark' ? 'switchToLight' : 'switchToDark')} />
      </div>
    </div>
  );
});

const themes: { [key: string]: Theme } = {
  violetWave: {
    name: 'Violet Wave',
    visualizer: [
      { name: 'violet-1', gradient: 'radial-gradient(circle, hsla(271, 76%, 53%, 0.8) 0%, hsla(271, 76%, 53%, 0) 70%)' },
      { name: 'pink', gradient: 'radial-gradient(circle, hsla(329, 100%, 50%, 0.8) 0%, hsla(329, 100%, 50%, 0) 70%)' },
      { name: 'blue', gradient: 'radial-gradient(circle, hsla(197, 100%, 50%, 0.8) 0%, hsla(197, 100%, 50%, 0) 70%)' },
      { name: 'indigo', gradient: 'radial-gradient(circle, hsla(271, 100%, 25%, 0.8) 0%, hsla(271, 100%, 25%, 0) 70%)' },
      { name: 'magenta', gradient: 'radial-gradient(circle, hsla(300, 100%, 50%, 0.8) 0%, hsla(300, 100%, 50%, 0) 70%)' },
      { name: 'deepskyblue', gradient: 'radial-gradient(circle, hsla(197, 100%, 50%, 0.8) 0%, hsla(197, 100%, 78%, 0) 70%)' },
    ],
    button: {
      from: 'from-violet-500',
      via: 'via-purple-500',
      to: 'to-pink-500',
      shadow: 'shadow-purple-500/50',
      shadowRgb: '168, 85, 247',
    },
    gradientText: {
      from: 'from-violet-600',
      to: 'to-pink-600',
      darkFrom: 'dark:from-violet-400',
      darkTo: 'dark:to-pink-400',
    },
    resultsRange: {
      from: 'from-violet-400',
      to: 'to-pink-400',
    },
    progress: {
      from: 'from-violet-500',
      to: 'to-pink-500',
    },
  },
};

export default VocalRangeTestScreen;
