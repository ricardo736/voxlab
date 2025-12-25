# Testing Documentation

This document describes the testing infrastructure for VoxLab.

## Overview

VoxLab uses [Vitest](https://vitest.dev/) as its testing framework along with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for component testing.

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

Tests are organized in the `__tests__/` directory:

- `pitchDetection.test.ts` - Tests for pitch detection utilities
- `exercise.test.ts` - Tests for exercise logic and patterns
- `App.test.tsx` - Integration tests for the main App component

## Test Setup

The test environment is configured with:

- **jsdom** - Browser-like environment for testing
- **Web Audio API mocks** - Mocked audio functionality for testing audio features
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom matchers for assertions

### Web Audio API Mocks

The `src/test/setup.ts` file provides comprehensive mocks for:

- AudioContext
- AudioWorkletNode
- MediaDevices
- Oscillators, Gain Nodes, Analysers, etc.

These mocks allow testing audio-related functionality without requiring actual audio hardware.

## Writing Tests

### Unit Tests

Unit tests should focus on individual functions and utilities:

```typescript
import { describe, it, expect } from 'vitest';
import { noteToFrequency } from '../utils';

describe('noteToFrequency', () => {
  it('should convert A4 to 440Hz', () => {
    expect(noteToFrequency('A4')).toBeCloseTo(440.0, 1);
  });
});
```

### Component Tests

Component tests should use React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from '../components/MyComponent';

it('should render component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

## Best Practices

1. **Test Behavior, Not Implementation** - Focus on what the code does, not how it does it
2. **Use Descriptive Test Names** - Test names should clearly describe what they're testing
3. **Keep Tests Isolated** - Each test should be independent and not rely on other tests
4. **Mock External Dependencies** - Use mocks for APIs, audio devices, etc.
5. **Test Edge Cases** - Don't just test the happy path

## Coverage

Run `npm run test:coverage` to generate a coverage report. The coverage report will be generated in the `coverage/` directory.

## CI/CD Integration

Tests are automatically run in the CI/CD pipeline on every push and pull request. All tests must pass before code can be merged.

## Troubleshooting

### Tests Failing Locally

1. Make sure dependencies are installed: `npm install`
2. Clear any cached data: `npm run test -- --clearCache`
3. Check that mocks are properly configured in `src/test/setup.ts`

### Audio-Related Test Failures

If audio-related tests are failing, verify that:
- The Web Audio API mocks are properly configured
- Audio contexts are being created correctly in tests
- MediaDevices are mocked appropriately

## Future Improvements

- Add E2E tests with Playwright
- Increase test coverage to >80%
- Add visual regression testing
- Add performance benchmarking tests
