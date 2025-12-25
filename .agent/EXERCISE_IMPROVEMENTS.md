# Exercise Improvements Task List

## 1. ✅ Routine Progress Indicator
- [ ] Show routine name in header during routine exercises
- [ ] Display "Exercise X of Y" counter
- [ ] Add "Next Exercise" button to skip to next in routine
- [ ] Show routine completion when all exercises are done

## 2. ✅ Fix Restart Button Behavior
**Current Issue**: Restart button goes back to exercise list
**Expected**: Restart should reset the current exercise without leaving the view
**Location**: `ExerciseGameViewALT.tsx` - Restart button handler

## 3. ✅ Metronome Sync
**Issue**: Metronome clicks are out of sync with note timing
**Fix**: Ensure metronome clicks align precisely with note start times
**Location**: Metronome timing logic in exercise playback

## 4. ✅ Note Duration Management
**Current**: All notes play for the same duration
**Needed**: 
- Quarter notes (1 beat)
- Half notes (2 beats)
- Whole notes (4 beats)
- Prevent overlapping note playback (singer can't sing two notes at once)
**Location**: Exercise pattern definition and playback logic

## 5. ✅ Remove Finish Line Position Control
**Reason**: Simplify UI, reduce complexity
**Action**: Remove the ability to change finish line position, keep it fixed
**Location**: `ExerciseGameViewALT.tsx` - Finish line controls

---

## Priority Order
1. Fix Restart Button (Quick fix)
2. Remove Finish Line Control (Quick fix)
3. Routine Progress Indicator (Medium)
4. Note Duration Management (Complex - requires pattern redesign)
5. Metronome Sync (Medium - depends on note duration)

## Notes
- All changes should maintain the current working exercise start/stop flow
- Test thoroughly to avoid breaking the fixes we just made
- Consider adding these to a settings panel for advanced users
