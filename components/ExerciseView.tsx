import React from 'react';
import { Exercise, Theme } from '../types';
import { EXERCISES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { Heart, Sparkles, Music, Star } from 'lucide-react';

interface ExerciseViewProps {
    onSelectExercise: (exercise: Exercise) => void;
    currentTheme: Theme;
    savedAIExercises: Exercise[];
    favoriteExerciseIds: string[];
    onToggleFavorite: (exerciseId: string) => void;
}

const GROUP_COLORS: { [key: string]: { text: string; bg: string; border: string; hoverText: string; } } = {
    "warmup": { text: "text-amber-600", bg: "bg-amber-100", border: "hover:border-amber-400", hoverText: "group-hover:text-amber-700" },
    "technique": { text: "text-sky-600", bg: "bg-sky-100", border: "hover:border-sky-400", hoverText: "group-hover:text-sky-700" },
    "agility": { text: "text-emerald-600", bg: "bg-emerald-100", border: "hover:border-emerald-400", hoverText: "group-hover:text-emerald-700" },
    "ear": { text: "text-fuchsia-600", bg: "bg-fuchsia-100", border: "hover:border-fuchsia-400", hoverText: "group-hover:text-fuchsia-700" },
    "style": { text: "text-rose-600", bg: "bg-rose-100", border: "hover:border-rose-400", hoverText: "group-hover:text-rose-700" },
    "Default": { text: "text-slate-600", bg: "bg-slate-100", border: "hover:border-violet-300", hoverText: "group-hover:text-violet-700" }
};

const ExerciseView: React.FC<ExerciseViewProps> = ({ onSelectExercise, currentTheme, savedAIExercises, favoriteExerciseIds, onToggleFavorite }) => {
    const { t } = useTranslation();

    // Combine built-in and AI-generated exercises
    const allExercises = [...EXERCISES, ...savedAIExercises];

    // Group exercises by category
    // Define a specific order matching PRO
    const orderedCategories = [
        'warmup',
        'technique',
        'agility',
        'ear',
        'style'
    ];

    // Get all unique categories present in the exercises
    const presentCategories = Array.from(new Set(allExercises.map(ex => ex.category)));

    // Sort present categories based on orderedCategories, appending any others at the end
    const categories = [
        ...orderedCategories.filter(c => presentCategories.includes(c)),
        ...presentCategories.filter(c => !orderedCategories.includes(c))
    ];

    return (
        <div className="flex-grow overflow-y-auto px-4 py-6 font-sans">
            <div className="max-w-4xl mx-auto space-y-8 pb-32">

                {categories.map(category => {
                    const categoryExercises = allExercises.filter(ex => ex.category === category);
                    const colors = GROUP_COLORS[category] || GROUP_COLORS.Default;

                    return (
                        <section key={category}>
                            <h2 className="text-base font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <Music size={18} /> {t(category as any)}
                            </h2>
                            {/* Description placeholder if we had category descriptions */}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {categoryExercises.map(exercise => {
                                    const isFavorite = favoriteExerciseIds.includes(exercise.exercise_id);
                                    const isAI = exercise.isAIGenerated;

                                    return (
                                        <button
                                            key={exercise.exercise_id}
                                            onClick={() => onSelectExercise(exercise)}
                                            className={`text-left p-3 rounded-xl border-2 transition-all duration-200 relative overflow-hidden hover:scale-[1.02] hover:shadow-lg ${colors.border} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700`}
                                        >
                                            {/* Star button - Top Right */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onToggleFavorite(exercise.exercise_id);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm text-slate-400 hover:text-amber-500 transition-all hover:scale-110 z-20 cursor-pointer"
                                            >
                                                <Star size={16} className={isFavorite ? "fill-amber-400 text-amber-400" : ""} />
                                            </button>

                                            {isAI && (
                                                <div className="absolute top-2 right-10 p-1.5">
                                                    <Sparkles size={16} className="text-violet-500" />
                                                </div>
                                            )}

                                            <div className="relative z-10 pr-8">
                                                <h3 className={`font-bold text-base mb-1.5 transition-colors ${colors.hoverText} text-slate-800 dark:text-slate-200`}>
                                                    {exercise.isAIGenerated ? exercise.name : t(exercise.name)}
                                                </h3>
                                                <p className="text-xs line-clamp-2 pb-6 text-slate-500 dark:text-slate-400">
                                                    {exercise.isAIGenerated ? exercise.desc : t(exercise.desc)}
                                                </p>
                                            </div>

                                            {/* Category tag - Bottom Right */}
                                            <span className={`absolute bottom-2 right-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} z-20`}>
                                                {t(category as any)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

export default ExerciseView;
