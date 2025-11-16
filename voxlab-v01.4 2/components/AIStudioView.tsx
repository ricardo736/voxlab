import React, { useState, useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Exercise } from '../types';

interface VoxLabAIViewProps {
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string, buttonGradient: string, gradientText: { from: string, to: string, darkFrom: string, darkTo: string } };
    onStartExercise: (exercise: Exercise) => void;
    onSave: (exercise: Exercise) => void;
    onToggleFavorite: (exerciseId: number) => void;
    savedAIExercises: Exercise[];
    favoriteExerciseIds: number[];
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 dark:border-violet-400"></div>
    </div>
);
  
const StarIcon: React.FC<{ isFavorite: boolean }> = ({ isFavorite }) => (
    <svg className={`w-6 h-6 transition-all duration-200 ${isFavorite ? 'text-amber-400 scale-110' : 'text-slate-400 group-hover:text-amber-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);


const VoxLabAIView: React.FC<VoxLabAIViewProps> = ({ currentTheme, onStartExercise, onSave, onToggleFavorite, savedAIExercises, favoriteExerciseIds }) => {
    const { t, language } = useTranslation();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<Exercise | null>(null);
    const [error, setError] = useState('');

    const isSaved = useMemo(() => {
        if (!result) return false;
        return savedAIExercises.some(ex => ex.id === result.id);
    }, [result, savedAIExercises]);

    const isFavorite = useMemo(() => {
        if (!result) return false;
        return favoriteExerciseIds.includes(result.id);
    }, [result, favoriteExerciseIds]);

    const handleGenerate = async () => {
        if (!prompt || isLoading) return;
        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const fullPrompt = `Create a custom vocal exercise based on the following user request: "${prompt}". The response MUST be a valid JSON object matching the provided schema. All user-facing text in the JSON response (like name, desc, instructions) must be in ${language.code}. The category must be one of the exact strings provided in the schema enum.`;

            const schema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "A creative name for the exercise." },
                    desc: { type: Type.STRING, description: "A short, one-sentence description of the exercise's purpose." },
                    instructions: { type: Type.STRING, description: "Detailed, step-by-step instructions on how to perform the exercise. Use clear and encouraging language." },
                    pattern: {
                        type: Type.ARRAY,
                        description: "A sequence of semitone offsets from a starting note. E.g., a simple 5-tone scale is [0, 2, 4, 5, 7, 5, 4, 2, 0]. Keep it melodic and logical.",
                        items: { type: Type.INTEGER }
                    },
                    duration: { type: Type.INTEGER, description: "The recommended duration of each note in the pattern, in milliseconds (e.g., 500)." },
                    category: {
                        type: Type.STRING,
                        description: "The most fitting category for this exercise. Choose one of: 'Warm-ups & Basics', 'Breath & Support', 'Resonance & Tone', 'Pitch & Intonation', 'Scales & Agility', 'Belting', 'Cooldowns'."
                    }
                },
                required: ["name", "desc", "instructions", "pattern", "duration", "category"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: fullPrompt }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                    },
                ]
            });

            const jsonResult = JSON.parse(response.text);
            const exerciseResult: Exercise = {
                ...jsonResult,
                id: Date.now(),
                isAIGenerated: true,
            };
            setResult(exerciseResult);

        } catch (e) {
            console.error("Error calling Gemini API:", e);
            setError('An error occurred while generating the exercise. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFavoriteClick = () => {
        if (!result) return;
        if (!isSaved) {
            onSave(result);
        }
        onToggleFavorite(result.id);
    };

    return (
        <section className="flex-grow flex flex-col justify-center pt-8">
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">{t('voxlabaiDesc')}</p>
            
            <div className="relative border border-amber-400/50 bg-white/30 dark:bg-black/20 backdrop-blur-lg rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-200 mb-6 shadow-lg">
                 <span className="font-bold">{t('beta')}:</span> {t('voxlabaiBeta')}
            </div>

            <div className="space-y-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('voxlabaiPrompt')}
                    className="w-full h-28 p-3 border border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-black/40 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                    disabled={isLoading}
                />
                <button 
                    onClick={handleGenerate} 
                    disabled={isLoading || !prompt}
                    className={`
                        px-8 py-3 rounded-full font-medium text-base text-white
                        flex items-center justify-center gap-2
                        relative overflow-hidden group 
                        transition-all transform hover:scale-105 active:scale-95
                        bg-gradient-to-br ${currentTheme.buttonGradient}
                        shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
                        backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    style={{
                        '--shadow-rgb': currentTheme.shadowRgb 
                    } as React.CSSProperties}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative z-10 flex items-center gap-2">
                        <span>{isLoading ? t('generate') + '...' : t('generate')}</span>
                    </span>
                </button>
            </div>

            {error && <p className="text-red-500 dark:text-red-400 mt-4">{error}</p>}

            {(isLoading || result) && (
                <div className="mt-8 p-5 border border-black/10 dark:border-white/10 rounded-2xl bg-white/30 dark:bg-black/20 backdrop-blur-lg shadow-2xl">
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        result &&
                        <div className="space-y-4">
                             <div>
                                <div className="flex justify-between items-start">
                                    <span className={`text-xs font-bold uppercase ${currentTheme.secondary}`}>{result.category}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">{t('aiGenerated')}</span>
                                        <button
                                            onClick={handleFavoriteClick}
                                            className="btn-interactive p-1.5 rounded-full bg-white/30 dark:bg-black/20 backdrop-blur-sm"
                                            aria-label={t('favorites')}
                                        >
                                            <StarIcon isFavorite={isFavorite} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo}`}>{result.name}</h3>
                                <p className="text-slate-600 dark:text-slate-300 italic">"{result.desc}"</p>
                            </div>
                            <div className="border-t border-slate-200/80 dark:border-slate-700/80 my-2"></div>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-white">Instructions</h4>
                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{result.instructions}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-white">Pattern</h4>
                                <p className="font-mono text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded p-2">
                                    {result.pattern.join(', ')}
                                </p>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-white">Note Duration</h4>
                                    <p className="text-slate-600 dark:text-slate-300">{result.duration}ms</p>
                                </div>
                             </div>
                             <div className="border-t border-slate-200/80 dark:border-slate-700/80 my-2"></div>

                             <button
                                onClick={() => onStartExercise(result)}
                                className={`
                                    px-8 py-3 rounded-full font-medium text-base text-white
                                    flex items-center justify-center gap-2
                                    relative overflow-hidden group 
                                    transition-all transform hover:scale-105 active:scale-95
                                    bg-gradient-to-br ${currentTheme.buttonGradient}
                                    shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
                                    backdrop-blur-sm
                                `}
                                style={{
                                    '--shadow-rgb': currentTheme.shadowRgb 
                                } as React.CSSProperties}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                <span className="relative z-10 flex items-center gap-2">
                                    <span>{t('practiceThisExercise')}</span>
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default VoxLabAIView;