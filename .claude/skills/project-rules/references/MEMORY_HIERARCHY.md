# CLAUDE.md Memory Hierarchy Reference

## Hierarchy Overview

Claude Code loads memory from multiple sources in priority order. Higher priority sources override conflicting rules from lower priority sources.

```
┌─────────────────────────────────────┐
│     1. Enterprise Policy            │  ← Highest Priority
│   /etc/claude-code/CLAUDE.md        │
│   C:\ProgramData\ClaudeCode\CLAUDE.md│
├─────────────────────────────────────┤
│     2. Project Memory               │
│        ./CLAUDE.md                  │     ← Default for rules
├─────────────────────────────────────┤
│     3. User Memory                  │
│     ~/.claude/CLAUDE.md             │
├─────────────────────────────────────┤
│     4. Project Memory Local         │  ← Deprecated
│        ./CLAUDE.local.md            │     ← Lowest Priority
└─────────────────────────────────────┘
```

## When to Use Each Level

### Enterprise Policy
- **Scope:** All users, all projects on the machine
- **Use for:** Company-wide coding standards, security policies, compliance rules
- **Edited by:** System administrators only
- **Example rules:**
  - "Never commit secrets or credentials"
  - "All code must pass security scan before merge"
  - "Use approved library versions only"

### Project Memory (./CLAUDE.md)
- **Scope:** All users working on this project
- **Use for:** Project-specific conventions, architecture decisions, team standards
- **Edited by:** Anyone with write access to the repo
- **Shared via:** Git (checked into repository)
- **Example rules:**
  - "Use React with TypeScript"
  - "Tests go in __tests__ directory"
  - "API routes follow RESTful conventions"

### User Memory (~/.claude/CLAUDE.md)
- **Scope:** Current user, all projects
- **Use for:** Personal preferences, individual workflow, preferred tools
- **Edited by:** The user only
- **Not shared:** Lives in home directory
- **Example rules:**
  - "Prefer functional components over class components"
  - "Always add JSDoc comments to public functions"
  - "Use descriptive variable names (no single letters except loops)"

### Project Memory Local (./CLAUDE.local.md)
- **Status:** Deprecated - avoid using
- **Use instead:** Use `@import` syntax to include local overrides

## Import Syntax

Use `@path/to/import` to include additional files. This enables modular organization.

### Syntax

```markdown
# Project Memory

@~/.claude/personal-preferences.md
@./docs/ai-guidelines.md
@./.claude/rules/testing.md
```

### Import Resolution

- `@~/.claude/...` - Resolves to user's home directory
- `@./...` - Resolves relative to CLAUDE.md location
- `@/absolute/path/...` - Resolves to absolute path

### Best Practices for Imports

1. **Group related rules** in separate files
2. **Keep main CLAUDE.md concise** - use it as an index
3. **Use descriptive filenames** - `testing.md`, `security.md`, `api.md`
4. **Avoid deep nesting** - one level of imports is usually enough

### Example Structure

```
project/
├── CLAUDE.md                    # Main file with imports
└── .claude/
    └── rules/
        ├── code-style.md        # Formatting rules
        ├── testing.md           # Testing conventions
        ├── architecture.md      # Architecture decisions
        └── security.md          # Security guidelines
```

Main CLAUDE.md:
```markdown
# Project Memory

## Overview
Brief project description and key conventions.

## Rules
@./.claude/rules/code-style.md
@./.claude/rules/testing.md
@./.claude/rules/architecture.md
@./.claude/rules/security.md
```

## Decision Flow for Rule Placement

```
User wants to add a rule
         │
         ▼
┌────────────────────────┐
│ Is it a company-wide   │──Yes──▶ Enterprise Policy
│ security/compliance    │
│ requirement?           │
└────────────────────────┘
         │ No
         ▼
┌────────────────────────┐
│ Should all team        │──Yes──▶ Project Memory (./CLAUDE.md)
│ members follow this    │         or imported file
│ on this project?       │
└────────────────────────┘
         │ No
         ▼
┌────────────────────────┐
│ Is this a personal     │──Yes──▶ User Memory (~/.claude/CLAUDE.md)
│ preference that        │
│ applies to all         │
│ projects?              │
└────────────────────────┘
         │ No
         ▼
    Project Memory
    (team-specific)
```

## Merging Behavior

When multiple CLAUDE.md files exist, Claude Code merges them:

1. **Conflicting rules**: Higher priority wins
2. **Non-conflicting rules**: All are included
3. **Section merging**: Sections with same name are combined

Example:
- Enterprise: "Use 4-space indentation"
- Project: "Use 2-space indentation"
- **Result**: Uses 2-space indentation (project overrides enterprise for this project)

## Common Patterns

### Pattern 1: Simple Project
Just use `./CLAUDE.md` with everything inline.

### Pattern 2: Modular Project
Use `./CLAUDE.md` as index with `@imports` for categories.

### Pattern 3: Personal + Team
- `./CLAUDE.md` for team rules
- `~/.claude/CLAUDE.md` for personal preferences
- Use `@~/.claude/CLAUDE.md` import in project if needed

### Pattern 4: Enterprise + Project
- Enterprise CLAUDE.md for company policies
- `./CLAUDE.md` for project-specific rules
- Project rules override enterprise when conflicting
