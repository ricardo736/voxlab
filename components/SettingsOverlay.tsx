
import React, { useState, useEffect, useRef } from 'react';
import { Language, Theme, ActiveView } from '../types';
import { LANGUAGES, THEMES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';


interface SettingsOverlayProps {
    setIsSettingsOpen: (isOpen: boolean) => void;
    setActiveView: (view: ActiveView) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    activeTheme: Theme;
    setThemeId: (id: string) => void;
    themeMode: 'light' | 'dark';
    setThemeMode: (mode: 'light' | 'dark') => void;
    onLoadSamples?: (files: FileList) => Promise<{ loaded: number; errors: number }> | void;
    loadedSampleCount?: number;
    availableInstruments?: string[];
    activeInstrument?: string;
    setActiveInstrument?: (instrument: string) => void;
    compressorEnabled: boolean;
    setCompressorEnabled: (enabled: boolean) => void;
    frequencySeparationEnabled: boolean;
    setFrequencySeparationEnabled: (enabled: boolean) => void;
    pyinBias: number;
    setPyinBias: (bias: number) => void;
    pyinGateMode: 'smooth' | 'instant';
    setPyinGateMode: (mode: 'smooth' | 'instant') => void;
    noiseGateThreshold: number;
    setNoiseGateThreshold: (threshold: number) => void;
}

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
    setIsSettingsOpen,
    setActiveView,
    language,
    setLanguage,
    activeTheme,
    setThemeId,
    themeMode,
    setThemeMode,
    onLoadSamples,
    availableInstruments,
    activeInstrument,
    setActiveInstrument,
    compressorEnabled,
    setCompressorEnabled,
    frequencySeparationEnabled,
    setFrequencySeparationEnabled,
    pyinBias,
    setPyinBias,
    pyinGateMode,
    setPyinGateMode,
    noiseGateThreshold,
    setNoiseGateThreshold
}) => {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    const [sampleStatus, setSampleStatus] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = requestAnimationFrame(() => setShow(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    const handleClose = () => {
        setShow(false);
        setTimeout(() => setIsSettingsOpen(false), 300);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && onLoadSamples) {
            setIsLoadingSamples(true);
            setSampleStatus(null);

            // Allow the UI to render the loading state before processing starts
            await new Promise(resolve => setTimeout(resolve, 50));

            const result = await onLoadSamples(e.target.files);

            setIsLoadingSamples(false);

            if (result) {
                let msg = t('samplesLoaded', { count: result.loaded });
                if (result.errors > 0) msg += ` (${result.errors} failed)`;
                if (result.loaded === 0 && result.errors === 0) msg = "No recognized samples found.";

                // Smart Pitch Shifting Feedback
                if (result.loaded > 0 && result.loaded < 4) {
                    msg += " (Smart Pitch Shifting Active)";
                }

                setSampleStatus(msg);
            }

            // Reset input to allow re-selection of the same files
            e.target.value = '';
        }
    };

    const SunIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
    const MoonIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;

    return (
        <div className={`fixed inset-0 bg-black/10 backdrop-blur-md z-[120] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${show ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}>
            <div
                className={`relative w-full max-w-xs max-h-[85vh] overflow-y-auto scrollbar-hide bg-white/95 dark:bg-slate-900/90 backdrop-blur-3xl rounded-3xl shadow-lg border border-white/50 dark:border-slate-700 p-4 text-slate-800 dark:text-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-300 ease-out ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-3 sticky top-0 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl z-10 -mx-4 px-4 py-2">
                    <h2 className="text-2xl font-black bg-gradient-to-r from-gray-600 to-gray-900 dark:from-gray-400 dark:to-gray-100 bg-clip-text text-transparent">{t('settings')}</h2>
                    <button
                        onClick={handleClose}
                        className="btn-interactive p-1 rounded-full text-slate-500 hover:bg-slate-400/20"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-3">
                    {/* Language & Theme Mode Selection */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">{t('language')}</h3>
                            <div className="flex space-x-2">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setLanguage(lang)}
                                        className={`btn-interactive flex items-center space-x-2 px-2.5 py-1 rounded-full border text-xs ${language.code === lang.code ? 'border-violet-500/50 bg-violet-500/10 text-violet-800 dark:text-violet-300 dark:bg-violet-500/20 font-semibold' : 'border-slate-300/70 dark:border-slate-600 hover:border-violet-400/70 hover:bg-slate-400/10 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <span>{lang.flag}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">Mode</h3>
                            <div className="p-1 rounded-full bg-slate-200 dark:bg-slate-800 flex">
                                <button onClick={() => setThemeMode('light')} className={`flex-1 flex justify-center items-center py-0.5 rounded-full text-xs font-semibold transition-colors ${themeMode === 'light' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500'}`}><SunIcon /></button>
                                <button onClick={() => setThemeMode('dark')} className={`flex-1 flex justify-center items-center py-0.5 rounded-full text-xs font-semibold transition-colors ${themeMode === 'dark' ? 'bg-slate-700 shadow-sm text-violet-400' : 'text-slate-500'}`}><MoonIcon /></button>
                            </div>
                        </div>
                    </div>


                    {/* Color Palette */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">{t('colorPalette')}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {THEMES.map(palette => (
                                <button
                                    key={palette.id}
                                    onClick={() => setThemeId(palette.id)}
                                    className={`btn-interactive flex items-center space-x-2 p-1.5 rounded-lg border ${activeTheme.id === palette.id ? 'border-violet-500/50 bg-violet-500/10 text-violet-800 dark:text-violet-300 dark:bg-violet-500/20 font-semibold' : 'border-slate-300/70 dark:border-slate-600 hover:border-violet-400/70 hover:bg-slate-400/10 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${palette.button.from} ${palette.button.to}`}></div>
                                    <span className="text-xs font-medium">{palette.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pitch Detector Access - Hidden for now, kept for future use
                    <div>
                        <button
                            onClick={() => {
                                setActiveView('test');
                                handleClose();
                            }}
                            className="btn-interactive w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-lg transition-all"
                        >
                            <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                            </svg>
                            <span>Open Pitch Detector</span>
                        </button>
                    </div>

                    <div className="border-t border-slate-300/50 dark:border-slate-700 my-1.5"></div>
                    */}








                    {/* Audio Settings */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">{t('audioSettings')}</h3>
                        <div className="space-y-2">
                            {/* Compressor / Mic Boost */}
                            <div className="flex items-center justify-between p-2 rounded-lg border border-slate-300/70 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('microphoneBoost')}</span>
                                    <span className="text-[10px] text-slate-500">Compressor & Gain</span>
                                </div>
                                <button
                                    onClick={() => setCompressorEnabled(!compressorEnabled)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${compressorEnabled ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${compressorEnabled ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Frequency Separation */}
                            <div className="flex items-center justify-between p-2 rounded-lg border border-slate-300/70 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('frequencySeparation')}</span>
                                    <span className="text-[10px] text-slate-500">Piano/Voice Split</span>
                                </div>
                                <button
                                    onClick={() => setFrequencySeparationEnabled(!frequencySeparationEnabled)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${frequencySeparationEnabled ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${frequencySeparationEnabled ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Noise Gate Threshold */}
                            <div className="p-2 rounded-lg border border-slate-300/70 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="flex justify-between mb-1">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Noise Gate</span>
                                    <span className="text-[10px] text-slate-500">{Math.round(noiseGateThreshold * 1000) / 1000}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="0.1"
                                    step="0.001"
                                    value={noiseGateThreshold}
                                    onChange={(e) => setNoiseGateThreshold(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                />
                            </div>

                            {/* pYIN Bias */}
                            <div className="p-2 rounded-lg border border-slate-300/70 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="flex justify-between mb-1">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Pitch Sensitivity</span>
                                    <span className="text-[10px] text-slate-500">{pyinBias}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={pyinBias}
                                    onChange={(e) => setPyinBias(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-300/50 dark:border-slate-700 my-1.5"></div>
                    {/* Custom Audio Loader */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">Custom Audio</h3>

                        {availableInstruments && availableInstruments.length > 0 && setActiveInstrument && (
                            <div className="mb-2">
                                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">{t('activeInstrument')}</label>
                                <select
                                    value={activeInstrument}
                                    onChange={(e) => setActiveInstrument(e.target.value)}
                                    className="w-full p-1.5 rounded-lg text-xs border border-slate-300/70 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-violet-500"
                                >
                                    {availableInstruments.map(inst => (
                                        <option key={inst} value={inst}>{inst}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            onChange={handleFileChange}
                            accept="audio/*,.flac,.mp3,.wav"
                        />
                        <button
                            onClick={() => !isLoadingSamples && fileInputRef.current?.click()}
                            disabled={isLoadingSamples}
                            className={`btn-interactive w-full text-left flex items-center space-x-2 p-1.5 rounded-lg border border-slate-300/70 dark:border-slate-600 hover:border-violet-400/70 hover:bg-slate-400/10 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 ${isLoadingSamples ? 'opacity-75 cursor-wait' : ''}`}
                        >
                            {isLoadingSamples ? (
                                <div className="flex items-center space-x-2 w-full justify-center py-1">
                                    <div className="animate-spin h-4 w-4 border-2 border-violet-500 rounded-full border-t-transparent"></div>
                                    <span className="text-xs font-medium">{t('processing')}</span>
                                </div>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19l-6 3V9l6-3m0 13V6m12 6l-12-4" />
                                    </svg>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium">Load Local Samples</span>
                                        <span className="text-[10px] text-slate-500">Select audio files (mp3/wav/flac)</span>
                                    </div>
                                </>
                            )}
                        </button>
                        {sampleStatus && (
                            <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded-lg border border-green-200 dark:border-green-800 flex items-center animate-fade-in">
                                <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                <span>{sampleStatus}</span>
                            </div>
                        )}
                    </div>



                    {/* FAQ & Support */}
                    <div className="flex space-x-2">
                        <button className="btn-interactive flex-1 text-center py-1.5 rounded-lg bg-slate-400/10 dark:bg-slate-700/50 hover:bg-slate-400/20 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs">{t('faq')}</button>
                        <button className="btn-interactive flex-1 text-center py-1.5 rounded-lg bg-slate-400/10 dark:bg-slate-700/50 hover:bg-slate-400/20 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs">{t('support')}</button>
                    </div>

                    {/* Version Info */}
                    <div className="mt-2 text-center">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            v0.9.0 Beta
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsOverlay;
