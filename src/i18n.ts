// Example translation keys and values.
export type TranslationKey = 'welcome' | 'goodbye';

export const translations: Record<string, Record<TranslationKey, string>> = {
    en: {
        welcome: "Welcome to VoxLab!",
        goodbye: "Goodbye!"
    },
    pt: {
        welcome: "Bem-vindo ao VoxLab!",
        goodbye: "Tchau!"
    }
};