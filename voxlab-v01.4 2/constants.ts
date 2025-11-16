import { Exercise, Language, ColorPalette, Routine, Tuning } from './types';
import { TranslationKey } from './i18n';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const IS_SHARP = [false, true, false, false, true, false, true, false, true, false, true, false];
export const BASE_FREQ = 261.63; // C4

export const EXERCISES: Exercise[] = [
    // Warm-ups & Basics
    { id: 1, name: 'lipTrills', desc: 'lipTrillsDesc', pattern: [0, 2, 4, 5, 7, 5, 4, 2, 0], duration: 500, instructions: 'Keep your lips relaxed and let them vibrate naturally', category: 'warmupsAndBasics' },
    { id: 2, name: 'sirens', desc: 'sirensDesc', pattern: [0, 2, 4, 7, 9, 12], duration: 800, instructions: 'Start at your lowest comfortable note and glide to your highest', category: 'warmupsAndBasics' },
    
    // Breath & Support
    { id: 5, name: 'staccatoExercise', desc: 'staccatoExerciseDesc', pattern: [0, 0, 0, 0, 0], duration: 300, instructions: 'Short, detached notes using "ha-ha-ha-ha-ha"', category: 'breathAndSupport' },
    { id: 11, name: 'messaDiVoce', desc: 'messaDiVoceDesc', pattern: [0], duration: 4000, instructions: 'Maintain steady pitch while changing volume', category: 'breathAndSupport' },
    { id: 17, name: 'pulsedHas', desc: 'pulsedHasDesc', pattern: [0, 0, 0, 0], duration: 400, instructions: 'Feel a gentle kick from your core on each "ha"', category: 'breathAndSupport' },
    { id: 18, name: 'sustainedHiss', desc: 'sustainedHissDesc', pattern: [0], duration: 8000, instructions: 'Maintain a consistent and smooth stream of air', category: 'breathAndSupport' },

    // Resonance & Tone
    { id: 9, name: 'hummingScale', desc: 'hummingScaleDesc', pattern: [0, 2, 4, 5, 7, 5, 4, 2, 0], duration: 550, instructions: 'Feel the vibration in your lips and nose', category: 'resonanceAndTone' },
    { id: 12, name: 'vowelPurityScale', desc: 'vowelPurityScaleDesc', pattern: [0, 2, 4, 5, 7, 5, 4, 2, 0], duration: 600, instructions: 'Keep your jaw relaxed and transitions smooth', category: 'resonanceAndTone' },
    { id: 15, name: 'ngResonance', desc: 'ngResonanceDesc', pattern: [0, 4, 7, 4, 0], duration: 650, instructions: 'Hum on an "ng" sound, feeling the vibration', category: 'resonanceAndTone' },
    { id: 19, name: 'forwardNee', desc: 'forwardNeeDesc', pattern: [0, 2, 4, 5, 7, 5, 4, 2, 0], duration: 500, instructions: 'Focus on the buzzing sensation behind your nose', category: 'resonanceAndTone' },
    { id: 20, name: 'vowelUniformity', desc: 'vowelUniformityDesc', pattern: [0, 4, 7, 12, 7, 4, 0], duration: 500, instructions: 'Cycle through "ee", "ah", "oo", keeping tone consistent', category: 'resonanceAndTone' },

    // Pitch & Intonation
    { id: 4, name: 'octaveJumps', desc: 'octaveJumpsDesc', pattern: [0, 12, 0, 12, 0], duration: 600, instructions: 'Keep your throat relaxed when jumping octaves', category: 'pitchAndIntonation' },
    { id: 6, name: 'thirdIntervals', desc: 'thirdIntervalsDesc', pattern: [0, 4, 0, 4, 0, 4, 0], duration: 450, instructions: 'Focus on smooth transitions between the notes', category: 'pitchAndIntonation' },
    { id: 8, name: 'chromaticScale', desc: 'chromaticScaleDesc', pattern: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0], duration: 350, instructions: 'Focus on pitch accuracy for each half step', category: 'pitchAndIntonation' },
    { id: 16, name: 'sixthIntervals', desc: 'sixthIntervalsDesc', pattern: [0, 9, 0, 9, 0], duration: 550, instructions: 'Focus on accurate pitching for this wider interval', category: 'pitchAndIntonation' },
    { id: 21, name: 'minorThirdIntervals', desc: 'minorThirdIntervalsDesc', pattern: [0, 3, 0, 3, 0, 3, 0], duration: 450, instructions: 'Listen carefully to the smaller interval jump', category: 'pitchAndIntonation' },
    { id: 22, name: 'scaleOfFifths', desc: 'scaleOfFifthsDesc', pattern: [0, 7, 2, 9, 4, 11, 5, 12], duration: 600, instructions: 'Support the sound through these large leaps', category: 'pitchAndIntonation' },

    // Scales & Agility
    { id: 3, name: 'fiveToneScale', desc: 'fiveToneScaleDesc', pattern: [0, 2, 4, 5, 7, 5, 4, 2, 0], duration: 500, instructions: 'Use "ma" or "ne" syllables for clear articulation', category: 'scalesAndAgility' },
    { id: 7, name: 'majorArpeggio', desc: 'majorArpeggioDesc', pattern: [0, 4, 7, 12, 7, 4, 0], duration: 450, instructions: 'Sing each note clearly and maintain good support', category: 'scalesAndAgility' },
    { id: 10, name: 'minorArpeggio', desc: 'minorArpeggioDesc', pattern: [0, 3, 7, 12, 7, 3, 0], duration: 450, instructions: 'Explore a more melancholic sound', category: 'scalesAndAgility' },
    { id: 14, name: 'solfegeMajorScale', desc: 'solfegeMajorScaleDesc', pattern: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0], duration: 400, instructions: 'Sing using Solfege: "Do-Re-Mi-Fa-Sol-La-Ti-Do..."', category: 'scalesAndAgility' },
    
    // Belting
    { id: 24, name: 'brattyNae', desc: 'brattyNaeDesc', pattern: [0, 4, 7, 9, 12, 9, 7, 4, 0], duration: 450, instructions: 'Use a nasal "nae-nae-nae" sound to encourage a forward placement', category: 'belting' },
    { id: 25, name: 'octaveGug', desc: 'octaveGugDesc', pattern: [0, 12, 0], duration: 600, instructions: 'Sing "gug-gug-gug" on the octave jump to maintain a connected sound', category: 'belting' },
    { id: 26, name: 'edgyAh', desc: 'edgyAhDesc', pattern: [7, 9, 12, 9, 7], duration: 500, instructions: 'Sing a strong "AH" on this high pattern, feeling the power from your core', category: 'belting' },

    // Cooldowns
    { id: 13, name: 'descendingVooScale', desc: 'descendingVooScaleDesc', pattern: [7, 5, 4, 2, 0], duration: 500, instructions: 'Use a gentle "voo" sound to descend smoothly', category: 'cooldowns' },
    { id: 23, name: 'gentleSighs', desc: 'gentleSighsDesc', pattern: [7, 5, 2, 0], duration: 700, instructions: 'Release all tension as you descend', category: 'cooldowns' },
];

// Updated Routines with more exercises to make them longer and more effective
export const ROUTINES: Routine[] = [
    { id: 'warmup-simple', name: 'warmUpSimple', description: 'warmUpSimpleDesc', exerciseIds: [1, 17, 9, 2], benefits: 'warmUpSimpleBenefits' },
    { id: 'warmup-advanced', name: 'warmUpAdvanced', description: 'warmUpAdvancedDesc', exerciseIds: [1, 9, 19, 2, 3, 6], benefits: 'warmUpAdvancedBenefits' },
    { id: 'daily-vocal-care', name: 'dailyVocalCare', description: 'dailyVocalCareDesc', exerciseIds: [1, 17, 9, 3, 13], benefits: 'dailyVocalCareBenefits' },
    { id: 'breath-support', name: 'breathSupportFoundation', description: 'breathSupportFoundationDesc', exerciseIds: [18, 17, 5, 11], benefits: 'breathSupportFoundationBenefits' },
    { id: 'resonance-builder', name: 'resonanceBuilder', description: 'resonanceBuilderDesc', exerciseIds: [9, 15, 19, 12, 20], benefits: 'resonanceBuilderBenefits' },
    { id: 'pitch-accuracy', name: 'pitchAccuracy', description: 'pitchAccuracyDesc', exerciseIds: [8, 6, 21, 16, 4, 22], benefits: 'pitchAccuracyBenefits' },
    { id: 'agility-flexibility', name: 'agilityFlexibility', description: 'agilityFlexibilityDesc', exerciseIds: [3, 8, 14, 7, 10, 22], benefits: 'agilityFlexibilityBenefits' },
    { id: 'mixed-voice-1', name: 'mixedVoice1', description: 'mixedVoice1Desc', exerciseIds: [1, 19, 3, 6], benefits: 'mixedVoice1Benefits' },
    { id: 'mixed-voice-2', name: 'mixedVoice2', description: 'mixedVoice2Desc', exerciseIds: [7, 8, 4], benefits: 'mixedVoice2Benefits' },
    { id: 'belting-foundation', name: 'beltingFoundation', description: 'beltingFoundationDesc', exerciseIds: [17, 24, 25, 26], benefits: 'beltingFoundationBenefits' },
    { id: 'vocal-cooldown', name: 'vocalCooldown', description: 'vocalCooldownDesc', exerciseIds: [9, 13, 23], benefits: 'vocalCooldownBenefits' },
];


// Piano layout constants
export const WHITE_KEY_SLOT_WIDTH = 60;
export const WHITE_KEY_SIZE = 54;
export const BLACK_KEY_SIZE = 36;
export const V_PADDING = 22;

// New constants for settings
export const LANGUAGES: Language[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt-BR', name: 'Português Brasileiro', flag: '🇧🇷' }
];

export const COLOR_PALETTES: ColorPalette[] = [
    { id: 'violet-wave', name: 'Violet Wave', gradient: 'from-violet-500/10 from-10% via-fuchsia-500/10 via-50% to-yellow-300/10 to-90%', primary: 'text-violet-600', secondary: 'text-fuchsia-600', shadowRgb: '139, 92, 246' },
    { id: 'ocean-blue', name: 'Ocean Blue', gradient: 'from-sky-400/10 via-cyan-400/10 to-blue-500/10', primary: 'text-blue-600', secondary: 'text-cyan-600', shadowRgb: '34, 211, 238' },
    { id: 'forest-green', name: 'Forest Green', gradient: 'from-emerald-400/10 via-teal-500/10 to-green-600/10', primary: 'text-green-700', secondary: 'text-teal-600', shadowRgb: '20, 184, 166' },
    { id: 'sunset-orange', name: 'Sunset Orange', gradient: 'from-amber-400/10 via-orange-500/10 to-red-500/10', primary: 'text-orange-600', secondary: 'text-red-600', shadowRgb: '249, 115, 22' },
];

// New constant for instrument tunings
export const TUNINGS: Tuning[] = [
    { id: 'chromatic', name: 'chromatic', notes: [] }, // Chromatic is special-cased
    {
        id: 'standard-guitar',
        name: 'standardGuitar',
        notes: [
            { name: 'E2', semitone: -20 },
            { name: 'A2', semitone: -15 },
            { name: 'D3', semitone: -10 },
            { name: 'G3', semitone: -5 },
            { name: 'B3', semitone: -1 },
            { name: 'E4', semitone: 4 },
        ]
    }
];

// Instructions for the redesigned "siren" vocal range test
export const RANGE_TEST_INSTRUCTIONS = {
    initial: "To find your vocal range, you will sing a \"siren\" sound.",
    detail: "Glide your voice from your lowest comfortable note up to your highest, and then back down. It's okay to repeat the glide if you have time.",
    warning: "Important: Do not strain your voice. Stop if you feel any discomfort.",
    listening: "Start singing now!",
};