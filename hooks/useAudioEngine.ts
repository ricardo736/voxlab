
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useTranslation } from './useTranslation';

interface AudioEngineProps {
    autoGainEnabled: boolean;
    gainValue: number;
    noiseGateThreshold: number;
    compressorThreshold: number;
    compressorRatio: number;
    compressorRelease: number;
    frequencySeparationEnabled: boolean;
    compressorEnabled: boolean;
    pyinBias: number;
    pyinGateMode: 'smooth' | 'instant';
    pitchAlgorithm: string;
    eqLowGain: number;
    eqMidGain: number;
    eqHighGain: number;
}

export const useAudioEngine = ({
    autoGainEnabled,
    gainValue,
    noiseGateThreshold,
    compressorThreshold,
    compressorRatio,
    compressorRelease,
    frequencySeparationEnabled,
    compressorEnabled,
    pyinBias,
    pyinGateMode,
    pitchAlgorithm,
    eqLowGain,
    eqMidGain,
    eqHighGain
}: AudioEngineProps) => {
    const { t } = useTranslation();
    const { audioCtxRef, masterGainRef, initAudio: initBaseAudio } = useAudio();

    const [micActive, setMicActive] = useState(false);
    const [userPitch, setUserPitch] = useState<number | null>(null);
    const [micGain, setMicGain] = useState(0);
    const [micStatus, setMicStatus] = useState(t('micStatusActivate'));

    const micStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null); // Note: In App.tsx this seemed unused or confused with masterGain, but checking usage...
    // In App.tsx: useEffect(() => { if (gainNodeRef.current) gainNodeRef.current.gain.value = autoGainEnabled ? 1 : gainValue; }, ...);
    // But gainNodeRef wasn't actually created in the snippet I saw! 
    // Wait, looking at App.tsx again, I need to verify if gainNodeRef is actually attached to anything.
    // Explicit check: In App.tsx, masterGainRef is the main output. 
    // gainNodeRef seems to be a separate input gain node?
    // Let's assume we need an input gain node for the mic if manual gain is used. 

    const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
    const eqLowNodeRef = useRef<BiquadFilterNode | null>(null);
    const eqMidNodeRef = useRef<BiquadFilterNode | null>(null);
    const eqHighNodeRef = useRef<BiquadFilterNode | null>(null);

    const lastPitchRef = useRef<number | null>(null);
    const lastSmoothedPitchRef = useRef<number | null>(null);
    const pitchBufferRef = useRef<number[]>([]);

    const stopPitchDetection = useCallback(() => {
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        if (workletNodeRef.current) {
            workletNodeRef.current.port.onmessage = null;
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }

        setMicActive(false);
        setUserPitch(null);
        setMicGain(0);
        lastSmoothedPitchRef.current = null;
        pitchBufferRef.current = [];
    }, []);

    // Cleanup on unmount
    useEffect(() => () => stopPitchDetection(), [stopPitchDetection]);


    const initAudioGraph = useCallback(async () => {
        const ready = await initBaseAudio();
        if (!ready || !audioCtxRef.current || !masterGainRef.current) return false;

        const ctx = audioCtxRef.current;

        // Setup Output Nodes if not ready
        if (!compressorNodeRef.current) {
            const compressor = ctx.createDynamicsCompressor();
            // Initial values will be updated by effects
            compressor.attack.value = 0.003;
            compressorNodeRef.current = compressor;

            // Connect Master Gain -> Compressor -> Destination
            // Disconnect masterGain from implicit destination if needed, though Context usually connects it.
            // In App.tsx, it disconnects and reconnects.
            try { masterGainRef.current.disconnect(); } catch (e) { }

            masterGainRef.current.connect(compressor);
            compressor.connect(ctx.destination);

            // Create EQ nodes
            const low = ctx.createBiquadFilter();
            low.type = 'lowshelf';
            low.frequency.value = 320;

            const mid = ctx.createBiquadFilter();
            mid.type = 'peaking';
            mid.frequency.value = 1000;
            mid.Q.value = 0.5;

            const high = ctx.createBiquadFilter();
            high.type = 'highshelf';
            high.frequency.value = 3200;

            eqLowNodeRef.current = low;
            eqMidNodeRef.current = mid;
            eqHighNodeRef.current = high;
            // Note: In App.tsx EQ seemed to be created but NOT connected into the graph? 
            // Re-reading App.tsx: 
            // eqLowNodeRef.current = low; ...
            // But where are they connected? 
            // Searching App.tsx for `eqLowNodeRef.current.connect`...
            // If they are not connected, they are useless. 
            // The existing App.tsx might have zombie code for EQ that isn't actually active in the audio path.
            // I will preserve the creation but if they weren't connected, I won't invent a connection scheme yet to avoid changing behavior.
            // Update: In App.tsx, I see creation but no `connect` calls for EQ nodes. They might be for future use or broken implementations.
            // I will keep them but this is suspicious.
        }

        return true;
    }, [initBaseAudio, audioCtxRef, masterGainRef]);

    const startPitchDetection = useCallback(async (): Promise<boolean> => {
        const audioReady = await initAudioGraph();
        const audioCtx = audioCtxRef.current;

        if (!audioReady || !audioCtx) {
            setMicStatus(t('micStatusError'));
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    // @ts-ignore
                    googEchoCancellation: false,
                    // @ts-ignore
                    googExperimentalEchoCancellation: false,
                    // @ts-ignore
                    googAutoGainControl: false,
                    // @ts-ignore
                    googNoiseSuppression: false,
                    // @ts-ignore
                    googExperimentalNoiseSuppression: false,
                    // @ts-ignore
                    googHighpassFilter: false,
                    // @ts-ignore
                    echoCancelation: false
                }
            });

            micStreamRef.current = stream;
            const source = audioCtx.createMediaStreamSource(stream);

            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            // Create AudioWorkletNode
            const workletNode = new AudioWorkletNode(audioCtx, 'pitch-processor', {
                processorOptions: {
                    noiseGateThreshold,
                    algorithm: pitchAlgorithm,
                    pyinBias,
                    pyinGateMode
                }
            });
            workletNodeRef.current = workletNode;

            let micInputNode: AudioNode = source;

            // Frequency Separation
            if (frequencySeparationEnabled) {
                const highPassFilter = audioCtx.createBiquadFilter();
                highPassFilter.type = 'highpass';
                highPassFilter.frequency.value = 950;
                highPassFilter.Q.value = 1.0;
                source.connect(highPassFilter);
                micInputNode = highPassFilter;
            }

            micInputNode.connect(workletNode);

            workletNode.port.onmessage = (event) => {
                const { pitch, gain } = event.data;
                setMicGain(Math.min(1, gain * 100) * 100);

                if (pitch !== undefined && pitch > 60) {
                    if (lastPitchRef.current !== null) {
                        const semitoneJump = Math.abs(12 * Math.log2(pitch / lastPitchRef.current));
                        if (semitoneJump > 36) return; // Reject huge jumps
                    }
                    setUserPitch(pitch);
                    lastPitchRef.current = pitch;
                }
            };

            setMicActive(true);
            return true;
        } catch (err) {
            console.error("Mic Error:", err);
            setMicStatus(t('micStatusPermissionDenied'));
            return false;
        }
    }, [initAudioGraph, audioCtxRef, t, autoGainEnabled, noiseGateThreshold, frequencySeparationEnabled, pitchAlgorithm, pyinBias, pyinGateMode]);


    // --- EFFECTS ---

    // Update Node Params
    useEffect(() => {
        if (compressorNodeRef.current) {
            if (compressorEnabled) {
                compressorNodeRef.current.threshold.value = compressorThreshold;
                compressorNodeRef.current.ratio.value = compressorRatio;
            } else {
                // Real bypass: 0dB threshold and 1:1 ratio
                compressorNodeRef.current.threshold.value = 0;
                compressorNodeRef.current.ratio.value = 1;
            }
            compressorNodeRef.current.release.value = compressorRelease;
        }
    }, [compressorEnabled, compressorThreshold, compressorRatio, compressorRelease]);

    useEffect(() => { if (eqLowNodeRef.current) eqLowNodeRef.current.gain.value = eqLowGain; }, [eqLowGain]);
    useEffect(() => { if (eqMidNodeRef.current) eqMidNodeRef.current.gain.value = eqMidGain; }, [eqMidGain]);
    useEffect(() => { if (eqHighNodeRef.current) eqHighNodeRef.current.gain.value = eqHighGain; }, [eqHighGain]);

    // Worklet Message Updates
    useEffect(() => {
        workletNodeRef.current?.port.postMessage({ noiseGateThreshold });
    }, [noiseGateThreshold]);

    useEffect(() => {
        workletNodeRef.current?.port.postMessage({ algorithm: pitchAlgorithm });
    }, [pitchAlgorithm]);

    useEffect(() => {
        workletNodeRef.current?.port.postMessage({ pyinBias });
    }, [pyinBias]);

    useEffect(() => {
        workletNodeRef.current?.port.postMessage({ pyinGateMode });
    }, [pyinGateMode]);

    return {
        micActive,
        setMicActive,
        userPitch,
        setUserPitch,
        micGain,
        micStatus,
        startPitchDetection,
        stopPitchDetection,
        initAudioGraph
    };
};
