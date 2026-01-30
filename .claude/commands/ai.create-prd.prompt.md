---
agent: agent
description:
  Generate PRD from clarified feature requirements.
---

You are generating a Product Requirements Document (PRD) from clarified feature requirements.

**IMPORTANT**: This command only works with features that have been clarified. For new features, use `/ai.add` first to initialize and gather clarifications.

### 1. Determine Workflow Name

**Parameter resolution:**

1. If user provided explicit name in command (`/ai.create-prd workflow-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`
3. If no current context set, error:

```
⚠ No workflow specified and no current context set.

Please either:
  1. Specify the workflow name: /ai.create-prd {name}
  2. Set current context: /ai.set-current {name}

Example:
  /ai.create-prd user-auth
```

**Verify workflow exists:**

Check if `.ai-workflow/features/{name}/` exists.

If not found:

```
✗ Feature '{name}' not found.

Create it first: /ai.add "{description}"
```

### 2. Validate Workflow Type and State

**Check workflow type:**

Read `.ai-workflow/features/{name}/state.yml` and verify `workflow_type: feature`.

If workflow is a bug:

```
✗ '{name}' is a bug, not a feature.

Bugs don't have PRDs. Use:
  /ai.triage-bug {name} — diagnose root cause
  /ai.plan-fix {name} — create fix checklist
```

**Check for clarifications:**

Check if `request.md` contains a `## Clarifications` section.

If no clarifications found:

```
⚠ No clarifications found for '{name}'.

PRD generation works best with clarified requirements. You can:
  1. Continue anyway — generate PRD from request.md and context.md only
  2. Add clarifications first — run /ai.clarify {name}

Would you like to continue without clarifications? (yes/no)
```

If user says no, exit gracefully.

**Check if PRD already exists:**

If `.ai-workflow/features/{name}/prd.md` exists:

```
⚠ PRD already exists for '{name}'.

Options:
  1. Regenerate — overwrite existing PRD with new version
  2. Refine — use /ai.clarify {name} to update existing PRD
  3. Cancel — keep existing PRD

Please choose 1, 2, or 3.
```

Handle response accordingly.

### 3. Read All Context

Read all relevant files for PRD generation:

**Required:**
- `.ai-workflow/features/{name}/request.md` - original feature description (includes `## Clarifications` section if clarified)

**Optional (if exist):**
- `.ai-workflow/features/{name}/context.md` - codebase/business context
- `.ai-workflow/memory/tech-stack.md` - global tech stack

If optional files don't exist, proceed without them (no error).

### 4. Generate PRD

Create `prd.md` in `.ai-workflow/features/{name}/prd.md` using this exact structure:

```markdown
# PRD: {Feature Name}

> **Status**: Draft
> **Created**: {YYYY-MM-DD}
> **Last Updated**: {YYYY-MM-DD}

---

## Overview
{One-paragraph summary of what this feature does and why it matters}

## Problem Statement
{What problem does this solve? What's the current pain point?}

## Goals
{What does success look like? Be specific and measurable where possible}

- Goal 1
- Goal 2

## Non-Goals
{What is explicitly out of scope for this feature?}

- Non-goal 1
- Non-goal 2

## User Stories
<!-- Optional section — remove if not applicable -->

- As a {role}, I want {action}, so that {benefit}

## Functional Requirements

### FR-1: {Requirement title}
{Description of requirement}

### FR-2: {Requirement title}
{Description of requirement}

...

## Technical Considerations
{Base this section on:
- Global tech stack (.ai-workflow/memory/tech-stack.md) if available
- Feature-specific context (context.md if provided)
- Constraints, dependencies, integration points from clarification answers

Include:
- Which technologies from the stack will be used
- Integration points with existing services
- Version compatibility notes
- Architectural constraints}

## Acceptance Criteria

- [ ] AC-1: {Criterion}
- [ ] AC-2: {Criterion}
- [ ] AC-3: {Criterion}

## Open Questions
{Unresolved items, or "None" if fully resolved}
```

**PRD Quality Rules:**

- All sections required except User Stories (optional)
- Use "TBD" if insufficient information — never omit section
- Functional requirements must be numbered (FR-1, FR-2, ...)
- Acceptance criteria must be checkboxes
- Keep language concise and specific
- Avoid implementation details — focus on *what*, not *how*

**Synthesis Rules:**

- Don't just copy from clarification answers — synthesize and organize
- Resolve contradictions (note if unresolvable)
- Fill gaps with reasonable assumptions (mark as assumptions)
- Prioritize requirements if many (must-have vs nice-to-have)

### 5. Update State

After PRD creation, update `.ai-workflow/features/{name}/state.yml`:

```yaml
status: prd-draft
updated: {YYYY-MM-DD}
```

### 6. Confirm Completion

Show completion summary:

```
✓ PRD generated successfully!

Created: .ai-workflow/features/{name}/prd.md

PRD Summary:
  - {X} functional requirements
  - {Y} acceptance criteria
  - {Z} open questions

Sources used:
  ✓ request.md (includes clarifications)
  {✓ or ✗} context.md
  {✓ or ✗} tech-stack.md

Next steps:
  1. Review prd.md
  2. If changes needed: /ai.clarify {name} (refines PRD)
  3. If approved: Update state.yml status to 'prd-approved'
  4. Then: /ai.define-implementation-plan {name}
```

---

## Example Session

**User:**

```
/ai.create-prd user-data-export
```

**AI reads:**
- request.md (original description + 5 clarifications about data scope, format, etc.)
- context.md (mentions existing import feature, rate limiting rule)
- tech-stack.md (Node.js, PostgreSQL)

**AI generates PRD** synthesizing all sources:
- Overview from request.md
- Functional requirements from clarification answers
- Technical considerations from tech-stack.md and context.md
- Acceptance criteria derived from requirements

**AI updates state.yml** to `prd-draft`

**AI confirms:**

```
✓ PRD generated successfully!

Created: .ai-workflow/features/user-data-export/prd.md

PRD Summary:
  - 5 functional requirements
  - 7 acceptance criteria
  - 0 open questions

Sources used:
  ✓ request.md (includes clarifications)
  ✓ context.md
  ✓ tech-stack.md

Next steps:
  1. Review prd.md
  2. If changes needed: /ai.clarify user-data-export
  3. If approved: Update state.yml status to 'prd-approved'
  4. Then: /ai.define-implementation-plan user-data-export
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| No clarifications exist | Warn user, offer to continue or add clarifications first |
| PRD already exists | Ask: regenerate, refine, or cancel |
| Workflow is a bug | Error: bugs don't have PRDs |
| Feature not found | Error: suggest /ai.add first |
| No request.md (corrupted state) | Error: suggest recreating feature with /ai.add |
| Contradictory clarifications | Note contradiction in Open Questions section |

---

## Important Notes

- **Requires clarifications**: Best results come from features with completed clarification rounds
- **Can regenerate**: Running this command again will overwrite existing PRD (with confirmation)
- **Synthesis focus**: Don't just copy answers — organize and synthesize into coherent requirements
- **Tech stack integration**: Always reference global tech stack when available
- **TBD is acceptable**: Better to mark unknowns as "TBD" than to invent details
