import React, { useMemo } from 'react';
import { Exercise, Routine } from '../types';
import { ROUTINES, EXERCISES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';

interface FavoritesViewProps {
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string, gradientText: { from: string, to: string, darkFrom: string, darkTo: string } };
    favoriteRoutineIds: string[];
    favoriteExerciseIds: number[];
    savedAIExercises: Exercise[];
    onStartRoutine: (routine: Routine) => void;
    onSelectExercise: (exercise: Exercise) => void;
    onToggleFavoriteRoutine: (routineId: string) => void;
    onToggleFavoriteExercise: (exerciseId: number) => void;
}

const StarIcon: React.FC<{ isFavorite: boolean }> = ({ isFavorite }) => (
    <svg className={`w-6 h-6 transition-all duration-200 ${isFavorite ? 'text-amber-400 scale-110' : 'text-slate-400 group-hover:text-amber-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const FavoriteCard: React.FC<{
    item: Exercise | Routine;
    onStart: () => void;
    onToggleFavorite: () => void;
}> = ({ item, onStart, onToggleFavorite }) => {
    const { t } = useTranslation();
    const isExercise = 'pattern' in item;

    return (
        <div
            onClick={onStart}
            className="btn-interactive relative p-5 rounded-2xl bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 shadow-lg hover:shadow-2xl h-full cursor-pointer"
        >
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className="btn-interactive absolute top-3 right-3 z-10 p-2 rounded-full bg-white/30 dark:bg-black/20 backdrop-blur-sm"
                aria-label={t('favorites')}
            >
                <StarIcon isFavorite={true} />
            </button>
            <h4 className="font-bold text-slate-800 dark:text-white pr-8">{t(item.name)}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t(isExercise ? item.desc : item.description)}</p>
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

    const allExercises = useMemo(() => [...EXERCISES, ...savedAIExercises], [savedAIExercises]);

    const favoriteRoutines = useMemo(() => {
        return ROUTINES.filter(routine => favoriteRoutineIds.includes(routine.id));
    }, [favoriteRoutineIds]);

    const favoriteExercises = useMemo(() => {
        return allExercises.filter(exercise => favoriteExerciseIds.includes(exercise.id));
    }, [favoriteExerciseIds, allExercises]);

    return (
        <section className="flex-grow flex flex-col justify-center w-full pt-8">
            <div className="space-y-8">
                <div>
                    <h3 className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-4`}>{t('favoriteRoutines')}</h3>
                    {favoriteRoutines.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {favoriteRoutines.map(routine => (
                                <FavoriteCard
                                    key={routine.id}
                                    item={routine}
                                    onStart={() => onStartRoutine(routine)}
                                    onToggleFavorite={() => onToggleFavoriteRoutine(routine.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 text-sm italic p-4 bg-white/30 dark:bg-black/20 rounded-lg shadow-lg border border-black/10 dark:border-white/10 backdrop-blur-lg">{t('emptyFavoritesRoutines')}</p>
                    )}
                </div>

                <div>
                    <h3 className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo} mb-4`}>{t('favoriteExercises')}</h3>
                    {favoriteExercises.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {favoriteExercises.map(exercise => (
                                <FavoriteCard
                                    key={exercise.id}
                                    item={exercise}
                                    onStart={() => onSelectExercise(exercise)}
                                    onToggleFavorite={() => onToggleFavoriteExercise(exercise.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 text-sm italic p-4 bg-white/30 dark:bg-black/20 rounded-lg shadow-lg border border-black/10 dark:border-white/10 backdrop-blur-lg">{t('emptyFavoritesExercises')}</p>
                    )}
                </div>
            </div>
        </section>
    );
};

export default FavoritesView;