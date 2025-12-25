import { useState, useEffect } from 'react';
import { Language } from '../types';
import { LANGUAGES, THEMES } from '../constants';

interface UseSettingsReturn {
    themeId: string;
    setThemeId: (id: string) => void;
    themeMode: 'light' | 'dark';
    setThemeMode: (mode: 'light' | 'dark') => void;
    compressorEnabled: boolean;
    setCompressorEnabled: (enabled: boolean) => void;
    frequencySeparationEnabled: boolean;
    setFrequencySeparationEnabled: (enabled: boolean) => void;
    pyinBias: number;
    setPyinBias: (bias: number) => void;
    pyinTolerance: number;
    setPyinTolerance: (tolerance: number) => void;
    pyinGateMode: 'smooth' | 'instant';
    setPyinGateMode: (mode: 'smooth' | 'instant') => void;
    noiseGateThreshold: number;
    setNoiseGateThreshold: (threshold: number) => void;
    micGain: number;
    setMicGain: (gain: number) => void;
}

export function useSettings(): UseSettingsReturn {
    const [themeId, setThemeId] = useState<string>(THEMES[0].id);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
    const [compressorEnabled, setCompressorEnabled] = useState(false);
    const [frequencySeparationEnabled, setFrequencySeparationEnabled] = useState(true);
    const [pyinBias, setPyinBias] = useState<number>(2.0);
    const [pyinTolerance, setPyinTolerance] = useState<number>(0.3);
    const [pyinGateMode, setPyinGateMode] = useState<'smooth' | 'instant'>('smooth');
    const [noiseGateThreshold, setNoiseGateThreshold] = useState(0.008);
    const [micGain, setMicGain] = useState(1.0);

    // Load settings from localStorage on mount
    useEffect(() => {
        const load = (k: string, s: (v: any) => void, d: any) => {
            try {
                const v = localStorage.getItem(k);
                if (v) {
                    const parsed = JSON.parse(v);
                    s(parsed);
                } else {
                    s(d);
                }
            } catch (e) {
                console.error(`Error loading ${k}:`, e);
                s(d);
            }
        };

        load('themeId', setThemeId, THEMES[0].id);
        load('themeMode', setThemeMode, 'light');
        load('micGain', setMicGain, 1.0);
        load('compressorEnabled', setCompressorEnabled, false);
        load('frequencySeparationEnabled', setFrequencySeparationEnabled, true);
        load('pyinBias', setPyinBias, 2.0);
        load('pyinTolerance', setPyinTolerance, 0.3);
        load('pyinGateMode', setPyinGateMode, 'smooth');
        load('noiseGateThreshold', setNoiseGateThreshold, 0.008);
    }, []);

    // Persist settings to localStorage
    useEffect(() => {
        localStorage.setItem('themeId', JSON.stringify(themeId));
    }, [themeId]);

    useEffect(() => {
        localStorage.setItem('themeMode', JSON.stringify(themeMode));
    }, [themeMode]);

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

    // Apply dark mode class to document
    useEffect(() => {
        document.documentElement.classList.toggle('dark', themeMode === 'dark');
    }, [themeMode]);

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
        micGain,
        setMicGain,
    };
}
