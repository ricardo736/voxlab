import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Routine } from '../types';
import { ROUTINES, EXERCISES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';

interface RoutineViewProps {
    onStartRoutine: (routine: Routine) => void;
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string, gradientText: { from: string, to: string, darkFrom: string, darkTo: string } };
    favoriteRoutineIds: string[];
    onToggleFavorite: (routineId: string) => void;
}

const StarIcon: React.FC<{ isFavorite: boolean }> = ({ isFavorite }) => (
    <svg className={`w-6 h-6 transition-all duration-200 ${isFavorite ? 'text-amber-400 scale-110' : 'text-slate-400 group-hover:text-amber-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const RoutineCard: React.FC<{
    routine: Routine,
    onStart: (routine: Routine) => void,
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string },
    isFavorite: boolean;
    onToggleFavorite: (routineId: string) => void;
}> = ({ routine, onStart, currentTheme, isFavorite, onToggleFavorite }) => {
    const { t } = useTranslation();
    const [isFlipped, setIsFlipped] = useState(false);
    const exercisesById = useMemo(() => new Map(EXERCISES.map(ex => [ex.id, ex])), []);

    const totalDurationMs = useMemo(() => {
        return routine.exerciseIds.reduce((sum, id) => {
            const exercise = exercisesById.get(id);
            if (!exercise) return sum;
            let exerciseTime = 0;
            const MAX_TRANSPOSE = 24;
            const mockRange = { start: { semitone: -12 }, end: { semitone: 12 } };
            for (let t = 0; t <= MAX_TRANSPOSE; t++) {
                const maxOffset = Math.max(...exercise.pattern, 0);
                if (mockRange.start.semitone + maxOffset + t > mockRange.end.semitone) break;
                exerciseTime += exercise.pattern.length * exercise.duration + 500;
            }
            return sum + exerciseTime;
        }, 0);
    }, [routine.exerciseIds, exercisesById]);

    const totalDurationMinutes = Math.round(totalDurationMs / (1000 * 60));
    const TimeIcon = () => <svg className="w-5 h-5 mr-1 text-sky-500 dark:text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    
    return (
        <div className="w-full h-full cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setIsFlipped(!isFlipped)}>
            <div
                className={`relative w-full h-full transition-transform duration-700 ease-in-out`}
                style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
                {/* Front Face */}
                <div className="absolute w-full h-full p-6 flex flex-col justify-between bg-white/30 dark:bg-black/20 backdrop-blur-lg rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(routine.id); }}
                        className="btn-interactive group absolute top-4 right-4 z-20 p-2 rounded-full bg-white/30 dark:bg-black/20 backdrop-blur-sm"
                        aria-label={t('favorites')}
                    >
                        <StarIcon isFavorite={isFavorite} />
                    </button>
                    <div>
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/70 rounded-full px-3 py-1 mb-3 w-fit">
                            <TimeIcon />
                            <span className="font-semibold">~{totalDurationMinutes} min</span>
                        </div>
                        <h3 className={`text-2xl font-extrabold ${currentTheme.primary} mb-2`}>{t(routine.name)}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm">{t(routine.description)}</p>
                    </div>
                    <div className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 mt-4">{t('clickForDetails')}</div>
                </div>

                {/* Back Face */}
                <div className="absolute w-full h-full p-6 flex flex-col justify-between bg-white/30 dark:bg-black/20 backdrop-blur-lg rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <div className="flex-grow flex flex-col min-h-0">
                        <h4 className={`text-lg font-bold ${currentTheme.secondary} mb-2`}>{t('benefits')}</h4>
                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">{t(routine.benefits)}</p>
                        
                        <h4 className={`text-lg font-bold ${currentTheme.secondary} mb-2`}>{t('exercises')}</h4>
                        <div className="flex-grow overflow-y-auto scrollbar-hide">
                            <div className="flex flex-wrap gap-2">
                                {routine.exerciseIds.map(id => {
                                    const ex = exercisesById.get(id);
                                    return ex ? (
                                        <span key={id} className="text-slate-700 dark:text-slate-300 text-xs font-medium bg-slate-100/80 dark:bg-slate-800/80 rounded-full px-3 py-1 border border-slate-200/80 dark:border-slate-700/80">{t(ex.name)}</span>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onStart(routine); }} 
                        className={`
                            px-8 py-3 rounded-full font-medium text-base text-white
                            flex items-center justify-center gap-2
                            relative overflow-hidden group 
                            transition-all transform hover:scale-105 active:scale-95
                            bg-gradient-to-br ${currentTheme.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-').replace(/\/10/g, '')}
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
                            <span>{t('startRoutine')}</span>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const RoutineView: React.FC<RoutineViewProps> = ({ onStartRoutine, currentTheme, favoriteRoutineIds, onToggleFavorite }) => {
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleArrowScroll = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const firstCard = container.querySelector('.snap-center.px-3') as HTMLDivElement;
        if (!firstCard) return;

        const scrollAmount = firstCard.offsetWidth;
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    };

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollCenter = container.scrollLeft + container.offsetWidth / 2;
        const cards = Array.from(container.children) as HTMLDivElement[];

        cards.forEach((cardWrapper) => {
            const transformWrapper = cardWrapper.firstElementChild as HTMLDivElement;
            if (!transformWrapper || !transformWrapper.firstElementChild) return; // Skip spacers

            const cardCenter = cardWrapper.offsetLeft + cardWrapper.offsetWidth / 2;
            const distance = scrollCenter - cardCenter;
            
            const maxDistance = container.offsetWidth * 0.8; // Use container width as a reference for distance calculation
            const distanceRatio = Math.max(-1, Math.min(1, distance / maxDistance));

            // --- Animation Parameters ---
            const rotateY = -distanceRatio * 65; 
            const translateX = -distanceRatio * 40; 
            const translateZ = -Math.abs(distanceRatio) * 120; 
            const scale = 1 - Math.abs(distanceRatio) * 0.15;
            const opacity = 1 - Math.pow(Math.abs(distanceRatio), 1.5);
            const zIndex = 100 - Math.abs(Math.round(distanceRatio * 100));
            const blur = Math.abs(distanceRatio) * 3;

            transformWrapper.style.transform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
            transformWrapper.style.opacity = `${opacity}`;
            transformWrapper.style.zIndex = `${zIndex}`;
            transformWrapper.style.filter = `blur(${blur}px)`;
        });
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            
            const initTimeout = setTimeout(() => {
                 handleScroll();
                 const firstCard = container.querySelector('.snap-center.px-3') as HTMLDivElement;
                 if(firstCard){
                     const scrollPos = firstCard.offsetLeft + firstCard.offsetWidth / 2 - container.offsetWidth / 2;
                     container.scrollTo({ left: scrollPos, behavior: 'auto' });
                 }
            }, 100);

            const resizeObserver = new ResizeObserver(handleScroll);
            resizeObserver.observe(container);

            return () => {
                clearTimeout(initTimeout);
                container.removeEventListener('scroll', handleScroll);
                resizeObserver.disconnect();
            }
        }
    }, []);

    return (
        <section className="flex-grow flex flex-col items-center justify-center w-full pt-8">
            <div className="relative w-full h-[400px]" style={{ perspective: '2000px' }}>
                 <button
                    onClick={() => handleArrowScroll('left')}
                    aria-label="Scroll left"
                    className="btn-interactive hidden md:flex absolute top-1/2 -translate-y-1/2 left-4 z-[101] w-12 h-12 items-center justify-center rounded-full bg-white/60 dark:bg-black/20 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg hover:bg-white dark:hover:bg-black/40"
                >
                    <svg className="w-6 h-6 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide items-center absolute inset-0 py-4"
                >
                    <div className="flex-shrink-0 w-[calc(50%-144px)] sm:w-[calc(50%-160px)] snap-center"></div>
                    {ROUTINES.map((routine) => (
                        <div key={routine.id} className="flex-shrink-0 w-72 sm:w-80 snap-center px-3" style={{ height: '380px' }}>
                            <div className="w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                                <RoutineCard
                                    routine={routine}
                                    onStart={onStartRoutine}
                                    currentTheme={currentTheme}
                                    isFavorite={favoriteRoutineIds.includes(routine.id)}
                                    onToggleFavorite={onToggleFavorite}
                                />
                            </div>
                        </div>
                    ))}
                    <div className="flex-shrink-0 w-[calc(50%-144px)] sm:w-[calc(50%-160px)] snap-center"></div>
                </div>
                 <button
                    onClick={() => handleArrowScroll('right')}
                    aria-label="Scroll right"
                    className="btn-interactive hidden md:flex absolute top-1/2 -translate-y-1/2 right-4 z-[101] w-12 h-12 items-center justify-center rounded-full bg-white/60 dark:bg-black/20 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg hover:bg-white dark:hover:bg-black/40"
                >
                    <svg className="w-6 h-6 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </section>
    );
};

export default React.memo(RoutineView);