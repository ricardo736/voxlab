# Testing Documentation

This project uses Vitest and React Testing Library for testing.

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `__tests__/` - All test files
  - `pitchDetection.test.ts` - Tests for pitch detection utilities (19 tests)
  - `exercise.test.ts` - Tests for exercise logic and utilities (30 tests)
  - `App.test.tsx` - Tests for app constants and data integrity (10 tests)

- `src/test/setup.ts` - Test setup file with Web Audio API mocks

## Test Coverage

Current test coverage includes:

### Pitch Detection (`utils.ts`)
- ✅ Frequency to note conversion
- ✅ Semitone to note name conversion
- ✅ Note to frequency conversion
- ✅ Edge cases (very low/high frequencies, invalid inputs)
- ✅ Detune calculation

### Exercise Logic (`exerciseUtils.ts`)
- ✅ Scale degree to semitone conversion (major and minor scales)
- ✅ Rhythm name to beats conversion
- ✅ Interval name to semitone conversion
- ✅ Vocal range calculations
- ✅ Integration tests

### App Constants (`constants.ts`)
- ✅ Exercise data integrity
- ✅ Exercise structure validation
- ✅ Category validation
- ✅ Unique IDs

## Mocked APIs

The test setup automatically mocks:
- Web Audio API (AudioContext, Analyser, Oscillator, etc.)
- navigator.mediaDevices.getUserMedia
- window.matchMedia

This allows tests to run in a Node.js environment without a browser.

## Test Results

All 59 tests are currently passing:
- 19 pitch detection tests
- 30 exercise logic tests  
- 10 app data integrity tests
