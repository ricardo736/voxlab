import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Language } from '../types';
import { LANGUAGES } from '../constants';
import { translations, TranslationKey } from '../i18n';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Set default language to Brazilian Portuguese (LANGUAGES[1])
  const [language, setLanguage] = useState<Language>(LANGUAGES[1]); 

  const t = useCallback((key: TranslationKey | string): string => {
    const langCode = language.code as keyof typeof translations;
    const typedKey = key as TranslationKey;
    // Fallback to English if a key is missing in the selected language, then fallback to the key itself.
    const translation = (translations[langCode] && translations[langCode][typedKey]) || translations.en[typedKey];
    return translation || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};