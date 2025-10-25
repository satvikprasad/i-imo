# Test Suite Setup and Documentation

This document describes the comprehensive test suite added to the frontend project.

## Overview

A complete testing infrastructure has been added using **Vitest** and **React Testing Library**. The test suite includes over 200+ test cases covering utilities, hooks, and UI components.

## Installation

Install the required testing dependencies:

```bash
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

## Configuration Files

### `vitest.config.ts`
Main Vitest configuration with:
- React plugin integration
- jsdom environment for DOM testing
- Path aliases matching the project structure
- Coverage configuration
- Test setup file

### `src/test/setup.ts`
Global test setup including:
- React Testing Library matchers
- Cleanup after each test
- Mock implementations for window.matchMedia
- Mock implementations for IntersectionObserver
- Mock implementations for ResizeObserver

## Test Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

## Test Files Created

### 1. **src/lib/utils.test.ts** (50+ tests)
Comprehensive testing of the `cn()` utility function including:
- Basic functionality (class merging, empty values, conditionals)
- Array handling (nested arrays, conditionals in arrays)
- Tailwind CSS merge functionality (conflicting classes, variants, responsive)
- Edge cases (no arguments, many arguments, duplicates, whitespace)
- Real-world component scenarios
- Performance and consistency tests

### 2. **src/hooks/use-mobile.test.ts** (40+ tests)
Thorough testing of the `useIsMobile` hook:
- Initialization at different screen widths
- Responsive behavior on window resize
- Edge cases (small/large screens, zero/negative widths)
- Cleanup and memory management
- Concurrent usage with multiple instances
- matchMedia query correctness
- Boolean coercion behavior

### 3. **src/components/ui/spinner.test.tsx** (15+ tests)
Testing the Spinner component:
- Rendering and ARIA roles
- Styling (animation, size, custom classes)
- Accessibility (screen readers, ARIA labels)
- Props forwarding
- Edge cases

### 4. **src/components/ui/skeleton.test.tsx** (20+ tests)
Testing the Skeleton component:
- Rendering and structure
- Styling (animation, background, custom classes)
- Use cases (text, circular, card skeletons)
- Props forwarding
- Accessibility
- Edge cases

### 5. **src/components/ui/badge.test.tsx** (30+ tests)
Testing the Badge component:
- Rendering and children
- Variants (default, secondary, destructive, outline)
- asChild prop functionality
- Styling and class merging
- Icon integration
- Accessibility
- Interactive states
- Props forwarding
- Edge cases

### 6. **src/components/ui/button.test.tsx** (50+ tests)
Comprehensive Button component testing:
- Rendering and structure
- Variants (default, destructive, outline, secondary, ghost, link)
- Sizes (default, sm, lg, icon variants)
- asChild prop with Radix Slot
- Disabled state
- Styling and class merging
- Icon integration
- Accessibility (ARIA attributes, keyboard navigation)
- Type attribute
- Event handlers
- Edge cases
- Combination of props

### 7. **src/components/ui/input.test.tsx** (60+ tests)
Extensive Input component testing:
- Rendering and structure
- Input types (text, email, password, number, tel, url, search, date, file)
- Styling and class merging
- User interaction (typing, focus, blur, onChange)
- Controlled component behavior
- Disabled and readonly states
- Validation attributes (required, pattern, minLength, maxLength)
- Accessibility (ARIA labels, keyboard navigation)
- Edge cases (empty values, special characters, unicode, very long input)
- Type-specific features (number min/max/step, file accept/multiple)

### 8. **src/components/ui/kbd.test.tsx** (40+ tests)
Testing Kbd and KbdGroup components:
- Rendering and structure
- Styling and visual appearance
- Common keyboard keys (Command, Control, Shift, Alt, Enter)
- Icon integration
- Accessibility (semantic HTML, ARIA labels)
- Props forwarding
- Edge cases
- KbdGroup specific tests (complex shortcuts, separators, multiple keys)

## Test Coverage

The test suite covers:
- ✅ **Utility functions**: Pure function testing with edge cases
- ✅ **React Hooks**: Custom hooks with lifecycle and state management
- ✅ **UI Components**: Component rendering, props, variants, styling
- ✅ **Accessibility**: ARIA attributes, keyboard navigation, screen reader support
- ✅ **User Interactions**: Clicks, typing, focus management
- ✅ **Edge Cases**: Empty values, null/undefined, extreme inputs
- ✅ **Type Safety**: TypeScript prop validation

## Test Patterns and Best Practices

### 1. Component Testing Pattern
```typescript
describe('Component Name', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      // Test basic rendering
    });
  });

  describe('props', () => {
    // Test different prop combinations
  });

  describe('user interaction', () => {
    // Test user events
  });

  describe('accessibility', () => {
    // Test ARIA attributes and keyboard navigation
  });

  describe('edge cases', () => {
    // Test boundary conditions
  });
});
```

### 2. Using React Testing Library
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Render component
render(<Component />);

// Query elements
const element = screen.getByRole('button');
const element2 = screen.getByTestId('custom-id');
const element3 = screen.getByText('Text content');

// User interactions
const user = userEvent.setup();
await user.click(element);
await user.type(input, 'text');
```

### 3. Testing Accessibility
```typescript
// Test ARIA roles
expect(screen.getByRole('button')).toBeInTheDocument();

// Test ARIA labels
expect(screen.getByLabelText('Close')).toBeInTheDocument();

// Test keyboard navigation
await user.tab();
expect(document.activeElement).toBe(element);
```

### 4. Testing Custom Hooks
```typescript
import { renderHook, act } from '@testing-library/react';

const { result } = renderHook(() => useCustomHook());

act(() => {
  // Perform state updates
});

expect(result.current).toBe(expectedValue);
```

## Coverage Goals

Target coverage metrics:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Continuous Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: pnpm test:run

- name: Generate coverage
  run: pnpm test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Future Test Additions

Consider adding tests for:
1. Complex UI components (Carousel, Chart, Dialog, etc.)
2. Form components with react-hook-form integration
3. Integration tests for page components
4. E2E tests with Playwright
5. Visual regression tests
6. Performance tests

## Debugging Tests

### Watch Mode
Tests run in watch mode by default. Press `a` to run all tests, `f` to run only failed tests.

### UI Mode
```bash
pnpm test:ui
```
Opens a browser-based UI for exploring tests, viewing results, and debugging.

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Events](https://testing-library.com/docs/user-event/intro)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## Notes

- All tests use TypeScript for type safety
- Tests follow AAA pattern: Arrange, Act, Assert
- Component tests use data-testid for stable selectors when needed
- User interactions use @testing-library/user-event for realistic behavior
- Mocks are provided for browser APIs not available in jsdom