# VoxLab AI Issues - Quick Fix Summary

## Issues Identified:

### 1. Preview Has No Sound
**Problem:** Preview button in AI Studio doesn't play audio
**Location:** `AIStudioView.tsx` line 617
**Current Code:** `playNote(semitone, noteDuration, false)`
**Issue:** The playNote function might not be working correctly or the audio context isn't initialized

**Fix Needed:**
- Verify playNote is receiving correct parameters
- Check if audio context is initialized before preview
- Add frequency conversion (semitone to frequency)

### 2. Back Button Doesn't Return to AI View
**Problem:** After starting a generated exercise, clicking back doesn't show the AI view with the exercise
**Location:** `App.tsx` - handleStop function
**Current Behavior:** Goes to home or exercises view
**Expected:** Should return to 'voxlabai' view with the generated exercise visible

**Fix Needed:**
- Modify handleStop to check if exercise is AI-generated
- Navigate to 'voxlabai' view instead of 'home'
- Preserve the generated exercise state

### 3. Add Edit Icon to Generated Exercise
**Problem:** No way to edit a just-created AI exercise
**Location:** `AIStudioView.tsx` - result display section
**Expected:** Edit icon next to Start button that allows modifying the exercise parameters

**Fix Needed:**
- Add Edit button/icon to the generated exercise card
- Populate the form fields with the current exercise data
- Allow user to regenerate with modifications

## Priority:
1. Back button navigation (HIGH) - User experience issue
2. Preview sound (MEDIUM) - Nice to have for verification
3. Edit icon (LOW) - Quality of life improvement
