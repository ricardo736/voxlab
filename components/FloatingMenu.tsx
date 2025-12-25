import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { ActiveView, Theme } from '../types';

interface FloatingMenuProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    setIsSettingsOpen: (isOpen: boolean) => void;
    currentTheme: Theme;
    uiView: 'main' | 'exercise';
    isVisible: boolean;
}

interface IconProps {
    isActive: boolean;
    activeClassName: string;
}

const HomeIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
const PianoIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${isActive ? activeClassName : ''}`}><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="4" y1="12" x2="20" y2="12"></line><line x1="8" y1="4" x2="8" y2="12"></line><line x1="12" y1="4" x2="12" y2="12"></line><line x1="16" y1="4" x2="16" y2="12"></line></svg>;
const RoutinesIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M21 15V6" /><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path d="M12 12H3" /><path d="M16 6H3" /><path d="M12 18H3" /></svg>;
const ExercisesIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M4 12h16M4 6h16M4 18h7" /></svg>;
const StudiesIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 1.66 4 3 10 0v-5"></path></svg>;
const VoxLabAIIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9z"></path><path d="M9 12l2 2 4-4"></path></svg>;
const FavoritesIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill={isActive ? "currentColor" : "none"} strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
const TestIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>;
const ExercisesProIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill={isActive ? "currentColor" : "none"} strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
const SettingsIcon = () => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>;

interface NavItemProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    theme: Theme;
    className?: string;
    isCompact: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick, theme, className = 'w-1/6', isCompact }) => {
    // The text color classes for the active icon, derived from the theme's gradient.
    const activeIconLightClass = theme.gradientText.from.replace('from-', 'text-'); // e.g., 'text-violet-600'
    const activeIconDarkClass = theme.gradientText.darkFrom.replace('dark:from-', 'dark:text-'); // e.g., 'dark:text-violet-400'

    return (
        <button
            onClick={onClick}
            className={`btn-interactive relative flex flex-col items-center justify-center h-full text-center px-1 rounded-full focus-visible:ring-offset-2 ${isActive
                ? '' // Parent doesn't need color styling if children handle it
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                } ${className}`}
            aria-label={label}
        >
            <div className={`relative transition-colors duration-300 ease-in-out ${!isCompact && 'mb-0.5'} ${isActive ? `${activeIconLightClass} ${activeIconDarkClass}` : ''}`}>{icon}</div>

            {!isCompact && (
                <span className={`relative text-[0.6rem] transition-colors duration-300 ease-in-out ${isActive ? `font-bold bg-clip-text text-transparent bg-gradient-to-br ${theme.gradientText.from} ${theme.gradientText.to} ${theme.gradientText.darkFrom} ${theme.gradientText.darkTo}` : 'font-normal'}`}>{label}</span>
            )}
        </button>
    );
};

const FloatingMenu: React.FC<FloatingMenuProps> = ({ activeView, setActiveView, setIsSettingsOpen, currentTheme, uiView, isVisible }) => {
    const { t } = useTranslation();
    const isCompact = uiView === 'exercise';

    const menuItems: { id: ActiveView, label: string, icon: React.ComponentType<IconProps> }[] = [
        { id: 'home', label: t('home'), icon: HomeIcon },
        { id: 'exercises', label: t('exercises'), icon: ExercisesIcon },
        { id: 'routines', label: t('routines'), icon: RoutinesIcon },
        { id: 'favorites', label: t('favorites'), icon: FavoritesIcon },
        { id: 'range', label: t('range'), icon: PianoIcon },
        { id: 'voxlabai', label: t('voxlabai'), icon: VoxLabAIIcon },
        { id: 'studies', label: t('studies'), icon: StudiesIcon },
    ];

    const glassBg = `bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-[0_12px_30px_-12px_rgba(0,0,0,0.2),inset_-1px_1px_8px_rgba(0,0,0,0.08),inset_2px_-2px_4px_rgba(255,255,255,0.5)] dark:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5),inset_-1px_1px_8px_rgba(255,255,255,0.08),inset_2px_-2px_4px_rgba(0,0,0,0.5)] border border-slate-300/60 dark:border-slate-700/60`;

    return (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg md:max-w-3xl flex items-center gap-2 z-50 transition-all duration-500 ease-in-out ${isCompact ? 'h-14' : 'h-16'} ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
            <nav
                className={`flex-grow h-full rounded-full min-w-0 relative ${glassBg}`}
            >
                <div
                    className="flex items-center h-full px-2 md:justify-around md:px-4 space-x-1 md:space-x-0 overflow-x-auto scrollbar-hide md:overflow-visible"
                    style={{
                        maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                    }}
                >
                    {menuItems.map(item => (
                        <NavItem
                            key={item.id}
                            label={item.label}
                            icon={<item.icon isActive={activeView === item.id} activeClassName="active-icon" />}
                            isActive={activeView === item.id}
                            onClick={() => setActiveView(item.id)}
                            theme={currentTheme}
                            className='w-14 flex-shrink-0 md:w-auto md:px-2'
                            isCompact={isCompact}
                        />
                    ))}
                </div>
            </nav>
            <button
                onClick={() => setIsSettingsOpen(true)}
                aria-label={t('settings')}
                className={`btn-interactive flex-shrink-0 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-500 ease-in-out ${isCompact ? 'w-14 h-14' : 'w-16 h-16'} ${glassBg}`}
            >
                <SettingsIcon />
            </button>
        </div>
    );
};

export default FloatingMenu;