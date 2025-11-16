import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { ActiveView } from '../types';

interface FloatingMenuProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    setIsSettingsOpen: (isOpen: boolean) => void;
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string, gradientText: { from: string, to: string, darkFrom: string, darkTo: string } };
}

interface IconProps {
    isActive: boolean;
    activeClassName: string;
}

const HomeIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
const PianoIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${isActive ? activeClassName : ''}`}><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="4" y1="12" x2="20" y2="12"></line><line x1="8" y1="4" x2="8" y2="12"></line><line x1="12" y1="4" x2="12" y2="12"></line><line x1="16" y1="4" x2="16" y2="12"></line></svg>;
const RoutinesIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M9 18V5l12-2v13M9 18l-6 2V7l6-2m12 7l-12-4" /></svg>;
const ExercisesIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M4 12h16M4 6h16M4 18h7" /></svg>;
const StudiesIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 1.66 4 3 10 0v-5"></path></svg>;
const VoxLabAIIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9z"></path><path d="M9 12l2 2 4-4"></path></svg>;
const FavoritesIcon: React.FC<IconProps> = ({ isActive, activeClassName }) => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill={isActive ? "currentColor" : "none"} strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${isActive ? activeClassName : ''}`}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
const SettingsIcon = () => <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>;

interface NavItemProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    activeTextGradientClasses: string;
    className?: string;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick, activeTextGradientClasses, className = 'w-1/6' }) => {
    return (
        <button
            onClick={onClick}
            className={`btn-interactive relative flex flex-col items-center justify-center h-full text-center px-1 rounded-full focus-visible:ring-offset-2 ${
                isActive
                    ? activeTextGradientClasses // Use gradient for active text
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            } ${className}`}
            aria-label={label}
        >
            <div className="relative mb-0.5">{icon}</div>
            <span className={`relative text-[0.6rem] transition-colors ${isActive ? `font-bold text-transparent bg-clip-text ${activeTextGradientClasses}` : 'font-normal'}`}>{label}</span>
        </button>
    );
};

const FloatingMenu: React.FC<FloatingMenuProps> = ({ activeView, setActiveView, setIsSettingsOpen, currentTheme }) => {
    const { t } = useTranslation();
    const menuItems: { id: ActiveView, label: string, icon: React.ComponentType<IconProps> }[] = [
        { id: 'home', label: t('home'), icon: HomeIcon },
        { id: 'routines', label: t('routines'), icon: RoutinesIcon },
        { id: 'exercises', label: t('exercises'), icon: ExercisesIcon },
        { id: 'favorites', label: t('favorites'), icon: FavoritesIcon },
        { id: 'range', label: t('range'), icon: PianoIcon },
        { id: 'voxlabai', label: t('voxlabai'), icon: VoxLabAIIcon },
        { id: 'studies', label: t('studies'), icon: StudiesIcon },
    ];
    
    // Updated glassBg to match RangeDetectorV2View's card styling
    const glassBg = `bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-full shadow-2xl`;

    const activeTextGradientClasses = `bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo}`;


    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg md:max-w-3xl flex items-center gap-2 z-50 h-16">
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
                            icon={<item.icon isActive={activeView === item.id} activeClassName={currentTheme.primary} />}
                            isActive={activeView === item.id}
                            onClick={() => setActiveView(item.id)}
                            activeTextGradientClasses={activeTextGradientClasses}
                            className='w-14 flex-shrink-0 md:w-auto md:px-2'
                        />
                    ))}
                </div>
            </nav>
            <button
                onClick={() => setIsSettingsOpen(true)}
                aria-label={t('settings')}
                className={`btn-interactive flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ${glassBg}`}
            >
                <SettingsIcon />
            </button>
        </div>
    );
};

export default FloatingMenu;