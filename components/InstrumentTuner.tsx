import React, { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { frequencyToNote } from '../utils';
import { Theme } from '../types';

interface InstrumentTunerProps {
    micActive: boolean;
    userPitch: number | null;
    micGain: number;
    currentTheme: Theme;
    onBack: () => void;
}

const InstrumentTuner: React.FC<InstrumentTunerProps> = ({ userPitch, micActive, micGain, onBack, currentTheme }) => {
    const { t } = useTranslation();
    const needleRef = useRef<HTMLDivElement>(null);
    const isDarkMode = document.documentElement.classList.contains('dark');

    const detectedNote = useMemo(() => {
        if (!userPitch || !micActive || micGain < 5) return null;
        return frequencyToNote(userPitch);
    }, [userPitch, micActive, micGain]);

    const detunePercent = useMemo(() => {
        if (!detectedNote) return 0.5; // Center when no note
        // Clamp detune to -50 to 50 cents, map to 0-1 range
        const clamped = Math.max(-50, Math.min(50, detectedNote.detune));
        return (clamped + 50) / 100; // Normalized 0 to 1
    }, [detectedNote]);

    const inTune = detectedNote && Math.abs(detectedNote.detune) < 5; // +/- 5 cents tolerance

    useEffect(() => {
        if (needleRef.current) {
            // Apply immediate position for initial render, then allow transition
            needleRef.current.style.transition = 'none';
            needleRef.current.style.left = `calc(${detunePercent * 100}% - 2px)`;
            
            // Re-enable transition after a very short delay
            requestAnimationFrame(() => {
                if (needleRef.current) {
                    needleRef.current.style.transition = 'left 0.2s ease-out, background-color 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out, transform 0.2s ease-out, box-shadow 0.2s ease-out';
                }
            });
        }
    }, [detunePercent]);
    
    const primaryTextColor = isDarkMode ? currentTheme.gradientText.darkFrom.replace('dark:from-','text-') : currentTheme.gradientText.from.replace('from-','text-');

    return (
        <section className="flex-grow flex flex-col justify-center items-center w-full p-4">
            <div className="w-full max-w-sm mx-auto bg-slate-800 rounded-2xl shadow-lg p-6 flex flex-col items-center gap-8 border border-slate-700">
                <h2 className="text-xl font-bold text-slate-100">{t('instrumentTuner')}</h2>
                
                {/* Note Display */}
                <div className="flex flex-col items-center">
                    <p className={`text-8xl font-black transition-all duration-200 ${inTune ? 'text-green-400 scale-105 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]' : `${primaryTextColor} scale-100`}`}>
                        {detectedNote ? detectedNote.name.replace('#', '') : '--'}
                        {detectedNote?.isSharp && <sup className={`text-5xl -top-6 ${inTune ? 'text-green-400' : 'text-slate-400'}`}>#</sup>}
                    </p>
                    <p className={`text-xl font-bold h-7 transition-colors duration-200 ${inTune ? 'text-green-400' : primaryTextColor}`}>
                        {detectedNote ? (inTune ? t('inTune') : `${detectedNote.detune.toFixed(0)} cents`) : <>&nbsp;</>}
                    </p>
                    {detectedNote?.preciseSemitone && (
                        <p className="text-sm font-medium text-slate-400 mt-2">
                            {userPitch ? userPitch.toFixed(2) : '-'} Hz
                        </p>
                    )}
                </div>

                {/* Tuner Meter */}
                <div className="w-full flex flex-col items-center">
                    <div className="relative w-full h-2 bg-gradient-to-r from-blue-500 via-slate-700 to-red-500 rounded-full">
                        {/* Center "in-tune" zone */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-5 w-[8%] bg-green-500/50 rounded-full border-2 border-green-400"></div>
                        
                        {/* Indicator Needle */}
                        <div 
                            ref={needleRef}
                            className={`absolute top-1/2 -translate-y-1/2 rounded-full shadow-lg ${inTune ? 'bg-green-400 w-2 h-7 shadow-green-400/50' : 'bg-slate-100 w-1 h-5'}`}
                            style={{ left: `calc(${detunePercent * 100}% - 2px)` }}
                        ></div>
                    </div>
                    <div className="w-full flex justify-between text-xs font-semibold text-slate-500 mt-2 px-1">
                        <span className="text-blue-400">{t('flat')}</span>
                        <span>{t('inTune')}</span>
                        <span className="text-red-400">{t('sharp')}</span>
                    </div>
                </div>
                
                <button 
                    onClick={onBack} 
                    className="btn-interactive mt-4 px-8 py-3 rounded-full font-semibold text-slate-300 bg-slate-700/50 border border-slate-600 shadow-sm hover:bg-slate-700"
                >
                    {t('goBack')}
                </button>
            </div>
        </section>
    );
};

export default InstrumentTuner;