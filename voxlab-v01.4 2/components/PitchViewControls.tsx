import React from 'react';
import { semitoneToNoteName } from '../utils';
import { useTranslation } from '../hooks/useTranslation';

interface PitchViewControlsProps {
    centerSemitone: number;
    setCenterSemitone: (value: number) => void;
    visibleOctaves: number;
    setVisibleOctaves: (value: number) => void;
    autoFitEnabled: boolean;
    setAutoFitEnabled: (value: boolean) => void;
    gainValue: number;
    setGainValue: (value: number) => void;
    noiseGateThreshold: number;
    setNoiseGateThreshold: (value: number) => void;
    compressorThreshold: number;
    setCompressorThreshold: (value: number) => void;
    compressorRatio: number;
    setCompressorRatio: (value: number) => void;
    compressorRelease: number;
    setCompressorRelease: (value: number) => void;
    autoGainEnabled: boolean;
    setAutoGainEnabled: (value: boolean) => void;
    eqLowGain: number;
    setEqLowGain: (value: number) => void;
    eqMidGain: number;
    setEqMidGain: (value: number) => void;
    eqHighGain: number;
    setEqHighGain: (value: number) => void;
}

const ControlSlider: React.FC<{id: string, label: string, value: number, onInput: (v: number) => void, min: number, max: number, step: number, unit?: string, disabled?: boolean }> = 
    ({ id, label, value, onInput, min, max, step, unit, disabled }) => (
    <div>
        <label htmlFor={id} className="block text-xs font-medium text-slate-500 dark:text-slate-400 text-center mb-1">
            {label}{unit && ':'} <span className="font-bold text-violet-600 dark:text-violet-400">{value.toFixed(unit ? 2 : 0)}{unit}</span>
        </label>
        <input id={id} type="range" min={min} max={max} step={step}
            value={value}
            onInput={(e) => onInput(parseFloat(e.currentTarget.value))}
            disabled={disabled}
            className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
        />
    </div>
);

const Section: React.FC<{title?: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="p-3 rounded-2xl bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 shadow-lg space-y-3">
        {title && <h3 className="text-center font-bold text-sm text-slate-600 dark:text-slate-300 -mb-1">{title}</h3>}
        {children}
    </div>
);


const PitchViewControls: React.FC<PitchViewControlsProps> = (props) => {
    const { t } = useTranslation();
    const { 
        centerSemitone, setCenterSemitone, visibleOctaves, setVisibleOctaves, autoFitEnabled, setAutoFitEnabled, 
        gainValue, setGainValue, noiseGateThreshold, setNoiseGateThreshold, 
        compressorThreshold, setCompressorThreshold, compressorRatio, setCompressorRatio, compressorRelease, setCompressorRelease,
        autoGainEnabled, setAutoGainEnabled,
        eqLowGain, setEqLowGain, eqMidGain, setEqMidGain, eqHighGain, setEqHighGain
    } = props;

    return (
        <div className="w-full px-2 mb-6 space-y-4">
            {/* View Controls */}
            <Section>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 flex items-center justify-center">
                        <label htmlFor="autofit-toggle" className="text-sm font-medium text-slate-600 dark:text-slate-300 mr-3">{t('autoFit')}</label>
                        <button id="autofit-toggle" role="switch" aria-checked={autoFitEnabled} onClick={() => setAutoFitEnabled(!autoFitEnabled)} className={`${autoFitEnabled ? 'bg-violet-600' : 'bg-slate-400'} btn-interactive relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}><span className={`${autoFitEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} /></button>
                    </div>
                    <div className={`transition-opacity ${autoFitEnabled ? 'opacity-50' : 'opacity-100'}`}>
                        <ControlSlider id="range-slider" label={t('centerNote')} value={centerSemitone} onInput={setCenterSemitone} min={-39} max={48} step={1} disabled={autoFitEnabled} unit={` (${semitoneToNoteName(centerSemitone)})`}/>
                    </div>
                    <div>
                        <ControlSlider id="zoom-slider" label={t('rangeOctaves')} value={visibleOctaves} onInput={setVisibleOctaves} min={0.5} max={5} step={0.1} unit={` ${t('octavesUnit')}`}/>
                    </div>
                </div>
            </Section>

            {/* Audio Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title={t('inputVolume')}>
                     <div className="flex items-center justify-center">
                        <label htmlFor="autofit-toggle" className="text-sm font-medium text-slate-600 dark:text-slate-300 mr-3">{t('autoGain')}</label>
                        <button id="autofit-toggle" role="switch" aria-checked={autoGainEnabled} onClick={() => setAutoGainEnabled(!autoGainEnabled)} className={`${autoGainEnabled ? 'bg-violet-600' : 'bg-slate-400'} btn-interactive relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}><span className={`${autoGainEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} /></button>
                    </div>
                    <div className={`transition-opacity ${autoGainEnabled ? 'opacity-50' : 'opacity-100'}`}>
                        <ControlSlider id="gain-slider" label="" value={gainValue} onInput={setGainValue} min={0.1} max={5} step={0.1} disabled={autoGainEnabled}/>
                    </div>
                    <ControlSlider id="noise-gate-slider" label={t('noiseGate')} value={noiseGateThreshold} onInput={setNoiseGateThreshold} min={0.001} max={0.1} step={0.001} />
                </Section>
                
                <Section title={t('compressor')}>
                    <ControlSlider id="compressor-slider" label="Threshold" value={compressorThreshold} onInput={setCompressorThreshold} min={-100} max={0} step={1} unit=" dB"/>
                    <ControlSlider id="compressor-ratio-slider" label={t('compressorRatio')} value={compressorRatio} onInput={setCompressorRatio} min={1} max={20} step={1} />
                    <ControlSlider id="compressor-release-slider" label={t('release')} value={compressorRelease} onInput={setCompressorRelease} min={0.01} max={1} step={0.01} unit="s" />
                </Section>

                <div className="md:col-span-2">
                    <Section title={t('equalizer')}>
                        <div className="grid grid-cols-3 gap-3">
                             <ControlSlider id="eq-low-slider" label={t('low')} value={eqLowGain} onInput={setEqLowGain} min={-20} max={20} step={1} unit=" dB"/>
                             <ControlSlider id="eq-mid-slider" label={t('mid')} value={eqMidGain} onInput={setEqMidGain} min={-20} max={20} step={1} unit=" dB"/>
                             <ControlSlider id="eq-high-slider" label={t('high')} value={eqHighGain} onInput={setEqHighGain} min={-20} max={20} step={1} unit=" dB"/>
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default PitchViewControls;