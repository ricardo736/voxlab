/**
 * pYIN (Probabilistic YIN) Pitch Detection Algorithm
 * Improved version with better accuracy and stability
 */

let pYinHistory: number | null = null;
let smoothRms = 0;

export interface PYINParams {
    bias: number;
    tolerance: number;
    gateThreshold: number;
    gateMode: 'smooth' | 'instant';
}

export const detectPitchPYIN = (
    buffer: Float32Array,
    sampleRate: number,
    params: PYINParams
): number => {
    const { bias, tolerance, gateThreshold, gateMode } = params;
    const bufferSize = buffer.length;

    // RMS & Gate
    let instantRms = 0;
    for (let i = 0; i < bufferSize; i++) {
        instantRms += buffer[i] * buffer[i];
    }
    instantRms = Math.sqrt(instantRms / bufferSize);

    const SMOOTHING_FACTOR = 0.95;
    smoothRms = (instantRms * (1 - SMOOTHING_FACTOR)) + (smoothRms * SMOOTHING_FACTOR);
    const rmsToUse = gateMode === 'smooth' ? smoothRms : instantRms;

    if (gateThreshold > 0 && rmsToUse < gateThreshold) {
        pYinHistory = null;
        return -1;
    }

    // YIN Steps (Autocorrelation)
    const yinBufferLength = bufferSize / 2;
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
            yinBuffer[t] *= t / runningSum; // Normalized Difference Function
        }
    }

    // Candidates
    const candidates = [];
    for (let t = 2; t < yinBufferLength - 1; t++) {
        if (yinBuffer[t] < yinBuffer[t - 1] && yinBuffer[t] < yinBuffer[t + 1]) {
            if (yinBuffer[t] < 1.0) {
                candidates.push({ tau: t, error: yinBuffer[t] });
            }
        }
    }

    if (candidates.length === 0) {
        pYinHistory = null;
        return -1;
    }

    // Scoring
    let bestScore = -1;
    let bestTau = -1;

    candidates.forEach(cand => {
        let prob = Math.pow(1 - cand.error, 4);
        if (pYinHistory && pYinHistory > 0 && bias > 0) {
            const prevTau = sampleRate / pYinHistory;
            const ratio = Math.abs(cand.tau - prevTau) / prevTau;

            // Use the tolerance parameter directly from settings
            if (ratio < tolerance) {
                // Apply bias: Boost probability significantly
                prob *= (1 + bias * 2);
            }
            else if (Math.abs(ratio - 0.5) < 0.05) prob *= 0.5;
        }
        if (prob > bestScore) {
            bestScore = prob;
            bestTau = cand.tau;
        }
    });

    if (bestScore < 0.01) {
        pYinHistory = null;
        return -1;
    }

    // Parabolic Interpolation
    if (bestTau <= 0 || bestTau >= yinBufferLength - 1) {
        pYinHistory = null;
        return -1;
    }

    const s0 = yinBuffer[bestTau - 1];
    const s1 = yinBuffer[bestTau];
    const s2 = yinBuffer[bestTau + 1];
    const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    const finalTau = bestTau + adjustment;

    const pitch = sampleRate / finalTau;
    pYinHistory = pitch;
    return pitch;
};

export const resetPYINHistory = () => {
    pYinHistory = null;
    smoothRms = 0;
};
