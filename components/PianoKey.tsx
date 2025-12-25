
import React, { useRef, useEffect, useCallback, forwardRef } from 'react';
import { Note } from '../types';
import { lerp } from '../utils';

interface PianoKeyProps {
    note: Note;
    onClick: (note: Note) => void;
    isSelected: boolean;
    isInRange: boolean;
    style: React.CSSProperties;
    mousePos: { x: number; y: number } | null;
    centerProximity: number;
}

const PianoKey = forwardRef<HTMLDivElement, PianoKeyProps>(({ note, onClick, isSelected, isInRange, style, mousePos, centerProximity }, ref) => {
    const keyRef = useRef<HTMLButtonElement>(null);
    const isWhite = !note.isSharp;

    const animatedValues = useRef({
        translateY: 0, scale: 1, shadowY: 2, shadowBlur: 12,
        glowOpacity: 0, glowSize: 12, reflectionX: 60, reflectionY: 45, reflectionOpacity: 0.7,
    });
    const animationFrameRef = useRef<number | null>(null);

    const animate = useCallback(() => {
        if (!keyRef.current) return;

        const target = {
            translateY: 0, scale: 1, shadowY: 2, shadowBlur: 12,
            glowOpacity: 0, glowSize: 12, reflectionX: 60, reflectionY: 45, reflectionOpacity: 0.7
        };

        const baseScale = isSelected ? 1.05 : 0.7;
        const maxScaleIncrease = 0.30;
        const proximityScaleFactor = baseScale + (centerProximity * maxScaleIncrease);
        target.scale = proximityScaleFactor;

        // Keep black keys fully visible to match white keys
        const opacityFactor = 1;

        if (isInRange && !isSelected) {
            target.glowOpacity = 0.4;
            target.glowSize = 18;
        }

        if (isSelected) {
            const pulse = (Math.sin(performance.now() / 250) + 1) / 2;
            target.glowOpacity = 0.5 + pulse * 0.5;
            target.glowSize = 25 + pulse * 15;
            target.translateY = 2;
        }

        if (mousePos) {
            const rect = keyRef.current.getBoundingClientRect();
            const keyCenterX = rect.left + rect.width / 2;
            const keyCenterY = rect.top + rect.height / 2;
            const dx = mousePos.x - keyCenterX;
            const dy = mousePos.y - keyCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 250;

            if (distance < maxDistance) {
                const proximity = 1 - (distance / maxDistance);
                target.translateY = (isSelected ? 2 : 0) + proximity * 4;
                target.scale = target.scale + proximity * 0.08;
                target.reflectionX = 60 + dx * 0.05;
                target.reflectionY = 45 - dy * 0.05;
                target.shadowY = 2 - proximity;
                target.shadowBlur = 12 - proximity * 6;
                target.glowOpacity = (isInRange ? 0.4 : 0) + proximity * 0.8;
                target.glowSize = (isInRange ? 18 : 12) + proximity * 25;
                target.reflectionOpacity = 0.7 + proximity * 0.3;
            }
        }

        const vals = animatedValues.current;
        const smoothness = 0.1;
        vals.translateY = lerp(vals.translateY, target.translateY, smoothness);
        vals.scale = lerp(vals.scale, target.scale, smoothness);
        vals.shadowY = lerp(vals.shadowY, target.shadowY, smoothness);
        vals.shadowBlur = lerp(vals.shadowBlur, target.shadowBlur, smoothness);
        vals.glowOpacity = lerp(vals.glowOpacity, target.glowOpacity, smoothness);
        vals.glowSize = lerp(vals.glowSize, target.glowSize, smoothness);
        vals.reflectionX = lerp(vals.reflectionX, target.reflectionX, smoothness);
        vals.reflectionY = lerp(vals.reflectionY, target.reflectionY, smoothness);
        vals.reflectionOpacity = lerp(vals.reflectionOpacity, target.reflectionOpacity, smoothness);

        const glowColor = (isSelected || isInRange) ? '139, 92, 246' : '167, 139, 250';
        keyRef.current.style.transform = `translateY(${vals.translateY}px) scale(${vals.scale})`;
        keyRef.current.style.boxShadow = `0px ${vals.shadowY}px ${vals.shadowBlur}px -5px rgba(0, 0, 0, 0.25), 0 0 ${vals.glowSize}px rgba(${glowColor}, ${vals.glowOpacity}), 0 0 10px rgba(255, 255, 255, ${vals.glowOpacity * 0.7})`;
        keyRef.current.style.setProperty('--reflection-x', `${vals.reflectionX}%`);
        keyRef.current.style.setProperty('--reflection-y', `${vals.reflectionY}%`);
        keyRef.current.style.setProperty('--reflection-opacity', `${vals.reflectionOpacity}`);
        // Both white and black keys at full opacity
        keyRef.current.style.opacity = '1';

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [mousePos, isInRange, isSelected, centerProximity, isWhite]);

    useEffect(() => {
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [animate]);

    const whiteGlassClasses = "bg-gradient-to-b from-white to-white/20";
    const blackGlassClasses = "bg-gradient-to-b from-gray-700/80 to-black/90 border-white/20";
    const glassClasses = isWhite ? whiteGlassClasses : blackGlassClasses;
    const reflectionClass = "before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-gradient-radial before:from-white/80 before:to-transparent before:to-60% before:opacity-[var(--reflection-opacity,0.7)] before:[background-position:var(--reflection-x,60%)_var(--reflection-y,45%)] before:[background-size:150%_150%]";
    const inRangeClasses = isInRange && !isSelected ? "border-violet-400/30" : "border-transparent";

    return (
        <div ref={ref} style={style} className="absolute cursor-pointer group">
            <button
                ref={keyRef}
                onClick={() => onClick(note)}
                className={`relative w-full h-full rounded-full shadow-lg shadow-black/15 backdrop-blur-md border will-change-transform ${glassClasses} ${reflectionClass} ${inRangeClasses} focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2`}
            >
                <div className="absolute inset-0 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_2px_rgba(0,0,0,0.15)]" />
                {isSelected && (
                    <div className="absolute -inset-1 rounded-full border-2 border-violet-500 opacity-80 animate-pulse"></div>
                )}
                {isWhite && (
                    <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold pointer-events-none transition-colors duration-200 ${isInRange ? 'text-violet-900' : 'text-slate-800'} group-hover:text-violet-700`}
                        style={{ textShadow: '0 1px 1px rgba(255,255,255,0.7)' }}
                    >
                        {note.name}
                    </span>
                )}
            </button>
            {!isWhite && (
                <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium pointer-events-none transition-colors duration-200 ${isInRange ? 'text-violet-700' : 'text-slate-500'} group-hover:text-violet-600`}>
                    {note.name}
                </span>
            )}
        </div>
    );
});

export default React.memo(PianoKey);