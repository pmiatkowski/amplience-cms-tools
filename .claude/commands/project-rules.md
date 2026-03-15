# /project-rules

Manage Claude Code coding guidelines (CLAUDE.md rules). Usage: `/rules <action> [args]`

## Actions

| Action | Description | Example |
|--------|-------------|---------|
| `add [file\|text]` | Add new rules from file or inline text | `/rules add path/to/rules.md` or `/rules add Use 2-space indentation` |
| `change <query>` | Modify existing rules matching query | `/rules change indentation` |
| `delete <query>` | Remove rules matching query | `/rules delete jquery` |
| `analyze` | Analyze current rules for quality issues | `/rules analyze` |
| `discover` | Scan codebase to discover conventions and suggest rules | `/rules discover` |

## Steps

1. Parse `$ARGUMENTS` to determine the action:
   - First word is the action (`add`, `change`, `delete`, `analyze`, `discover`)
   - Remainder is the argument (file path, search query, or rule text)

2. Execute the appropriate action using the rules skill.

3. For `add`, `change`, `delete` actions:
   - Ask user which CLAUDE.md to modify if unclear (project vs user)
   - Present a summary of changes before applying

4. For `analyze` and `discover`:
   - Present findings in a structured report
   - Offer to apply suggested changes

## Action Details

### add

- If argument is a file path (exists on disk): read file and extract rules
- If argument is text: treat as rule content directly
- If no argument: ask user for rule text or file path
- Determine appropriate section in CLAUDE.md or create new section
- Use `@import` syntax if the rule set is large

### change

- Search CLAUDE.md for rules matching the query
- Present matching rules to user
- Accept modification (full replacement or guided edit)
- Preserve surrounding structure and formatting

### delete

- Search CLAUDE.md for rules matching the query
- Present matching rules and confirm deletion
- Remove rule while preserving section structure
- Clean up empty sections if they become empty

### analyze

- Read project CLAUDE.md (and user CLAUDE.md if exists)
- Check for: coverage gaps, conflicts, vagueness, organization issues
- Produce structured analysis report with recommendations

### discover

- Scan codebase for conventions using Glob/Grep/Read
- Detect: tech stack, file naming patterns, import patterns, code structure
- Check existing linting/formatting configs
- Produce suggested rules based on discovered patterns
- Offer to add discovered rules to CLAUDE.md

## Reference

This command activates the `rules` skill. See `.claude/skills/rules/` for implementation details.
