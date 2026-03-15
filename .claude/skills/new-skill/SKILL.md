---
name: new-skill
description: Create new Claude Code skills (local or global) from provided resources, URLs, or descriptions. Use when user wants to build, generate, or create a new skill.
argument-hint: <skill-name> [url|file|description]
disable-model-invocation: true
---

# New Skill Builder

Create a new Claude Code skill based on provided resources.

## Usage

```
/new-skill <skill-name> [resource]
```

**Resources can be:**
- URL to documentation/guide
- Path to local file(s)
- Direct description of what the skill should do
- Comma-separated list of multiple resources

**Examples:**
```
/new-skill git-workflow https://docs.example.com/git-guide
/new-skill code-review ./docs/review-checklist.md
/new-skill commit-msg skill for writing conventional commit messages
/new-skill api-client api.md, auth.md, examples.md
```

## Process

### 1. Analyze Input

If resource is a **URL**:
- Fetch and analyze the content
- Extract key concepts, patterns, and instructions

If resource is a **file path**:
- Read the file(s) provided
- Extract relevant instructions and patterns

If resource is a **description**:
- Parse the intent and requirements
- Ask clarifying questions if needed

If **no resource provided**:
- Ask what the skill should do
- Offer to research documentation if applicable

### 2. Determine Scope

Ask the user:
> **Where should this skill live?**
> - `local` → `.claude/skills/<skill-name>/` (project-specific)
> - `global` → `~/.claude/skills/<skill-name>/` (all projects)

Default to `local` unless user specifies otherwise.

### 3. Design the Skill

Based on the resource, determine:

**Skill Type:**
- **Reference** - Background knowledge Claude applies inline (no `disable-model-invocation`)
- **Task** - Step-by-step action workflow (`disable-model-invocation: true`)

**Frontmatter Settings:**
```yaml
name: <skill-name>           # Lowercase, hyphens only
description: <when to use>   # Clear trigger description
argument-hint: [args]        # If skill takes arguments
disable-model-invocation: true/false  # Based on skill type
user-invocable: true/false   # Usually true
allowed-tools: <tools>       # If restricted tool access needed
context: fork                # If should run in subagent
agent: Explore|Plan|general-purpose  # If context: fork
```

**Content Structure:**
- Clear objective at the top
- Step-by-step instructions
- Examples where helpful
- Reference to supporting files if complex

### 4. Generate SKILL.md

Create a complete, well-structured SKILL.md:

```markdown
---
name: <skill-name>
description: <clear description of what this skill does and when Claude should use it>
argument-hint: <optional argument hint>
<other frontmatter>
---

# <Skill Title>

<Brief introduction>

## Usage

<How to invoke and use>

## Instructions

<Main skill content - instructions for Claude>

## Examples

<Optional examples>

## Notes

<Optional additional context>
```

### 5. Supporting Files (if needed)

If the skill is complex (>500 lines potential):
- Create separate files for detailed content
- Reference them from SKILL.md with relative links
- Common supporting files:
  - `reference.md` - Detailed documentation
  - `examples.md` - Usage examples
  - `templates/` - Template files
  - `scripts/` - Executable scripts

### 6. Create the Skill

Write the files to the appropriate location:

**Local:** `.claude/skills/<skill-name>/SKILL.md`
**Global:** `~/.claude/skills/<skill-name>/SKILL.md`

### 7. Verify and Test

After creation:
1. Show the generated skill content
2. Explain how to test it:
   - Direct: `/<skill-name>`
   - Auto: Ask something matching the description
3. Remind about `/context` to verify skill is loaded

## Frontmatter Decision Guide

| Use Case | Settings |
|----------|----------|
| Workflow user controls (deploy, commit) | `disable-model-invocation: true` |
| Background knowledge | `user-invocable: false` |
| Read-only exploration | `allowed-tools: Read, Grep, Glob` |
| Research in isolation | `context: fork`, `agent: Explore` |
| Takes arguments | Add `argument-hint`, use `$ARGUMENTS` |

## String Substitutions

Use these in skill content:
- `$ARGUMENTS` - All arguments passed
- `$0`, `$1`, `$2` - Individual arguments by position
- `${CLAUDE_SKILL_DIR}` - Path to skill directory
- `${CLAUDE_SESSION_ID}` - Current session ID

## Quality Checklist

Before finalizing, ensure:

- [ ] `name` is lowercase with hyphens only (max 64 chars)
- [ ] `description` clearly states when Claude should use this skill
- [ ] Skill content is actionable and specific
- [ ] SKILL.md is under 500 lines (split if larger)
- [ ] Examples are provided for complex skills
- [ ] Arguments are documented if skill accepts them

---

**Now tell me:**
1. What is the skill name?
2. What resource should I use (URL, file, or description)?
3. Local or global scope?
