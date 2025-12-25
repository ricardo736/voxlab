# VoxLab AI - Critical Fixes Needed

## Issues to Fix:

### 1. Back Button Navigation (HIGH PRIORITY)
**Current:** Back button goes to new creation
**Expected:** Back button returns to AI result page (screenshot 1) showing the generated exercise
**Fix:** Need to preserve the AI result state when navigating to exercise view

### 2. Remove Edit Button from AI Result Page
**Current:** Edit button added to AI result card (wrong location)
**Expected:** No edit button on result page
**Fix:** Remove the Edit button I just added to AIStudioView.tsx lines 635-647

### 3. Add Refine Mode in Exercise View
**Current:** Edit button in exercise view
**Expected:** "Refinar" (Refine) input field like screenshot 2
**Fix:** Replace Edit button with Refine input that allows modifying the exercise prompt
**Location:** Inside the exercise view, accessible via icon in top-right

### 4. Preview Button Triple-Click Issue
**Current:** Requires 3 clicks to hear preview
**Expected:** Single click plays preview
**Fix:** Likely a focus/propagation issue with the button

### 5. Button Sizes Too Large
**Current:** Buttons are too big
**Expected:** Smaller, more compact buttons
**Fix:** Reduce button sizes in ExerciseGameViewALT.tsx

## Implementation Priority:
1. Fix back button navigation (preserve AI result state)
2. Remove wrong Edit button from AI result page  
3. Reduce button sizes
4. Add Refine mode in exercise view
5. Fix preview triple-click

## Notes:
- The "Refinar" feature should allow users to modify the exercise without leaving the exercise view
- Back button must preserve the generated exercise so users can return to it
- Preview button issue is likely related to event propagation or button focus
