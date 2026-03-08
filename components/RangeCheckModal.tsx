import React, { useState, useCallback, useEffect } from 'react';
import { Theme } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import ThemedButton from './ThemedButton';

const RangeCheckModal: React.FC<{ onDefine: () => void; onContinue: () => void; theme: Theme }> = React.memo(({ onDefine, onContinue, theme }) => {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);

    useEffect(() => {
        const timer = requestAnimationFrame(() => setShow(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    const handleClose = useCallback((callback: () => void) => {
        setShow(false);
        setTimeout(callback, 300);
    }, []);

    return (
        <div className={`fixed inset-0 bg-black/20 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${show ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full shadow-lg text-center transition-all duration-300 ease-out ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">{t('rangeCheckTitle')}</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6">{t('rangeCheckPrompt')}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => handleClose(onContinue)} className="btn-interactive flex-1 px-4 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-transparent backdrop-blur-sm border border-slate-400 dark:border-slate-500 shadow-sm hover:bg-slate-400/10 dark:hover:bg-slate-800/20">
                        {t('continueAnyway')}
                    </button>
                    <ThemedButton theme={theme} onClick={() => handleClose(onDefine)}>
                        {t('defineRange')}
                    </ThemedButton>
                </div>
            </div>
        </div>
    );
});

export default RangeCheckModal;
