import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Theme } from '../types';
import { THEMES } from '../constants';

interface ThemeContextType {
    themeId: string;
    setThemeId: (id: string) => void;
    themeMode: 'light' | 'dark';
    setThemeMode: (mode: 'light' | 'dark') => void;
    activeTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeId, setThemeId] = useState<string>(THEMES[0].id);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

    // Load saved settings
    useEffect(() => {
        try {
            const savedThemeId = localStorage.getItem('themeId');
            if (savedThemeId) {
                setThemeId(JSON.parse(savedThemeId));
            }

            const savedThemeMode = localStorage.getItem('themeMode');
            if (savedThemeMode) {
                setThemeMode(JSON.parse(savedThemeMode));
            }
        } catch (e) {
            console.error("Failed to load theme settings from local storage", e);
        }
    }, []);

    // Persist changes
    useEffect(() => {
        localStorage.setItem('themeId', JSON.stringify(themeId));
    }, [themeId]);

    useEffect(() => {
        localStorage.setItem('themeMode', JSON.stringify(themeMode));
    }, [themeMode]);

    // Apply dark mode class
    useEffect(() => {
        document.documentElement.classList.toggle('dark', themeMode === 'dark');
    }, [themeMode]);

    const activeTheme = useMemo(() => THEMES.find(p => p.id === themeId) || THEMES[0], [themeId]);

    const value = {
        themeId,
        setThemeId,
        themeMode,
        setThemeMode,
        activeTheme
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
