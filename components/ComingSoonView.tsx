import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import ComingSoonCard from './ComingSoonCard';
import { Theme } from '../types';

interface ComingSoonViewProps {
    title: string;
    description: string;
    currentTheme: Theme;
    isStudies?: boolean;
}

// Icons for the 'Studies' section
const TokenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
);

const RecordVideoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const TeacherIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.176-5.97M15 21h6v-1a6 6 0 00-9-5.197" />
    </svg>
);

const MusicTheoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19l-6 3V9l6-3m0 13V6m12 6l-12-4" />
    </svg>
);

const MasterclassIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const ComingSoonView: React.FC<ComingSoonViewProps> = ({ title, description, currentTheme, isStudies }) => {
    const { t } = useTranslation();

    if (isStudies) {
        const futureFeatures = [
            { icon: <TokenIcon />, titleKey: 'importTokenTitle', descKey: 'importTokenDesc' },
            { icon: <RecordVideoIcon />, titleKey: 'recordVideo', descKey: 'recordVideoDesc' },
            { icon: <TeacherIcon />, titleKey: 'accessStudiesPrompt', descKey: 'teacherStudiesDesc' },
            { icon: <MusicTheoryIcon />, titleKey: 'interactiveTheoryTitle', descKey: 'interactiveTheoryDesc' },
            { icon: <MasterclassIcon />, titleKey: 'masterclassesTitle', descKey: 'masterclassesDesc' },
        ];

        return (
            <section className="flex-grow flex flex-col justify-center animate-fade-in w-full -mt-36 md:mt-0">
                <div className="text-center mb-6">
                    <p className="text-slate-500 dark:text-slate-400">{t('studiesDesc')}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {futureFeatures.map(feature => (
                        <ComingSoonCard
                            key={feature.titleKey}
                            title={t(feature.titleKey)}
                            description={t(feature.descKey)}
                            theme={currentTheme}
                        >
                            <div className="flex items-center justify-center h-16">
                                {feature.icon}
                            </div>
                        </ComingSoonCard>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="flex-grow flex flex-col justify-center items-center w-full animate-fade-in">
            <div className="w-full max-w-md">
                <ComingSoonCard title={title} description={description} theme={currentTheme}>
                    <div className="h-24 w-full flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-800/30">
                        <p className="text-slate-400 dark:text-slate-500 font-medium">{t('comingSoon')}...</p>
                    </div>
                </ComingSoonCard>
            </div>
        </section>
    );
};

export default ComingSoonView;