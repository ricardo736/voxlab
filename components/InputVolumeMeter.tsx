import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface InputVolumeMeterProps {
    micGain: number;
}

const InputVolumeMeter: React.FC<InputVolumeMeterProps> = ({ micGain }) => {
    const { t } = useTranslation();
    const isClipping = micGain >= 98;
    const meterColor = isClipping ? 'bg-red-500' : micGain > 85 ? 'bg-amber-400' : 'bg-green-500';

    return (
        <div className="mt-4 w-full">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                <p>{t('inputVolume')}</p>
                {isClipping && <p className="font-bold text-red-500 animate-pulse">{t('clippingWarning')}</p>}
            </div>
            <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-300/50 dark:border-slate-600">
                <div className={`h-full rounded-full transition-all duration-75 ease-linear ${meterColor}`} style={{ width: `${micGain}%` }} ></div>
            </div>
        </div>
    );
};

// Only re-render if micGain changes by more than 1%
export default React.memo(InputVolumeMeter, (prevProps, nextProps) => {
    return Math.abs(prevProps.micGain - nextProps.micGain) < 1;
});

