import React, { useState, useCallback, useEffect } from 'react';
import { Theme } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import ThemedButton from './ThemedButton';

const RoutineCompleteModal: React.FC<{ onFinish: () => void; theme: Theme }> = React.memo(({ onFinish, theme }) => {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);

    useEffect(() => {
        const timer = requestAnimationFrame(() => setShow(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    const handleClose = useCallback(() => {
        setShow(false);
        setTimeout(onFinish, 300);
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 bg-black/20 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${show ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full shadow-lg text-center transition-all duration-300 ease-out ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">{t('routineComplete')}</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6">{t('drinkWaterSuggestion')}</p>
                <ThemedButton onClick={handleClose} theme={theme} className="w-full">{t('finish')}</ThemedButton>
            </div>
        </div>
    );
});

export default RoutineCompleteModal;
