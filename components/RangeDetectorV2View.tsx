
import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from "react";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { useTranslation } from '../hooks/useTranslation';
import { ColorPalette } from "../types";
import { average, min, max, calculateRMS, midiToNoteName, freqToNote, detectPitch, LOW_VOLUME_RMS_THRESHOLD } from '../utils';


const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

// --- Helper Components ---
interface OrbProps {
  color: string;
  size: number;
  x: string;
  y: string;
  opacity: number;
  blur: number;
  initialTransform: string;
}

const Orb: React.FC<OrbProps> = memo(
  ({ color, size, x, y, opacity, blur, initialTransform }) => (
    <div
      className="absolute rounded-full mix-blend-hard-light transition-all duration-300 ease-out"
      style={{
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
        left: x,
        top: y,
        opacity,
        filter: `blur(${blur}px)`,
        transform: initialTransform,
        willChange: "transform, opacity, filter",
      }}
    />
  ),
);

// --- Main Component ---
interface RangeDetectorV2ViewProps {
  currentTheme: { id: string, primary: string, secondary: string, gradient: string, shadowRgb: string, gradientText: { from: string, to: string, darkFrom: string, darkTo: string } };
  onBack: () => void;
  stopVoxLabMic: () => void;
  startVoxLabMic: () => Promise<boolean>;
}

// FIX: Define a constant for the minimum number of valid pitch samples required to consider a step as having "input".
// This helps prevent false positives from very brief or noisy input.
const MIN_SAMPLES_FOR_VALID_INPUT = 5;


export const RangeDetectorV2View: React.FC<RangeDetectorV2ViewProps> = memo(({ currentTheme, onBack, stopVoxLabMic, startVoxLabMic }) => {
  const { t, language } = useTranslation();
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // FIX: Changed Float34Array to Float32Array
  const audioBufferRef = useRef<Float32Array>(new Float32Array(2048)); // Fixed size for analysis
  const [currentPitch, setCurrentPitch] = useState<number | null>(null);
  const [currentRMS, setCurrentRMS] = useState<number>(0);
  const [micActive, setMicActive] = useState(false);
  // FIX: Explicitly bind `this` to null for `t` function calls.
  const [micStatusMessage, setMicStatusMessage] = useState(t.call(null, "micStatusActivate"));

  const [testMode, setTestMode] = useState<"simple" | "advanced" | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stepActive, setStepActive] = useState(false);
  const [noInputDetected, setNoInputDetected] = useState(false);
  const noInputTimeoutRef = useRef<number | null>(null);

  // Data collection for analysis
  const lowestNotesRef = useRef<number[]>([]);
  const speakingPitchesRef = useRef<number[]>([]);
  const sirenPitchesRef = useRef<number[]>([]);

  const [analysisResults, setAnalysisResults] = useState<{
    lowestSung: string | null;
    highestSung: string | null;
    avgSpeaking: string | null;
    vocalRange: string | null;
  } | null>(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const feedbackModel = 'gemini-2.5-flash';

  const resetAnalysis = useCallback(() => {
    setCurrentStep(1);
    setCountdown(null);
    setStepActive(false);
    setNoInputDetected(false);
    lowestNotesRef.current = [];
    speakingPitchesRef.current = [];
    sirenPitchesRef.current = [];
    setAnalysisResults(null);
    setGeneratingFeedback(false);
    setFeedbackText(null);
    setFeedbackError(null);
  }, []);

  const startMic = useCallback(async () => {
    if (micActive) return; // Already active
    stopVoxLabMic(); // Stop VoxLab's mic if it's active

    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    } else if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      const source = audioContextRef.current!.createMediaStreamSource(stream);
      analyserNodeRef.current = audioContextRef.current!.createAnalyser();
      analyserNodeRef.current.fftSize = 4096;
      scriptProcessorNodeRef.current = audioContextRef.current!.createScriptProcessor(
        audioBufferRef.current.length,
        1,
        1,
      ); // Use same buffer size as analysis

      scriptProcessorNodeRef.current.onaudioprocess = (event) => {
        event.inputBuffer.getChannelData(0, audioBufferRef.current);
        const pitch = detectPitch(
          audioBufferRef.current,
          audioContextRef.current!.sampleRate,
        );
        const rms = calculateRMS(audioBufferRef.current);
        setCurrentPitch(pitch);
        setCurrentRMS(rms * 100); // Scale to 0-100 for display
      };

      source.connect(analyserNodeRef.current);
      analyserNodeRef.current.connect(scriptProcessorNodeRef.current);
      scriptProcessorNodeRef.current.connect(audioContextRef.current!.destination); // Connect to destination to prevent garbage collection

      setMicActive(true);
      // FIX: Explicitly bind `this` to null for `t` function calls.
      setMicStatusMessage(t.call(null, "micStatusListening"));
      setNoInputDetected(false);
    } catch (err) {
      console.error("Microphone access error:", err);
      // FIX: Explicitly bind `this` to null for `t` function calls.
      setMicStatusMessage(t.call(null, "micDenied"));
      setMicActive(false);
    }
  }, [micActive, t, stopVoxLabMic]);

  const stopMic = useCallback(() => {
    micStream?.getTracks().forEach((track) => track.stop());
    if (scriptProcessorNodeRef.current) {
        scriptProcessorNodeRef.current.disconnect();
        scriptProcessorNodeRef.current.onaudioprocess = null;
    }
    if (analyserNodeRef.current) {
        analyserNodeRef.current.disconnect();
    }
    if (audioContextRef.current) {
        // Do not close context here, App.tsx might want to reuse it.
        // If it's suspended, App.tsx can resume it.
        // audioContextRef.current.close();
        // audioContextRef.current = null;
    }
    setMicStream(null);
    setMicActive(false);
    setCurrentPitch(null);
    setCurrentRMS(0);
    // FIX: Explicitly bind `this` to null for `t` function calls.
    setMicStatusMessage(t.call(null, "micStatusActivate"));
    // Restart VoxLab's mic after RangeDetectorV2 is done
    startVoxLabMic();
  }, [micStream, t, startVoxLabMic]);

  useEffect(() => {
    // Start mic automatically when component mounts and test mode is selected
    if (testMode) {
      startMic();
    }
    return () => {
      stopMic();
      if (noInputTimeoutRef.current) clearTimeout(noInputTimeoutRef.current);
    };
  }, [testMode, startMic, stopMic]);

  const generateFeedback = useCallback(async (
    lowestSung: string | null,
    highestSung: string | null,
    avgSpeaking: string | null,
    vocalRange: string | null,
  ) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const prompt = `Based on the following vocal analysis results, provide a concise, encouraging, and informative feedback.
      Your tone should be like a vocal coach. Include suggestions for exercises or areas to focus on.
      Also, suggest 2-3 famous singers who have a similar vocal range (if applicable and if the range is well-defined).
      The output should be in JSON format matching the schema provided, and all user-facing text must be in ${language.code}.

      Vocal Analysis:
      Lowest Sung Note: ${lowestSung || "N/A"}
      Highest Sung Note: ${highestSung || "N/A"}
      Average Speaking Voice: ${avgSpeaking || "N/A"}
      Estimated Vocal Range: ${vocalRange || "N/A"}
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "A brief, encouraging summary of the vocal analysis." },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key strengths identified from the range (e.g., 'strong lower register')." },
          areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific areas for vocal development (e.g., 'extend upper range')." },
          exerciseSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Recommended exercises or practice types." },
          similarSingers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Names of 2-3 famous singers with a similar vocal range." },
        },
        required: ["summary", "exerciseSuggestions"],
      };

      const response = await ai.models.generateContent({
        model: feedbackModel,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });
      setFeedbackText(response.text);

    } catch (error) {
      console.error("Error generating feedback:", error);
      // FIX: Explicitly bind `this` to null for `t` function calls.
      setFeedbackError(t.call(null, "feedbackError"));
    }
  }, [language.code, t]);

  const performAnalysis = useCallback(async () => {
    let finalLowestSung: string | null = null;
    let finalHighestSung: string | null = null;
    let finalAvgSpeaking: string | null = null;
    let finalVocalRange: string | null = null;

    if (testMode === "advanced") {
      const lowestPitches = lowestNotesRef.current.filter((p) => p > 0); // Filter for valid pitches
      const speakingPitches = speakingPitchesRef.current.filter((p) => p > 0);
      const sirenPitches = sirenPitchesRef.current.filter((p) => p > 0);

      if (lowestPitches.length > 0) {
        finalLowestSung = freqToNote(min(lowestPitches));
      }
      if (sirenPitches.length > 0) {
        finalHighestSung = freqToNote(max(sirenPitches));
      }
      if (speakingPitches.length > 0) {
        finalAvgSpeaking = freqToNote(average(speakingPitches));
      }
    } else { // Simple mode
      const sirenPitches = sirenPitchesRef.current.filter((p) => p > 0);
      if (sirenPitches.length > 0) {
        finalLowestSung = freqToNote(min(sirenPitches));
        finalHighestSung = freqToNote(max(sirenPitches));
      }
    }

    if (finalLowestSung && finalHighestSung) {
      finalVocalRange = `${finalLowestSung} - ${finalHighestSung}`;
    }

    setAnalysisResults({
      lowestSung: finalLowestSung,
      highestSung: finalHighestSung,
      avgSpeaking: finalAvgSpeaking,
      vocalRange: finalVocalRange,
    });
    setGeneratingFeedback(true);
    // FIX: Pass all required arguments to generateFeedback.
    await generateFeedback(finalLowestSung, finalHighestSung, finalAvgSpeaking, finalVocalRange);
    setGeneratingFeedback(false);
  }, [testMode, generateFeedback]);

  const startCountdown = useCallback((duration: number, onComplete: () => void) => {
    setCountdown(duration);
    setStepActive(true);
    let timer = duration;
    const interval = setInterval(() => {
      timer--;
      setCountdown(timer);
      if (timer === 0) {
        clearInterval(interval);
        setCountdown(null);
        setStepActive(false);
        onComplete();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStepCompletion = useCallback(() => {
    // Check if enough input was heard
    // FIX: Use MIN_SAMPLES_FOR_VALID_INPUT for length comparison.
    const hasInput = (currentStep === 1 && lowestNotesRef.current.length >= MIN_SAMPLES_FOR_VALID_INPUT) ||
                     (currentStep === 2 && speakingPitchesRef.current.length >= MIN_SAMPLES_FOR_VALID_INPUT) ||
                     (currentStep === (testMode === 'simple' ? 1 : 3) && sirenPitchesRef.current.length >= MIN_SAMPLES_FOR_VALID_INPUT);

    if (!hasInput) {
      setNoInputDetected(true);
      noInputTimeoutRef.current = window.setTimeout(() => {
        setNoInputDetected(false);
      }, 3000); // Hide message after 3 seconds
      return;
    }

    if (testMode === "simple") {
      performAnalysis();
    } else {
      if (currentStep < 3) {
        setCurrentStep((prev) => prev + 1);
      } else {
        performAnalysis();
      }
    }
  }, [currentStep, testMode, performAnalysis]);

  useEffect(() => {
    if (stepActive) {
      if (noInputTimeoutRef.current) clearTimeout(noInputTimeoutRef.current);
      setNoInputDetected(false); // Reset no input message
      // Data collection loop
      animationFrameRef.current = requestAnimationFrame(function collectData() {
        const pitch = currentPitch;
        const rms = currentRMS;

        if (pitch !== null && rms > LOW_VOLUME_RMS_THRESHOLD) { // Only collect if valid pitch and sufficient volume
            if (currentStep === 1 && testMode === "advanced") {
                lowestNotesRef.current.push(pitch);
            } else if (currentStep === 2 && testMode === "advanced") {
                speakingPitchesRef.current.push(pitch);
            } else if (currentStep === (testMode === 'simple' ? 1 : 3)) { // Siren step for both modes
                sirenPitchesRef.current.push(pitch);
            }
        }
        animationFrameRef.current = requestAnimationFrame(collectData);
      });
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stepActive, currentPitch, currentRMS, currentStep, testMode]);

  const themesConfig = {
    "violet-wave": {
      gradient: "from-violet-500/10 from-10% via-fuchsia-500/10 via-50% to-yellow-300/10 to-90%",
      colors: ["#8b5cf6", "#d946ef", "#facc15"], // Violet, Fuchsia, Yellow
    },
    "ocean-blue": {
      gradient: "from-sky-400/10 via-cyan-400/10 to-blue-500/10",
      colors: ["#38bdf8", "#22d3ee", "#3b82f6"], // Sky, Cyan, Blue
    },
    "forest-green": {
      gradient: "from-emerald-400/10 via-teal-500/10 to-green-600/10",
      colors: ["#34d399", "#14b8a6", "#16a34a"], // Emerald, Teal, Green
    },
    "sunset-orange": {
      gradient: "from-amber-400/10 via-orange-500/10 to-red-500/10",
      colors: ["#facc15", "#f97316", "#ef4444"], // Amber, Orange, Red
    },
  };
  // FIX: Access currentTheme.id directly
  const theme = themesConfig[currentTheme.id as keyof typeof themesConfig] || themesConfig["violet-wave"];

  const getStepInstruction = useCallback((step: number) => {
    if (testMode === "simple") {
      return {
        // FIX: Explicitly bind `this` to null for `t` function calls.
        title: t.call(null, "simpleStep1Title"),
        // FIX: Explicitly bind `this` to null for `t` function calls.
        instruction: t.call(null, "simpleStep1Instruction"),
        countdown: 7, // Longer for siren
      };
    } else {
      switch (step) {
        case 1:
          return {
            // FIX: Explicitly bind `this` to null for `t` function calls.
            title: t.call(null, "step1Title"),
            // FIX: Explicitly bind `this` to null for `t` function calls.
            instruction: t.call(null, "step1Instruction"),
            countdown: 5,
          };
        case 2:
          return {
            // FIX: Explicitly bind `this` to null for `t` function calls.
            title: t.call(null, "step2Title"),
            // FIX: Explicitly bind `this` to null for `t` function calls.
            instruction: t.call(null, "step2Instruction"),
            countdown: 5,
          };
        case 3:
          return {
            // FIX: Explicitly bind `this` to null for `t` function calls.
            title: t.call(null, "step3Title"),
            // FIX: Explicitly bind `this` to null for `t` function calls.
            instruction: t.call(null, "step3Instruction"),
            countdown: 7,
          };
        default:
          return { title: "", instruction: "", countdown: 0 };
      }
    }
  }, [t, testMode]);


  useEffect(() => {
    if (micActive && !analysisResults && testMode && !stepActive && currentStep <= (testMode === 'simple' ? 1 : 3)) {
      const { countdown: stepCountdown } = getStepInstruction(currentStep);
      startCountdown(stepCountdown, handleStepCompletion);
    }
  }, [micActive, analysisResults, testMode, stepActive, currentStep, startCountdown, handleStepCompletion, getStepInstruction]);


  const cardClasses = `bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 text-center relative overflow-hidden`;
  const btnClasses = `
    px-8 py-3 rounded-full font-medium text-base text-white
    flex items-center justify-center gap-2
    relative overflow-hidden group
    transition-all transform hover:scale-105 active:scale-95
    bg-gradient-to-br ${currentTheme.gradient.replace(/\/10/g, '')}
    shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb),0.4),inset_0_1px_0_rgba(255,255,255,0.2)]
    backdrop-blur-sm
  `;

  const dynamicShadowRgb = currentTheme.shadowRgb || "139, 92, 246"; // Default violet shadow
  const progressPercentage = currentRMS; // Use RMS for orb scaling
  const primaryColor = theme.colors[0];
  const secondaryColor = theme.colors[1];

  const { title: stepTitle, instruction: stepInstruction } = getStepInstruction(currentStep);

  const parsedFeedback = useMemo(() => {
      if (feedbackText) {
          try {
              return JSON.parse(feedbackText);
          } catch (e) {
              console.error("Failed to parse feedback JSON:", e);
              return null;
          }
      }
      return null;
  }, [feedbackText]);

  return (
    <div className="flex-grow flex flex-col items-center justify-center w-full px-4 pt-8 pb-28 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Orb
          color={primaryColor}
          size={250 + progressPercentage * 3} // Scale with RMS
          x="10%"
          y="10%"
          opacity={0.3 + progressPercentage / 200} // Increase opacity with RMS
          blur={100 + progressPercentage}
          initialTransform="translateZ(0)"
        />
        <Orb
          color={secondaryColor}
          size={200 + progressPercentage * 2}
          x="80%"
          y="70%"
          opacity={0.3 + progressPercentage / 200}
          blur={80 + progressPercentage}
          initialTransform="translateZ(0)"
        />
        <Orb
          color={theme.colors[2]} // Third color from theme
          size={300 + progressPercentage * 4}
          x="40%"
          y="85%"
          opacity={0.3 + progressPercentage / 200}
          blur={120 + progressPercentage}
          initialTransform="translateZ(0)"
        />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="btn-interactive absolute -top-12 left-0 p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-400/20"
          // FIX: Explicitly bind `this` to null for `t` function calls.
          aria-label={t.call(null, "goBack")}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Removed the h1 title here based on user feedback */}

        {!testMode && (
          <div className={`${cardClasses} space-y-6 max-w-md mx-auto`}>
            <h2
              className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo}`}
            >
              {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
              {t.call(null, "selectMode")}
            </h2>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setTestMode("simple")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border border-black/10 dark:border-white/10 shadow-lg bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 transition-all`}
              >
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white">
                  {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                  {t.call(null, "simpleMode")}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                  {t.call(null, "simpleModeDesc")}
                </p>
              </button>
              <button
                onClick={() => setTestMode("advanced")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border border-black/10 dark:border-white/10 shadow-lg bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 transition-all`}
              >
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white">
                  {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                  {t.call(null, "advancedMode")}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                  {t.call(null, "advancedModeDesc")}
                </p>
              </button>
            </div>
            <button
              onClick={() => {
                resetAnalysis();
                setTestMode(null);
                onBack(); // Go back to the main range view
              }}
              className="btn-interactive text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40 px-6 py-2.5 rounded-full mt-4"
            >
              {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
              {t.call(null, "goBack")}
            </button>
          </div>
        )}

        {testMode && !analysisResults && (
          <div className={`${cardClasses} space-y-4 max-w-md mx-auto`}>
            {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
            {micStatusMessage === t.call(null, "micDenied") ? (
              <div className="text-red-500 dark:text-red-400 font-semibold">
                {micStatusMessage}
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase">
                  {/* FIX: Correct string interpolation for `advancedStepHeader` and remove interpolation for `simpleStepHeader`. */}
                  {testMode === "advanced"
                    ? t.call(null, "advancedStepHeader").replace('{step}', currentStep.toString())
                    : t.call(null, "simpleStepHeader")}
                </p>
                <h2
                  className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo}`}
                >
                  {stepTitle}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 whitespace-pre-line">
                  {stepInstruction}
                </p>

                {noInputDetected && (
                  <p className="text-red-500 dark:text-red-400 font-semibold animate-pulse">
                    {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                    {t.call(null, "notHearingYou")}
                  </p>
                )}

                <div className="h-24 flex items-center justify-center relative">
                  {countdown !== null && countdown > 0 && (
                    <span
                      className={`text-7xl font-extrabold absolute ${
                        countdown <= 3 ? "animate-ping-once" : ""
                      }`}
                      style={{ color: primaryColor }}
                    >
                      {countdown}
                    </span>
                  )}
                  {countdown === 0 && (
                    <span
                      className={`text-7xl font-extrabold absolute`}
                      style={{ color: primaryColor }}
                    >
                      {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                      {t.call(null, "countdownGo")}
                    </span>
                  )}
                  {countdown === null && !stepActive && !analysisResults && (
                      <button
                        onClick={() => {
                          const { countdown: stepCountdown } = getStepInstruction(currentStep);
                          startCountdown(stepCountdown, handleStepCompletion);
                        }}
                        className={btnClasses}
                        style={{ '--shadow-rgb': dynamicShadowRgb } as React.CSSProperties}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative z-10 flex items-center gap-2">
                          {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                          {t.call(null, "startDetection")}
                        </span>
                      </button>
                    )}
                </div>

                <div className="h-6 mt-4">
                  {currentRMS > LOW_VOLUME_RMS_THRESHOLD && currentPitch ? (
                    <p className="text-xl font-bold text-slate-800 dark:text-white">
                      {midiToNoteName(69 + 12 * Math.log2(currentPitch / 440))} (
                      {currentPitch.toFixed(1)} Hz)
                    </p>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400">
                      {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                      {micActive ? t.call(null, "noSoundDetected") : micStatusMessage}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {analysisResults && (
          <div className={`${cardClasses} space-y-6 max-w-md mx-auto`}>
            <h2
              className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientText.from} ${currentTheme.gradientText.to} ${currentTheme.gradientText.darkFrom} ${currentTheme.gradientText.darkTo}`}
            >
              {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
              {t.call(null, "feedbackTitle")}
            </h2>

            {generatingFeedback ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-600 dark:border-violet-400"></div>
                <p className="text-slate-600 dark:text-slate-300">
                  {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                  {t.call(null, "generatingFeedback")}
                </p>
              </div>
            ) : feedbackError ? (
              <p className="text-red-500 dark:text-red-400">{feedbackError}</p>
            ) : parsedFeedback ? (
              <div className="text-left space-y-4">
                <p className="text-slate-700 dark:text-slate-200 font-semibold">
                  {parsedFeedback.summary}
                </p>
                {testMode === 'advanced' && (
                    <>
                        {analysisResults.lowestSung && <p className="text-slate-600 dark:text-slate-300"><strong>{t.call(null, "resultsLowestSung")}:</strong> {analysisResults.lowestSung}</p>}
                        {analysisResults.highestSung && <p className="text-slate-600 dark:text-slate-300"><strong>{t.call(null, "resultsHighestSung")}:</strong> {analysisResults.highestSung}</p>}
                        {analysisResults.avgSpeaking && <p className="text-slate-600 dark:text-slate-300"><strong>{t.call(null, "resultsAvgSpeaking")}:</strong> {analysisResults.avgSpeaking}</p>}
                    </>
                )}
                {analysisResults.vocalRange && (
                  <p className="text-xl font-black text-slate-800 dark:text-white">
                    <strong>{t.call(null, "resultsRange")}:</strong> {analysisResults.vocalRange}
                  </p>
                )}
                {parsedFeedback.strengths && parsedFeedback.strengths.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Strengths:</h3>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-300">
                      {parsedFeedback.strengths.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsedFeedback.areasForImprovement && parsedFeedback.areasForImprovement.length > 0 && (
                  <div>
                    <h3 className="lg font-bold text-slate-800 dark:text-white">Areas for Improvement:</h3>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-300">
                      {parsedFeedback.areasForImprovement.map((a: string, i: number) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsedFeedback.exerciseSuggestions && parsedFeedback.exerciseSuggestions.length > 0 && (
                  <div>
                    <h3 className="lg font-bold text-slate-800 dark:text-white">Exercise Suggestions:</h3>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-300">
                      {parsedFeedback.exerciseSuggestions.map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsedFeedback.similarSingers && parsedFeedback.similarSingers.length > 0 && (
                  <div>
                    <h3 className="lg font-bold text-slate-800 dark:text-white">
                      {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
                      {t.call(null, "similarSingers")}:
                    </h3>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-300">
                      {parsedFeedback.similarSingers.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            <button
              onClick={resetAnalysis}
              className="btn-interactive text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-slate-300/50 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-black/40 px-6 py-2.5 rounded-full mt-4"
            >
              {/* FIX: Explicitly bind `this` to null for `t` function calls. */}
              {t.call(null, "startNew")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
