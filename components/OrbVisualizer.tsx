import React, { useRef, useEffect } from 'react';
import { lerp } from '../utils';

interface OrbVisualizerProps {
    micGain: number;
    visualizerTheme: { name: string; gradient: string }[];
}

const OrbVisualizer: React.FC<OrbVisualizerProps> = ({ micGain, visualizerTheme }) => {
    const orbsRef = useRef<(HTMLDivElement | null)[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const micGainRef = useRef(micGain);

    // Keep the ref updated without triggering the animation effect restart
    useEffect(() => {
        micGainRef.current = micGain;
    }, [micGain]);

    const orbParams = useRef(Array(6).fill(0).map(() => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        scale: 1,
        opacity: 0.5,
        targetScale: 1,
        targetOpacity: 0.5,
        // Animation parameters
        x_amp: Math.random() * 30 + 20,
        y_amp: Math.random() * 30 + 20,
        x_freq: (Math.random() - 0.5) * 0.0002 + 0.0001,
        y_freq: (Math.random() - 0.5) * 0.0002 + 0.0001,
        x_phase: Math.random() * Math.PI * 2,
        y_phase: Math.random() * Math.PI * 2,
    }))).current;

    useEffect(() => {
        const animate = (time: number) => {
            // Use the ref value to avoid effect dependency on micGain
            const gainFactor = Math.pow(micGainRef.current / 100, 0.7);
            const targetScale = 1 + gainFactor * 1.5;
            const targetOpacity = 0.02 + gainFactor * 0.015;

            orbsRef.current.forEach((orb, i) => {
                if (!orb) return;

                const params = orbParams[i];
                params.targetScale = targetScale;
                params.targetOpacity = targetOpacity;

                // Smoothly interpolate scale and opacity
                params.scale = lerp(params.scale, params.targetScale, 0.05);
                params.opacity = lerp(params.opacity, params.targetOpacity, 0.05);

                // Update position for floating animation
                params.x = 50 + params.x_amp * Math.sin(time * params.x_freq + params.x_phase);
                params.y = 50 + params.y_amp * Math.cos(time * params.y_freq + params.y_phase);

                orb.style.transform = `translate(-50%, -50%) translate(${params.x}vw, ${params.y}vh) scale(${params.scale})`;
                orb.style.opacity = `${params.opacity}`;
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [orbParams]); // Removed micGain from dependencies

    // Use a cycle of the first 3 gradients if only 3 are provided, to make 6 orbs.
    const fullVisualizerTheme = visualizerTheme.length >= 6
        ? visualizerTheme
        : [...visualizerTheme, ...visualizerTheme];

    return (
        <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            {fullVisualizerTheme.slice(0, 6).map((orb, index) => (
                <div
                    key={orb.name + index}
                    // Fix: Use a block body for the ref callback to ensure it returns void.
                    ref={el => { orbsRef.current[index] = el; }}
                    className="absolute rounded-full w-[20vmax] h-[20vmax] mix-blend-multiply dark:mix-blend-screen"
                    style={{
                        background: orb.gradient,
                        filter: 'blur(60px)',
                        opacity: 0.4,
                        willChange: 'transform, opacity',
                    }}
                />
            ))}
        </div>
    );
};

// Only re-render if micGain changes significantly (more than 5%) or theme changes
export default React.memo(OrbVisualizer, (prevProps, nextProps) => {
    const gainDiff = Math.abs(prevProps.micGain - nextProps.micGain);
    const themeChanged = prevProps.visualizerTheme !== nextProps.visualizerTheme;
    return gainDiff < 5 && !themeChanged;
});