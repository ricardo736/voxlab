import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations, TranslationKey } from '../i18n';

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>('en');

  const t = useCallback((key: TranslationKey): string => {
    const translation = (translations[language] && translations[language][key]) || translations.en[key];
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