import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { frequencyToNote, lerp } from '../utils'; // Import lerp
import { TUNINGS } from '../constants'; // Import TUNINGS

interface InstrumentTunerProps {
    micActive: boolean;
    userPitch: number | null;
    micGain: number;
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string, gradientText: { from: string, to: string, darkFrom: string, darkTo: string } };
    onBack: () => void;
}

const SNAP_THRESHOLD_CENTS = 50; // Max cents difference to snap to an instrument's defined note
const SMOOTHING_FACTOR = 0.2; // For exponential moving average of detune
const IN_TUNE_THRESHOLD_CENTS = 5; // Within +/- 5 cents is considered in tune

const InstrumentTuner: React.FC<InstrumentTunerProps> = ({ userPitch, micActive, micGain, onBack, currentTheme }) => {
    const { t } = useTranslation();
    const needleRef = useRef<HTMLDivElement>(null);
    const [selectedTuningId, setSelectedTuningId] = useState<string>('chromatic');
    const [smoothedDetuneCents, setSmoothedDetuneCents] = useState(0);

    const primaryColorClass = currentTheme.primary;
    const primaryHex = useMemo(() => {
        const colors: { [key: string]: string } = { 'text-violet-600': '#8b5cf6', 'text-fuchsia-600': '#d946ef', 'text-blue-600': '#2563eb', 'text-cyan-600': '#0891b2', 'text-green-700': '#15803d', 'text-teal-600': '#0d9488', 'text-orange-600': '#ea580c', 'text-red-600': '#dc2626' };
        return colors[primaryColorClass] || '#8b5cf6';
    }, [primaryColorClass]);

    const displayInfo = useMemo(() => {
        const info = {
            mainNoteName: '--',
            mainNoteSharp: false,
            detuneCents: 0,
            targetTuningNote: null as { name: string; semitone: number } | null,
            statusMessage: '',
        };

        if (!micActive) {
            info.statusMessage = t('micStatusActivate');
            return info;
        }

        if (micGain < 5) {
            info.statusMessage = t('noSoundDetected');
            return info;
        }

        const detectedChromaticNote = userPitch ? frequencyToNote(userPitch) : null;
        if (!detectedChromaticNote) {
            info.statusMessage = t('listeningMessage');
            return info;
        }

        info.statusMessage = t('listeningMessage');
        info.mainNoteName = detectedChromaticNote.name.replace('#', '').replace('b', '');
        info.mainNoteSharp = detectedChromaticNote.isSharp;
        info.detuneCents = detectedChromaticNote.detune; // Initial detune relative to chromatic

        if (selectedTuningId !== 'chromatic') {
            const tuning = TUNINGS.find(t => t.id === selectedTuningId);
            if (tuning && tuning.notes.length > 0) {
                let closestTuningNoteCandidate = null;
                let minDetuneFromCandidate = Infinity;

                for (const tuningNote of tuning.notes) {
                    // Check if the detected chromatic note is "close enough" to one of the instrument's notes
                    const detuneFromTuningNote = (detectedChromaticNote.preciseSemitone - tuningNote.semitone) * 100;
                    if (Math.abs(detuneFromTuningNote) < Math.abs(minDetuneFromCandidate)) {
                        minDetuneFromCandidate = detuneFromTuningNote;
                        closestTuningNoteCandidate = tuningNote;
                    }
                }
                
                // Only snap to the instrument's note if we're within the SNAP_THRESHOLD_CENTS
                if (closestTuningNoteCandidate && Math.abs(minDetuneFromCandidate) <= SNAP_THRESHOLD_CENTS) {
                    info.targetTuningNote = closestTuningNoteCandidate;
                    info.mainNoteName = closestTuningNoteCandidate.name.replace(/[0-9#b-]/g, ''); // e.g., "E" from "E2"
                    info.mainNoteSharp = closestTuningNoteCandidate.name.includes('#');
                    info.detuneCents = minDetuneFromCandidate; // Recalculate detune relative to the perfect closestTuningNote pitch
                }
                // If not close enough to snap, it remains chromatic
            }
        }
        
        return info;
    }, [micActive, micGain, userPitch, selectedTuningId, t]);

    useEffect(() => {
        setSmoothedDetuneCents(prev => lerp(prev, displayInfo.detuneCents, SMOOTHING_FACTOR));
    }, [displayInfo.detuneCents]);

    const isCurrentlyInTune = Math.abs(smoothedDetuneCents) < IN_TUNE_THRESHOLD_CENTS;

    const detunePercent = useMemo(() => {
        const clamped = Math.max(-50, Math.min(50, smoothedDetuneCents));
        return (clamped + 50) / 100; // Normalized 0 to 1 for needle position
    }, [smoothedDetuneCents]);

    useEffect(() => {
        if (needleRef.current) {
            // Apply immediate position for initial render, then allow transition
            needleRef.current.style.transition = 'none';
            needleRef.current.style.left = `calc(${detunePercent * 100}% - 2px)`;
            
            // Re-enable transition after a very short delay
            requestAnimationFrame(() => {
                if (needleRef.current) {
                    needleRef.current.style.transition = 'left 0.15s ease-out, background-color 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out, transform 0.2s ease-out, box-shadow 0.2s ease-out';
                }
            });
        }
    }, [detunePercent]);

    const getDynamicColor = useCallback((currentDetune: number, hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        if (isCurrentlyInTune) return `rgb(74, 222, 128)`; // green
        if (currentDetune > 0) { // Sharp
            const blendFactor = Math.min(1, Math.abs(currentDetune) / 50); // 0-1 based on detune
            const r_blend = Math.round(lerp(r, 220, blendFactor)); // Blend towards red
            const g_blend = Math.round(lerp(g, 38, blendFactor));
            const b_blend = Math.round(lerp(b, 38, blendFactor));
            return `rgb(${r_blend}, ${g_blend}, ${b_blend})`;
        } else { // Flat
            const blendFactor = Math.min(1, Math.abs(currentDetune) / 50); // 0-1 based on detune
            const r_blend = Math.round(lerp(r, 37, blendFactor)); // Blend towards blue
            const g_blend = Math.round(lerp(g, 99, blendFactor));
            const b_blend = Math.round(lerp(b, 235, blendFactor));
            return `rgb(${r_blend}, ${g_blend}, ${b_blend})`;
        }
    }, [isCurrentlyInTune, primaryHex]);

    const dynamicNoteColor = getDynamicColor(smoothedDetuneCents, primaryHex);
    const dynamicNeedleColor = isCurrentlyInTune ? 'bg-green-400' : (smoothedDetuneCents > 0 ? 'bg-red-400' : 'bg-blue-400');
    const dynamicNeedleShadow = isCurrentlyInTune ? 'shadow-green-400/50' : (smoothedDetuneCents > 0 ? 'shadow-red-400/50' : 'shadow-blue-400/50');

    // Determine status message / detune text
    const pitchStatusText = useMemo(() => {
        if (!micActive) return displayInfo.statusMessage;
        if (micGain < 5) return displayInfo.statusMessage;
        if (!userPitch) return displayInfo.statusMessage; // "Listening..."
        
        return isCurrentlyInTune ? t('inTune') : `${smoothedDetuneCents.toFixed(0)} ${t('cents')}`;
    }, [micActive, micGain, userPitch, isCurrentlyInTune, smoothedDetuneCents, displayInfo.statusMessage, t]);


    return (
        <section className="flex-grow flex flex-col justify-center items-center w-full p-4 pt-8">
            <div className="w-full max-w-sm mx-auto bg-white/30 dark:bg-black/20 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center gap-8 border border-black/10 dark:border-white/10">
                <h2 className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo}`}>{t('instrumentTuner')}</h2>
                
                {/* Tuning Selection */}
                <div className="w-full">
                    <label htmlFor="tuning-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('tuning')}</label>
                    <select
                        id="tuning-select"
                        value={selectedTuningId}
                        onChange={(e) => setSelectedTuningId(e.target.value)}
                        className="w-full p-2 bg-white/60 dark:bg-black/40 border border-slate-300/50 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                    >
                        {TUNINGS.map(tuning => (
                            <option key={tuning.id} value={tuning.id}>
                                {t(tuning.name)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Note Display */}
                <div className="flex flex-col items-center min-h-[160px] justify-center"> {/* Added min-height for stability */}
                    <div className="relative flex items-end h-24"> {/* Container for main note + sharp */}
                        <p className={`text-8xl font-black transition-all duration-200 ${displayInfo.mainNoteName === '--' ? 'opacity-30' : 'opacity-100'}`} style={{color: dynamicNoteColor}}>
                            {displayInfo.mainNoteName}
                        </p>
                        <sup className={`text-5xl -top-6 transition-opacity duration-200 ${displayInfo.mainNoteName === '--' ? 'opacity-0' : (displayInfo.mainNoteSharp ? 'opacity-100' : 'opacity-0')}`} style={{
                            color: isCurrentlyInTune ? 'rgb(74, 222, 128)' : dynamicNoteColor, // Green when in tune, otherwise dynamic
                        }}>#</sup>
                    </div>
                    <div className="min-h-[28px]"> {/* Placeholder for target tuning note */}
                        {displayInfo.targetTuningNote && (
                            <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
                                ({displayInfo.targetTuningNote.name})
                            </p>
                        )}
                    </div>
                    <p className={`text-xl font-bold h-7 transition-colors duration-200 ${
                        (displayInfo.statusMessage === t('noSoundDetected') || displayInfo.statusMessage === t('listeningMessage'))
                        ? 'text-slate-500 dark:text-slate-400' // More neutral color for passive states
                        : ''
                    }`} style={{color: (displayInfo.statusMessage === t('noSoundDetected') || displayInfo.statusMessage === t('listeningMessage')) ? undefined : dynamicNoteColor}}>
                        {pitchStatusText}
                    </p>
                    <div className="min-h-[28px] mt-2"> {/* Placeholder for Hz display */}
                        {userPitch && (micActive && micGain > 5) && (
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {userPitch.toFixed(2)} Hz
                            </p>
                        )}
                    </div>
                </div>

                {/* Tuner Meter */}
                <div className="w-full flex flex-col items-center">
                    <div className="relative w-full h-2 bg-gradient-to-r from-blue-400/80 via-slate-300/80 to-red-400/80 rounded-full border border-slate-300/50 dark:border-slate-600/50">
                        {/* Center "in-tune" zone */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-5 w-[8%] bg-green-500/50 rounded-full border-2 border-green-400"></div>
                        
                        {/* Indicator Needle */}
                        <div 
                            ref={needleRef}
                            className={`absolute top-1/2 -translate-y-1/2 rounded-full shadow-md ${dynamicNeedleColor} ${dynamicNeedleShadow} ${isCurrentlyInTune ? 'w-2 h-7' : 'w-1 h-5'}`}
                            // The `left` style is controlled by `useEffect` for smooth animation
                        ></div>
                    </div>
                    <div className="w-full flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 px-1">
                        <span className="text-blue-400 dark:text-blue-300">{t('flat')}</span>
                        <span className="text-slate-600 dark:text-slate-300">{t('inTune')}</span>
                        <span className="text-red-400 dark:text-red-300">{t('sharp')}</span>
                    </div>
                </div>
                
                <button 
                    onClick={onBack} 
                    className="btn-interactive mt-4 px-8 py-3 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40"
                >
                    {t('goBack')}
                </button>
            </div>
        </section>
    );
};

export default InstrumentTuner;