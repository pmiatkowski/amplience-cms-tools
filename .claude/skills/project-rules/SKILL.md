---
name: project-rules
description: |
  Manage coding guidelines and CLAUDE.md rules. Use when the user wants to
  add, change, delete, analyze, or discover coding conventions. Triggers
  include: "add rule", "coding guidelines", "convention", "CLAUDE.md",
  "coding standard", "project rules", "discover patterns".
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# Rules Skill

Manage Claude Code coding guidelines stored in CLAUDE.md files.

## Memory Hierarchy

When modifying rules, understand the target location:

| Priority | Location | Scope | Path |
|----------|----------|-------|------|
| 1 (highest) | Enterprise Policy | All users, all projects | `/etc/claude-code/CLAUDE.md` or `C:\ProgramData\ClaudeCode\CLAUDE.md` |
| 2 | Project Memory | All users, this project | `./CLAUDE.md` |
| 3 | User Memory | Current user, all projects | `~/.claude/CLAUDE.md` |
| 4 (lowest) | Project Memory Local | Current user, this project | `./CLAUDE.local.md` (deprecated) |

**Default assumption**: Unless specified otherwise, modify `./CLAUDE.md` (project memory).

## Actions

### ADD Rules

Add new rules to a CLAUDE.md file.

**Input sources:**

1. From file: User provides path to file containing rules
2. From text: User provides rule text directly
3. From discovery: Generated from codebase scan (see DISCOVER)

**Process:**

1. Determine target CLAUDE.md file (ask if unclear)
2. Read existing content to understand structure
3. Parse new rules and categorize them
4. Find appropriate section or create new one
5. Format rules according to template (see references/RULE_TEMPLATE.md)
6. Insert maintaining markdown structure
7. Consider using `@import` for large rule sets

**Example insertion:**

```markdown
## Code Style

- Use 2-space indentation for all files
- Use single quotes for strings in JavaScript/TypeScript
- Add trailing commas in multiline structures
```

### CHANGE Rules

Modify existing rules in a CLAUDE.md file.

**Process:**

1. Search CLAUDE.md for rules matching the query using Grep/Read
2. Present all matching rules with context (section, surrounding rules)
3. Ask user to confirm which rule(s) to modify
4. Accept the modification (full replacement or guided edit)
5. Apply change preserving formatting and structure

**Matching strategies:**

- Exact section name match
- Keyword search within rule text
- Fuzzy match for partial queries

**Example:**

```
User: /rules change indentation
Found in section "Code Style":
  "- Use tabs for indentation"
Change to: "- Use 2-space indentation"
```

### DELETE Rules

Remove rules from a CLAUDE.md file.

**Process:**

1. Search CLAUDE.md for rules matching the query
2. Present all matching rules with context
3. Ask user to confirm deletion
4. Remove rule cleanly
5. If section becomes empty, ask whether to remove section
6. Clean up any orphaned `@import` references

**Example:**

```
User: /rules delete jquery
Found in section "Dependencies":
  "- Use jQuery for DOM manipulation"
Delete this rule? [Y/n]
```

### ANALYZE Rules

Analyze current CLAUDE.md rules for quality issues.

**Analysis dimensions:**

1. **Coverage** - What aspects of development are covered?
   - Code style, naming, file organization, error handling, testing, security, performance, documentation, dependencies, git

2. **Conflicts** - Are there contradictory rules?
   - Example: "Use tabs" vs "Use 2-space indentation"

3. **Redundancy** - Duplicate or overlapping rules?

4. **Specificity** - Are rules actionable?
   - Vague: "Follow best practices", "Write clean code"
   - Specific: "Use 2-space indentation", "Name components with PascalCase"

5. **Organization** - Is the structure logical?
   - Consistent heading levels
   - Logical grouping
   - Appropriate section ordering

**Output format:**

```markdown
# Rules Analysis Report

**Target:** ./CLAUDE.md
**Date:** <date>
**Score:** X/10

## Coverage Summary
| Category | Rules | Gaps |
|----------|-------|------|
| Code Style | 5 | - |
| Testing | 2 | Missing: test naming, coverage threshold |
| ... | ... | ... |

## Issues Found
| # | Type | Location | Issue | Recommendation |
|---|------|----------|-------|----------------|
| 1 | VAGUE | Style | "Follow best practices" | Be specific: define what practices |
| 2 | CONFLICT | Formatting | Conflicting indent rules | Consolidate to one rule |

## Suggestions
1. Add testing naming convention rule
2. Specify error handling patterns
3. Remove redundant "clean code" rule
```

### DISCOVER Rules

Scan codebase to discover existing conventions and suggest rules.

**Discovery process:**

1. **Detect Tech Stack**
   - Check for: package.json, Cargo.toml, pyproject.toml, go.mod, etc.
   - Identify frameworks: React, Vue, Django, Rails, etc.
   - Identify test frameworks: Jest, pytest, Go test, etc.

2. **Analyze File Naming**
   - Use Glob to find patterns: `*.tsx`, `*.test.ts`, `*.spec.js`, `test_*.py`
   - Detect conventions: PascalCase, camelCase, kebab-case
   - Identify suffixes: .test, .spec, .module, .config

3. **Analyze Directory Structure**
   - Common directories: src/, lib/, components/, hooks/, utils/
   - Colocation patterns (tests next to source vs separate)

4. **Analyze Code Patterns**
   - Use Grep to find import patterns
   - Detect export patterns (named vs default)
   - Identify comment conventions
   - Find error handling patterns

5. **Check Existing Configs**
   - Linting: .eslintrc, ruff.toml, clippy.toml
   - Formatting: .prettierrc, .editorconfig
   - CI/CD: .github/workflows/, .gitlab-ci.yml

**Output format:**

```markdown
# Discovered Conventions

## Tech Stack
- **Language:** TypeScript
- **Framework:** React
- **Testing:** Jest + React Testing Library
- **Build:** Vite

## File Naming Patterns
| Type | Pattern | Examples |
|------|---------|----------|
| Components | PascalCase.tsx | Button.tsx, UserProfile.tsx |
| Tests | *.test.tsx | Button.test.tsx |
| Utilities | camelCase.ts | formatDate.ts |
| Styles | *.module.css | Button.module.css |

## Directory Structure
- `src/components/` - React components
- `src/hooks/` - Custom hooks
- `src/lib/` - Utility functions
- `src/__tests__/` - Test files

## Import Patterns
- Path alias: `@/` for src/
- Named exports preferred for utilities
- Default exports for page components

## Existing Configs
- ESLint: .eslintrc.json (airbnb base)
- Prettier: .prettierrc (2 spaces, single quotes)
- TypeScript: strict mode enabled

## Suggested Rules

### Code Style
- Use 2-space indentation (from Prettier config)
- Use single quotes for strings (from Prettier config)
- Use path alias `@/` for imports from src/

### Naming Conventions
- Components: PascalCase.tsx
- Test files: colocated with source, *.test.tsx suffix
- Utilities: camelCase.ts

### Architecture
- Components in src/components/
- Custom hooks in src/hooks/
- Utilities in src/lib/

### Testing
- Use Jest + React Testing Library
- Test files colocated with source files

---
Add these rules to CLAUDE.md? [all/selective/none]
```

## Reference Files

- `references/RULE_TEMPLATE.md` - Template for writing rules
- `references/DISCOVERY_PATTERNS.md` - Detailed discovery patterns
- `references/MEMORY_HIERARCHY.md` - CLAUDE.md hierarchy reference

## Best Practices

1. **Be Specific**: "Use 2-space indentation" > "Format code properly"
2. **Use Structure**: Organize with markdown headings and bullet points
3. **Provide Examples**: Include code examples for complex rules
4. **Keep Current**: Review and update rules as project evolves
5. **Use Imports**: For large rule sets, use `@path/to/import` syntax
6. **Avoid Redundancy**: Don't duplicate rules across sections
7. **One Concept Per Rule**: Keep rules focused and atomic
