# Coding Instructions

> **Last Updated**: 2026-01-05
> **Maintained By**: Development Team

---

## General Coding Approach

### Development Methodology

We follow Test-Driven Development (TDD). Tests are written before implementation to ensure comprehensive coverage and enable confident refactoring.

**Testing Strategy**:

- Focus on business logic, integration points, and critical paths
- Prefer meaningful tests over coverage metrics
- E2E tests for key user workflows
- Co-locate unit tests with source files using `{filename}.test.ts` pattern

**Testing Tools**:

- Vitest for unit tests with v8 coverage provider
- Node environment for testing
- Path aliases (`~/` → `src/`) for clean test imports

### Architectural Principles

We follow pragmatic architectural principles focused on simplicity and maintainability.

**Key principles we follow:**

- Don't Repeat Yourself (DRY) - extract common patterns
- Keep It Simple, Stupid (KISS) - prefer simple solutions
- You Aren't Gonna Need It (YAGNI) - avoid premature optimization
- Composition over inheritance

**Anti-patterns to avoid:**

- Avoid default exports - use named exports for better refactoring and discoverability
- Avoid exporting types from specific modules or components - use ambient declarations and global namespaces in `./types` folder for shared types
- Avoid deep nesting - keep modules organized with clear utils/services/helpers structure
- Avoid multiple functions per file - stick to one file, one function rule where practical

### Code Review Standards

Code reviews are optional but encouraged for complex changes.

**Review requirements:**

- Self-review before merging
- Ask for reviews on complex or risky changes
- Trust-based approach prioritizing velocity

### Documentation Standards

We document public interfaces and maintain essential guides.

**Documentation expectations:**

- Public APIs and exported functions documented with JSDoc
- Use `@param` tags to document function behavior comprehensively
- Implement `@example` tags with realistic usage scenarios for Amplience API interactions
- Do not use `@returns` or `@throws` tags to avoid duplication from TypeScript
- README with setup, usage, and contribution guidelines
- Self-documenting code preferred over excessive comments
- Comments for non-obvious decisions or workarounds
- Focus comments on 'why' not 'what'

---

## Additional Standards

### Coding Conventions

**File Naming & Organization:**

- Use kebab-case for all filenames (e.g., `amplience-service.ts`)
- Organize modules consistently: utils/services/helpers pattern
- Co-locate test files with source code: `{filename}.test.ts`
- Mirror directory structure between source and tests

**Barrel Exports:**

- Create `index.ts` barrel files in directories with multiple modules
- Re-export all public APIs through barrel exports
- Use barrel exports to simplify imports and create clean grouped imports
- Configure TypeScript path aliases (`~/*` → `src/*`) for imports
- Example: `import { AmplienceService, CacheService } from '~/services'`

**Module Structure:**

- Follow the rule: one file, one function (where practical)
- Place interfaces and types at the bottom of files, below all code
- Skip barrel exports for files that only contain re-exports
- Do not create test files for `index.ts` barrel files

**Type Management:**

- Avoid exporting types from specific modules or components
- Use ambient declarations and global namespaces defined in `./types` folder for shared types
- Try to infer types or use utility types to derive types when possible
- Avoid default exports - use named exports only

**Import Preferences:**

- Prefer grouped imports over multiple individual import statements
- Use path aliases (`~/`) instead of relative imports
- Quote variables in shell commands: `"$var"` instead of `$var`

---

## Rule Categories

> **Note**: Category-specific rules are maintained manually. Create subdirectories for each technology category (e.g., `typescript/`, `vitest/`, `git/`) and add rule files as needed.

**To add category rules:**

1. Create directory: `.ai/memory/coding-rules/{category}/`
2. Create category index: `.ai/memory/coding-rules/{category}/index.md`
3. Add individual rule files: `.ai/memory/coding-rules/{category}/{rule-name}.md`
4. Link the category below

### Available Categories

- [Testing Standards](./testing/index.md) - Vitest testing patterns, co-location strategy, and test organization

**Additional categories can be added:**

- [TypeScript Standards](./typescript/index.md) - TypeScript best practices and type safety
- [Git Standards](./git/index.md) - Version control workflows and commit conventions

---

## Usage

These coding instructions are automatically referenced when:

- Creating implementation plans (`/ai.define-implementation-plan`)
- Executing implementation phases (`/ai.execute`)

They are NOT included in PRDs, which focus on _what_ to build rather than _how_.

---

## Updating These Instructions

To update these instructions, run:

```bash
/ai.define-coding-instructions
```

Choose "Update existing" to modify specific sections.
