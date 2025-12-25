# Completed Quick Fixes

## ✅ Done:
1. **Always Show Controls** - Controls now stay visible with reduced opacity when playing
2. **Routine Progress Header** - Shows routine name and "Exercise X of Y"
3. **Static Tuner Width** - Fixed width prevents flickering
4. **Fixed Restart Button** - Restarts current exercise instead of exiting

---

# Remaining Complex Tasks

## 1. Note Overlap & Duration System
**Status**: Requires significant refactoring
**Current Issue**: All notes use same duration from `exercise.duration`
**Needed**: 
- Add duration property to each note in pattern
- Modify pattern from `[0, 2, 4, 5, 7]` to `[{semitone: 0, duration: 1}, {semitone: 2, duration: 0.5}, ...]`
- Update playback logic to respect individual note durations
- Ensure no overlapping (wait for note to finish before next)

**Files to modify**:
- `constants.ts` - Exercise pattern definitions
- `ExerciseGameViewALT.tsx` - Note scheduling logic
- `types.ts` - Exercise interface

## 2. Metronome Sync
**Status**: Needs investigation
**Issue**: Metronome clicks don't align with note timing
**Fix**: Ensure metronome clicks are scheduled at exact note start times

**Files to check**:
- `ExerciseGameViewALT.tsx` - Metronome click scheduling
- Note playback timing logic

## 3. Standardize PYIN Algorithm
**Status**: Medium complexity
**Issue**: Range detector uses different algorithm, picks unrealistic low notes
**Fix**: 
- Update `VocalRangeTestScreen.tsx` to use PYIN
- Ensure consistent pitch detection across app
- Add better filtering for unrealistic frequencies

**Files to modify**:
- `VocalRangeTestScreen.tsx` - Replace current algorithm with PYIN
- Possibly `pitchDetection.ts` - Ensure PYIN is optimized

## 4. Remove Restart from Test Section
**Status**: Quick fix (not done yet)
**Location**: Test view component

---

# Deployment Checklist
Before deploying:
- [ ] Test all quick fixes on localhost
- [ ] Verify routine progress shows correctly
- [ ] Confirm controls stay visible
- [ ] Check tuner doesn't flicker
- [ ] Test restart button
- [ ] Remove debug console.logs
- [ ] Build and deploy to Netlify
