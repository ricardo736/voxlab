import React, { useRef, useState, useMemo, useLayoutEffect, useEffect, useCallback } from 'react';
import { Note, VocalRange, ColorPalette } from '../types';
import { WHITE_KEY_SLOT_WIDTH, WHITE_KEY_SIZE, BLACK_KEY_SIZE, V_PADDING } from '../constants';
import PianoKey from './PianoKey';

interface PianoProps {
    notes: Note[];
    onKeyClick: (note: Note) => void;
    vocalRange: VocalRange;
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string };
}

const Piano: React.FC<PianoProps> = ({ notes, onKeyClick, vocalRange, currentTheme }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const c4KeyRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [scrollCenterOffset, setScrollCenterOffset] = useState(0);
    const [viewportWidth, setViewportWidth] = useState(0);

    const whiteKeys = useMemo(() => notes.filter(n => !n.isSharp), [notes]);
    const pianoWidth = whiteKeys.length * WHITE_KEY_SLOT_WIDTH;

    useLayoutEffect(() => {
        if (c4KeyRef.current && scrollContainerRef.current) {
            const scrollEl = scrollContainerRef.current;
            if (scrollEl.clientWidth > 0) {
                const centerC4 = c4KeyRef.current.offsetLeft + (c4KeyRef.current.offsetWidth / 2);
                scrollEl.scrollLeft = centerC4 - (scrollEl.clientWidth / 2);
            }
        }
    }, [notes, viewportWidth]);

    useEffect(() => {
        const scrollEl = scrollContainerRef.current;
        if (!scrollEl) return;

        const updateState = () => {
            setViewportWidth(scrollEl.clientWidth);
            setScrollCenterOffset(scrollEl.scrollLeft + (scrollEl.clientWidth / 2));
        };

        updateState();

        scrollEl.addEventListener('scroll', updateState, { passive: true });
        const resizeObserver = new ResizeObserver(updateState);
        resizeObserver.observe(scrollEl);

        return () => {
            scrollEl.removeEventListener('scroll', updateState);
            resizeObserver.disconnect();
        };
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => setMousePos({ x: e.clientX, y: e.clientY });
    const handleMouseLeave = () => setMousePos(null);
    
    const handleArrowScroll = useCallback((direction: 'left' | 'right') => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const scrollAmount = container.clientWidth * 0.7; // Scroll 70%
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    }, []);


    return (
        <div className={`relative w-full group my-6 mx-auto`}>
             <button
                onClick={() => handleArrowScroll('left')}
                aria-label="Scroll left"
                className="btn-interactive absolute top-1/2 -translate-y-1/2 left-0 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg hover:bg-white dark:hover:bg-black/40 transition-all transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            >
                <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
             <button
                onClick={() => handleArrowScroll('right')}
                aria-label="Scroll right"
                className="btn-interactive absolute top-1/2 -translate-y-1/2 right-0 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg hover:bg-white dark:hover:bg-black/40 transition-all transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            >
                <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>

            <div className="relative w-full bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-3xl p-2 sm:p-4 shadow-2xl">
                <div className="relative">
                    <div
                        ref={scrollContainerRef}
                        className="overflow-x-scroll scrollbar-hide rounded-full"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        style={{
                            maskImage: 'linear-gradient(to right, transparent, black 100px, black calc(100% - 100px), transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 100px, black calc(100% - 100px), transparent)',
                        }}
                    >
                        <div className="relative" style={{ width: `${pianoWidth}px`, height: `${WHITE_KEY_SIZE + V_PADDING * 2}px` }}>
                            {notes.map(note => {
                                const isSelected = vocalRange.start?.semitone === note.semitone || vocalRange.end?.semitone === note.semitone;
                                const isInRange = vocalRange.start && vocalRange.end && note.semitone >= vocalRange.start.semitone && note.semitone <= vocalRange.end.semitone;
                                const isC4 = note.semitone === 0;

                                let leftPosition = 0;
                                let keyWidth = note.isSharp ? BLACK_KEY_SIZE : WHITE_KEY_SIZE;
                                
                                if (note.isSharp) {
                                    const precedingWhiteKeyIndex = whiteKeys.findIndex(wk => wk.semitone === note.semitone - 1);
                                    leftPosition = (precedingWhiteKeyIndex + 1) * WHITE_KEY_SLOT_WIDTH - (BLACK_KEY_SIZE / 2);
                                } else {
                                    const whiteKeyIndex = whiteKeys.findIndex(wk => wk.semitone === note.semitone);
                                    leftPosition = whiteKeyIndex * WHITE_KEY_SLOT_WIDTH + (WHITE_KEY_SLOT_WIDTH - WHITE_KEY_SIZE) / 2;
                                }

                                const keyCenter = leftPosition + keyWidth / 2;
                                const distanceToCenter = Math.abs(keyCenter - scrollCenterOffset);
                                
                                const maxDistance = viewportWidth / 2;
                                const normalizedDistance = maxDistance > 0 ? Math.min(1, distanceToCenter / maxDistance) : 0;
                                const centerProximity = 1 - Math.pow(normalizedDistance, 1.5);

                                return (
                                    <PianoKey
                                        key={note.semitone}
                                        ref={isC4 && !note.isSharp ? c4KeyRef : null}
                                        note={note}
                                        onClick={onKeyClick}
                                        isSelected={isSelected}
                                        isInRange={!!isInRange}
                                        mousePos={mousePos}
                                        centerProximity={centerProximity}
                                        style={{
                                            left: `${leftPosition}px`,
                                            width: `${keyWidth}px`,
                                            height: `${note.isSharp ? BLACK_KEY_SIZE : WHITE_KEY_SIZE}px`,
                                            zIndex: note.isSharp ? 10 : 5,
                                            top: `${note.isSharp ? (WHITE_KEY_SIZE - BLACK_KEY_SIZE) / 2 + V_PADDING : V_PADDING}px`
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Piano;