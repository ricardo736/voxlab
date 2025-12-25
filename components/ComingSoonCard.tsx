import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Theme } from '../types';

interface ComingSoonCardProps {
    title: string;
    description: string;
    children: React.ReactNode;
    theme: Theme;
}

const ComingSoonCard: React.FC<ComingSoonCardProps> = ({ title, description, children, theme }) => {
    const { t } = useTranslation();
    return (
        <div className="relative opacity-50 cursor-not-allowed">
            <div className="absolute -top-2 -right-2 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md z-10">
                {t('comingSoon')}
            </div>
            <div className="relative border border-slate-200 dark:border-slate-700 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden">
                <h3 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-br ${theme.gradientText.from} ${theme.gradientText.to} ${theme.gradientText.darkFrom} ${theme.gradientText.darkTo} mb-1`}>{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{description}</p>
                <div className="pointer-events-none">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ComingSoonCard;