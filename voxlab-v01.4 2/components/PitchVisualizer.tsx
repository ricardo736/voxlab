import React, { useRef, useEffect, useMemo } from 'react';
import { semitoneToNoteName } from '../utils';
import { useTranslation } from '../hooks/useTranslation';

const HISTORY_LENGTH = 200;
const INDICATOR_X_RATIO = 0.85;
const HISTORY_UPDATE_INTERVAL_FRAMES = 3;

interface PitchVisualizerProps {
    micActive: boolean;
    micGain: number;
    smoothedSemitone: number | null;
    centerSemitone: number;
    visibleOctaves: number;
    primaryColor?: string;
    secondaryColor?: string;
}

const tailwindToRgba = (className: string = 'text-violet-600', opacity: number = 1): string => {
    // Map of Tailwind color classes to hex values for light mode
    const lightColors: { [key: string]: string } = {
        'text-violet-600': '#8b5cf6', 'text-fuchsia-600': '#d946ef', 'text-blue-600': '#2563eb',
        'text-cyan-600': '#0891b2', 'text-green-700': '#15803d', 'text-teal-600': '#0d9488',
        'text-orange-600': '#ea580c', 'text-red-600': '#dc2626'
    };
    // Map of Tailwind color classes to hex values for dark mode
    const darkColors: { [key: string]: string } = {
        'text-violet-600': '#c4b5fd', 'text-fuchsia-600': '#e879f9', 'text-blue-600': '#60a5fa',
        'text-cyan-600': '#22d3ee', 'text-green-700': '#4ade80', 'text-teal-600': '#5eead4',
        'text-orange-600': '#fdba74', 'text-red-600': '#f87171'
    };

    const isDarkMode = document.documentElement.classList.contains('dark');
    const colors = isDarkMode ? darkColors : lightColors;
    
    const hex = colors[className] || lightColors['text-violet-600']; // Default to violet-600 light
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const PitchVisualizer: React.FC<PitchVisualizerProps> = ({ micActive, micGain, smoothedSemitone, centerSemitone, visibleOctaves, primaryColor = 'text-violet-600' }) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const pitchHistoryRef = useRef<(number | null)[]>(new Array(HISTORY_LENGTH).fill(null));
    const frameCounterRef = useRef(0);
    const propsRef = useRef({ micActive, micGain, smoothedSemitone });

    useEffect(() => { propsRef.current = { micActive, micGain, smoothedSemitone }; }, [micActive, micGain, smoothedSemitone]);

    const { MIN_SEMITONE, MAX_SEMITONE, TOTAL_SEMITONES, NOTE_MARKERS } = useMemo(() => {
        const rangeSpan = 12 * visibleOctaves;
        const min = centerSemitone - (rangeSpan / 2);
        const max = centerSemitone + (rangeSpan / 2);
        const markers = [];
        for (let s = Math.floor(min); s <= Math.ceil(max); s++) markers.push({ name: semitoneToNoteName(s), semitone: s });
        return { MIN_SEMITONE: min, MAX_SEMITONE: max, TOTAL_SEMITONES: max - min, NOTE_MARKERS: markers };
    }, [centerSemitone, visibleOctaves]);

    useEffect(() => {
        const canvas = canvasRef.current; const container = containerRef.current; if (!canvas || !container) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        let dpr = window.devicePixelRatio || 1;
        const resizeCanvas = () => { const { width, height } = container.getBoundingClientRect(); dpr = window.devicePixelRatio || 1; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
        const draw = () => {
            const { width, height } = container.getBoundingClientRect(); ctx.clearRect(0, 0, width, height);
            const { micActive: currentMicActive, micGain: currentMicGain, smoothedSemitone: currentSmoothedSemitone } = propsRef.current;
            frameCounterRef.current++; const isSignalActive = currentMicActive && currentMicGain > 5 && currentSmoothedSemitone !== null;
            const currentPitch = isSignalActive ? currentSmoothedSemitone : null;
            if (frameCounterRef.current % HISTORY_UPDATE_INTERVAL_FRAMES === 0) pitchHistoryRef.current = [...pitchHistoryRef.current.slice(1), currentPitch];
            NOTE_MARKERS.forEach(({ name, semitone }) => {
                const isCNote = name.startsWith('C'), isSharpNote = name.includes('#');
                const y = height - ((semitone - MIN_SEMITONE) / TOTAL_SEMITONES * height);
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.lineWidth = isCNote ? 1 : 0.5;
                ctx.strokeStyle = isCNote ? 'rgba(148, 163, 184, 0.7)' : isSharpNote ? 'rgba(226, 232, 240, 0.6)' : 'rgba(203, 213, 225, 0.7)';
                ctx.stroke(); ctx.font = '10px sans-serif'; ctx.fillStyle = isCNote ? 'rgba(100, 116, 139, 0.9)' : isSharpNote ? 'rgba(148, 163, 184, 0.9)' : 'rgba(161, 161, 170, 0.9)';
                ctx.textAlign = 'end'; ctx.textBaseline = 'middle'; ctx.fillText(name, width - 8, y - 6);
            });
            const indicatorX = width * INDICATOR_X_RATIO, xStep = width / (HISTORY_LENGTH - 1);
            const points = pitchHistoryRef.current.map((s, i) => s === null ? null : ({ x: indicatorX - ((HISTORY_LENGTH - 1 - i) * xStep), y: height - ((s - MIN_SEMITONE) / TOTAL_SEMITONES * height) })).filter((p): p is {x: number, y: number} => p !== null);
            if (points.length > 1) {
                const gradient = ctx.createLinearGradient(0, 0, indicatorX, 0);
                gradient.addColorStop(0, tailwindToRgba(primaryColor, 0)); gradient.addColorStop(0.5, tailwindToRgba(primaryColor, 0.4)); gradient.addColorStop(1, tailwindToRgba(primaryColor, 1));
                ctx.beginPath(); ctx.lineWidth = 2.5; ctx.strokeStyle = gradient; ctx.moveTo(points[0].x, points[0].y);
                for (let i = 0; i < points.length - 1; i++) ctx.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + points[i+1].x) / 2, (points[i].y + points[i+1].y) / 2);
                ctx.stroke();
            }
            const lastActiveSemitone = [...pitchHistoryRef.current].reverse().find(s => s !== null);
            if (lastActiveSemitone !== undefined && lastActiveSemitone !== null) {
                 const y = height - ((lastActiveSemitone - MIN_SEMITONE) / TOTAL_SEMITONES * height);
                 ctx.beginPath(); ctx.arc(indicatorX, y, 6, 0, 2 * Math.PI);
                 ctx.fillStyle = (currentMicActive && currentMicGain > 5) ? tailwindToRgba(primaryColor, 1) : '#64748b';
                 ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
            }
        };
        const renderLoop = () => { draw(); animationFrameRef.current = requestAnimationFrame(renderLoop); };
        const resizeObserver = new ResizeObserver(resizeCanvas); resizeObserver.observe(container); renderLoop();
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); resizeObserver.disconnect(); };
    }, [NOTE_MARKERS, TOTAL_SEMITONES, MIN_SEMITONE, primaryColor]);
    
    const isClipping = micGain >= 98;
    const meterColor = isClipping ? 'bg-red-500' : micGain > 85 ? 'bg-amber-400' : 'bg-green-500';

    return (
        <div className="w-full mb-4">
            <div ref={containerRef} className="w-full h-80 bg-white/30 dark:bg-black/20 backdrop-blur-lg rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-lg">
               <canvas ref={canvasRef} className="w-full h-full" />
            </div>
            <div className="mt-4 w-full">
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <p>{t('inputVolume')}</p>
                    {isClipping && <p className="font-bold text-red-500 dark:text-red-400 animate-pulse">{t('clippingWarning')}</p>}
                </div>
                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-300/50 dark:border-slate-600/50">
                    <div className={`h-full rounded-full transition-all duration-75 ease-linear ${meterColor}`} style={{ width: `${micGain}%`}} ></div>
                </div>
            </div>
        </div>
    );
};

export default PitchVisualizer;