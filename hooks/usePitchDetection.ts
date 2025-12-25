import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePitchDetectionOptions {
    audioCtx: AudioContext | null;
    initAudio: () => Promise<boolean>;
    autoGainEnabled: boolean;
    noiseGateThreshold: number;
    gainValue: number;
    compressorEnabled: boolean;
    frequencySeparationEnabled: boolean;
    pyinBias: number;
    pyinGateMode: 'smooth' | 'instant';
    pitchAlgorithm: string;
    onMicStatusChange: (status: string) => void;
    pitchProcessorCode: string;
}

interface UsePitchDetectionReturn {
    micActive: boolean;
    userPitch: number | null;
    micGain: number;
    micStatus: string;
    startPitchDetection: () => Promise<boolean>;
    stopPitchDetection: () => void;
    toggleMic: () => void;
    setMicGain: (gain: number) => void;
}

export function usePitchDetection({
    audioCtx,
    initAudio,
    autoGainEnabled,
    noiseGateThreshold,
    gainValue,
    compressorEnabled,
    frequencySeparationEnabled,
    pyinBias,
    pyinGateMode,
    pitchAlgorithm,
    onMicStatusChange,
    pitchProcessorCode,
}: UsePitchDetectionOptions): UsePitchDetectionReturn {
    const [micActive, setMicActive] = useState(false);
    const [userPitch, setUserPitch] = useState<number | null>(null);
    const [micGain, setMicGain] = useState(0);
    const [micStatus, setMicStatus] = useState('micStatusActivate');

    const micStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const workletModuleAddedRef = useRef(false);
    const lastPitchRef = useRef<number | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
    const eqLowNodeRef = useRef<BiquadFilterNode | null>(null);
    const eqMidNodeRef = useRef<BiquadFilterNode | null>(null);
    const eqHighNodeRef = useRef<BiquadFilterNode | null>(null);
    const lastSmoothedPitchRef = useRef<number | null>(null);
    const pitchBufferRef = useRef<number[]>([]);

    const startPitchDetection = useCallback(async (): Promise<boolean> => {
        const audioReady = await initAudio();
        if (!audioReady || !audioCtx) {
            const errorMsg = 'micStatusError';
            setMicStatus(errorMsg);
            onMicStatusChange(errorMsg);
            return false;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    // 🎯 AGGRESSIVE ECHO CANCELLATION for feedback prevention
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: autoGainEnabled },
                    // @ts-ignore - Chrome/Chromium specific constraints for stronger echo cancellation
                    googEchoCancellation: { exact: true },
                    // @ts-ignore
                    googExperimentalEchoCancellation: { exact: true },
                    // @ts-ignore
                    googAutoGainControl: { exact: autoGainEnabled },
                    // @ts-ignore
                    googNoiseSuppression: { exact: true },
                    // @ts-ignore
                    googExperimentalNoiseSuppression: { exact: true },
                    // @ts-ignore
                    googHighpassFilter: { exact: true },
                    // @ts-ignore - Safari-specific constraint
                    echoCancelation: { ideal: true }
                }
            });
            micStreamRef.current = stream;
            const source = audioCtx.createMediaStreamSource(stream);

            // Resume AudioContext if suspended
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            // Initialize AudioWorklet (McLeod Pitch Method) - only add module once
            if (!workletModuleAddedRef.current) {
                try {
                    await audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([pitchProcessorCode], { type: 'application/javascript' })));
                    workletModuleAddedRef.current = true;

                } catch (e) {
                    console.error('❌ Failed to register pitch processor:', e);
                    const errorMsg = 'micStatusError';
                    setMicStatus(errorMsg);
                    onMicStatusChange(errorMsg);
                    return false;
                }
            }

            const workletNode = new AudioWorkletNode(audioCtx, 'pitch-processor', {
                processorOptions: {
                    noiseGateThreshold,
                    algorithm: pitchAlgorithm,
                    pyinBias,
                    pyinGateMode
                }
            });
            workletNodeRef.current = workletNode;

            // FREQUENCY SEPARATION: High-pass filter - App deaf to piano frequencies
            let micInputNode: AudioNode = source;
            if (frequencySeparationEnabled) {
                const highPassFilter = audioCtx.createBiquadFilter();
                highPassFilter.type = 'highpass';
                highPassFilter.frequency.value = 950; // App deaf below 950Hz
                highPassFilter.Q.value = 1.0;
                source.connect(highPassFilter);
                micInputNode = highPassFilter;
            }

            // Connect to pitch detector
            micInputNode.connect(workletNode);

            workletNode.port.onmessage = (event) => {
                const { pitch, gain } = event.data;
                const adjustedGain = gain;
                setMicGain(Math.min(1, adjustedGain * 100) * 100);

                if (pitch !== undefined && pitch > 60) {
                    // Reject impossible octave jumps (likely pitch detection errors)
                    if (lastPitchRef.current !== null) {
                        const semitoneJump = Math.abs(12 * Math.log2(pitch / lastPitchRef.current));
                        if (semitoneJump > 36) {
                            // Reject jumps larger than 3 octaves - these are detection errors
                            return;
                        }
                    }

                    // Pass raw pitch data - smoothing handled by visualizer
                    setUserPitch(pitch);
                    lastPitchRef.current = pitch;
                } else {
                    // No valid pitch - keep last position so circle stays in place (grey)
                }
            };

            setMicActive(true);
            return true;
        } catch (err) {
            console.error("Mic Error:", err);
            const errorMsg = 'micStatusPermissionDenied';
            setMicStatus(errorMsg);
            onMicStatusChange(errorMsg);
        }
        return false;
    }, [initAudio, audioCtx, autoGainEnabled, noiseGateThreshold, gainValue, compressorEnabled, frequencySeparationEnabled, pyinBias, pyinGateMode, pitchAlgorithm, onMicStatusChange, pitchProcessorCode]);

    const stopPitchDetection = useCallback(() => {
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        if (workletNodeRef.current) {
            workletNodeRef.current.port.onmessage = null;
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        workletModuleAddedRef.current = false; // Reset so worklet can be re-registered on next start
        setMicActive(false);
        setUserPitch(null);
        setMicGain(0);
        lastSmoothedPitchRef.current = null;
        pitchBufferRef.current = [];
    }, []);

    const toggleMic = useCallback(() => {
        if (micActive) {
            stopPitchDetection();
        } else {
            startPitchDetection();
        }
    }, [micActive, startPitchDetection, stopPitchDetection]);

    // Effects to update audio node parameters when state changes
    useEffect(() => {
        if (gainNodeRef.current) gainNodeRef.current.gain.value = autoGainEnabled ? 1 : gainValue;
    }, [gainValue, autoGainEnabled]);

    useEffect(() => {
        if (workletNodeRef.current) {
            console.log('🎛️ Sending noiseGateThreshold to worklet:', noiseGateThreshold);
            workletNodeRef.current.port.postMessage({ noiseGateThreshold });
        }
    }, [noiseGateThreshold]);

    useEffect(() => {
        if (workletNodeRef.current) workletNodeRef.current.port.postMessage({ algorithm: pitchAlgorithm });
    }, [pitchAlgorithm]);

    useEffect(() => {
        if (workletNodeRef.current) {
            console.log('🎛️ Sending pyinBias to worklet:', pyinBias);
            workletNodeRef.current.port.postMessage({ pyinBias });
        }
    }, [pyinBias]);

    useEffect(() => {
        if (workletNodeRef.current) {
            console.log('🎛️ Sending pyinGateMode to worklet:', pyinGateMode);
            workletNodeRef.current.port.postMessage({ pyinGateMode });
        }
    }, [pyinGateMode]);

    // Cleanup on unmount
    useEffect(() => () => stopPitchDetection(), [stopPitchDetection]);

    return {
        micActive,
        userPitch,
        micGain,
        micStatus,
        startPitchDetection,
        stopPitchDetection,
        toggleMic,
        setMicGain,
    };
}
