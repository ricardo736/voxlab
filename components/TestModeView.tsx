import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../types';
import { Activity, Sliders, Zap, Volume2 } from 'lucide-react';
import ExerciseGameViewALTWrapper from './ExerciseGameViewALTWrapper';

interface TestModeViewProps {
    currentTheme: Theme;
    vocalRange: any;
    userPitch: number | null;
    micGain: number;
    playNote: (semitone: number, duration: number, forExercise?: boolean) => void;
    onToggleMic: () => void;
    micActive: boolean;
    // Audio settings
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
    onBack: () => void; // Navigate to home
}

const TestModeView: React.FC<TestModeViewProps> = (props) => {
    const {
        compressorEnabled,
        frequencySeparationEnabled,
        pyinBias,
        pyinTolerance,
        pyinGateMode,
        noiseGateThreshold
    } = props;

    // Create a dummy exercise for test mode
    const testExercise = {
        id: 999,
        name: 'Test Mode',
        desc: 'Pitch Detection Test',
        pattern: [], // No notes
        duration: 1000,
        bpm: 90,
        instructions: 'Test your pitch detection',
        category: 'test' as any
    };

    return (
        <div className="h-full w-full flex">
            {/* Test Mode Label */}
            <div className="absolute top-4 left-4 z-40 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm shadow-lg">
                <Activity size={16} className="inline mr-2" />
                Test Mode
            </div>

            {/* Game View in Test Mode */}
            <div className="flex-1 overflow-hidden">
                <ExerciseGameViewALTWrapper
                    exercise={testExercise}
                    vocalRange={props.vocalRange}
                    userPitch={props.userPitch}
                    micGain={props.micGain}
                    isPlaying={props.micActive}
                    isExerciseComplete={false}
                    onStop={() => { }}
                    onComplete={() => { }}
                    onPlayPause={props.onToggleMic}
                    onPreview={() => { }}
                    isPreviewing={false}
                    playNote={props.playNote}
                    centerSemitone={60}
                    visibleOctaves={2}
                    onNotePositionUpdate={() => { }}
                    currentRoutine={null}
                    onNextInRoutine={() => { }}
                    onToggleFavoriteExercise={() => { }}
                    isExerciseFavorite={false}
                    onToggleFavoriteRoutine={() => { }}
                    isRoutineFavorite={false}
                    isFullscreen={false}
                    onToggleFullscreen={() => { }}
                    onBack={props.onBack}
                    compressorEnabled={compressorEnabled}
                    frequencySeparationEnabled={frequencySeparationEnabled}
                    pyinBias={pyinBias}
                    pyinTolerance={pyinTolerance}
                    pyinGateMode={pyinGateMode}
                    noiseGateThreshold={noiseGateThreshold}
                    checkAudioBuffers={async () => true}
                />
            </div>

            {/* Settings Panel - Hidden on mobile */}
            <div className="hidden md:flex w-80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-l border-slate-200/50 dark:border-slate-700/50 p-6 flex-col gap-6 overflow-y-auto z-50 shadow-2xl">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-2">
                    <Sliders size={20} className="text-violet-600" />
                    <h3 className="font-bold text-lg">Audio Settings</h3>
                </div>

                {/* Compressor */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Zap size={16} className="text-amber-500" /> Compressor
                        </label>
                        <button
                            onClick={() => props.setCompressorEnabled(!compressorEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${compressorEnabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${compressorEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Balances volume levels automatically.
                    </p>
                </div>

                {/* Frequency Separation */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Activity size={16} className="text-blue-500" /> Freq. Separation
                        </label>
                        <button
                            onClick={() => props.setFrequencySeparationEnabled(!frequencySeparationEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${frequencySeparationEnabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${frequencySeparationEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Prevents piano bass from interfering with voice detection.
                    </p>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />

                {/* Note Stickiness (Bias) */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Note Stickiness</label>
                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-violet-600 font-bold">{pyinBias.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="0.1"
                        max="10.0"
                        step="0.1"
                        value={pyinBias}
                        onChange={(e) => props.setPyinBias(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Loose (Fast)</span>
                        <span>Sticky (Stable)</span>
                    </div>
                </div>

                {/* Note Tolerance */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Note Tolerance</label>
                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-violet-600 font-bold">{(pyinTolerance * 100).toFixed(0)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.01"
                        value={pyinTolerance}
                        onChange={(e) => props.setPyinTolerance(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Strict (5%)</span>
                        <span>Loose (50%)</span>
                    </div>
                </div>

                {/* Gate Mode */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gate Mode</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => props.setPyinGateMode('smooth')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${pyinGateMode === 'smooth' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Smooth
                        </button>
                        <button
                            onClick={() => props.setPyinGateMode('instant')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${pyinGateMode === 'instant' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Instant
                        </button>
                    </div>
                </div>

                {/* Noise Gate Threshold */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Volume2 size={16} className="text-emerald-500" /> Noise Gate
                        </label>
                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-violet-600 font-bold">{(noiseGateThreshold * 100).toFixed(1)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0.001"
                        max="0.1"
                        step="0.001"
                        value={noiseGateThreshold}
                        onChange={(e) => props.setNoiseGateThreshold(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Sensitive</span>
                        <span>Strict</span>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default TestModeView;
