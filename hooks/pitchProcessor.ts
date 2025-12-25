// Pitch processor code for AudioWorklet
export const pitchProcessorCode = `
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
                peaks.push({ period: tau, clarity: nsdf[tau] });
            }
        }
        
        if (peaks.length === 0) return -1;
        
        // Step 3: Find the best peak (highest clarity above threshold)
        peaks.sort((a, b) => b.clarity - a.clarity);
        const bestPeak = peaks[0];
        
        if (bestPeak.clarity < 0.90) return -1; // Very strong clarity threshold for stability
        
        // Step 4: Parabolic interpolation for sub-sample accuracy
        const tau = bestPeak.period;
        const y1 = nsdf[tau - 1];
        const y2 = nsdf[tau];
        const y3 = nsdf[tau + 1];
        
        const delta = 0.5 * (y3 - y1) / (2 * y2 - y1 - y3);
        const refinedPeriod = tau + delta;
        
        return sampleRate / refinedPeriod;
    }

    // YIN Algorithm - simpler, faster alternative
    yinPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const threshold = 0.15; // Lower = more strict
        const minPeriod = Math.floor(sampleRate / 2000);
        const maxPeriod = Math.floor(sampleRate / 30);
        
        // Step 1: Difference function
        const diff = new Float32Array(maxPeriod + 1);
        for (let tau = 0; tau <= maxPeriod; tau++) {
            let sum = 0;
            for (let i = 0; i < bufferSize - tau; i++) {
                const delta = buffer[i] - buffer[i + tau];
                sum += delta * delta;
            }
            diff[tau] = sum;
        }
        
        // Step 2: Cumulative mean normalized difference
        const cmndf = new Float32Array(maxPeriod + 1);
        cmndf[0] = 1;
        let runningSum = 0;
        for (let tau = 1; tau <= maxPeriod; tau++) {
            runningSum += diff[tau];
            cmndf[tau] = diff[tau] / (runningSum / tau);
        }
        
        // Step 3: Absolute threshold
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
        
        if (tau >= maxPeriod || cmndf[tau] >= threshold) return -1;
        
        // Step 4: Parabolic interpolation
        let betterTau = tau;
        if (tau > 0 && tau < maxPeriod) {
            const s0 = cmndf[tau - 1];
            const s1 = cmndf[tau];
            const s2 = cmndf[tau + 1];
            betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
        
        return sampleRate / betterTau;
    }

    // PYIN Algorithm - Probabilistic YIN with better accuracy (IMPROVED VERSION)
    pyinPitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        
        // 1. Instantaneous RMS Calculation
        let instantRms = 0;
        for (let i = 0; i < bufferSize; i++) {
            instantRms += buffer[i] * buffer[i];
        }
        instantRms = Math.sqrt(instantRms / bufferSize);

        // 2. Smoothed RMS (Attack/Release smoothing)
        const SMOOTHING_FACTOR = 0.95;
        this.smoothRms = (instantRms * (1 - SMOOTHING_FACTOR)) + (this.smoothRms * SMOOTHING_FACTOR);

        // 3. Noise Gate Logic
        let rmsToUse = this.pyinGateMode === 'smooth' ? this.smoothRms : instantRms;

        // The gate is only active if the threshold is > 0
        if (this.noiseGateThreshold > 0 && rmsToUse < this.noiseGateThreshold) {
            // Signal is too quiet
            this.pyinHistory = null;
            return -1;
        }

        // 4. YIN Steps 1 & 2: Difference & Cumulative Mean Normalization
        const yinBufferLength = Math.floor(bufferSize / 2);
        const yinBuffer = new Float32Array(yinBufferLength);

        for (let t = 0; t < yinBufferLength; t++) {
            yinBuffer[t] = 0;
            for (let i = 0; i < yinBufferLength; i++) {
                const delta = buffer[i] - buffer[i + t];
                yinBuffer[t] += delta * delta;
            }
        }
        yinBuffer[0] = 1;
        let runningSum = 0;
        for (let t = 1; t < yinBufferLength; t++) {
            runningSum += yinBuffer[t];
            // IMPROVED: Protect against division by zero
            if (runningSum === 0) {
                yinBuffer[t] = 1;
            } else {
                yinBuffer[t] *= t / runningSum;
            }
        }

        // 5. Candidate Collection (find all valleys)
        let candidates = [];
        for (let t = 2; t < yinBufferLength - 1; t++) {
            if (yinBuffer[t] < yinBuffer[t-1] && yinBuffer[t] < yinBuffer[t+1]) {
                if (yinBuffer[t] < 1.0) {
                    candidates.push({ tau: t, error: yinBuffer[t] });
                }
            }
        }

        if (candidates.length === 0) {
            this.pyinHistory = null;
            return -1;
        }

        // 6. Scoring: Combine Error Probability with Transition Probability
        let bestScore = -1;
        let bestTau = -1;

        candidates.forEach(cand => {
            // Base probability: lower error is better
            let prob = Math.pow(1 - cand.error, 4);

            // History Bias: Stick to previous note (Only apply if bias > 0)
            if (this.pyinHistory && this.pyinHistory > 0 && this.pyinBias > 0) {
                const prevTau = sampleRate / this.pyinHistory;
                const ratio = Math.abs(cand.tau - prevTau) / prevTau;
                
                if (ratio < 0.1) {
                    prob *= (1 + this.pyinBias); // Strongly prefer continuity
                } else if (Math.abs(ratio - 0.5) < 0.05) {
                    prob *= 0.5; // Penalize octave jumps
                }
            }

            if (prob > bestScore) {
                bestScore = prob;
                bestTau = cand.tau;
            }
        });

        if (bestScore < 0.01) {
            this.pyinHistory = null;
            return -1;
        }

        // 7. Parabolic refinement - IMPROVED: Bounds checking
        if (bestTau <= 0 || bestTau >= yinBufferLength - 1) {
            this.pyinHistory = null;
            return -1;
        }

        let s0 = yinBuffer[bestTau - 1];
        let s1 = yinBuffer[bestTau];
        let s2 = yinBuffer[bestTau + 1];
        let adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        const finalTau = bestTau + adjustment;

        const pitch = sampleRate / finalTau;
        this.pyinHistory = pitch;
        return pitch;
    }

    // SWIPE Algorithm - Sawtooth Waveform Inspired Pitch Estimator
    swipePitchMethod(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const minFreq = 30;
        const maxFreq = 2000;
        const numCandidates = 100;
        
        // Generate candidate frequencies (log-spaced)
        const candidates = [];
        const logMin = Math.log(minFreq);
        const logMax = Math.log(maxFreq);
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
