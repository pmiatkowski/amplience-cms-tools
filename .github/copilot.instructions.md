---
applyTo: '**'
---

# AI Rules for Amplience CLI Tool

A Node.js command-line application designed to automate bulk operations within
the Amplience CMS, addressing the need for efficient content management that is
not available through the standard UI. The initial version (MVP) focuses on bulk
updating the `deliveryKey` of content items based on a rich set of filters,
featuring interactive CLI interface, advanced filtering options, safe dryRun
mode by default, and detailed Markdown reporting.

## CODING_PRACTICES

### Guidelines for SUPPORT_LEVEL

#### SUPPORT_EXPERT

- Favor elegant, maintainable solutions over verbose code. Assume understanding
  of language idioms and design patterns.
- Highlight potential performance implications and optimization opportunities in
  suggested code.
- Frame solutions within broader architectural contexts and suggest design
  alternatives when appropriate.
- Focus comments on 'why' not 'what' - assume code readability through
  well-named functions and variables.
- Proactively address edge cases, race conditions, and security considerations
  without being prompted.
- When debugging, provide targeted diagnostic approaches rather than shotgun
  solutions.
- Suggest comprehensive testing strategies rather than just example tests,
  including considerations for mocking, test organization, and coverage.
-

### Guidelines for DOCUMENTATION

#### JSDOC

- Document all functions, classes, and methods with consistent JSDoc comments
- Use @param tags to document function behavior comprehensively
- Implement @example tags with realistic usage scenarios for Amplience API
  interactions and complex CLI operations
- Do not use @returns or @throws tags to avoid duplication from typescript
- Use @typedef for documenting complex object structures when not using
  TypeScript
- Configure documentation generation as part of the build process to keep docs
  current
- Implement custom templates to match kebab-case file naming and TypeScript path
  alias conventions

### Guidelines for PROJECT_STRUCTURE

#### BARREL_EXPORTS

- Create index.ts barrel files in each directory containing multiple modules to
  re-export all public APIs
- Use barrel exports to simplify imports and create clean grouped imports from
  related modules
- Place barrel files in directories that export modules
- Prefer grouped imports over multiple individual import statements when
  importing from the same barrel
- Example:
  `import { AmplienceService, CacheService, ReportService } from '~/services'`
  instead of separate imports
- Configure TypeScript path aliases (`~/*` → `src/*`) to enable clean imports
  without relative paths
- Use barrel exports to hide internal module complexity and expose only the
  intended public interface

### Guidelines for VERSION_CONTROL

#### GIT

- Use conventional commits to create meaningful commit messages
- Use feature branches with descriptive names following feat/feature-name or
  fix/issue-description convention
- Write meaningful commit messages that explain why changes were made, not just
  what
- Keep commits focused on single logical changes to facilitate code review and
  bisection
- Use interactive rebase to clean up history before merging feature branches
- Leverage git hooks to enforce code quality checks before commits and pushes

### Guidelines for TESTING

#### TEST_ORGANIZATION

- **Co-locate all unit tests** with their source files - Place test files
  directly next to the file being tested in the same directory
- **Follow naming convention** - Use `{source-filename}.test.ts` pattern with
  kebab-case naming to match project conventions
- **Mirror directory structure** - Tests must mirror the exact folder structure
  of source code, including all subdirectories
- **Skip barrel exports** - Do not create test files for `index.ts` barrel
  export files that only contain re-exports
- **Use path aliases** - Import using configured path aliases (`~/`) instead of
  relative imports for cleaner, more maintainable test code

#### TEST_SCOPE

- **DO test business logic** - Core functionality, algorithms, service classes,
  utility functions, command handlers, prompt functions, error handling, and
  data validation logic
- **DON'T test trivial code** - Skip barrel export files, type definitions,
  static configuration objects, and third-party library integrations unless
  adding custom logic
- **Focus on meaningful coverage** - Aim for high coverage on business logic and
  core functionality rather than arbitrary coverage percentages

#### VITEST_PATTERNS

- **Leverage the `vi` object for test doubles** - Use `vi.fn()` for function
  mocks, `vi.spyOn()` to monitor existing functions, and `vi.stubGlobal()` for
  global mocks. Prefer spies over mocks when you only need to verify
  interactions without changing behavior
- **Master `vi.mock()` factory patterns** - Place mock factory functions at the
  top level of your test file, return typed mock implementations, and use
  `mockImplementation()` or `mockReturnValue()` for dynamic control during
  tests. Remember the factory runs before imports are processed
- **Mock dotenv for environment variable testing** - When testing code that uses
  dotenv, always mock it to prevent loading from actual .env files:
  `vi.mock('dotenv', () => ({ config: vi.fn() }))`. This ensures test isolation
  and prevents environment variable pollution between tests
- **Follow Arrange-Act-Assert pattern** - Structure tests with clear phases:
  setup test data (Arrange), execute the function under test (Act), verify
  results (Assert)
- **Use descriptive test organization** - Group related tests with descriptive
  `describe` blocks, write explicit assertion messages, and make tests
  self-documenting
- **Handle async operations properly** - Use `async/await` for testing
  asynchronous functions and ensure proper error handling in test scenarios
- **Create setup files for reusable configuration** - Define global mocks,
  custom matchers, and environment setup in dedicated files referenced in
  `vitest.config.ts` to keep test files clean
- **Use inline snapshots for readable assertions** - Replace complex equality
  checks with `expect(value).toMatchInlineSnapshot()` to capture expected output
  directly in test files, making changes more visible in code reviews
- **Leverage TypeScript type checking in tests** - Enable strict typing in tests
  to catch type errors early, use `expectTypeOf()` for type-level assertions,
  and ensure mocks preserve original type signatures

#### TEST_WORKFLOW

- **Make watch mode part of development** - Run `vitest --watch` during
  development for instant feedback as you modify code, filtering tests with `-t`
  to focus on specific areas under development
- **Explore UI mode for complex test suites** - Use `vitest --ui` to visually
  navigate large test suites, inspect test results, and debug failures more
  efficiently during development
- **Handle optional dependencies with smart mocking** - Use conditional mocking
  to test code with optional dependencies by implementing `vi.mock()` with the
  factory pattern for modules that might not be available in all environments
