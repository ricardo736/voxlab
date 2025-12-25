# Refine Functionality - Implementation Guide

## Current Status:
The Refine UI is complete and working:
- ✅ Violet edit button appears for AI exercises
- ✅ Centered dialog with input field
- ✅ Keyboard shortcuts (Enter to submit, ESC to cancel)
- ❌ Backend integration not implemented

## What Happens Now:
When user types a refinement and presses Enter:
- Line 1284 in ExerciseGameViewALT.tsx: `console.log('Refine:', refinePrompt);`
- Dialog closes
- Nothing else happens

## What Needs to Happen:
1. User types refinement (e.g., "Faça mais rápido")
2. System should:
   - Take the current exercise
   - Take the refinement prompt
   - Call AI API with both
   - Generate new refined exercise
   - Update the exercise in real-time

## Implementation Steps:

### Step 1: Add onRefine prop to ExerciseGameViewALT
```tsx
// In ExerciseGameViewALT.tsx interface
onRefine?: (currentExercise: Exercise, refinePrompt: string) => Promise<void>;
```

### Step 2: Create handleRefine in App.tsx
```tsx
const handleRefineExercise = useCallback(async (exercise: Exercise, refinePrompt: string) => {
    // Call AIStudioView's refine logic
    // This requires exposing the refine function from AIStudioView
    // Or duplicating the AI logic here
}, []);
```

### Step 3: Pass callback through the chain
```
App.tsx 
  → ExerciseGameViewALTWrapper (pass onRefine)
    → ExerciseGameViewALT (use onRefine in line 1284)
```

### Step 4: Update line 1284 in ExerciseGameViewALT.tsx
```tsx
if (e.key === 'Enter' && refinePrompt.trim()) {
    if (onRefine) {
        await onRefine(exercise, refinePrompt);
    }
    setRefinePrompt('');
    setShowRefineInput(false);
}
```

## Alternative Simpler Solution:
Instead of refining in-place, the Refine button could:
1. Navigate back to AI Studio
2. Pre-populate the refine input with the current exercise context
3. Let user refine there

This is simpler but less elegant than in-place refinement.

## Current Workaround:
Users can:
1. Click yellow back button to return to AI Studio
2. Use the "Refinar" section there (which already works)
3. Regenerate the exercise

The in-exercise Refine button is currently UI-only and needs backend integration.
