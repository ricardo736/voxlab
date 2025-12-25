import { useState, useRef, useCallback, useEffect } from 'react';
import { pitchProcessorCode } from './pitchProcessor';

interface UsePitchDetectionReturn {
  // State
  micActive: boolean;
  setMicActive: (active: boolean) => void;
  userPitch: number | null;
  setUserPitch: (pitch: number | null) => void;
  micGain: number;
  setMicGain: (gain: number) => void;
  micStatus: string;
  setMicStatus: (status: string) => void;
  
  // Refs
  micStreamRef: React.RefObject<MediaStream | null>;
  workletNodeRef: React.RefObject<AudioWorkletNode | null>;
  workletModuleAddedRef: React.RefObject<boolean>;
  lastPitchRef: React.RefObject<number | null>;
  lastSmoothedPitchRef: React.RefObject<number | null>;
  pitchBufferRef: React.RefObject<number[]>;
  gainNodeRef: React.RefObject<GainNode | null>;
  eqLowNodeRef: React.RefObject<BiquadFilterNode | null>;
  eqMidNodeRef: React.RefObject<BiquadFilterNode | null>;
  eqHighNodeRef: React.RefObject<BiquadFilterNode | null>;
  
  // Functions
  startPitchDetection: () => Promise<boolean>;
  stopPitchDetection: () => void;
  handleMicToggle: () => void;
}

export function usePitchDetection(
  t: (key: string) => string,
  initAudio: () => Promise<boolean>,
  audioCtxRef: React.RefObject<AudioContext | null>,
  autoGainEnabled: boolean,
  noiseGateThreshold: number,
  gainValue: number,
  compressorEnabled: boolean,
  frequencySeparationEnabled: boolean,
  pyinBias: number,
  pyinGateMode: 'smooth' | 'instant',
  pitchAlgorithm: string,
  compressorThreshold: number,
  compressorRatio: number,
  compressorRelease: number,
  eqLowGain: number,
  eqMidGain: number,
  eqHighGain: number
): UsePitchDetectionReturn {
  // State
  const [micActive, setMicActive] = useState(false);
  const [userPitch, setUserPitch] = useState<number | null>(null);
  const [micGain, setMicGain] = useState(0);
  const [micStatus, setMicStatus] = useState(t('micStatusActivate'));
  
  // Refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletModuleAddedRef = useRef(false);
  const lastPitchRef = useRef<number | null>(null);
  const lastSmoothedPitchRef = useRef<number | null>(null);
  const pitchBufferRef = useRef<number[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const eqLowNodeRef = useRef<BiquadFilterNode | null>(null);
  const eqMidNodeRef = useRef<BiquadFilterNode | null>(null);
  const eqHighNodeRef = useRef<BiquadFilterNode | null>(null);
  
  const startPitchDetection = useCallback(async (): Promise<boolean> => {
    const audioReady = await initAudio();
    const audioCtx = audioCtxRef.current;
    if (!audioReady || !audioCtx) {
      setMicStatus(t('micStatusError'));
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
          setMicStatus(t('micStatusError'));
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
      setMicStatus(t('micStatusPermissionDenied'));
    }
    return false;
  }, [
    initAudio,
    t,
    autoGainEnabled,
    noiseGateThreshold,
    gainValue,
    compressorEnabled,
    frequencySeparationEnabled,
    pyinBias,
    pyinGateMode,
    pitchAlgorithm,
    audioCtxRef
  ]);
  
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
  
  const handleMicToggle = useCallback(() => {
    micActive ? stopPitchDetection() : startPitchDetection();
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
  
  useEffect(() => {
    if (eqLowNodeRef.current) eqLowNodeRef.current.gain.value = eqLowGain;
  }, [eqLowGain]);
  
  useEffect(() => {
    if (eqMidNodeRef.current) eqMidNodeRef.current.gain.value = eqMidGain;
  }, [eqMidGain]);
  
  useEffect(() => {
    if (eqHighNodeRef.current) eqHighNodeRef.current.gain.value = eqHighGain;
  }, [eqHighGain]);
  
  // Cleanup on unmount
  useEffect(() => () => stopPitchDetection(), [stopPitchDetection]);
  
  // Update mic status based on mic active state
  useEffect(() => {
    setMicStatus(micActive ? t('micStatusListening') : t('micStatusActivate'));
  }, [micActive, t]);
  
  return {
    micActive,
    setMicActive,
    userPitch,
    setUserPitch,
    micGain,
    setMicGain,
    micStatus,
    setMicStatus,
    micStreamRef,
    workletNodeRef,
    workletModuleAddedRef,
    lastPitchRef,
    lastSmoothedPitchRef,
    pitchBufferRef,
    gainNodeRef,
    eqLowNodeRef,
    eqMidNodeRef,
    eqHighNodeRef,
    startPitchDetection,
    stopPitchDetection,
    handleMicToggle,
  };
}
