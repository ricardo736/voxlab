import React, { useState, useEffect, useRef, useMemo } from 'react';
import { lerp, frequencyToNote } from '../utils';

interface SimplePitchIndicatorProps {
    micGain: number;
    userPitch: number | null;
    currentTheme: { primary: string; secondary: string; gradient: string };
}

// Helper to convert Tailwind color class to an RGB array [r, g, b]
const colorMap: { [key: string]: [number, number, number] } = {
    'text-violet-600': [139, 92, 246], 'text-fuchsia-600': [217, 70, 239],
    'text-blue-600': [37, 99, 235], 'text-cyan-600': [8, 145, 178],
    'text-green-700': [21, 128, 61], 'text-teal-600': [13, 148, 136],
    'text-orange-600': [234, 88, 12], 'text-red-600': [220, 38, 38],
};

const getRgbArrayFromTheme = (themeColor: string): [number, number, number] => {
    return colorMap[themeColor] || [139, 92, 246];
};

const NUM_ELEMENTS = 9;
const BAR_WIDTH_PX = 18;
const MAX_BAR_HEIGHT_PX = 110;
const GAIN_HISTORY_LENGTH = 10; // Increased for more stagger
const OPACITY_LEVELS = [0.5, 0.6, 0.75, 0.9, 1, 0.9, 0.75, 0.6, 0.5];
const AMPLITUDE_MULTIPLIERS = [0.4, 0.65, 0.85, 0.95, 1, 0.95, 0.85, 0.65, 0.4];

const SimplePitchIndicator: React.FC<SimplePitchIndicatorProps> = ({
    micGain,
    userPitch,
    currentTheme,
}) => {
    const primaryRgb = useMemo(() => getRgbArrayFromTheme(currentTheme.primary), [currentTheme.primary]);
    const secondaryRgb = useMemo(() => getRgbArrayFromTheme(currentTheme.secondary), [currentTheme.secondary]);

    const [visuals, setVisuals] = useState(() =>
        Array(NUM_ELEMENTS).fill({ height: BAR_WIDTH_PX, color: primaryRgb.join(', '), translateY: 0 })
    );

    const gainHistory = useRef(new Array(GAIN_HISTORY_LENGTH).fill(0));
    const animatedVisuals = useRef(visuals.map(v => ({...v})));
    const animationFrameRef = useRef<number | null>(null);
    const randomFloatParams = useRef(Array(NUM_ELEMENTS).fill(0).map(() => ({
        speed: 0.0008 + Math.random() * 0.0005, // Random speed
        phase: Math.random() * Math.PI * 2,    // Random phase
        amplitude: 0.5 + Math.random() * 1.5,      // Reduced amplitude for subtler float
    })));

    useEffect(() => {
        const animate = () => {
            gainHistory.current.push(micGain);
            if (gainHistory.current.length > GAIN_HISTORY_LENGTH) {
                gainHistory.current.shift();
            }
            
            const now = performance.now();
            const isSignalActive = micGain > 5;
            const detectedNote = userPitch && isSignalActive ? frequencyToNote(userPitch) : null;
            
            // Map pitch (C3 to C4.5) to a 0-1 value for color interpolation for a more sensitive reaction
            const PITCH_MIN_SEMITONE = -12; // C3
            const PITCH_RANGE = 18; // 1.5 octaves
            let colorLerpFactor = 0.0;
            if (detectedNote) {
                colorLerpFactor = Math.max(0, Math.min(1, (detectedNote.semitone - PITCH_MIN_SEMITONE) / PITCH_RANGE));
            }
            
            // Interpolate target color based on pitch
            const r = lerp(primaryRgb[0], secondaryRgb[0], colorLerpFactor);
            const g = lerp(primaryRgb[1], secondaryRgb[1], colorLerpFactor);
            const b = lerp(primaryRgb[2], secondaryRgb[2], colorLerpFactor);

            animatedVisuals.current.forEach((vis, i) => {
                const centralBarIndex = Math.floor(NUM_ELEMENTS / 2);
                const distanceFromCenter = Math.abs(i - centralBarIndex);
                // Apply a larger delay for elements further from the center
                const gainIndex = Math.max(0, GAIN_HISTORY_LENGTH - 1 - (distanceFromCenter * 2));
                const gainForBar = isSignalActive ? (gainHistory.current[gainIndex] || 0) : 0;
                
                const amplitudeMultiplier = AMPLITUDE_MULTIPLIERS[i];
                // Use a power curve for gain to make reaction more noticeable at lower volumes
                const gainFactor = Math.pow(gainForBar / 100, 0.75);
                const randomJitter = (Math.random() * 0.6) + 0.7;
                const targetHeight = BAR_WIDTH_PX + gainFactor * MAX_BAR_HEIGHT_PX * amplitudeMultiplier * randomJitter;

                vis.height = lerp(vis.height, targetHeight, 0.35);
                
                // Smoothly interpolate current bar color towards target color with stronger reaction
                const currentColorRgb = vis.color.split(', ').map(Number);
                const nextColorRgb = [
                    lerp(currentColorRgb[0], r, 0.35),
                    lerp(currentColorRgb[1], g, 0.35),
                    lerp(currentColorRgb[2], b, 0.35)
                ];
                vis.color = nextColorRgb.map(c => c.toFixed(0)).join(', ');

                // Randomized floaty effect
                const params = randomFloatParams.current[i];
                vis.translateY = Math.sin(now * params.speed + params.phase) * params.amplitude;
            });

            setVisuals([...animatedVisuals.current]);
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [micGain, userPitch, primaryRgb, secondaryRgb]);

    const glowScale = 0.5 + (micGain / 100) * 1.5;
    const glowOpacity = 0.1 + (micGain / 100) * 0.4;
    
    const primaryHex = `#${primaryRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
    const secondaryHex = `#${secondaryRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
    const backgroundGlowStyle = {
        transform: `scale(${glowScale})`,
        opacity: glowOpacity,
        background: `
            radial-gradient(ellipse at 25% 75%, ${primaryHex} 0%, transparent 50%),
            radial-gradient(ellipse at 75% 25%, ${secondaryHex} 0%, transparent 50%)
        `,
        filter: 'blur(128px)', // Increased blur
    };

    return (
        <div className="relative w-full h-80 flex justify-center items-center">
            {/* Reactive background glow */}
            <div
                className="absolute inset-[-50%] transition-all duration-500 ease-out"
                style={backgroundGlowStyle}
            />
            <div className="absolute flex justify-center items-center gap-3">
                {visuals.map((vis, i) => {
                    const opacity = OPACITY_LEVELS[i];
                    return (
                        <div
                            key={i}
                            className="rounded-full transition-all duration-75 ease-out"
                            style={{
                                width: `${BAR_WIDTH_PX}px`,
                                height: `${vis.height}px`,
                                background: `rgba(${vis.color}, ${opacity})`,
                                transform: `translateY(${vis.translateY}px)`,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default SimplePitchIndicator;
