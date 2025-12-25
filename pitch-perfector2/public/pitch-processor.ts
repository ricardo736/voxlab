interface Candidate {
    tau: number;
    error: number;
}

interface ProcessorOptions {
    noiseGateThreshold?: number;
    algorithm?: string;
    pyinBias?: number;
    pyinGateMode?: string;
}

class PitchProcessor extends AudioWorkletProcessor {
    private analysisBufferSize: number;
    private buffer: Float32Array;
    private bufferPos: number;
    private noiseGateThreshold: number;
    private algorithm: string;
    private pyinBias: number;
    private pyinGateMode: string;
    private pyinHistory: number | null;
    private smoothRms: number;

    constructor(options: { processorOptions: ProcessorOptions }) {
        super();
        this.analysisBufferSize = 2048;
        this.buffer = new Float32Array(this.analysisBufferSize);
        this.bufferPos = 0;

        // Options & Defaults
        const opts = options.processorOptions || {};
        this.noiseGateThreshold = opts.noiseGateThreshold || 0.008;
        this.algorithm = opts.algorithm || 'pyin';
        this.pyinBias = opts.pyinBias !== undefined ? opts.pyinBias : 2.0;
        this.pyinGateMode = opts.pyinGateMode || 'smooth';

        // State
        this.pyinHistory = null;
        this.smoothRms = 0;

        this.port.onmessage = (event: MessageEvent) => {
            if (event.data.noiseGateThreshold !== undefined) this.noiseGateThreshold = event.data.noiseGateThreshold;
            if (event.data.pyinBias !== undefined) this.pyinBias = event.data.pyinBias;
        };
    }

    // --- pYIN ALGORITHM IMPLEMENTATION ---
    pyinPitchMethod(buffer: Float32Array, sampleRate: number): number {
        const bufferSize = buffer.length;

        // 1. RMS Calculation & Noise Gate
        let instantRms = 0;
        for (let i = 0; i < bufferSize; i++) {
            instantRms += buffer[i] * buffer[i];
        }
        instantRms = Math.sqrt(instantRms / bufferSize);

        // Smoothed RMS (Attack/Release)
        const SMOOTHING_FACTOR = 0.95;
        this.smoothRms = (instantRms * (1 - SMOOTHING_FACTOR)) + (this.smoothRms * SMOOTHING_FACTOR);

        let rmsToUse = this.pyinGateMode === 'smooth' ? this.smoothRms : instantRms;

        if (this.noiseGateThreshold > 0 && rmsToUse < this.noiseGateThreshold) {
            this.pyinHistory = null;
            return -1; // Silence
        }

        // 2. YIN Difference Function & Cumulative Mean Normalization
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
            if (runningSum === 0) {
                yinBuffer[t] = 1;
            } else {
                yinBuffer[t] *= t / runningSum;
            }
        }

        // 3. Candidate Collection (Valleys)
        let candidates: Candidate[] = [];
        for (let t = 2; t < yinBufferLength - 1; t++) {
            if (yinBuffer[t] < yinBuffer[t - 1] && yinBuffer[t] < yinBuffer[t + 1]) {
                if (yinBuffer[t] < 1.0) { // Threshold for candidacy
                    candidates.push({ tau: t, error: yinBuffer[t] });
                }
            }
        }

        if (candidates.length === 0) {
            this.pyinHistory = null;
            return -1;
        }

        // 4. Probabilistic Scoring with History Bias
        let bestScore = -1;
        let bestTau = -1;

        candidates.forEach(cand => {
            // Base probability: lower error is better
            let prob = Math.pow(1 - cand.error, 4);

            // History Bias: Prefer continuity with previous note
            if (this.pyinHistory && this.pyinHistory > 0 && this.pyinBias > 0) {
                const prevTau = sampleRate / this.pyinHistory;
                const ratio = Math.abs(cand.tau - prevTau) / prevTau;

                if (ratio < 0.1) {
                    prob *= (1 + this.pyinBias); // Bonus for being close to previous
                } else if (Math.abs(ratio - 0.5) < 0.05) {
                    prob *= 0.5; // Penalty for octave jumps
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

        // 5. Parabolic Refinement
        if (bestTau <= 0 || bestTau >= yinBufferLength - 1) return -1;

        let s0 = yinBuffer[bestTau - 1];
        let s1 = yinBuffer[bestTau];
        let s2 = yinBuffer[bestTau + 1];
        let adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        const finalTau = bestTau + adjustment;

        const pitch = sampleRate / finalTau;
        this.pyinHistory = pitch;
        return pitch;
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];

            // Fill internal buffer
            const remainingSpace = this.analysisBufferSize - this.bufferPos;
            const toCopy = Math.min(channelData.length, remainingSpace);
            this.buffer.set(channelData.subarray(0, toCopy), this.bufferPos);
            this.bufferPos += toCopy;

            // Process when buffer is full
            if (this.bufferPos >= this.analysisBufferSize) {
                const pitch = this.pyinPitchMethod(this.buffer, sampleRate);

                // Calculate gain for UI feedback
                let sum = 0;
                for (let i = 0; i < channelData.length; i++) sum += channelData[i] * channelData[i];
                const rms = Math.sqrt(sum / channelData.length);

                this.port.postMessage({ pitch, gain: rms });
                this.bufferPos = 0; // Reset buffer
            }
        }
        return true;
    }
}

registerProcessor('pitch-processor', PitchProcessor);
