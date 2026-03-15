# Rule Template Reference

## Rule Structure

### Basic Rule (Bullet Point)

```markdown
## Category Name

- Use clear, actionable statement
- Another rule in same category
```

### Rule with Rationale

```markdown
## Category Name

- **Rule:** Use named exports for all components
- **Why:** Named exports enable better tree-shaking and IDE autocompletion
```

### Rule with Example

```markdown
## Category Name

- Use named exports for components

  ```typescript
  // Good
  export function Button({ children }) { ... }

  // Avoid
  export default function Button({ children }) { ... }
  ```
```

### Rule with Constraints

```markdown
## Error Handling

- Always handle errors in async operations
  - Log errors with context
  - Return meaningful error messages to users
  - Never expose internal details in error messages
```

## Standard Categories

Organize rules under these standard categories:

1. **Code Style** - Formatting, indentation, quotes, semicolons
2. **Naming Conventions** - File, function, variable, component naming
3. **File Organization** - Directory structure, file placement
4. **Error Handling** - Try/catch, error logging, user messages
5. **Testing** - Test structure, naming, coverage
6. **Security** - Input validation, sanitization, auth
7. **Performance** - Optimization, lazy loading, caching
8. **Documentation** - Comments, README, API docs
9. **Dependencies** - Package management, version pinning
10. **Git/Version Control** - Commit messages, branch naming

## Rule Quality Checklist

Before adding a rule, verify:

- [ ] **Specific** - Is it actionable? (Not "write clean code")
- [ ] **Justified** - Is there a reason this rule exists?
- [ ] **Consistent** - Does it conflict with existing rules?
- [ ] **Scopable** - Is it clear when the rule applies?
- [ ] **Enforceable** - Can it be verified programmatically or by review?

## Vague vs Specific Examples

| Vague (Avoid) | Specific (Use) |
|---------------|----------------|
| Follow best practices | Use React Testing Library for component tests |
| Write clean code | Functions should be under 50 lines |
| Handle errors properly | Wrap async operations in try/catch, log to console.error |
| Use good naming | Use camelCase for variables, PascalCase for components |
| Format code correctly | Use 2-space indentation, single quotes for strings |

## Using Imports for Large Rule Sets

When rules become extensive, split into separate files:

```markdown
# Project Memory

@./.claude/rules/code-style.md
@./.claude/rules/testing.md
@./.claude/rules/security.md
```

This keeps CLAUDE.md readable and allows focused updates.
