# Quality Verification Rules

These rules are checked by task-verificator in deep mode.

## Code Quality

### Readability
- [ ] Functions are small (< 50 lines)
- [ ] Descriptive naming conventions
- [ ] No magic numbers (use constants)
- [ ] Comments explain "why", not "what"

### Complexity
- [ ] Cyclomatic complexity < 10 per function
- [ ] Nesting depth < 4 levels
- [ ] No deeply nested conditionals
- [ ] Early returns to reduce nesting

### Duplication
- [ ] No copy-pasted code blocks
- [ ] DRY principle followed
- [ ] Shared logic extracted to utilities
- [ ] Similar code patterns consolidated

### Dead Code
- [ ] No unused imports
- [ ] No unused variables
- [ ] No commented-out code
- [ ] No unreachable code

## Testing

### Coverage
- [ ] Unit test coverage > 80%
- [ ] Critical paths have integration tests
- [ ] Edge cases tested
- [ ] Error paths tested

### Test Quality
- [ ] Tests are independent
- [ ] Tests are deterministic
- [ ] Clear test names (describe expected behavior)
- [ ] No test interdependencies

### Test Patterns
- [ ] Arrange-Act-Assert pattern
- [ ] Given-When-Then for BDD
- [ ] Mocks used appropriately
- [ ] No overspecified tests

## Error Handling

### Graceful Degradation
- [ ] Errors caught and handled
- [ ] User-friendly error messages
- [ ] Fallback behavior defined
- [ ] No unhandled promise rejections

### Logging
- [ ] Errors logged with context
- [ ] Log levels used correctly
- [ ] No sensitive data in logs
- [ ] Structured logging format

### Validation
- [ ] Input validation at boundaries
- [ ] Type validation for APIs
- [ ] Schema validation for configs
- [ ] Early validation (fail fast)

## Documentation

### Code Documentation
- [ ] Public APIs documented
- [ ] Complex logic explained
- [ ] Type annotations present (TypeScript)
- [ ] JSDoc for public functions

### README
- [ ] Setup instructions clear
- [ ] Dependencies listed
- [ ] Scripts documented
- [ ] Environment variables listed

### Architecture
- [ ] Architecture decisions recorded (ADRs)
- [ ] System diagrams up to date
- [ ] API documentation current
- [ ] Change log maintained

## Maintainability

### Modularity
- [ ] Single responsibility principle
- [ ] Low coupling between modules
- [ ] High cohesion within modules
- [ ] Clear module boundaries

### Extensibility
- [ ] Open for extension
- [ ] Plugin/strategy patterns used
- [ ] Configuration over hardcoding
- [ ] Feature flags for new features

### Dependency Management
- [ ] Minimal dependencies
- [ ] Dependencies justified
- [ ] No duplicate functionality
- [ ] Lock files committed

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| CRITICAL | Blocks release | BLOCK - Fix immediately |
| HIGH | Significant quality issue | BLOCK - Fix before merge |
| MEDIUM | Quality concern | WARN - Fix in current sprint |
| LOW | Minor improvement | INFO - Address when possible |

## Quality Commands

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Test coverage
npm run test -- --coverage

# Complexity analysis
npx escomplex .

# Duplicate detection
npx jscpd src/
```
