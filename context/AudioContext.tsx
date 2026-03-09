import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

interface AudioContextType {
    audioCtxRef: React.MutableRefObject<AudioContext | null>;
    masterGainRef: React.MutableRefObject<GainNode | null>;
    initAudio: () => Promise<boolean>;
    isAudioInitialized: boolean;
    audioState: AudioContextState | 'closed' | 'uninitialized';
    resumeAudio: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const audioInitPromiseRef = useRef<Promise<boolean> | null>(null);
    const workletModuleAddedRef = useRef(false);

    const [isAudioInitialized, setIsAudioInitialized] = useState(false);
    const [audioState, setAudioState] = useState<AudioContextState | 'closed' | 'uninitialized'>('uninitialized');

    // Update state when audio context state changes
    useEffect(() => {
        if (!audioCtxRef.current) return;

        const updateState = () => {
            if (audioCtxRef.current) {
                setAudioState(audioCtxRef.current.state);
            }
        };

        const ctx = audioCtxRef.current;
        ctx.addEventListener('statechange', updateState);
        return () => {
            ctx.removeEventListener('statechange', updateState);
        };
    }, [isAudioInitialized]);

    const initAudio = useCallback(async (): Promise<boolean> => {
        if (audioCtxRef.current) return true;
        if (audioInitPromiseRef.current) return audioInitPromiseRef.current;

        const promise = (async () => {
            try {
                const Ctx = window.AudioContext || (window as any).webkitAudioContext;
                if (!Ctx) {
                    console.error('AudioContext not supported');
                    return false;
                }

                const ctx = new Ctx({
                    latencyHint: 'interactive',
                    sampleRate: 44100
                });
                audioCtxRef.current = ctx;

                // Load the AudioWorklet
                try {
                    await ctx.audioWorklet.addModule('pitch-processor.js');
                    workletModuleAddedRef.current = true;
                } catch (e) {
                    console.error("Failed to load worklet from file", e);
                }

                masterGainRef.current = ctx.createGain();
                masterGainRef.current.connect(ctx.destination);
                masterGainRef.current.gain.value = 0.5;

                setIsAudioInitialized(true);
                setAudioState(ctx.state);

                return true;
            } catch (e) {
                console.error("Audio init error:", e);
                return false;
            }
        })();

        audioInitPromiseRef.current = promise;
        return promise;
    }, []);

    const resumeAudio = useCallback(async () => {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            try {
                await audioCtxRef.current.resume();
                setAudioState(audioCtxRef.current.state);
            } catch (e) {
                console.warn('Failed to resume audio context', e);
            }
        }
    }, []);

    const value = {
        audioCtxRef,
        masterGainRef,
        initAudio,
        isAudioInitialized,
        audioState,
        resumeAudio
    };

    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (context === undefined) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
};
