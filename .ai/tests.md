# Testing Guidelines for Amplience CLI Tool

## Overview

This document defines the testing standards and conventions for the Amplience
CLI Tool project. These guidelines ensure consistent, maintainable, and
comprehensive test coverage across the codebase.

## Testing Framework

- **Framework**: [Vitest](https://vitest.dev/) - A fast unit test framework
  powered by Vite
- **Configuration**: `vitest.config.ts` located at the project root
- **Environment**: Node.js environment for all tests
- **Coverage Provider**: V8 for accurate coverage reporting

## Test File Organization

### Co-Location Strategy

**Rule**: All unit tests must be co-located with their source files, placed
directly next to the file being tested.

### File Naming Convention

**Pattern**: `{source-filename}.test.{extension}`

- Source file: `amplience-service.ts`
- Test file: `amplience-service.test.ts`

**Important**: Follow the project's kebab-case naming convention for all test
files.

### Directory Structure Mirroring

Tests must mirror the exact folder structure of the source code, including all
subdirectories.

#### ✅ Correct Structure Examples

```text
src/
├── commands/
│   ├── clean-repository/
│   │   ├── prompts/
│   │   │   ├── prompt-for-include-hierarchy-descendants.ts
│   │   │   ├── prompt-for-include-hierarchy-descendants.test.ts
│   │   │   └── index.ts                                    # ← No test file (barrel export)
│   │   ├── clean-repository.ts
│   │   ├── clean-repository.test.ts
│   │   └── index.ts                                        # ← No test file (barrel export)
│   └── update-delivery-keys-locale/
│       ├── prompts/
│       │   ├── prompt-for-publish-updated-items.ts
│       │   ├── prompt-for-publish-updated-items.test.ts
│       │   └── index.ts                                    # ← No test file (barrel export)
│       ├── update-delivery-keys-locale.ts
│       ├── update-delivery-keys-locale.test.ts
│       ├── utils.ts
│       ├── utils.test.ts
│       └── index.ts                                        # ← No test file (barrel export)
├── services/
│   ├── amplience-service.ts
│   ├── amplience-service.test.ts
│   ├── cache-service.ts
│   ├── cache-service.test.ts
│   ├── report-service.ts
│   ├── report-service.test.ts
│   └── index.ts                                            # ← No test file (barrel export)
├── utils/
│   ├── create-progress-bar.ts
│   ├── create-progress-bar.test.ts
│   ├── display-table.ts
│   ├── display-table.test.ts
│   └── index.ts                                            # ← No test file (barrel export)
└── prompts/
    ├── prompt-for-hub.ts
    ├── prompt-for-hub.test.ts
    ├── prompt-for-repository.ts
    ├── prompt-for-repository.test.ts
    └── index.ts                                            # ← No test file (barrel export)
```

#### ❌ Incorrect Structure Examples

```text
# Wrong - centralized test directory
tests/
├── commands/
│   └── clean-repository.test.ts
├── services/
│   └── amplience-service.test.ts
└── utils/
    └── create-progress-bar.test.ts

# Wrong - not mirroring subfolder structure
src/commands/clean-repository/
├── prompts/
│   └── prompt-for-include-hierarchy-descendants.ts
├── clean-repository.ts
├── clean-repository.test.ts
└── prompt-for-include-hierarchy-descendants.test.ts        # ← Should be in prompts/ folder
```

## What to Test vs. What Not to Test

### ✅ DO Test

- **Business logic functions**: Core functionality and algorithms
- **Service classes**: API interactions, data transformations
- **Utility functions**: Helper functions with logic
- **Command handlers**: Main command execution logic
- **Prompt functions**: User interaction logic
- **Error handling**: Exception scenarios and edge cases
- **Data validation**: Input/output validation logic

### ❌ DON'T Test

- **Barrel export files** (`index.ts` files): These are simple re-exports
- **Type definitions**: TypeScript interfaces and types
- **Configuration files**: Static configuration objects
- **Third-party library integrations**: Unless adding custom logic

## Test Types and Placement

### Unit Tests

**Placement**: Always co-located with source files **Purpose**: Test individual
functions, classes, or modules in isolation **Naming**:
`{source-filename}.test.ts`

```typescript
// Example: src/services/amplience-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AmplienceService } from './amplience-service';

describe('AmplienceService', () => {
  it('should authenticate with valid credentials', () => {
    // Test implementation
  });
});
```

### Integration Tests

**Placement**: Flexible - can be co-located or organized separately **Purpose**:
Test interaction between multiple components **Naming Options**:

- Co-located: `{source-filename}.integration.test.ts`
- Separate: `tests/integration/{feature-name}.test.ts`

**Decision Criteria**:

- **Co-locate** when testing closely related components within the same module
- **Separate** when testing cross-module interactions or complex workflows

```typescript
// Example: Co-located integration test
// src/commands/clean-repository/clean-repository.integration.test.ts

// Example: Separate integration test
// tests/integration/content-item-workflow.test.ts
```

## Vitest Configuration

The project uses a dual-pattern approach to support both existing and new test
structures:

```typescript
// vitest.config.ts
include: [
  'tests/**/*.{test,spec}.{js,ts}', // Existing centralized tests
  'src/**/*.{test,spec}.{js,ts}', // New co-located tests
];
```

### Path Aliases in Tests

Use the configured path aliases for cleaner imports:

```typescript
// ✅ Good - using path alias
import { AmplienceService } from '~/services/amplience-service';
import { createProgressBar } from '~/utils/create-progress-bar';

// ❌ Avoid - relative imports
import { AmplienceService } from '../../../services/amplience-service';
```

## Testing Patterns and Best Practices

### Test Structure

Follow the **Arrange-Act-Assert** pattern:

```typescript
describe('FeatureName', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test-value';
    const expectedOutput = 'expected-result';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expectedOutput);
  });
});
```

### Mocking External Dependencies

Use Vitest's built-in mocking capabilities:

```typescript
import { vi } from 'vitest';

// Mock external modules
vi.mock('~/services/amplience-service', () => ({
  AmplienceService: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue(true),
  })),
}));

// Mock dotenv to prevent loading from .env files during testing
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));
```

**Important**: When testing code that uses `dotenv`, always mock it to prevent
loading from actual `.env` files. This ensures test isolation and prevents
environment variable pollution between tests.

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  // Arrange
  const service = new AmplienceService();

  // Act
  const result = await service.fetchContentItems();

  // Assert
  expect(result).toBeDefined();
});
```

## Running Tests

### Available Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Coverage Requirements

- **Exclude from coverage**: `node_modules/`, `tests/`, `dist/`, `reports/`,
  barrel export files (`**/index.ts`)
- **Target coverage**: Aim for high coverage on business logic and core
  functionality
- **Coverage reports**: Generated in HTML, JSON, and text formats

## Migration Strategy

### Existing Tests

- **Current location**: `tests/` directory
- **Action**: Leave existing tests in place - no immediate migration required
- **Future**: Gradual migration can be planned separately

### New Tests

- **All new tests**: Must follow co-location guidelines
- **No exceptions**: Every new source file should have a corresponding test file
  (except barrel exports)

## Examples by File Type

### Service Class Test

```typescript
// src/services/cache-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService } from './cache-service';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  it('should store and retrieve values', () => {
    const key = 'test-key';
    const value = { data: 'test' };

    cacheService.set(key, value);
    const result = cacheService.get(key);

    expect(result).toEqual(value);
  });
});
```

### Utility Function Test

```typescript
// src/utils/display-table.test.ts
import { describe, it, expect } from 'vitest';
import { displayTable } from './display-table';

describe('displayTable', () => {
  it('should format data into table structure', () => {
    const data = [{ name: 'Test', value: 123 }];
    const result = displayTable(data);

    expect(result).toContain('name');
    expect(result).toContain('Test');
  });
});
```

### Command Test

```typescript
// src/commands/clean-repository/clean-repository.test.ts
import { describe, it, expect, vi } from 'vitest';
import { cleanRepository } from './clean-repository';

describe('cleanRepository', () => {
  it('should execute cleanup with proper filters', async () => {
    // Test implementation
  });
});
```

## AI Agent Instructions

When creating tests for this project:

1. **Always check if the file is a barrel export** (`index.ts` with only
   re-exports) - if so, skip test creation
2. **Place test files in the exact same directory** as the source file being
   tested
3. **Use the `.test.ts` suffix** following the kebab-case naming convention
4. **Mirror the complete folder structure** including all subdirectories
5. **Focus on business logic and core functionality** rather than trivial code
6. **Use path aliases** (`~/`) for imports in test files
7. **Follow the Arrange-Act-Assert pattern** for test structure
8. **Mock external dependencies** appropriately using Vitest's mocking system

## Validation Checklist

Before submitting any test file:

- [ ] Test file is co-located with source file
- [ ] File name follows `{source-name}.test.ts` convention
- [ ] Directory structure exactly mirrors source structure
- [ ] No test file created for barrel exports (`index.ts`)
- [ ] Uses path aliases for imports
- [ ] Includes proper describe/it blocks
- [ ] Tests meaningful functionality, not trivial code
- [ ] Mocks external dependencies where appropriate
- [ ] Follows project's TypeScript and ESLint conventions
