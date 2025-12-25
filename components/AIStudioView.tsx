
import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { GoogleGenAI, Type } from "@google/genai";
import { Exercise, Theme, MidiExercise } from '../types';
import ThemedButton from './ThemedButton';
import { Play, Square } from 'lucide-react';
import { parseUserSemitone, rhythmNameToBeats } from '../exerciseUtils';
interface VoxLabAIViewProps {
    currentTheme: Theme;
    onStartExercise: (exercise: Exercise) => void;
    onSave: (exercise: Exercise) => void;
    onToggleFavorite: (exerciseId: number) => void;
    savedAIExercises: Exercise[];
    favoriteExerciseIds: number[];
    playNote: (semitone: number, duration: number, forExercise?: boolean) => void;
    aiResult: Exercise | null;
    setAiResult: (result: Exercise | null) => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
    </div>
);

const StarIcon: React.FC<{ isFavorite: boolean }> = ({ isFavorite }) => (
    <svg className={`w-6 h-6 transition-all duration-200 ${isFavorite ? 'text-amber-400 scale-110' : 'text-slate-400 group-hover:text-amber-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const MagicIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

// Convert beats to musical notation
const beatsToMusicalNotation = (beats: number): { notation: string; symbol: string } => {
    // beats: 4 = whole note, 2 = half note, 1 = quarter note, 0.5 = eighth, 0.25 = sixteenth

    if (beats >= 3.5) return { notation: 'Whole Note', symbol: '𝅝' };
    if (beats >= 1.75) return { notation: 'Half Note', symbol: '𝅗𝅥' };
    if (beats >= 0.875) return { notation: 'Quarter Note', symbol: '♩' };
    if (beats >= 0.4375) return { notation: 'Eighth Note', symbol: '♪' };
    if (beats >= 0.21875) return { notation: 'Sixteenth Note', symbol: '𝅘𝅥𝅯' };
    return { notation: 'Very Short', symbol: '𝅘𝅥𝅰' };
};

const VoxLabAIView: React.FC<VoxLabAIViewProps> = ({ currentTheme, onStartExercise, onSave, onToggleFavorite, savedAIExercises, favoriteExerciseIds, playNote, aiResult, setAiResult }) => {
    const { t, language } = useTranslation();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Use lifted state from props instead of local state
    const result = aiResult;
    const setResult = setAiResult;
    const [error, setError] = useState('');

    // Refine State
    const [isRefining, setIsRefining] = useState(false);
    const [refinePrompt, setRefinePrompt] = useState('');
    const [isRefineLoading, setIsRefineLoading] = useState(false);

    // Preview State
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewTimeoutId, setPreviewTimeoutId] = useState<NodeJS.Timeout | null>(null);
    const previewClickedRef = useRef(false);


    // API Key Management
    const [userApiKey, setUserApiKey] = useState<string>('');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    // Check for API key on mount
    React.useEffect(() => {
        const envKey = process.env.API_KEY;
        const storedKey = localStorage.getItem('voxlab_api_key');

        if (envKey && envKey.length > 0 && envKey !== 'undefined') {
            // Environment key exists and is valid
            setShowApiKeyInput(false);
        } else if (storedKey) {
            // User has a stored key
            setUserApiKey(storedKey);
            setShowApiKeyInput(false);
        } else {
            // No key found anywhere
            setShowApiKeyInput(true);
        }
    }, []);

    const handleSaveApiKey = (key: string) => {
        setUserApiKey(key);
        localStorage.setItem('voxlab_api_key', key);
        setShowApiKeyInput(false);
    };

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

        // Determine which key to use
        const envKey = process.env.API_KEY;
        const apiKeyToUse = (envKey && envKey.length > 0 && envKey !== 'undefined') ? envKey : userApiKey;

        if (!apiKeyToUse) {
            setShowApiKeyInput(true);
            setError('Please enter a valid Google AI API Key to continue.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult(null);

        setIsRefining(false);

        try {
            const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
            const fullPrompt = `Create a custom vocal exercise based on the following user request: "${prompt}". 
            
The response MUST be a valid JSON object matching the provided schema (VoxLab Exercise Format v1.5).
All user-facing text in the JSON response (like name, instructions) must be in ${language.name}.
The category must be one of the exact strings provided in the schema enum.

IMPORTANT PEDAGOGICAL RULE:
- Unless specifically asked for a continuous run (like "agility" or "speed"), ALWAYS insert a rest (duration 1.0 or more) at the end of the pattern.
- This allows the app to play the reference chord for the NEXT key before the user starts singing.
- The pattern structure should generally be: [Notes...] -> [Rest].

UNDERSTANDING USER REQUESTS:
- Recognize musical terms in multiple languages (English, Portuguese, Spanish, Italian, etc.)
- Examples: "scale" = "escala" = "scala", "arpeggio" = "arpejo" = "arpeggio"
- Understand abbreviations: "maj" = "major", "min" = "minor", "dim" = "diminished"
- Recognize note names: Do, Re, Mi, Fa, Sol, La, Si (solfège) = C, D, E, F, G, A, B
- Common requests: "warm-up", "aquecimento", "sirene", "siren", "lip trill", "tongue trill"
- Interval requests: "thirds", "terças", "fifths", "quintas", "octaves", "oitavas"

MUSICIAN-FRIENDLY INPUT (IMPORTANT!):
Musicians think in 1-based scale degrees: "1-3-5" means root, third, fifth.
But the JSON format uses 0-based semitones: 0=root, 4=major 3rd, 7=perfect 5th.

When users say:
- "1" or "root" → use semitone: 0
- "2" or "major 2nd" → use semitone: 2
- "3" or "major 3rd" → use semitone: 4
- "b3" or "minor 3rd" → use semitone: 3
- "4" or "perfect 4th" → use semitone: 5
- "5" or "perfect 5th" → use semitone: 7
- "6" or "major 6th" → use semitone: 9
- "b7" or "minor 7th" → use semitone: 10
- "7" or "major 7th" → use semitone: 11
- "8" or "octave" → use semitone: 12

EXERCISE FORMAT v1.5:
- Use "notes" array (not "pattern")
- Each note has: type ("note" or "rest"), semitone (0-12), duration (in beats), lyric (optional)
- Semitones are 0-based: 0=root, 1=minor 2nd, 2=major 2nd, 3=minor 3rd, 4=major 3rd, etc.
- Durations are in BEATS: 4.0=whole, 2.0=half, 1.0=quarter, 0.5=eighth, 0.25=sixteenth
- You can use dotted notes: 3.0=dotted half, 1.5=dotted quarter, 0.75=dotted eighth
- You can add rests for breathing: { "type": "rest", "duration": 1.0 }

BPM (Beats Per Minute):
- Slow: 60-80 BPM (warm-ups, breath work)
- Moderate: 80-120 BPM (scales, basic exercises)
- Fast: 120-180 BPM (agility, runs, coloratura)

EXAMPLES:

Major Arpeggio (1-3-5-8):
{
  "notes": [
    { "type": "note", "semitone": 0, "duration": 1.0, "lyric": "La" },
    { "type": "note", "semitone": 4, "duration": 1.0, "lyric": "La" },
    { "type": "note", "semitone": 7, "duration": 1.0, "lyric": "La" },
    { "type": "note", "semitone": 12, "duration": 2.0, "lyric": "La" }
  ]
}

Blues Scale with Rest:
{
  "notes": [
    { "type": "note", "semitone": 0, "duration": 1.0, "lyric": "Ah" },
    { "type": "note", "semitone": 3, "duration": 1.0, "lyric": "Ah" },
    { "type": "note", "semitone": 5, "duration": 1.0, "lyric": "Ah" },
    { "type": "rest", "duration": 0.5 },
    { "type": "note", "semitone": 6, "duration": 1.0, "lyric": "Ah" },
    { "type": "note", "semitone": 7, "duration": 1.0, "lyric": "Ah" },
    { "type": "note", "semitone": 10, "duration": 1.0, "lyric": "Ah" }
  ]
}`;

            const noteSchema = {
                type: Type.OBJECT,
                properties: {
                    type: {
                        type: Type.STRING,
                        description: "Either 'note' (sing a pitch) or 'rest' (silence/breathing pause)"
                    },
                    semitone: {
                        type: Type.INTEGER,
                        description: "Semitones from root (0-12+). 0=root, 4=major 3rd, 7=perfect 5th, 12=octave. Required for 'note' type."
                    },
                    duration: {
                        type: Type.NUMBER,
                        description: "Duration in BEATS. 4.0=whole, 2.0=half, 1.0=quarter, 0.5=eighth, 0.25=sixteenth. Can use dotted: 1.5=dotted quarter."
                    },
                    lyric: {
                        type: Type.STRING,
                        description: "Optional syllable to sing (e.g., 'Ah', 'La', 'Do'). Only for 'note' type."
                    }
                },
                required: ["type", "duration"]
            };

            const schema = {
                type: Type.OBJECT,
                properties: {
                    exercise_id: {
                        type: Type.STRING,
                        description: "Unique ID like 'AI_GEN_001'. Use 'AI_GEN_' prefix + timestamp or random number."
                    },
                    name: {
                        type: Type.STRING,
                        description: "A creative name for the exercise in the user's language."
                    },
                    category: {
                        type: Type.STRING,
                        description: "Choose one: 'warmUpsAndBasics', 'breathAndSupport', 'resonanceAndTone', 'pitchAndIntonation', 'scalesAndAgility', 'belting', 'cooldowns'"
                    },
                    key_center: {
                        type: Type.STRING,
                        description: "Starting pitch like 'C4', 'D4', 'A3'. Default to 'C4' if not specified."
                    },
                    tempo_bpm: {
                        type: Type.INTEGER,
                        description: "Tempo in BPM. Slow=60-80, Moderate=90-110, Fast=120-160."
                    },
                    time_signature: {
                        type: Type.STRING,
                        description: "Time signature like '4/4', '3/4', '6/8'. Default to '4/4'."
                    },
                    notes: {
                        type: Type.ARRAY,
                        description: "Array of note/rest objects. Each has type, semitone (for notes), duration, and optional lyric.",
                        items: noteSchema
                    },
                    instructions: {
                        type: Type.STRING,
                        description: "Detailed, encouraging instructions in the user's language."
                    }
                },
                required: ["exercise_id", "name", "category", "key_center", "tempo_bpm", "time_signature", "notes", "instructions"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const jsonResult = JSON.parse(response.text);
            const exerciseResult: MidiExercise = {
                ...jsonResult,
                isAIGenerated: true,
            };
            setResult(exerciseResult as any);

        } catch (e) {
            console.error("Error calling Gemini API:", e);
            setError('An error occurred while generating the exercise. Please check your API key and try again.');
            // If it's an auth error, maybe prompt for key again?
            if (String(e).includes('401') || String(e).includes('API key')) {
                setShowApiKeyInput(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefine = async () => {
        if (!refinePrompt || isRefineLoading || !result) return;

        // Determine which key to use
        const envKey = process.env.API_KEY;
        const apiKeyToUse = (envKey && envKey.length > 0 && envKey !== 'undefined') ? envKey : userApiKey;

        if (!apiKeyToUse) {
            setShowApiKeyInput(true);
            setError('Please enter a valid Google AI API Key to continue.');
            return;
        }

        setIsRefineLoading(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
            const fullPrompt = `
                I have a vocal exercise defined in JSON: ${JSON.stringify(result)}.
                Please modify this exercise based on this request: "${refinePrompt}".
                The response MUST be a valid JSON object matching the provided schema.
                All user-facing text (name, desc, instructions) must be in ${language.name}.
                The category must be one of the exact strings provided in the schema enum.
                Keep the general structure but apply the requested changes.
                
                IMPORTANT MUSICAL TIMING GUIDELINES:
                This is a MUSIC application. All timing must be based on musical tempo (BPM) and beat subdivisions.
                
                BPM (Beats Per Minute):
                - Slow: 60-80 BPM
                - Moderate: 80-120 BPM  
                - Fast: 120-180 BPM
                
                Note Durations (in BEATS, not milliseconds):
                - Whole note = 4 beats
                - Half note = 2 beats
                - Quarter note = 1 beat
                - Eighth note = 0.5 beats
                - Sixteenth note = 0.25 beats
                
                If the user specifies a note duration (like "half note", "quarter note", etc.), you MUST use the corresponding BEAT value.
                If the user wants VARIED note durations within the exercise, provide a "durations" array with one beat value per note in the pattern.
            `;

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
                    bpm: {
                        type: Type.INTEGER,
                        description: "Tempo in beats per minute. Choose based on exercise type: slow warm-ups (60-80), moderate scales (90-110), fast agility (120-160)."
                    },
                    duration: {
                        type: Type.NUMBER,
                        description: "Default duration for all notes in BEATS. Use: whole=4, half=2, quarter=1, eighth=0.5, sixteenth=0.25."
                    },
                    durations: {
                        type: Type.ARRAY,
                        description: "Optional: Array of durations in BEATS for each note in the pattern. If provided, this overrides 'duration'. Must have the same length as 'pattern'.",
                        items: { type: Type.NUMBER }
                    },
                    category: {
                        type: Type.STRING,
                        description: "The most fitting category for this exercise. Choose one of: 'Warm-ups & Basics', 'Breath & Support', 'Resonance & Tone', 'Pitch & Intonation', 'Scales & Agility', 'Belting', 'Cooldowns'."
                    }
                },
                required: ["name", "desc", "instructions", "pattern", "bpm", "duration", "category"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const jsonResult = JSON.parse(response.text);
            const exerciseResult: Exercise = {
                ...jsonResult,
                id: result.id, // Keep ID to maintain identity if possible, or generate new one
                isAIGenerated: true,
            };
            setResult(exerciseResult);
            setIsRefining(false);
            setRefinePrompt('');

        } catch (e) {
            console.error("Error calling Gemini API:", e);
            setError('An error occurred while refining the exercise. Please try again.');
        } finally {
            setIsRefineLoading(false);
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
        <section className="flex-grow flex flex-col justify-center pb-24">
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">{t('voxlabaiDesc')}</p>

            <div className="w-full max-w-3xl mx-auto">
                <div className="relative border border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/20 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300 mb-6">
                    <span className="font-bold">{t('beta')}:</span> {t('voxlabaiBeta')}
                </div>

                {showApiKeyInput && (
                    <div className="mb-6 p-4 border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                        <label className="block text-sm font-bold text-violet-800 dark:text-violet-300 mb-2">
                            Google AI API Key Required
                        </label>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                            To use this feature, you need a Google AI API key. Get one for free at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-violet-600 underline">aistudio.google.com</a>.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={userApiKey}
                                onChange={(e) => setUserApiKey(e.target.value)}
                                placeholder="Paste your API key here"
                                className="flex-1 p-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500"
                            />
                            <button
                                onClick={() => handleSaveApiKey(userApiKey)}
                                className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded hover:bg-violet-700 transition-colors"
                            >
                                Save Key
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('voxlabaiPrompt')}
                        className="relative z-10 w-full h-28 p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow resize-none"
                        disabled={isLoading}
                    />
                    <div className="flex justify-center">
                        <ThemedButton
                            onClick={handleGenerate}
                            disabled={isLoading || !prompt}
                            theme={currentTheme}
                        >
                            {isLoading ? t('generate') + '...' : t('generate')}
                        </ThemedButton>
                    </div>
                </div>
            </div>

            {error && <p className="text-red-500 mt-4">{error}</p>}

            {(isLoading || result) && (
                <div className="mt-8 p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white/60 dark:bg-slate-800/30 backdrop-blur-md shadow-sm">
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        result && (
                            // VIEW MODE
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <span className={`text-xs font-bold uppercase bg-clip-text text-transparent bg-gradient-to-br ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo}`}>{result.category}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">{t('aiGenerated')}</span>
                                            <button
                                                onClick={() => setIsRefining(!isRefining)}
                                                className={`btn-interactive p-1.5 rounded-full backdrop-blur-sm transition-colors ${isRefining ? 'bg-violet-100 dark:bg-violet-900/50' : 'bg-white/30 dark:bg-slate-700/30'}`}
                                                aria-label={t('refine')}
                                                title={t('refine')}
                                            >
                                                <MagicIcon />
                                            </button>
                                            <button
                                                onClick={handleFavoriteClick}
                                                className="btn-interactive p-1.5 rounded-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm"
                                                aria-label={t('favorites')}
                                            >
                                                <StarIcon isFavorite={isFavorite} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Refine Window */}
                                    {isRefining && (
                                        <div className="mt-3 mb-4 p-3 rounded-xl bg-violet-50/80 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 animate-fade-in">
                                            <label className="block text-xs font-bold text-violet-800 dark:text-violet-300 mb-2">
                                                {t('refine')}
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={refinePrompt}
                                                    onChange={(e) => setRefinePrompt(e.target.value)}
                                                    placeholder={t('refinePromptPlaceholder')}
                                                    className="flex-1 p-2 text-sm rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                                                />
                                                <button
                                                    onClick={handleRefine}
                                                    disabled={isRefineLoading || !refinePrompt}
                                                    className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {isRefineLoading ? (
                                                        <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <h3 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo}`}>{result.name}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 italic">"{result.desc}"</p>
                                </div>
                                <div className="border-t border-slate-200/80 dark:border-slate-700/80 my-2"></div>
                                <div>
                                    <h4 className="font-semibold text-violet-700 dark:text-violet-400">Instructions</h4>
                                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{result.instructions}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-violet-700 dark:text-violet-400">
                                        {(result as any).notes ? 'Notes' : 'Pattern'}
                                    </h4>
                                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 rounded p-2">
                                        {(result as any).notes
                                            ? `${(result as any).notes.length} notes`
                                            : result.pattern?.join(', ') || 'No pattern defined'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {result.duration && (
                                        <div>
                                            <h4 className="font-semibold text-violet-700 dark:text-violet-400">Note Duration</h4>
                                            <p className="text-slate-600 dark:text-slate-300">
                                                <span className="text-2xl mr-2">{beatsToMusicalNotation(result.duration).symbol}</span>
                                                {beatsToMusicalNotation(result.duration).notation}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">({result.duration} beats)</p>
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-semibold text-violet-700 dark:text-violet-400">Tempo</h4>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            <span className="text-2xl mr-2">♩</span>
                                            {(result as any).tempo_bpm || result.bpm || 90} BPM
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Beats per minute</p>
                                    </div>
                                </div>
                                <div className="border-t border-slate-200/80 dark:border-slate-700/80 my-2"></div>

                                <div className="flex gap-2 mt-2 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            console.log('Preview button clicked!', { isPreviewing });
                                            if (isPreviewing) {
                                                if (previewTimeoutId) clearTimeout(previewTimeoutId);
                                                setIsPreviewing(false);
                                                setPreviewTimeoutId(null);
                                            } else {
                                                setIsPreviewing(true);
                                                const bpm = (result as any).tempo_bpm || result.bpm || 90;
                                                const secondsPerBeat = 60 / bpm;

                                                // Handle both old pattern format and new notes format
                                                if ((result as any).notes) {
                                                    // New format - play notes array
                                                    const notes = (result as any).notes;
                                                    let currentTime = 0;
                                                    notes.forEach((note: any, index: number) => {
                                                        if (note.type === 'note') {
                                                            const durationSec = note.duration * secondsPerBeat;
                                                            setTimeout(() => {
                                                                playNote(note.semitone, durationSec * 1000, false);
                                                            }, currentTime * 1000);
                                                            currentTime += note.duration;
                                                        } else {
                                                            // Rest
                                                            currentTime += note.duration;
                                                        }
                                                    });
                                                    const finalTimeoutId = setTimeout(() => {
                                                        setIsPreviewing(false);
                                                        setPreviewTimeoutId(null);
                                                    }, currentTime * 1000);
                                                    setPreviewTimeoutId(finalTimeoutId);
                                                } else if (result.pattern && result.pattern.length > 0) {
                                                    // Old format - play pattern array
                                                    const noteDuration = result.duration * secondsPerBeat;
                                                    playNote(result.pattern[0], noteDuration, false);
                                                    let currentTime = noteDuration;
                                                    for (let i = 1; i < result.pattern.length; i++) {
                                                        const semitone = result.pattern[i];
                                                        setTimeout(() => {
                                                            playNote(semitone, noteDuration, false);
                                                        }, currentTime * 1000);
                                                        currentTime += noteDuration;
                                                    }
                                                    const totalDuration = result.pattern.length * noteDuration;
                                                    const finalTimeoutId = setTimeout(() => {
                                                        setIsPreviewing(false);
                                                        setPreviewTimeoutId(null);
                                                    }, totalDuration * 1000);
                                                    setPreviewTimeoutId(finalTimeoutId);
                                                }
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 transition-all text-sm font-semibold cursor-pointer select-none"
                                    >
                                        {isPreviewing ? <Square size={16} /> : <Play size={16} />}
                                        {isPreviewing ? 'Stop Preview' : 'Preview'}
                                    </button>
                                    <ThemedButton
                                        onClick={() => onStartExercise(result)}
                                        theme={currentTheme}
                                    >
                                        {t('practiceThisExercise')}
                                    </ThemedButton>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </section>
    );
};

export default VoxLabAIView;
