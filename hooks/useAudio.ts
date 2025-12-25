import { useRef, useCallback, useState } from 'react';
import { NoteNodes } from '../types';
import { noteToFrequency } from '../utils';
import { pitchProcessorCode } from './pitchProcessor';

interface UseAudioReturn {
  // Refs
  audioCtxRef: React.RefObject<AudioContext | null>;
  masterGainRef: React.RefObject<GainNode | null>;
  currentPlayingExerciseNoteNodesRef: React.RefObject<Set<NoteNodes>>;
  currentNonExerciseNoteNodesRef: React.RefObject<Set<NoteNodes>>;
  audioInitPromiseRef: React.RefObject<Promise<boolean> | null>;
  previewTimersRef: React.RefObject<number[]>;
  latestPlayRequestRef: React.RefObject<number>;
  currentlyPlayingNotesRef: React.RefObject<Set<number>>;
  compressorNodeRef: React.RefObject<DynamicsCompressorNode | null>;
  
  // State
  exerciseNoteVolume: number;
  setExerciseNoteVolume: (volume: number) => void;
  metronomeVolume: number;
  setMetronomeVolume: (volume: number) => void;
  
  // Functions
  initAudio: () => Promise<boolean>;
  playNote: (
    semitone: number,
    duration: number,
    forExercise: boolean,
    instrumentLibrary: Record<string, Map<number, AudioBuffer>>,
    activeInstrument: string,
    fetchAndDecodeSample: (semitone: number, audioCtx: AudioContext | null) => Promise<AudioBuffer | null>,
    frequencySeparationEnabled: boolean
  ) => Promise<void>;
  playMetronomeClick: () => Promise<void>;
  stopAllExerciseNotes: () => void;
  stopAllNonExerciseNotes: () => void;
}

export function useAudio(
  t: (key: string) => string,
  setMicStatus: (status: string) => void,
  compressorThreshold: number,
  compressorRatio: number,
  compressorRelease: number
): UseAudioReturn {
  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const currentPlayingExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set());
  const currentNonExerciseNoteNodesRef = useRef<Set<NoteNodes>>(new Set());
  const audioInitPromiseRef = useRef<Promise<boolean> | null>(null);
  const previewTimersRef = useRef<number[]>([]);
  const latestPlayRequestRef = useRef<number>(0);
  const currentlyPlayingNotesRef = useRef<Set<number>>(new Set());
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  
  // State
  const [exerciseNoteVolume, setExerciseNoteVolume] = useState(1.0);
  const [metronomeVolume, setMetronomeVolume] = useState(0.3);
  
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
            setMicStatus(t('micStatusError'));
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
  }, [t, compressorThreshold, compressorRatio, compressorRelease, setMicStatus]);
  
  const playNote = useCallback(async (
    semitone: number,
    duration: number,
    forExercise: boolean = false,
    instrumentLibrary: Record<string, Map<number, AudioBuffer>>,
    activeInstrument: string,
    fetchAndDecodeSample: (semitone: number, audioCtx: AudioContext | null) => Promise<AudioBuffer | null>,
    frequencySeparationEnabled: boolean
  ) => {
    const audioReady = await initAudio();
    const audioCtx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    if (!audioReady || !audioCtx || !masterGain) return;

    const now = audioCtx.currentTime;
    const noteSet = forExercise ? currentPlayingExerciseNoteNodesRef.current : currentNonExerciseNoteNodesRef.current;

    // PREVENT OVERLAPPING: Stop any previous notes of the same semitone
    noteSet.forEach(existingNode => {
      if ((existingNode as any).semitone === semitone) {
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
    const currentMap = instrumentLibrary[activeInstrument];

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
      try {
        const fetched = await fetchAndDecodeSample(semitone, audioCtx);
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
      const ATTACK_TIME = 0.01;
      const DECAY_TIME = 0.1;
      const SUSTAIN_LEVEL = 0.1;

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

      const osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc1.connect(mainGainNode);
      nodes.oscillators.push(osc1);
      nodes.allNodes.push(osc1);

      const brightOscGain = audioCtx.createGain();
      brightOscGain.gain.setValueAtTime(0, now);
      brightOscGain.gain.linearRampToValueAtTime(0.1, now + 0.005);
      brightOscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      brightOscGain.connect(mainGainNode);
      nodes.gainNodes.push(brightOscGain);
      nodes.allNodes.push(brightOscGain);

      const osc2 = audioCtx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq * 2, now);
      osc2.connect(brightOscGain);
      nodes.oscillators.push(osc2);
      nodes.allNodes.push(osc2);

      nodes.oscillators.forEach(osc => {
        osc.start(now);
        try { osc.stop(now + totalDurationSecs); } catch (e) { }
      });
      osc1.onended = () => {
        nodes.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } });
        noteSet.delete(nodes);
      };
      noteSet.add(nodes);
    }
  }, [initAudio, exerciseNoteVolume]);
  
  const playMetronomeClick = useCallback(async () => {
    const audioReady = await initAudio();
    const audioCtx = audioCtxRef.current;
    if (!audioReady || !audioCtx || !masterGainRef.current) return;
    const now = audioCtx.currentTime;
    const clickGain = audioCtx.createGain();
    clickGain.gain.setValueAtTime(metronomeVolume, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    clickGain.connect(masterGainRef.current);
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.connect(clickGain);
    osc.start(now);
    osc.stop(now + 0.1);
    osc.onended = () => {
      try {
        osc.disconnect();
        clickGain.disconnect();
      } catch (e) { }
    };
  }, [initAudio, metronomeVolume]);
  
  const stopAllExerciseNotes = useCallback(() => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    currentPlayingExerciseNoteNodesRef.current.forEach(nodes => {
      nodes.gainNodes.forEach(g => {
        try {
          g.gain.cancelScheduledValues(now);
          g.gain.setValueAtTime(g.gain.value, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        } catch (e) { }
      });
      nodes.allNodes.forEach(node => {
        if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
          try { node.stop(now + 0.06); } catch (e) { }
        }
      });
      setTimeout(() => {
        nodes.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } });
      }, 70);
    });
    currentPlayingExerciseNoteNodesRef.current.clear();
  }, []);
  
  const stopAllNonExerciseNotes = useCallback(() => {
    currentNonExerciseNoteNodesRef.current.forEach(nodes => {
      nodes.allNodes.forEach(node => { try { node.disconnect(); } catch (e) { } });
    });
    currentNonExerciseNoteNodesRef.current.clear();
  }, []);
  
  return {
    audioCtxRef,
    masterGainRef,
    currentPlayingExerciseNoteNodesRef,
    currentNonExerciseNoteNodesRef,
    audioInitPromiseRef,
    previewTimersRef,
    latestPlayRequestRef,
    currentlyPlayingNotesRef,
    compressorNodeRef,
    exerciseNoteVolume,
    setExerciseNoteVolume,
    metronomeVolume,
    setMetronomeVolume,
    initAudio,
    playNote,
    playMetronomeClick,
    stopAllExerciseNotes,
    stopAllNonExerciseNotes,
  };
}
