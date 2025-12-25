import { useState, useRef, useCallback } from 'react';
import { NoteNodes } from '../types';
import { noteToFrequency, semitoneToNoteName } from '../utils';

// Pitch processor code (used for AudioWorklet)
const pitchProcessorCode = `
class PitchProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.analysisBufferSize = 2048;
        this.buffer = new Float32Array(this.analysisBufferSize);
        this.bufferPos = 0;
        this.lastGain = 0;
        this.noiseGateThreshold = options.processorOptions.noiseGateThreshold || 0.008;
        this.algorithm = options.processorOptions.algorithm || 'pyin'; // Default to pyin
        
        // pYIN-specific parameters
        this.pyinBias = options.processorOptions.pyinBias || 2.0;
        this.pyinGateMode = options.processorOptions.pyinGateMode || 'smooth';
        this.pyinHistory = null; // For temporal smoothing
        this.smoothRms = 0; // For smooth gate mode
        
        this.port.onmessage = (event) => {
            if (event.data.noiseGateThreshold !== undefined) {
                this.noiseGateThreshold = event.data.noiseGateThreshold;
            }
            if (event.data.algorithm) {
                this.algorithm = event.data.algorithm;
            }
            if (event.data.pyinBias !== undefined) {
                this.pyinBias = event.data.pyinBias;
            }
            if (event.data.pyinGateMode) {
                this.pyinGateMode = event.data.pyinGateMode;
            }
        };
    }


    static get parameterDescriptors() {
        return [];
    }
    
    // McLeod Pitch Method (MPM) - professional-grade pitch detection for voice
    mcleodPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const minPeriod = Math.floor(sampleRate / 2000); // 2000 Hz max
        const maxPeriod = Math.floor(sampleRate / 30);   // 30 Hz min
        
        // Step 1: Normalized Square Difference Function (NSDF)
        const nsdf = new Array(maxPeriod + 1).fill(0);
        
        for (let tau = 0; tau <= maxPeriod; tau++) {
            let acf = 0;
            let divisorM = 0;
            
            for (let i = 0; i < bufferSize - tau; i++) {
                acf += buffer[i] * buffer[i + tau];
                divisorM += buffer[i] * buffer[i] + buffer[i + tau] * buffer[i + tau];
            }
            
            nsdf[tau] = divisorM > 0 ? (2 * acf) / divisorM : 0;
        }
        
        // Step 2: Peak picking - find positive zero crossings
        const peaks = [];
        for (let tau = minPeriod; tau < maxPeriod - 1; tau++) {
            if (nsdf[tau] > 0 && nsdf[tau] > nsdf[tau - 1] && nsdf[tau] >= nsdf[tau + 1]) {
                peaks.push({ tau, value: nsdf[tau] });
            }
        }
        
        if (peaks.length === 0) return -1;
        
        // Step 3: Find the best peak (highest clarity)
        let bestPeak = peaks[0];
        for (const peak of peaks) {
            if (peak.value > bestPeak.value) {
                bestPeak = peak;
            }
        }
        
        if (bestPeak.value < 0.6) return -1; // Confidence threshold
        
        // Step 4: Parabolic interpolation for sub-sample accuracy
        const tau = bestPeak.tau;
        let betterTau = tau;
        if (tau > 0 && tau < nsdf.length - 1) {
            const s0 = nsdf[tau - 1];
            const s1 = nsdf[tau];
            const s2 = nsdf[tau + 1];
            betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
        
        return sampleRate / betterTau;
    }

    // YIN Algorithm - robust pitch detection
    yinPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const threshold = 0.15; // YIN threshold
        const minPeriod = Math.floor(sampleRate / 2000);
        const maxPeriod = Math.floor(sampleRate / 30);
        
        // Step 1: Difference function
        const difference = new Float32Array(maxPeriod);
        for (let tau = 0; tau < maxPeriod; tau++) {
            let sum = 0;
            for (let i = 0; i < bufferSize - tau; i++) {
                const delta = buffer[i] - buffer[i + tau];
                sum += delta * delta;
            }
            difference[tau] = sum;
        }
        
        // Step 2: Cumulative mean normalized difference
        const cmndf = new Float32Array(maxPeriod);
        cmndf[0] = 1;
        let runningSum = 0;
        for (let tau = 1; tau < maxPeriod; tau++) {
            runningSum += difference[tau];
            cmndf[tau] = difference[tau] / (runningSum / tau);
        }
        
        // Step 3: Absolute threshold - find first valley below threshold
        let tau = minPeriod;
        while (tau < maxPeriod) {
            if (cmndf[tau] < threshold) {
                while (tau + 1 < maxPeriod && cmndf[tau + 1] < cmndf[tau]) {
                    tau++;
                }
                break;
            }
            tau++;
        }
        
        if (tau >= maxPeriod) return -1;
        
        // Step 4: Parabolic interpolation
        let betterTau = tau;
        if (tau > 0 && tau < cmndf.length - 1) {
            const s0 = cmndf[tau - 1];
            const s1 = cmndf[tau];
            const s2 = cmndf[tau + 1];
            betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
        
        return sampleRate / betterTau;
    }

    // pYIN Algorithm - Probabilistic YIN with better robustness
    pyinPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const minPeriod = Math.floor(sampleRate / 2000);
        const maxPeriod = Math.floor(sampleRate / 30);
        
        // Calculate difference function (same as YIN)
        const difference = new Float32Array(maxPeriod);
        for (let tau = 0; tau < maxPeriod; tau++) {
            let sum = 0;
            for (let i = 0; i < bufferSize - tau; i++) {
                const delta = buffer[i] - buffer[i + tau];
                sum += delta * delta;
            }
            difference[tau] = sum;
        }
        
        // Cumulative mean normalized difference
        const cmndf = new Float32Array(maxPeriod);
        cmndf[0] = 1;
        let runningSum = 0;
        for (let tau = 1; tau < maxPeriod; tau++) {
            runningSum += difference[tau];
            cmndf[tau] = difference[tau] / (runningSum / tau);
        }
        
        // Find local minima (candidate pitches)
        const candidates = [];
        for (let tau = minPeriod; tau < maxPeriod - 1; tau++) {
            if (cmndf[tau] < cmndf[tau - 1] && cmndf[tau] <= cmndf[tau + 1]) {
                candidates.push({ tau, value: cmndf[tau] });
            }
        }
        
        if (candidates.length === 0) return -1;
        
        // Score candidates using probabilistic model with bias
        let bestCandidate = candidates[0];
        let bestScore = -Infinity;
        
        for (const candidate of candidates) {
            // Convert CMNDF to probability (lower CMNDF = higher probability)
            let probability = Math.max(0, 1 - candidate.value);
            
            // Apply temporal smoothing (sticky pitch)
            if (this.pyinHistory !== null) {
                const freqDiff = Math.abs(sampleRate / candidate.tau - this.pyinHistory);
                const semitoneDistance = Math.abs(12 * Math.log2((sampleRate / candidate.tau) / this.pyinHistory));
                // Bonus for being close to previous pitch (stickiness controlled by bias)
                const stickyBonus = Math.exp(-semitoneDistance / this.pyinBias);
                probability += stickyBonus * 0.5;
            }
            
            // Penalize very high or very low frequencies
            const freq = sampleRate / candidate.tau;
            if (freq < 80 || freq > 1000) {
                probability *= 0.7;
            }
            
            if (probability > bestScore) {
                bestScore = probability;
                bestCandidate = candidate;
            }
        }
        
        // Confidence threshold with gate mode
        let threshold;
        if (this.pyinGateMode === 'smooth') {
            // Smooth gate: use RMS-based adaptive threshold
            let rms = 0;
            for (let i = 0; i < bufferSize; i++) {
                rms += buffer[i] * buffer[i];
            }
            rms = Math.sqrt(rms / bufferSize);
            this.smoothRms = this.smoothRms * 0.9 + rms * 0.1;
            threshold = 0.4 * (1 - this.smoothRms * 10);
        } else {
            // Instant gate: fixed threshold
            threshold = 0.5;
        }
        
        if (bestScore < threshold) return -1;
        
        // Parabolic interpolation
        const tau = bestCandidate.tau;
        let betterTau = tau;
        if (tau > 0 && tau < cmndf.length - 1) {
            const s0 = cmndf[tau - 1];
            const s1 = cmndf[tau];
            const s2 = cmndf[tau + 1];
            betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
        
        const detectedFreq = sampleRate / betterTau;
        this.pyinHistory = detectedFreq;
        return detectedFreq;
    }

    // SWIPE Algorithm - Sawtooth Waveform Inspired Pitch Estimator
    swipePitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const minFreq = 30;
        const maxFreq = 2000;
        const numCandidates = 100;
        
        // Generate logarithmically-spaced candidate frequencies
        const logMin = Math.log(minFreq);
        const logMax = Math.log(maxFreq);
        const candidates = [];
        for (let i = 0; i < numCandidates; i++) {
            const logFreq = logMin + (logMax - logMin) * i / (numCandidates - 1);
            candidates.push(Math.exp(logFreq));
        }
        
        // Calculate strength for each candidate
        let maxStrength = 0;
        let bestFreq = -1;
        
        for (const freq of candidates) {
            const period = sampleRate / freq;
            let strength = 0;
            let count = 0;
            
            // Prime-based subharmonic summation
            for (let k = 1; k <= 5; k++) {
                const tau = Math.round(period * k);
                if (tau < bufferSize) {
                    let localSum = 0;
                    for (let i = 0; i < bufferSize - tau; i++) {
                        localSum += buffer[i] * buffer[i + tau];
                    }
                    strength += localSum / k;
                    count++;
                }
            }
            
            if (count > 0) {
                strength /= count;
                if (strength > maxStrength) {
                    maxStrength = strength;
                    bestFreq = freq;
                }
            }
        }
        
        return maxStrength > 0.01 ? bestFreq : -1;
    }

    // HPS Algorithm - Harmonic Product Spectrum
    hpsPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const fftSize = 2048;
        
        // Simple FFT approximation using autocorrelation
        const spectrum = new Float32Array(fftSize / 2);
        for (let k = 0; k < fftSize / 2; k++) {
            let real = 0, imag = 0;
            for (let n = 0; n < Math.min(bufferSize, fftSize); n++) {
                const angle = -2 * Math.PI * k * n / fftSize;
                real += buffer[n] * Math.cos(angle);
                imag += buffer[n] * Math.sin(angle);
            }
            spectrum[k] = Math.sqrt(real * real + imag * imag);
        }
        
        // Harmonic Product Spectrum (multiply downsampled versions)
        const hps = new Float32Array(fftSize / 2);
        for (let i = 0; i < fftSize / 2; i++) {
            hps[i] = spectrum[i];
        }
        
        // Multiply with 2nd, 3rd, 4th harmonics
        for (let harmonic = 2; harmonic <= 4; harmonic++) {
            for (let i = 0; i < fftSize / (2 * harmonic); i++) {
                hps[i] *= spectrum[i * harmonic];
            }
        }
        
        // Find peak in HPS
        let maxVal = 0;
        let maxIdx = 0;
        const minBin = Math.floor(30 * fftSize / sampleRate);
        const maxBin = Math.floor(2000 * fftSize / sampleRate);
        
        for (let i = minBin; i < maxBin && i < hps.length; i++) {
            if (hps[i] > maxVal) {
                maxVal = hps[i];
                maxIdx = i;
            }
        }
        
        if (maxVal < 0.01) return -1;
        
        // Convert bin to frequency
        return maxIdx * sampleRate / fftSize;
    }


    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];
            let sum = 0;
            for (let i = 0; i < channelData.length; i++) {
                sum += channelData[i] * channelData[i];
            }
            this.lastGain = Math.sqrt(sum / channelData.length);
            const remainingSpace = this.analysisBufferSize - this.bufferPos;
            const toCopy = Math.min(channelData.length, remainingSpace);
            this.buffer.set(channelData.subarray(0, toCopy), this.bufferPos);
            this.bufferPos += toCopy;
            
            if (this.bufferPos >= this.analysisBufferSize) {
                let pitch = -1;
                if (this.lastGain > this.noiseGateThreshold) { 
                    // Select algorithm
                    if (this.algorithm === 'yin') {
                        pitch = this.yinPitchMethod(this.buffer, sampleRate);
                    } else if (this.algorithm === 'pyin') {
                        pitch = this.pyinPitchMethod(this.buffer, sampleRate);
                    } else if (this.algorithm === 'swipe') {
                        pitch = this.swipePitchMethod(this.buffer, sampleRate);
                    } else if (this.algorithm === 'hps') {
                        pitch = this.hpsPitchMethod(this.buffer, sampleRate);
                    } else {
                        pitch = this.mcleodPitchMethod(this.buffer, sampleRate);
                    }
                }
                this.port.postMessage({ pitch, gain: this.lastGain });
                this.bufferPos = 0;
            } else {
                 this.port.postMessage({ gain: this.lastGain });
            }
        }
        return true;
    }
}
try {
    registerProcessor('pitch-processor', PitchProcessor);
} catch (e) {
    // Processor already registered, this is fine

}
`;

interface UseAudioReturn {
    audioCtx: AudioContext | null;
    initAudio: () => Promise<boolean>;
    playNote: (semitone: number, duration: number, forExercise?: boolean) => Promise<void>;
    playMetronomeClick: () => Promise<void>;
    stopAllExerciseNotes: () => void;
    stopAllNonExerciseNotes: () => void;
    checkAudioBuffers: (semitones: number[]) => Promise<void>;
}

interface UseAudioOptions {
    exerciseNoteVolume: number;
    metronomeVolume: number;
    activeInstrument: string;
    frequencySeparationEnabled: boolean;
    compressorThreshold: number;
    compressorRatio: number;
    compressorRelease: number;
    onMicStatusChange: (status: string) => void;
    instrumentLibraryRef: React.MutableRefObject<Record<string, Map<number, AudioBuffer>>>;
    failedSamplesRef: React.MutableRefObject<Set<number>>;
    fetchAndDecodeSample: (semitone: number) => Promise<AudioBuffer | null>;
}

export function useAudio({
    exerciseNoteVolume,
    metronomeVolume,
    activeInstrument,
    frequencySeparationEnabled,
    compressorThreshold,
    compressorRatio,
    compressorRelease,
    onMicStatusChange,
    instrumentLibraryRef,
    failedSamplesRef,
    fetchAndDecodeSample,
}: UseAudioOptions): UseAudioReturn {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const currentPlayingExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set());
    const currentNonExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set());
    const audioInitPromiseRef = useRef<Promise<boolean> | null>(null);
    const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);

    const initAudio = useCallback(async () => {
        // 1. Initialize if needed
        if (!audioCtxRef.current) {
            if (!audioInitPromiseRef.current) {
                audioInitPromiseRef.current = (async () => {
                    try {
                        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                        if (!AudioContextClass) {
                            console.error('❌ AudioContext not supported');
                            return false;
                        }
                        const context = new AudioContextClass();

                        const gain = context.createGain();
                        gain.gain.value = 0.8; // Increased from 0.5 for better mobile volume
                        masterGainRef.current = gain;
                        masterGainRef.current.connect(context.destination);

                        const blob = new Blob([pitchProcessorCode], { type: 'application/javascript' });
                        const url = URL.createObjectURL(blob);
                        try {
                            await context.audioWorklet.addModule(url);
                        } catch (e) {
                            console.error('❌ AudioWorklet error:', e);
                        }
                        URL.revokeObjectURL(url);
                        audioCtxRef.current = context;

                        // Initialize compressor and EQ
                        compressorNodeRef.current = context.createDynamicsCompressor();
                        compressorNodeRef.current.threshold.value = compressorThreshold;
                        compressorNodeRef.current.ratio.value = compressorRatio;
                        compressorNodeRef.current.release.value = compressorRelease;
                        return true;
                    } catch (e) {
                        console.error("❌ Error initializing audio.", e);
                        onMicStatusChange('micStatusError');
                        return false;
                    }
                })();
            }
            await audioInitPromiseRef.current;
        }

        // 2. Always check and resume if suspended
        if (audioCtxRef.current) {
            if (audioCtxRef.current.state === 'suspended') {
                try {
                    await audioCtxRef.current.resume();
                } catch (e) {
                    console.warn('❌ Failed to resume audio context', e);
                }
            }
        }

        return !!audioCtxRef.current;
    }, [compressorThreshold, compressorRatio, compressorRelease, onMicStatusChange]);

    const checkAudioBuffers = useCallback(async (semitones: number[]): Promise<void> => {
        const audioReady = await initAudio();
        if (!audioReady) return;

        // For local files, they are already loaded.
        // For cloud files, we'd fetch them here.
        // If using "Default" instrument and it's empty, try fetch.

        if (activeInstrument === 'Default' && (!instrumentLibraryRef.current['Default'] || instrumentLibraryRef.current['Default'].size === 0)) {
            const uniqueSemitones = [...new Set(semitones)];
            // Only fetch what we don't have
            const needed = uniqueSemitones.filter(s =>
                !(instrumentLibraryRef.current['Default'] && instrumentLibraryRef.current['Default'].has(s)) &&
                !failedSamplesRef.current.has(s)
            );
            if (needed.length > 0) {
                await Promise.all(needed.map(s => fetchAndDecodeSample(s)));
            }
        }
    }, [initAudio, fetchAndDecodeSample, activeInstrument, instrumentLibraryRef, failedSamplesRef]);

    const playNote = useCallback(async (semitone: number, duration: number, forExercise: boolean = false) => {
        const audioReady = await initAudio();
        const audioCtx = audioCtxRef.current;
        const masterGain = masterGainRef.current;
        if (!audioReady || !audioCtx || !masterGain) return;

        const now = audioCtx.currentTime;
        const noteSet = forExercise ? currentPlayingExerciseNoteNodesRef.current : currentNonExerciseNoteNodesRef.current;

        // PREVENT OVERLAPPING: Stop any previous notes of the same semitone
        noteSet.forEach(existingNode => {
            // Check if this node is playing the same semitone (stored in a custom property)
            if ((existingNode as any).semitone === semitone) {
                // Quickly fade out and stop
                existingNode.gainNodes.forEach(g => {
                    try {
                        g.gain.cancelScheduledValues(now);
                        g.gain.setValueAtTime(g.gain.value, now);
                        g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                    } catch (e) { }
                });
                existingNode.allNodes.forEach(node => {
                    if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                        try { node.stop(now + 0.06); } catch (e) { }
                    }
                });
                setTimeout(() => {
                    existingNode.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } });
                    noteSet.delete(existingNode);
                }, 70);
            }
        });

        // Get the map for the current instrument
        const currentMap = instrumentLibraryRef.current[activeInstrument];

        // --- TRY PLAYING SAMPLE WITH NEAREST NEIGHBOR SEARCH (SCOPED TO INSTRUMENT) ---
        let buffer: AudioBuffer | null = null;
        let playbackRate = 1.0;

        if (currentMap && currentMap.size > 0) {
            // 1. Check exact match
            if (currentMap.has(semitone)) {
                buffer = currentMap.get(semitone)!;
            }
            // 2. Fallback: Search for nearest neighbor in THIS instrument's map
            else {
                let closestSemitone: number | null = null;
                let minDistance = Infinity;

                for (const key of currentMap.keys()) {
                    const dist = Math.abs(semitone - key);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestSemitone = key;
                    }
                }

                if (closestSemitone !== null) {
                    buffer = currentMap.get(closestSemitone)!;
                    playbackRate = Math.pow(2, (semitone - closestSemitone) / 12);
                }
            }
        } else if (activeInstrument === 'Default') {
            // Legacy fallback/Cloud behavior if Default is empty (try to fetch)
            // Only logic remains for compat if user didn't load local files
            try {
                const fetched = await fetchAndDecodeSample(semitone);
                if (fetched) buffer = fetched;
            } catch (e) { }
        }

        if (buffer) {
            // Play Sample
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = playbackRate;

            const sampleGain = audioCtx.createGain();
            sampleGain.gain.setValueAtTime(forExercise ? exerciseNoteVolume * 1.5 : 0.8, now);
            sampleGain.gain.exponentialRampToValueAtTime(0.001, now + (duration / 1000) + 0.5);

            source.connect(sampleGain);

            const nodes: NoteNodes = { oscillators: [], gainNodes: [sampleGain], allNodes: [source, sampleGain] };

            // FREQUENCY SEPARATION: Low-pass filter for piano output (warm, bass-heavy sound)
            if (frequencySeparationEnabled) {
                const lowPassFilter = audioCtx.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 900; // Piano plays only below 900Hz
                lowPassFilter.Q.value = 1.0; // Sharp cutoff
                sampleGain.connect(lowPassFilter);
                lowPassFilter.connect(masterGain);
                nodes.allNodes.push(lowPassFilter);
            } else {
                sampleGain.connect(masterGain);
            }

            source.start(now);
            try {
                const adjustedDuration = (duration / 1000) / playbackRate;
                source.stop(now + adjustedDuration + 2.0);
            } catch (e) { }

            // Store semitone for overlap detection
            (nodes as any).semitone = semitone;
            source.onended = () => { nodes.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } }); noteSet.delete(nodes); };
            noteSet.add(nodes);

        } else {
            // --- FALLBACK: SYNTHESIS ---
            const freq = noteToFrequency(semitone);
            const totalDurationSecs = duration / 1000;
            const ATTACK_TIME = 0.01; const DECAY_TIME = 0.1; const SUSTAIN_LEVEL = 0.1;

            const mainGainNode = audioCtx.createGain();
            mainGainNode.gain.setValueAtTime(0, now);
            mainGainNode.gain.linearRampToValueAtTime(forExercise ? exerciseNoteVolume * 1.5 : 0.8, now + ATTACK_TIME);
            mainGainNode.gain.exponentialRampToValueAtTime(SUSTAIN_LEVEL, now + ATTACK_TIME + DECAY_TIME);
            mainGainNode.gain.exponentialRampToValueAtTime(0.0001, now + totalDurationSecs);

            const nodes: NoteNodes = { oscillators: [], gainNodes: [mainGainNode], allNodes: [mainGainNode] };

            // FREQUENCY SEPARATION: Low-pass filter for synthesized piano
            if (frequencySeparationEnabled) {
                const lowPassFilter = audioCtx.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 900; // Piano plays only below 900Hz
                lowPassFilter.Q.value = 1.0;
                mainGainNode.connect(lowPassFilter);
                lowPassFilter.connect(masterGain);
                nodes.allNodes.push(lowPassFilter);
            } else {
                mainGainNode.connect(masterGain);
            }

            // Store semitone for overlap detection
            (nodes as any).semitone = semitone;

            const osc1 = audioCtx.createOscillator(); osc1.type = 'sine'; osc1.frequency.setValueAtTime(freq, now); osc1.connect(mainGainNode);
            nodes.oscillators.push(osc1); nodes.allNodes.push(osc1);

            const brightOscGain = audioCtx.createGain(); brightOscGain.gain.setValueAtTime(0, now); brightOscGain.gain.linearRampToValueAtTime(0.1, now + 0.005); brightOscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            brightOscGain.connect(mainGainNode); nodes.gainNodes.push(brightOscGain); nodes.allNodes.push(brightOscGain);

            const osc2 = audioCtx.createOscillator(); osc2.type = 'square'; osc2.frequency.setValueAtTime(freq * 2, now); osc2.connect(brightOscGain);
            nodes.oscillators.push(osc2); nodes.allNodes.push(osc2);

            nodes.oscillators.forEach(osc => { osc.start(now); try { osc.stop(now + totalDurationSecs); } catch (e) { } });
            osc1.onended = () => { nodes.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } }); noteSet.delete(nodes); };
            noteSet.add(nodes);
        }
    }, [initAudio, exerciseNoteVolume, fetchAndDecodeSample, activeInstrument, frequencySeparationEnabled, instrumentLibraryRef]);

    const playMetronomeClick = useCallback(async () => {
        const audioReady = await initAudio(); const audioCtx = audioCtxRef.current;
        if (!audioReady || !audioCtx || !masterGainRef.current) return;
        const now = audioCtx.currentTime; const clickGain = audioCtx.createGain();
        clickGain.gain.setValueAtTime(metronomeVolume, now); clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        clickGain.connect(masterGainRef.current);
        const osc = audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now); osc.connect(clickGain);
        osc.start(now); osc.stop(now + 0.1);
        osc.onended = () => { try { osc.disconnect(); clickGain.disconnect(); } catch (e) { } };
    }, [initAudio, metronomeVolume]);

    const stopAllExerciseNotes = useCallback(() => {
        const audioCtx = audioCtxRef.current; if (!audioCtx) return;
        currentPlayingExerciseNoteNodesRef.current.forEach(n => {
            // RAMP DOWN INSTEAD OF INSTANT STOP
            const now = audioCtx.currentTime;
            n.gainNodes.forEach(g => {
                try {
                    g.gain.cancelScheduledValues(now);
                    g.gain.setValueAtTime(g.gain.value, now);
                    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                } catch (e) { }
            });
            n.allNodes.forEach(node => {
                if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                    try { node.stop(now + 0.15); } catch (e) { }
                }
            });

            // Cleanup later (simple timeout for now)
            setTimeout(() => {
                n.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } });
            }, 200);
        });
        currentPlayingExerciseNoteNodesRef.current.clear();
    }, []);

    const stopAllNonExerciseNotes = useCallback(() => {
        const audioCtx = audioCtxRef.current; if (!audioCtx) return;
        currentNonExerciseNoteNodesRef.current.forEach(n => { n.allNodes.forEach(node => { if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) { try { node.stop(audioCtx.currentTime); } catch (e) { } } try { node.disconnect(); } catch (e) { } }); });
        currentNonExerciseNoteNodesRef.current.clear();
    }, []);

    return {
        audioCtx: audioCtxRef.current,
        initAudio,
        playNote,
        playMetronomeClick,
        stopAllExerciseNotes,
        stopAllNonExerciseNotes,
        checkAudioBuffers,
    };
}
