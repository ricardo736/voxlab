
import React, { useState, useEffect, useCallback } from 'react';
import { Language, ColorPalette, ActiveView } from '../types';
import { LANGUAGES, COLOR_PALETTES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';

interface SettingsOverlayProps {
    setIsSettingsOpen: (isOpen: boolean) => void;
    setActiveView: (view: ActiveView) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    colorPalette: ColorPalette;
    setColorPalette: (palette: ColorPalette) => void;
    isDarkMode: boolean; // New prop
    setIsDarkMode: (isDark: boolean) => void; // New prop
}

const ANIMATION_DURATION = 300; // milliseconds, reduced for snappier animation

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
    setIsSettingsOpen,
    setActiveView,
    language,
    setLanguage,
    colorPalette,
    setColorPalette,
    isDarkMode, // Destructure new prop
    setIsDarkMode, // Destructure new prop
}) => {
    const { t } = useTranslation();
    const [animateIn, setAnimateIn] = useState(false); // Controls entry/exit animation classes

    // Effect for animating in when component mounts
    useEffect(() => {
        // Set animateIn to true after a short delay to trigger transition
        const timer = setTimeout(() => {
            setAnimateIn(true);
        }, 50); 
        return () => clearTimeout(timer);
    }, []);

    const handleClose = useCallback(() => {
        setAnimateIn(false); // Trigger exit animation
        // After the animation duration, signal parent to close (unmount component)
        const timer = setTimeout(() => {
            setIsSettingsOpen(false);
        }, ANIMATION_DURATION);
        return () => clearTimeout(timer);
    }, [setIsSettingsOpen]);

    return (
        <div 
            className={`fixed inset-0 bg-black/10 backdrop-blur-md z-[1000] flex items-center justify-center p-4 transition-opacity ease-out duration-${ANIMATION_DURATION} ${animateIn ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleClose}
        >
            <div 
                className={`relative w-full max-w-xs bg-white/30 dark:bg-black/20 backdrop-blur-lg rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 p-4 text-slate-800 dark:text-white transition-all ease-out duration-${ANIMATION_DURATION} ${animateIn ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold text-black dark:text-white">{t('settings')}</h2>
                    <button 
                        onClick={handleClose}
                        className="btn-interactive p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-400/20"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-3">
                    {/* Language Selection */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-white mb-1.5">{t('language')}</h3>
                        <div className="flex space-x-2">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => setLanguage(lang)}
                                    className={`btn-interactive flex items-center space-x-2 px-2.5 py-1 rounded-full border text-xs ${language.code === lang.code ? 'border-violet-500/50 dark:border-violet-400/50 bg-violet-500/10 dark:bg-violet-900/50 shadow-sm text-violet-800 dark:text-violet-200 font-semibold' : 'border-slate-300/70 dark:border-slate-600/70 hover:border-violet-400/70 hover:bg-slate-400/10 dark:hover:bg-slate-600/10 text-slate-700 dark:text-slate-300'}`}
                                >
                                    <span>{lang.flag}</span>
                                    <span>{lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Palette */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-white mb-1.5">{t('colorPalette')}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {COLOR_PALETTES.map(palette => (
                                <button
                                    key={palette.id}
                                    onClick={() => setColorPalette(palette)}
                                    className={`btn-interactive flex items-center space-x-2 p-1.5 rounded-lg border ${colorPalette.id === palette.id ? 'border-violet-500/50 dark:border-violet-400/50 bg-violet-500/10 dark:bg-violet-900/50 shadow-sm text-violet-800 dark:text-violet-200 font-semibold' : 'border-slate-300/70 dark:border-slate-600/70 hover:border-violet-400/70 hover:bg-slate-400/10 dark:hover:bg-slate-600/10 text-slate-700 dark:text-slate-300'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${palette.gradient.replace(/\/10/g, '/80')}`}></div>
                                    <span className="text-xs font-medium">{palette.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-white mb-1.5">{t('theme')}</h3>
                        <button 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            role="switch"
                            aria-checked={isDarkMode}
                            className={`btn-interactive w-full text-left flex items-center justify-between p-2 rounded-lg border border-slate-300/70 dark:border-slate-600/70 hover:border-violet-400/70 hover:bg-slate-400/10 dark:hover:bg-slate-600/10 text-slate-700 dark:text-slate-300`}
                        >
                            <span className="flex items-center space-x-2 text-xs font-medium">
                                {isDarkMode ? (
                                    <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.707A8.987 8.987 0 0111 2c-2.88 0-5.467 1.07-7.469 2.872a1 1 0 00-.064 1.487l.456.456a1 1 0 001.487-.064A6.983 6.983 0 0011 4c2.19 0 4.16.892 5.584 2.316a1 1 0 00.064 1.487l.456.456a1 1 0 001.487-.064c1.802-2.002 2.872-4.59 2.872-7.469a8.987 8.987 0 01-2.707 6.707z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                ) : (
                                    <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 10a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 00-.707-.293H15a1 1 0 000 2h1a1 1 0 00.707-.293l.707-.707a1 1 0 00-1.414-1.414l-.707.707zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-5 6a1 1 0 01-1 1v1a1 1 0 112 0v-1a1 1 0 01-1-1zm-4.536-1.049l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM3 11a1 1 0 100-2H2a1 1 0 000 2h1zm9-8.536l.707-.707a1 1 0 00-1.414-1.414L11 2.586V3a1 1 0 000 2h-.586l-.707.707a1 1 0 001.414 1.414l.707-.707z"></path></svg>
                                )}
                                <span>{isDarkMode ? t('darkMode') : t('lightMode')}</span>
                            </span>
                            <span className={`${isDarkMode ? 'bg-violet-600' : 'bg-slate-400 dark:bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`} aria-hidden="true">
                                <span className={`${isDarkMode ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </span>
                        </button>
                    </div>

                    <div className="border-t border-slate-300/50 dark:border-slate-600/50 my-1.5"></div>

                    {/* Tools Section */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-white mb-1.5">{t('tools')}</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => {
                                    setActiveView('pitch');
                                    handleClose();
                                }}
                                className="btn-interactive w-full text-left flex items-center space-x-2 p-1.5 rounded-lg border border-slate-300/70 dark:border-slate-600/70 hover:border-violet-400/70 hover:bg-slate-400/10 dark:hover:bg-slate-600/10 text-slate-700 dark:text-slate-300"
                            >
                                <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-violet-600 dark:text-violet-400"><path d="M3 12h2l2-9l4 18l4-18l2 9h2"></path></svg>
                                <span className="text-xs font-medium">{t('livePitchDetector')}</span>
                            </button>
                             <button
                                onClick={() => {
                                    setActiveView('instrumentTuner');
                                    handleClose();
                                }}
                                className="btn-interactive w-full text-left flex items-center space-x-2 p-1.5 rounded-lg border border-slate-300/70 dark:border-slate-600/70 hover:border-violet-400/70 hover:bg-slate-400/10 dark:hover:bg-slate-600/10 text-slate-700 dark:text-slate-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19l-6 3V9l6-3m0 13V6m12 6l-12-4" />
                                </svg>
                                <span className="text-xs font-medium">{t('instrumentTuner')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-300/50 dark:border-slate-600/50 my-1.5"></div>

                    {/* FAQ & Support */}
                    <div className="flex space-x-2">
                        <button className="btn-interactive flex-1 text-center py-1.5 rounded-lg bg-slate-400/10 dark:bg-slate-600/10 hover:bg-slate-400/20 dark:hover:bg-slate-600/20 text-slate-800 dark:text-slate-200 font-medium text-xs">{t('faq')}</button>
                        <button className="btn-interactive flex-1 text-center py-1.5 rounded-lg bg-slate-400/10 dark:bg-slate-600/10 hover:bg-slate-400/20 dark:hover:bg-slate-600/20 text-slate-800 dark:text-slate-200 font-medium text-xs">{t('support')}</button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SettingsOverlay;