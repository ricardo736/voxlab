

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Exercise, VocalRange, Routine, GameNote, PlaybackState } from '../types';
import { EXERCISES } from '../constants';
import { noteToFrequency, semitoneToNoteName, frequencyToNote, lerp } from '../utils';
import { useTranslation } from '../hooks/useTranslation';
import { TranslationKey } from '../i18n';

const HISTORY_LENGTH = 150;
const INDICATOR_X_PERCENT = 0.25;
const GAIN_THRESHOLD = 10; // Minimum micGain to consider pitch valid
const IN_TUNE_THRESHOLD_CENTS = 25; // Within +/- 25 cents is considered "hit"
const METRONOME_INTERVAL_MS = 500; // Time between metronome beats
const COUNTDOWN_BEATS = 4;
const COUNTDOWN_DURATION_MS = COUNTDOWN_BEATS * METRONOME_INTERVAL_MS; // Total duration of countdown

const tailwindToRgb = (className: string = 'text-violet-600'): [number, number, number] => {
    const colors: { [key: string]: string } = { 'text-violet-600': '#8b5cf6', 'text-fuchsia-600': '#d946ef', 'text-blue-600': '#2563eb', 'text-cyan-600': '#0891b2', 'text-green-700': '#15803d', 'text-teal-600': '#0d9488', 'text-orange-600': '#ea580c', 'text-red-600': '#dc2626' };
    const hex = colors[className] || '#8b5cf6';
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
};

const StarIcon = (p: {f: boolean}) => <svg className={`w-6 h-6 transition-all duration-200 ${p.f?'text-amber-400 scale-110':'text-slate-400 group-hover:text-amber-300'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1"><path d="M8 5v14l11-7z"></path></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>;
const RestartIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></svg>;
const BackIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path></svg>;
const PreviewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.108 12 5v14c0 .892-1.077 1.337-1.707.707L5.586 15z" /></svg>;

interface ExerciseGameViewProps {
    exercise: Exercise;
    vocalRange: VocalRange;
    userPitch: number | null;
    micGain: number;
    isPlaying: boolean;
    onStop: () => void;
    onPreview: () => void;
    onComplete: () => void;
    centerSemitone: number;
    visibleOctaves: number;
    onNotePositionUpdate: (noteCenter: number | null) => void;
    currentTheme: { primary: string, secondary: string, gradient: string, shadowRgb: string, buttonGradient: string, gradientText: { from: string, to: string, darkFrom: string, darkTo: string } };
    currentRoutine: { routine: Routine; exerciseIndex: number } | null;
    onToggleFavoriteExercise: (exerciseId: number) => void;
    isExerciseFavorite: boolean;
    onToggleFavoriteRoutine: ((routineId: string) => void) | undefined;
    isRoutineFavorite: boolean;
    onPlayPause: () => void;
    isExerciseComplete: boolean;
    onPlayExerciseNote: (semitone: number, duration: number, forExercise?: boolean) => void;
    playbackState: PlaybackState; // Passed directly from App.tsx
    setPlaybackState: React.Dispatch<React.SetStateAction<PlaybackState>>; // Passed setter from App.tsx
    setElapsedTime: (time: number) => void; // Passed setter for displayed timer
    elapsedTime: number; // For displaying current elapsed time
    onMetronomeTick: () => void; // Passed metronome tick handler
    t: (key: TranslationKey | string) => string; // Added translation function
}

const ExerciseGameView: React.FC<ExerciseGameViewProps> = (props) => {
    // FIX: Destructure `t` from props
    const { t, onPlayPause, onStop, onPreview, isPlaying, isExerciseComplete, currentRoutine, onPlayExerciseNote, playbackState, setPlaybackState, setElapsedTime, elapsedTime, onMetronomeTick } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const pitchHistoryRef = useRef<(number | null)[]>(new Array(HISTORY_LENGTH).fill(null));
    const [gameNotesState, setGameNotesState] = useState<GameNote[]>([]); // Use state for game notes
    const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null); // For visual countdown
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [notesHitCount, setNotesHitCount] = useState(0);
    const [notesAttemptedCount, setNotesAttemptedCount] = useState(0);
    const frameCounterRef = useRef(0); // Fix: Declared frameCounterRef

    const propsRef = useRef(props); // Ref to hold current props for animation frame
    propsRef.current = props;

    const { memoizedGameNotes, totalDuration } = useMemo(() => {
        const { exercise, vocalRange } = propsRef.current; // Access from ref
        if (!vocalRange.start || !vocalRange.end) return { memoizedGameNotes: [], totalDuration: 0 };

        const notes: GameNote[] = [];
        let currentTime = 0; // Notes start at 0ms relative to content playback start
        const MAX_TRANSPOSE = 48; // Max transpose up 4 octaves
        
        for (let t = 0; t <= MAX_TRANSPOSE; t += 12) { // Iterate by full octaves for transposing
            const transposedStartSemitone = vocalRange.start.semitone + t;
            const maxOffset = Math.max(...exercise.pattern, 0);

            // Stop transposing if the highest note of the pattern exceeds the vocal range
            if (transposedStartSemitone + maxOffset > vocalRange.end.semitone) break;
            
            // Ensure the lowest note of the pattern is within the vocal range
            if (transposedStartSemitone < vocalRange.start.semitone) continue;

            for (const offset of exercise.pattern) {
                const semitone = transposedStartSemitone + offset;
                // Only add note if it's within the vocal range
                if (semitone >= vocalRange.start.semitone && semitone <= vocalRange.end.semitone) {
                    notes.push({ 
                        id: `${t}-${notes.length}`, 
                        semitone, 
                        startTime: currentTime, 
                        duration: exercise.duration, 
                        played: false, 
                        playedAudio: false, 
                        name: semitoneToNoteName(semitone), 
                        hitState: 'upcoming',
                        scoreHandled: false, // Initialize scoreHandled
                    });
                    currentTime += exercise.duration;
                }
            }
            currentTime += 500; // Pause between transposed patterns
        }
        return { memoizedGameNotes: notes, totalDuration: notes.length > 0 ? notes[notes.length - 1].startTime + notes[notes.length - 1].duration : 0 };
    }, [props.exercise, props.vocalRange]); // props.vocalRange, not propsRef.current.vocalRange for memoization

    // Effect to reset gameNotesState when memoizedGameNotes changes (new exercise selected)
    useEffect(() => {
        setGameNotesState(memoizedGameNotes.map(n => ({ ...n, hitState: 'upcoming', playedAudio: false, scoreHandled: false })));
        setNotesHitCount(0);
        setNotesAttemptedCount(0);
        // Do not reset playbackState here, App.tsx manages that on new exercise select
        // Only reset visual countdown if it was active
        if (!isPlaying) setCountdownDisplay(null);
    }, [memoizedGameNotes, isPlaying]);

    const gameLogicIntervalRef = useRef<number | null>(null);
    const timersRef = useRef<Set<number>>(new Set());

    const addTimer = useCallback((timerId: number) => { timersRef.current.add(timerId); }, []);
    const clearTimers = useCallback(() => { timersRef.current.forEach(timerId => { clearTimeout(timerId); clearInterval(timerId); }); timersRef.current.clear(); }, []);

    // Main game logic effect
    useEffect(() => {
        clearTimers(); // Clear any existing timers on effect re-run

        if (!isPlaying && !isExerciseComplete) {
            // When paused/stopped outside of countdown or playing, ensure countdown visual is off
            setCountdownDisplay(null);
            return;
        }

        // Initialize countdown visual if starting a fresh exercise
        if (isPlaying && playbackState.isCountingDown && playbackState.countdownStartedAt > 0 && playbackState.pausedTime === 0 && !isExerciseComplete) {
            setCountdownDisplay(COUNTDOWN_BEATS); // Start countdown visual
            onMetronomeTick(); // First click for beat 4
        } else if (isPlaying && !playbackState.isCountingDown && playbackState.sessionStartTime > 0 && playbackState.pausedTime === 0 && !isExerciseComplete) {
            // This case should primarily be for resumes that aren't countdowns
            // And if playbackState.pausedTime is > 0, App.tsx has already set sessionStartTime for resume.
            // No specific action needed here beyond the interval loop
        }

        // Interval for game state updates, metronome, and countdown
        gameLogicIntervalRef.current = window.setInterval(() => {
            const now = performance.now();
            let currentEffectivePlaybackTime: number; // Time relative to the start of exercise content (can be negative during countdown)
            let displayedTime: number; // For the elapsed time display (always positive)

            if (playbackState.isCountingDown) {
                const elapsedSinceCountdownStart = now - playbackState.countdownStartedAt;
                const currentBeat = COUNTDOWN_BEATS - Math.floor(elapsedSinceCountdownStart / METRONOME_INTERVAL_MS);

                if (currentBeat > 0 && currentBeat !== countdownDisplay) {
                    setCountdownDisplay(currentBeat);
                    onMetronomeTick(); // Play metronome sound
                } else if (currentBeat <= 0) {
                    // Countdown finished
                    setPlaybackState(prev => ({
                        ...prev,
                        isCountingDown: false,
                        sessionStartTime: now, // Exercise content officially starts now
                    }));
                    setCountdownDisplay(null);
                    onMetronomeTick(); // Final click for beat 0/start
                }
                currentEffectivePlaybackTime = elapsedSinceCountdownStart - COUNTDOWN_DURATION_MS; // Negative, counts up to 0
                displayedTime = Math.floor(Math.max(0, currentEffectivePlaybackTime) / 1000); // Display 0 during countdown
            } else if (isPlaying && playbackState.sessionStartTime > 0) {
                currentEffectivePlaybackTime = now - playbackState.sessionStartTime;
                displayedTime = Math.floor(currentEffectivePlaybackTime / 1000);
            } else { // Paused or Stopped
                currentEffectivePlaybackTime = playbackState.pausedTime;
                displayedTime = Math.floor(currentEffectivePlaybackTime / 1000);
            }
            setElapsedTime(displayedTime);

            // Update game notes state, check pitch, trigger audio
            setGameNotesState(prevNotes => {
                let newNotes = [...prevNotes]; // Create a mutable copy for this interval
                let newNotesHitCount = notesHitCount;
                let newNotesAttemptedCount = notesAttemptedCount;

                // Fix: Access userPitch and micGain from propsRef.current
                const { userPitch, micGain } = propsRef.current;
                const detectedNote = userPitch ? frequencyToNote(userPitch) : null;
                const userSemitone = detectedNote ? detectedNote.preciseSemitone : null;
                const isSinging = micGain > GAIN_THRESHOLD && userSemitone !== null;

                // Only process game logic if not in countdown and playback is active
                if (!playbackState.isCountingDown && isPlaying) {
                    newNotes.forEach((n, idx) => {
                        const noteStartMs = n.startTime;
                        const noteEndMs = n.startTime + n.duration;
                        const hasCrossedHitZone = currentEffectivePlaybackTime > noteEndMs; // Note has passed its end time
                        const isActiveInHitZone = (currentEffectivePlaybackTime >= noteStartMs && currentEffectivePlaybackTime < noteEndMs);
                        
                        // Trigger note audio playback
                        if (isActiveInHitZone && !n.playedAudio) {
                            onPlayExerciseNote(n.semitone, n.duration, true);
                            newNotes[idx] = { ...n, playedAudio: true };
                        }

                        // Update hit state and score
                        if (!n.scoreHandled) { // Only process scoring for notes not yet scored
                            if (isActiveInHitZone && isSinging && Math.abs(userSemitone! - n.semitone) < IN_TUNE_THRESHOLD_CENTS) {
                                // User is singing in tune while note is active
                                newNotes[idx] = { ...n, hitState: 'hit' };
                                // This might get re-hit, but scoreHandled will prevent double counting.
                            } else if (hasCrossedHitZone) {
                                // Note has passed the hit zone
                                if (n.hitState === 'upcoming') { // If it was never hit
                                    newNotes[idx] = { ...n, hitState: 'miss' };
                                }
                                // Mark for scoring
                                if (!n.scoreHandled) {
                                    newNotesHitCount += (newNotes[idx].hitState === 'hit' ? 1 : 0);
                                    newNotesAttemptedCount += 1;
                                    newNotes[idx] = { ...newNotes[idx], scoreHandled: true };
                                }
                            }
                        }
                    });

                    // Update counts only if they changed
                    if (newNotesHitCount !== notesHitCount) setNotesHitCount(newNotesHitCount);
                    if (newNotesAttemptedCount !== notesAttemptedCount) setNotesAttemptedCount(newNotesAttemptedCount);

                    // Check for exercise completion (after the last note + a small buffer)
                    if (currentEffectivePlaybackTime > totalDuration + METRONOME_INTERVAL_MS * 2 && totalDuration > 0) {
                        // Fix: Access onComplete from propsRef.current
                        propsRef.current.onComplete();
                    }
                }

                return newNotes; // Return the updated state
            });

        }, METRONOME_INTERVAL_MS / 4); // Run game logic more frequently than metronome ticks
        addTimer(gameLogicIntervalRef.current);

        return () => {
            clearTimers();
            if (gameLogicIntervalRef.current) clearInterval(gameLogicIntervalRef.current);
            gameLogicIntervalRef.current = null;
        };
    }, [isPlaying, isExerciseComplete, totalDuration, memoizedGameNotes, onPlayExerciseNote, onMetronomeTick, props.onComplete, notesHitCount, notesAttemptedCount, playbackState, setPlaybackState, setElapsedTime, countdownDisplay]);


    const handlePreviewClick = useCallback(() => {
        if (isPreviewing || isPlaying) return;
        setIsPreviewing(true); onPreview();
        const previewDuration = memoizedGameNotes.reduce((acc, note) => acc + note.duration, 0) + 500; // Sum of all notes + padding
        setTimeout(() => setIsPreviewing(false), previewDuration);
    }, [isPreviewing, isPlaying, onPreview, memoizedGameNotes]);

    useEffect(() => {
        const canvas = canvasRef.current, container = containerRef.current; if (!canvas || !container) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        let dpr = window.devicePixelRatio || 1;
        const resizeCanvas = () => { const { width, height } = container.getBoundingClientRect(); dpr = window.devicePixelRatio || 1; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
        const lookaheadMs = 4000; // How many ms of notes are visible ahead of the hit zone

        const draw = () => {
            // Fix: Access userPitch and micGain from propsRef.current
            const { userPitch, micGain, centerSemitone, visibleOctaves, onNotePositionUpdate } = propsRef.current;
            const { width, height } = container.getBoundingClientRect();
            ctx.clearRect(0, 0, width, height);

            const rangeSpan = 12 * visibleOctaves;
            const minSemitone = centerSemitone - (rangeSpan / 2);
            const totalSemitones = rangeSpan;
            
            // Calculate current playback time for rendering
            let effectivePlaybackTime: number;
            if (playbackState.isCountingDown) {
                const elapsedSinceCountdownStart = performance.now() - playbackState.countdownStartedAt;
                effectivePlaybackTime = elapsedSinceCountdownStart - COUNTDOWN_DURATION_MS; // Will be negative, counting up to 0
            } else {
                effectivePlaybackTime = isPlaying && playbackState.sessionStartTime > 0
                    ? performance.now() - playbackState.sessionStartTime
                    : playbackState.pausedTime;
            }


            // Draw horizontal note lines
            for (let s = Math.floor(minSemitone); s <= Math.ceil(minSemitone + totalSemitones); s++) {
                const name = semitoneToNoteName(s);
                const isC = name.startsWith('C');
                const isSharp = name.includes('#');
                const y = height - ((s - minSemitone) / totalSemitones * height);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = isC ? 'rgba(203, 213, 225, 0.7)' : isSharp ? 'rgba(241, 245, 249, 0.6)' : 'rgba(226, 232, 240, 0.7)';
                ctx.stroke();
            }

            // Draw hit zone line
            const hitZoneX = width * INDICATOR_X_PERCENT;
            ctx.beginPath();
            ctx.moveTo(hitZoneX, 0);
            ctx.lineTo(hitZoneX, height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(${tailwindToRgb(props.currentTheme.primary).join(',')}, 0.3)`;
            ctx.stroke();

            // Calculate pixels per millisecond
            const pixelsPerMs = (width - hitZoneX) / lookaheadMs;

            // Update visible note center for auto-fit, but less frequently
            if (frameCounterRef.current % 10 === 0) { // Update every 10 frames
                const visibleNotes = gameNotesState.filter(n => {
                    const noteX = hitZoneX + (n.startTime - effectivePlaybackTime) * pixelsPerMs;
                    const noteEndVisibleX = noteX + (n.duration * pixelsPerMs);
                    return noteEndVisibleX > 0 && noteX < width; // Check if any part of the note is visible
                });
                onNotePositionUpdate(visibleNotes.length > 0 ? visibleNotes.reduce((s, n) => s + n.semitone, 0) / visibleNotes.length : null);
            }
            frameCounterRef.current++; // Increment frame counter

            const primaryRgb = tailwindToRgb(props.currentTheme.primary);
            const secondaryRgb = tailwindToRgb(props.currentTheme.secondary);

            // Draw game notes
            gameNotesState.forEach(n => {
                const x = hitZoneX + (n.startTime - effectivePlaybackTime) * pixelsPerMs;
                const noteW = n.duration * pixelsPerMs;

                // Only draw notes that are visible or just passed
                if (x + noteW < 0 || x > width + 100) return; // Add some buffer

                const y = height - ((n.semitone - minSemitone) / totalSemitones * height);
                const noteH = height / totalSemitones * 0.8; // Note height
                const noteY = y - noteH / 2; // Y position for the center of the note

                // Determine note color based on hitState
                let fillColor = '';
                let strokeColor = 'rgba(255, 255, 255, 0.7)'; // Default border color

                if (n.hitState === 'hit') {
                    fillColor = 'rgb(74, 222, 128, 0.9)'; // Green for hit
                } else if (n.hitState === 'miss') {
                    fillColor = 'rgb(249, 115, 22, 0.9)'; // Orange-red for miss
                } else {
                    // Gradient for upcoming notes
                    const progressThroughScreen = Math.min(1, Math.max(0, (width - x) / (width - hitZoneX))); // 0 to 1 as note approaches hit zone
                    const r = lerp(secondaryRgb[0], primaryRgb[0], progressThroughScreen);
                    const g = lerp(secondaryRgb[1], primaryRgb[1], progressThroughScreen);
                    const b = lerp(secondaryRgb[2], primaryRgb[2], progressThroughScreen);
                    fillColor = `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, ${0.7 + progressThroughScreen * 0.2})`;
                }

                ctx.fillStyle = fillColor;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(x, noteY, noteW, noteH, [noteH / 2]);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(n.name, x + noteW / 2, noteY + noteH / 2);
            });

            // User Pitch History Line and Dot
            // Define userPitch, micGain, detectedNote, currSemi, isSinging for this scope
            const currentMicGain = propsRef.current.micGain;
            const currentUserPitch = propsRef.current.userPitch;
            const detectedNote = currentUserPitch ? frequencyToNote(currentUserPitch) : null;
            const currSemi = detectedNote ? detectedNote.preciseSemitone : null;
            const isSinging = currentMicGain > GAIN_THRESHOLD && currSemi !== null;

            // Update pitch history for rendering
            // if (frameCounterRef.current % 3 === 0) { // Update history less frequently for smoother line
            pitchHistoryRef.current = [...pitchHistoryRef.current.slice(1), isSinging ? currSemi : null];
            // }
            
            const points = pitchHistoryRef.current.map((s, i) =>
                s === null ? null : ({
                    x: hitZoneX - ((HISTORY_LENGTH - 1 - i) * (hitZoneX / HISTORY_LENGTH)),
                    y: height - ((s - minSemitone) / totalSemitones * height)
                })
            ).filter((p): p is {x: number, y: number} => p !== null && p.x >= 0);

            if (points.length > 1) {
                const grad = ctx.createLinearGradient(0, 0, hitZoneX, 0);
                grad.addColorStop(0, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0)`);
                grad.addColorStop(1, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 1)`);
                ctx.beginPath();
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = grad;
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 0; i < points.length - 1; i++) {
                    ctx.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + points[i+1].x) / 2, (points[i].y + points[i+1].y) / 2);
                }
                ctx.stroke();
            }

            const lastActive = [...pitchHistoryRef.current].reverse().find(s => s !== null);
            if (lastActive !== undefined && lastActive !== null) {
                const y = height - ((lastActive - minSemitone) / totalSemitones * height);
                ctx.beginPath();
                ctx.arc(hitZoneX, y, 6, 0, 2 * Math.PI);
                ctx.fillStyle = isSinging && currSemi !== null ? `rgb(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]})` : '#a1a1aa';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Real-time Pitch Detune Indicator
            if (isSinging && currSemi !== null) {
                const activeTargetNote = gameNotesState.find(n =>
                    (n.startTime <= effectivePlaybackTime + (lookaheadMs * INDICATOR_X_PERCENT)) && // Note is near or in hit zone
                    (n.startTime + n.duration >= effectivePlaybackTime + (lookaheadMs * INDICATOR_X_PERCENT)) // Note has not completely passed
                );

                if (activeTargetNote) {
                    const detuneCents = (currSemi - activeTargetNote.semitone) * 100;
                    const clampedDetune = Math.max(-50, Math.min(50, detuneCents)); // Clamp between -50 and 50 cents
                    const barLength = Math.abs(clampedDetune) * 2; // Scale length with detune magnitude
                    const barY = height - ((currSemi - minSemitone) / totalSemitones * height) + 12; // Position below user dot
                    const barHeight = 4;
                    const centerBarX = hitZoneX - barLength / 2;

                    let detuneColor: string;
                    if (Math.abs(detuneCents) < IN_TUNE_THRESHOLD_CENTS) {
                        detuneColor = 'rgb(74, 222, 128)'; // Green for in-tune
                    } else if (detuneCents > 0) {
                        detuneColor = 'rgb(220, 38, 38)'; // Red for sharp
                    } else {
                        detuneColor = 'rgb(37, 99, 235)'; // Blue for flat
                    }

                    ctx.fillStyle = detuneColor;
                    ctx.beginPath();
                    ctx.roundRect(centerBarX + (clampedDetune > 0 ? barLength / 2 : 0) - (clampedDetune < 0 ? barLength : 0), barY, barLength, barHeight, 2);
                    ctx.fill();
                }
            }

            // Render countdown display
            if (countdownDisplay !== null) {
                ctx.fillStyle = `rgba(${primaryRgb.join(',')}, 0.8)`;
                ctx.font = 'bold 150px sans-serif'; // Large, bold font
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(countdownDisplay.toString(), width / 2, height / 2);
            }
        };

        const renderLoop = () => {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
            draw();
        };

        resizeCanvas(); // Initial canvas resize
        const resObs = new ResizeObserver(resizeCanvas);
        resObs.observe(container);
        renderLoop();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            resObs.disconnect();
        };
    }, [props.currentTheme, totalDuration, gameNotesState, isPlaying, props.userPitch, props.micGain, countdownDisplay, playbackState.isCountingDown, playbackState.countdownStartedAt, playbackState.sessionStartTime, playbackState.pausedTime, props.centerSemitone, props.visibleOctaves, props.onNotePositionUpdate]);

    const routineExercises = useMemo(() => currentRoutine ? currentRoutine.routine.exerciseIds.map(id => EXERCISES.find(ex => ex.id === id)).filter(Boolean) as Exercise[] : [], [currentRoutine]);
    // FIX: Access `elapsedTime` from props directly
    const formattedTime = useMemo(() => `${String(Math.floor(elapsedTime / 60)).padStart(2, '0')}:${String(elapsedTime % 60).padStart(2, '0')}`, [elapsedTime]);
    
    const baseButtonClasses = `
        px-8 py-3 rounded-full font-medium text-base text-white
        flex items-center justify-center gap-2
        relative overflow-hidden group 
        transition-all transform hover:scale-105 active:scale-95
        bg-gradient-to-br ${props.currentTheme.buttonGradient}
        shadow-2xl shadow-[0_8px_32px_rgba(var(--shadow-rgb),0.4),inset_0_1px_0_rgba(255,255,255,0.2)] 
        backdrop-blur-sm
    `;

    const accuracyPercentage = notesAttemptedCount > 0 ? ((notesHitCount / notesAttemptedCount) * 100).toFixed(0) : '0';

    return (
        <section className="w-full flex flex-col flex-grow pt-8">
            <div className="text-center mb-6">
                 <div className="flex justify-center items-center gap-2">
                    <h2 className={`text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${props.currentTheme.gradientText.from} ${props.currentTheme.gradientText.to} ${props.currentTheme.gradientText.darkFrom} ${props.currentTheme.gradientText.darkTo} mb-2`}>{t(props.exercise.name)}</h2>
                    <button onClick={() => props.onToggleFavoriteExercise(props.exercise.id)} className="btn-interactive group p-1 rounded-full mb-2" aria-label={t('favorites')}><StarIcon f={props.isExerciseFavorite} /></button>
                </div>
                <p className="text-slate-500 dark:text-slate-400">{t(props.exercise.desc)}</p>
                <div className="flex justify-center items-center gap-4 mt-2">
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-lg">{formattedTime}</p>
                    <p className={`text-lg font-bold ${notesAttemptedCount > 0 ? (notesHitCount / notesAttemptedCount > 0.8 ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400') : 'text-slate-500 dark:text-slate-400'}`}>
                        {t('accuracy')}: {accuracyPercentage}%
                    </p>
                </div>
            </div>
             {currentRoutine && (
                <div className="w-full max-w-lg mx-auto mb-4 p-3 bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-2xl text-xs shadow-lg">
                    <div className="flex justify-between items-center mb-2">
                         <h4 className="font-bold text-slate-600 dark:text-slate-300">{t(currentRoutine.routine.name)}: {t('upNext')}</h4>
                         <button onClick={() => props.onToggleFavoriteRoutine!(currentRoutine.routine.id)} className="btn-interactive group p-1 rounded-full" aria-label={t('favorites')}><StarIcon f={props.isRoutineFavorite} /></button>
                    </div>
                    <ul className="flex flex-wrap gap-1">
                        {routineExercises.map((ex, idx) => <li key={ex.id} className={`px-2 py-0.5 rounded-full border ${idx === currentRoutine.exerciseIndex ? `font-bold text-white border-transparent ${props.currentTheme.primary.replace('text-', 'bg-')}` : 'bg-white/50 dark:bg-black/20 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-white/10'}`}>{t(ex.name)}</li>)}
                    </ul>
                </div>
            )}
            <div ref={containerRef} className="relative w-full h-[400px] bg-white/30 dark:bg-black/20 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-3xl overflow-hidden my-4 shadow-2xl">
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>
            
            <div className="flex-shrink-0 pt-4">
                 <div className="flex justify-center items-center gap-4">
                     <button 
                        onClick={onStop} 
                        className={`
                            px-8 py-3 rounded-full font-medium text-base text-white
                            flex items-center justify-center gap-2
                            relative overflow-hidden group 
                            transition-all transform hover:scale-105 active:scale-95
                            bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700
                            shadow-2xl shadow-gray-600/40
                            backdrop-blur-sm text-slate-200
                        `}
                        style={{
                            boxShadow: '0 8px 32px rgba(75, 85, 99, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        }}
                        disabled={isPreviewing}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative z-10 flex items-center gap-2">
                            <div className="drop-shadow-sm"><BackIcon /></div>
                        </span>
                    </button>
                    <button 
                        onClick={handlePreviewClick} 
                        className={`${baseButtonClasses} text-black dark:text-white`} 
                        style={{'--shadow-rgb': props.currentTheme.shadowRgb} as React.CSSProperties}
                        disabled={isPreviewing || isPlaying}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative z-10 flex items-center gap-2">
                            <div className="drop-shadow-sm"><PreviewIcon /></div>
                        </span>
                    </button>
                    {!(isExerciseComplete && currentRoutine) && 
                        <button 
                            onClick={onPlayPause} 
                            className={`${baseButtonClasses} text-black dark:text-white ${isExerciseComplete || isPlaying ? 'shadow-inner' : ''}`} 
                            style={{'--shadow-rgb': props.currentTheme.shadowRgb} as React.CSSProperties}
                            disabled={isPreviewing || (isPlaying && playbackState.isCountingDown)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <span className="relative z-10 flex items-center gap-2">
                                <div className="drop-shadow-sm">{isExerciseComplete ? <RestartIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}</div>
                            </span>
                        </button>
                    }
                </div>
            </div>
        </section>
    );
};

export default React.memo(ExerciseGameView);