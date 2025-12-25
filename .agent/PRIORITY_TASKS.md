# Priority Improvements - Implementation Plan

## 1. ✅ Always Show Controls (Don't Hide)
- Remove the hide/show animation for play, back, restart buttons
- Keep them visible with lower opacity and blur when playing
- **Location**: `ExerciseGameViewALT.tsx` - Control buttons section

## 2. ✅ Fix Note Overlap & Duration
- Notes should not overlap - wait for previous to finish
- Note width should reflect duration (quarters, halves, whole notes)
- **Location**: Exercise playback logic and note scheduling

## 3. ✅ Static Tuner Shape (No Flickering)
- Tuner in minimized state should have fixed width
- Stop width animation based on note name length
- **Location**: `ExerciseGameViewALT.tsx` - Tuner display

## 4. ✅ Routine Progress Header
- Show routine name at top
- Display "Exercise X of Y" counter
- **Location**: `ExerciseGameViewALT.tsx` - Add header section

## 5. ✅ Standardize PYIN Algorithm
- Use PYIN in range detector (currently uses different algorithm)
- Make PYIN standard across entire app
- Fix unrealistic low note detection
- **Location**: `VocalRangeTestScreen.tsx` - Pitch detection

## 6. ✅ Remove Restart from Test Section
- Test mode doesn't need restart button
- **Location**: Test view component

---

## Implementation Order:
1. Always show controls (Quick)
2. Static tuner shape (Quick)
3. Routine progress header (Medium)
4. Standardize PYIN (Medium)
5. Fix note overlap/duration (Complex)
6. Remove test restart (Quick)
