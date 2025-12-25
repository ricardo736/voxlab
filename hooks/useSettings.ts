import { useState, useEffect } from 'react';
import { LANGUAGES, THEMES } from '../constants';
import { Language, VocalRange } from '../types';

interface UseSettingsReturn {
  // Theme settings
  themeId: string;
  setThemeId: (id: string) => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  
  // Audio settings
  compressorEnabled: boolean;
  setCompressorEnabled: (enabled: boolean) => void;
  frequencySeparationEnabled: boolean;
  setFrequencySeparationEnabled: (enabled: boolean) => void;
  
  // pYIN parameters
  pyinBias: number;
  setPyinBias: (bias: number) => void;
  pyinTolerance: number;
  setPyinTolerance: (tolerance: number) => void;
  pyinGateMode: 'smooth' | 'instant';
  setPyinGateMode: (mode: 'smooth' | 'instant') => void;
  noiseGateThreshold: number;
  setNoiseGateThreshold: (threshold: number) => void;
  
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  
  // Vocal range
  vocalRange: VocalRange;
  setVocalRange: (range: VocalRange) => void;
  
  // Favorites
  favoriteExerciseIds: string[];
  setFavoriteExerciseIds: (ids: string[]) => void;
  favoriteRoutineIds: string[];
  setFavoriteRoutineIds: (ids: string[]) => void;
  
  // Mic gain (legacy)
  micGain: number;
  setMicGain: (gain: number) => void;
}

export function useSettings(): UseSettingsReturn {
  // Theme settings
  const [themeId, setThemeId] = useState<string>(THEMES[0].id);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  
  // Audio settings
  const [compressorEnabled, setCompressorEnabled] = useState(false);
  const [frequencySeparationEnabled, setFrequencySeparationEnabled] = useState(true);
  
  // pYIN parameters
  const [pyinBias, setPyinBias] = useState<number>(2.0);
  const [pyinTolerance, setPyinTolerance] = useState<number>(0.3);
  const [pyinGateMode, setPyinGateMode] = useState<'smooth' | 'instant'>('smooth');
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(0.008);
  
  // Language
  const [language, setLanguage] = useState<Language>(LANGUAGES[0]);
  
  // Vocal range
  const [vocalRange, setVocalRange] = useState<VocalRange>({ start: null, end: null });
  
  // Favorites
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([]);
  const [favoriteRoutineIds, setFavoriteRoutineIds] = useState<string[]>([]);
  
  // Mic gain
  const [micGain, setMicGain] = useState(1.0);
  
  // Load settings from localStorage on mount
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
  
  // Save individual settings to localStorage
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
  
  return {
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
    language,
    setLanguage,
    vocalRange,
    setVocalRange,
    favoriteExerciseIds,
    setFavoriteExerciseIds,
    favoriteRoutineIds,
    setFavoriteRoutineIds,
    micGain,
    setMicGain,
  };
}
