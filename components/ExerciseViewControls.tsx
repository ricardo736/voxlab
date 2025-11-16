


import React from 'react';
import { semitoneToNoteName } from '../utils';
import { useTranslation } from '../hooks/useTranslation';

interface ExerciseViewControlsProps {
    centerSemitone: number;
    setCenterSemitone: (value: number) => void;
    visibleOctaves: number;
    setVisibleOctaves: (value: number) => void;
    autoFitEnabled: boolean;
    setAutoFitEnabled: (value: boolean) => void;
    exerciseNoteVolume: number; // New prop
    setExerciseNoteVolume: (value: number) => void; // New prop
    metronomeVolume: number; // New prop
    setMetronomeVolume: (value: number) => void; // New prop
}

const ExerciseViewControls: React.FC<ExerciseViewControlsProps> = ({
    centerSemitone,
    setCenterSemitone,
    visibleOctaves,
    setVisibleOctaves,
    autoFitEnabled,
    setAutoFitEnabled,
    exerciseNoteVolume,
    setExerciseNoteVolume,
    metronomeVolume,
    setMetronomeVolume
}) => {
    const { t } = useTranslation();

    return (
        <div className="w-full px-2 mb-6 space-y-3">
            <div className="flex items-center justify-center">
                <label htmlFor="autofit-toggle-exercise" className="text-sm font-medium text-slate-600 dark:text-slate-300 mr-3">
                    {t('autoFit')}
                </label>
                <button
                    id="autofit-toggle-exercise"
                    role="switch"
                    aria-checked={autoFitEnabled}
                    onClick={() => setAutoFitEnabled(!autoFitEnabled)}
                    className={`${autoFitEnabled ? 'bg-violet-600' : 'bg-slate-400 dark:bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900`}
                >
                    <span className={`${autoFitEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </button>
            </div>
            <div className={`transition-opacity ${autoFitEnabled ? 'opacity-50' : 'opacity-100'}`}>
                <label htmlFor="range-slider-exercise" className="block text-xs font-medium text-slate-500 dark:text-slate-400 text-center mb-1">
                    {t('centerNote')}: <span className="font-bold text-violet-600 dark:text-violet-400">{semitoneToNoteName(centerSemitone)}</span>
                </label>
                <input id="range-slider-exercise" type="range" min="-39" max="48" step="1"
                    value={Math.round(centerSemitone)}
                    onInput={(e) => setCenterSemitone(parseInt(e.currentTarget.value, 10))}
                    disabled={autoFitEnabled}
                    className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
            </div>
            <div>
                <label htmlFor="zoom-slider-exercise" className="block text-xs font-medium text-slate-500 dark:text-slate-400 text-center mb-1">
                    {t('rangeOctaves')}: <span className="font-bold text-violet-600 dark:text-violet-400">{visibleOctaves.toFixed(1)} {t('octavesUnit')}</span>
                </label>
                <input id="zoom-slider-exercise" type="range" min="0.5" max="5" step="0.1"
                    value={visibleOctaves}
                    onInput={(e) => setVisibleOctaves(parseFloat(e.currentTarget.value))}
                    className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            {/* New volume sliders */}
            <div>
                <label htmlFor="note-volume-slider" className="block text-xs font-medium text-slate-500 dark:text-slate-400 text-center mb-1">
                    {t('noteVolume')}: <span className="font-bold text-violet-600 dark:text-violet-400">{(exerciseNoteVolume * 100).toFixed(0)}%</span>
                </label>
                <input id="note-volume-slider" type="range" min="0" max="1" step="0.05"
                    value={exerciseNoteVolume}
                    onInput={(e) => setExerciseNoteVolume(parseFloat(e.currentTarget.value))}
                    className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            <div>
                <label htmlFor="metronome-volume-slider" className="block text-xs font-medium text-slate-500 dark:text-slate-400 text-center mb-1">
                    {t('metronomeVolume')}: <span className="font-bold text-violet-600 dark:text-violet-400">{(metronomeVolume * 100).toFixed(0)}%</span>
                </label>
                <input id="metronome-volume-slider" type="range" min="0" max="1" step="0.05"
                    value={metronomeVolume}
                    onInput={(e) => setMetronomeVolume(parseFloat(e.currentTarget.value))}
                    className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </div>
    );
};

export default ExerciseViewControls;
