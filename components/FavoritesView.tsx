import React, { useMemo, useState } from 'react';
import { Exercise, Routine, Theme } from '../types';
import { ROUTINES, EXERCISES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { Star, Play, Clock, Music, ListMusic, Sparkles } from 'lucide-react';

interface FavoritesViewProps {
    currentTheme: Theme;
    favoriteRoutineIds: string[];
    favoriteExerciseIds: string[];
    savedAIExercises: Exercise[];
    onStartRoutine: (routine: Routine) => void;
    onSelectExercise: (exercise: Exercise) => void;
    onToggleFavoriteRoutine: (routineId: string) => void;
    onToggleFavoriteExercise: (exerciseId: string) => void;
}

// Category colors (no emojis)
const CATEGORY_STYLES: { [key: string]: { color: string; bg: string } } = {
    warmup: { color: 'text-amber-500', bg: 'bg-amber-500/10' },
    technique: { color: 'text-sky-500', bg: 'bg-sky-500/10' },
    agility: { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ear: { color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' },
    style: { color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

// Routine Card Component
const RoutineCard: React.FC<{
    routine: Routine;
    onStart: () => void;
    onToggleFavorite: () => void;
    theme: Theme;
}> = ({ routine, onStart, onToggleFavorite, theme }) => {
    const { t } = useTranslation();

    return (
        <div
            onClick={onStart}
            className="group relative p-5 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-800/60 dark:to-slate-800/30 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.button.from} ${theme.button.to} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

            {/* Star button */}
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-amber-400/20 hover:bg-amber-400/30 transition-all hover:scale-110"
                aria-label={t('favorites')}
            >
                <Star size={18} className="text-amber-400 fill-amber-400" />
            </button>

            {/* Icon badge */}
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${theme.button.from} ${theme.button.to} shadow-lg`}>
                    <ListMusic size={20} className="text-white" />
                </div>
                <div>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {t('routinesTitle')}
                    </span>
                </div>
            </div>

            {/* Content */}
            <h4 className={`font-bold text-lg mb-2 bg-clip-text text-transparent bg-gradient-to-r ${theme.gradientText.from} ${theme.gradientText.to} ${theme.gradientText.darkFrom} ${theme.gradientText.darkTo} pr-8`}>
                {t(routine.name)}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                {t(routine.description)}
            </p>

            {/* Footer with time and exercises count */}
            <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                {routine.estimatedMinutes && (
                    <span className="flex items-center gap-1">
                        <Clock size={12} />
                        ~{routine.estimatedMinutes} min
                    </span>
                )}
                <span className="flex items-center gap-1">
                    <Music size={12} />
                    {routine.exerciseIds.length} exercícios
                </span>
            </div>

            {/* Play indicator */}
            <div className="absolute bottom-3 right-3 p-2 rounded-full bg-slate-100 dark:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                <Play size={14} className="text-slate-600 dark:text-slate-300" />
            </div>
        </div>
    );
};

// Exercise Card Component
const ExerciseCard: React.FC<{
    exercise: Exercise;
    onStart: () => void;
    onToggleFavorite: () => void;
    theme: Theme;
}> = ({ exercise, onStart, onToggleFavorite, theme }) => {
    const { t } = useTranslation();
    const categoryStyle = CATEGORY_STYLES[exercise.category] || CATEGORY_STYLES.technique;

    return (
        <div
            onClick={onStart}
            className="group relative p-4 rounded-xl bg-white/70 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Star button */}
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-amber-400/20 hover:bg-amber-400/30 transition-all hover:scale-110"
                aria-label={t('favorites')}
            >
                <Star size={14} className="text-amber-400 fill-amber-400" />
            </button>

            {/* Category badge */}
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${categoryStyle.bg} ${categoryStyle.color.replace('text-', 'bg-')}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wide ${categoryStyle.color}`}>
                    {t(exercise.category as any)}
                </span>
                {exercise.isAIGenerated && (
                    <Sparkles size={12} className="text-violet-500" />
                )}
            </div>

            {/* Content */}
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 pr-6 mb-1 line-clamp-1">
                {exercise.isAIGenerated ? exercise.name : t(exercise.name)}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {exercise.isAIGenerated ? exercise.desc : t(exercise.desc)}
            </p>

            {/* Play indicator */}
            <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Play size={12} className="text-slate-600 dark:text-slate-300" />
            </div>
        </div>
    );
};

// Empty State Component
const EmptyState: React.FC<{ type: 'routines' | 'exercises'; theme: Theme }> = ({ type, theme }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700">
            <div className={`p-4 rounded-full bg-gradient-to-br ${theme.button.from} ${theme.button.to} opacity-20 mb-4`}>
                {type === 'routines' ? (
                    <ListMusic size={32} className="text-white" />
                ) : (
                    <Music size={32} className="text-white" />
                )}
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center mb-2">
                {t(type === 'routines' ? 'emptyFavoritesRoutines' : 'emptyFavoritesExercises')}
            </p>
            <p className="text-slate-300 dark:text-slate-600 text-xs text-center">
                {type === 'routines'
                    ? 'Toque na ⭐ em uma rotina para adicionar aqui'
                    : 'Toque na ⭐ em um exercício para adicionar aqui'
                }
            </p>
        </div>
    );
};

const FavoritesView: React.FC<FavoritesViewProps> = ({
    currentTheme,
    favoriteRoutineIds,
    favoriteExerciseIds,
    savedAIExercises,
    onStartRoutine,
    onSelectExercise,
    onToggleFavoriteRoutine,
    onToggleFavoriteExercise
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'routines' | 'exercises'>('routines');

    const allExercises = useMemo(() => [...EXERCISES, ...savedAIExercises], [savedAIExercises]);

    const favoriteRoutines = useMemo(() => {
        return ROUTINES.filter(routine => favoriteRoutineIds.includes(routine.id));
    }, [favoriteRoutineIds]);

    const favoriteExercises = useMemo(() => {
        return allExercises.filter(exercise => favoriteExerciseIds.includes(exercise.exercise_id));
    }, [favoriteExerciseIds, allExercises]);

    const totalFavorites = favoriteRoutines.length + favoriteExercises.length;

    return (
        <section className="flex-grow flex flex-col items-center justify-start pt-8 w-full -mt-24 md:mt-0">
            <div className="w-full space-y-6">
                {/* Summary */}
                {totalFavorites > 0 && (
                    <div className="flex items-center gap-2 mb-6">
                        <Star size={16} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {totalFavorites} {totalFavorites === 1 ? 'favorito' : 'favoritos'}
                        </span>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-3 mb-6">
                    <button
                        onClick={() => setActiveTab('routines')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${activeTab === 'routines'
                            ? `bg-gradient-to-r ${currentTheme.button.from} ${currentTheme.button.via} ${currentTheme.button.to} text-white shadow-lg shadow-${currentTheme.button.shadow}`
                            : 'bg-white/60 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/50 border border-slate-200/50 dark:border-slate-700'
                            }`}
                    >
                        <ListMusic size={16} />
                        {t('routinesTitle')}
                        {favoriteRoutines.length > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'routines'
                                ? 'bg-white/25'
                                : 'bg-slate-100 dark:bg-slate-700'
                                }`}>
                                {favoriteRoutines.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('exercises')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${activeTab === 'exercises'
                            ? `bg-gradient-to-r ${currentTheme.button.from} ${currentTheme.button.via} ${currentTheme.button.to} text-white shadow-lg shadow-${currentTheme.button.shadow}`
                            : 'bg-white/60 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/50 border border-slate-200/50 dark:border-slate-700'
                            }`}
                    >
                        <Music size={16} />
                        {t('exercisesTitle')}
                        {favoriteExercises.length > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'exercises'
                                ? 'bg-white/25'
                                : 'bg-slate-100 dark:bg-slate-700'
                                }`}>
                                {favoriteExercises.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow pb-32">
                    {activeTab === 'routines' ? (
                        favoriteRoutines.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                {favoriteRoutines.map(routine => (
                                    <RoutineCard
                                        key={routine.id}
                                        routine={routine}
                                        onStart={() => onStartRoutine(routine)}
                                        onToggleFavorite={() => onToggleFavoriteRoutine(routine.id)}
                                        theme={currentTheme}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState type="routines" theme={currentTheme} />
                        )
                    ) : (
                        favoriteExercises.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
                                {favoriteExercises.map(exercise => (
                                    <ExerciseCard
                                        key={exercise.exercise_id}
                                        exercise={exercise}
                                        onStart={() => onSelectExercise(exercise)}
                                        onToggleFavorite={() => onToggleFavoriteExercise(exercise.exercise_id)}
                                        theme={currentTheme}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState type="exercises" theme={currentTheme} />
                        )
                    )}
                </div>
            </div>
        </section>
    );
};

export default FavoritesView;