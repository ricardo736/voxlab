import React, { useMemo } from 'react';
import { Exercise } from '../types';
import { TranslationKey } from '../i18n';
import { EXERCISES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';

interface ExerciseViewProps {
    onSelectExercise: (exercise: Exercise) => void;
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string, gradientText: { from: string, to: string, darkFrom: string, darkTo: string } };
    savedAIExercises: Exercise[];
    favoriteExerciseIds: number[];
    onToggleFavorite: (exerciseId: number) => void;
}

const StarIcon: React.FC<{ isFavorite: boolean }> = ({ isFavorite }) => (
    <svg className={`w-6 h-6 transition-all duration-200 ${isFavorite ? 'text-amber-400 scale-110' : 'text-slate-400 group-hover:text-amber-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const ExerciseCard: React.FC<{
    exercise: Exercise;
    onSelect: (exercise: Exercise) => void;
    onToggleFavorite: (exerciseId: number) => void;
    isFavorite: boolean;
}> = ({ exercise, onSelect, onToggleFavorite, isFavorite }) => {
    const { t } = useTranslation();
    return (
        <div
            onClick={() => onSelect(exercise)}
            className="btn-interactive relative p-5 rounded-2xl bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 shadow-lg hover:shadow-2xl hover:border-violet-300/50 transition-all duration-300 ease-out h-full cursor-pointer"
        >
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(exercise.id); }}
                className="btn-interactive group absolute top-3 right-3 z-10 p-2 rounded-full bg-white/30 dark:bg-black/20 backdrop-blur-sm transition-colors duration-200"
                aria-label={t('favorites')}
            >
                <StarIcon isFavorite={isFavorite} />
            </button>

            <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-slate-800 dark:text-white pr-8">{t(exercise.name)}</h4>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t(exercise.desc)}</p>

            {exercise.isAIGenerated && (
                <span className="absolute bottom-4 left-4 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">{t('aiGenerated')}</span>
            )}
        </div>
    );
};


const ExerciseView: React.FC<ExerciseViewProps> = ({ onSelectExercise, currentTheme, savedAIExercises, favoriteExerciseIds, onToggleFavorite }) => {
    const { t } = useTranslation();

    const allExercises = useMemo(() => [...EXERCISES, ...savedAIExercises], [savedAIExercises]);

    const exercisesByCategory = useMemo(() => {
        return allExercises.reduce((acc, exercise) => {
            const categoryKey = exercise.isAIGenerated ? 'aiGeneratedExercises' : exercise.category as TranslationKey;
            if (!acc[categoryKey]) {
                acc[categoryKey] = [];
            }
            acc[categoryKey].push(exercise);
            return acc;
        }, {} as Record<TranslationKey, Exercise[]>);
    }, [allExercises]);

    const categoryOrder: TranslationKey[] = [
        'warmupsAndBasics', 'breathAndSupport', 'resonanceAndTone', 'pitchAndIntonation',
        'scalesAndAgility', 'belting', 'cooldowns', 'aiGeneratedExercises'
    ];

    return (
        <section className="flex-grow flex flex-col justify-center w-full pt-8">
            <div className="space-y-8">
                {categoryOrder.map(categoryKey => {
                    const exercises = exercisesByCategory[categoryKey];
                    if (!exercises || exercises.length === 0) return null;
                    return (
                        <div key={categoryKey}>
                            <h3 className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-4`}>{t(categoryKey)}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {exercises.map(exercise => (
                                    <ExerciseCard
                                        key={exercise.id}
                                        exercise={exercise}
                                        onSelect={onSelectExercise}
                                        onToggleFavorite={onToggleFavorite}
                                        isFavorite={favoriteExerciseIds.includes(exercise.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default ExerciseView;