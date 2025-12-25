# VoxLab Tester Feedback - Implementation Plan

## 🔴 CRITICAL (Fix Immediately)

### 1. Audio Playback - Stop on Exit ✅ PRIORITY 1
**Issue:** Audio continues when exiting exercise
**Fix:** Add cleanup in ExerciseGameViewALT unmount
**Files:** `ExerciseGameViewALT.tsx`, `ExerciseGameViewALTWrapper.tsx`
**Estimated Time:** 15 min

### 2. Pitch Detection - Low Note Artifacts ✅ PRIORITY 2
**Issue:** Detecting very low notes (noise)
**Current Filter:** 80 Hz minimum
**Fix:** Increase to 100 Hz, add confidence threshold
**Files:** `ExerciseGameViewALT.tsx`
**Estimated Time:** 10 min

### 3. Notes Out of Sync ✅ PRIORITY 3
**Issue:** Exercise notes timing issues
**Fix:** Review timing calculation, add latency compensation
**Files:** `ExerciseGameViewALT.tsx` - `createNotes` function
**Estimated Time:** 30 min

## 🟡 HIGH PRIORITY (Fix Soon)

### 4. Routines - Legacy Game View
**Issue:** Routines using old view
**Fix:** Ensure routines use ExerciseGameViewALTWrapper
**Files:** `App.tsx` - routine handling
**Estimated Time:** 20 min

### 5. Responsive Layout - Stretched UI
**Issue:** Interface stretched on some screens
**Fix:** Add max-width constraints, improve aspect ratio handling
**Files:** `App.tsx`, CSS
**Estimated Time:** 30 min

### 6. Default BPM Too Fast
**Issue:** Already reduced by 35%, but still too fast
**Fix:** Reduce by another 20-30%
**Files:** `constants.ts`
**Estimated Time:** 5 min

## 🟢 MEDIUM PRIORITY (Next Sprint)

### 7. Button Visibility - Don't Hide Disabled
**Fix:** Change `hidden` to `opacity-50 cursor-not-allowed`
**Files:** Multiple components
**Estimated Time:** 20 min

### 8. Analysis Display - Show Octave Count
**Fix:** Add octave count to vocal range results
**Files:** `VocalRangeTestScreen.tsx`
**Estimated Time:** 15 min

### 9. In-Exercise BPM Control
**Fix:** Add BPM slider to Engine Settings
**Files:** `ExerciseGameViewALT.tsx`
**Estimated Time:** 30 min

### 10. In-Exercise Vocal Range Control
**Fix:** Add range adjustment to Engine Settings
**Files:** `ExerciseGameViewALT.tsx`
**Estimated Time:** 45 min

## 🔵 LOW PRIORITY (Future)

### 11. Descending Exercises
**Fix:** Add `reverse` option to exercise patterns
**Files:** `constants.ts`, exercise generation
**Estimated Time:** 1 hour

### 12. AI Exercise Saving
**Fix:** Already implemented? Verify and improve UX
**Files:** `AIStudioView.tsx`
**Estimated Time:** 30 min

### 13. AI Audio Input
**Fix:** Enable mic for AI voice analysis
**Files:** `AIStudioView.tsx`
**Estimated Time:** 1 hour

### 14. Reference Singers Quality
**Fix:** Improve singer database, ensure gender balance
**Files:** `VocalRangeTestScreen.tsx`, singer data
**Estimated Time:** 2 hours

---

## 📋 Implementation Order

**Session 1 (Now):**
1. ✅ Audio stop on exit
2. ✅ Pitch detection filter improvement
3. ✅ Default BPM reduction

**Session 2:**
4. Notes sync fix
5. Routines fix
6. Button visibility

**Session 3:**
7. Responsive layout
8. Octave count display
9. In-exercise controls

**Session 4:**
10. Descending exercises
11. AI improvements
12. Reference singers

---

## 🎯 Quick Wins (< 30 min total)
- Audio stop on exit (15 min)
- Pitch filter (10 min)
- BPM reduction (5 min)

**Total: 30 minutes for 3 critical fixes**

Let's start with these!
