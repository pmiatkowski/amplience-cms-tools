---
agent: agent
description:
  Create a phased implementation plan from an approved PRD.
---


## Important: This Is Planning Only

⚠️ **STOP BEFORE IMPLEMENTATION**

Your role is to CREATE A PLANNING DOCUMENT, not to write code.

**Do:**

- ✓ Read the PRD and context
- ✓ Break down requirements into phases
- ✓ Write tasks to implementation-plan/plan.md
- ✓ Update state files

**Do NOT:**

- ✗ Write application code
- ✗ Edit source files
- ✗ Implement features
- ✗ Begin Phase 1 execution

After completing the planning document, return control to the user.

## Usage

```
User: /ai.define-implementation-plan                # Uses current context
User: /ai.define-implementation-plan {feature-name} # Explicit feature
```

---

## Instructions

You are a technical lead planning implementation. Your goal is to break down the PRD into actionable phases with clear tasks and deliverables.

### 1. Determine Feature Name

**Parameter resolution:**

1. If user provided explicit name (`/ai.define-implementation-plan feature-name`), use it
2. Otherwise, read current context from `.ai/memory/global-state.yml`
3. If current context is a bug:

```
⚠ Current context is a bug, not a feature.

Bugs use /ai.plan-fix for lightweight planning instead of full implementation plans.

To work with a feature:
  /ai.set-current {feature-name}
  /ai.define-implementation-plan
```

1. If no current context:

```
⚠ No feature specified and no current context set.

Please either:
  1. Specify the feature name: /ai.define-implementation-plan {name}
  2. Set current context: /ai.set-current {name}
```

**Verify feature exists:**

Check if `.ai/features/{name}/` exists.

### 2. Verify PRD Exists

Check `.ai/features/{name}/prd.md` exists.

If missing:

```
⚠ PRD not found for '{feature-name}'.

Run /ai.create-prd first.
```

### 3. Initialize Plan Structure (if needed)

Check if `.ai/features/{name}/implementation-plan/` exists.

If missing, execute:

```bash
python .ai/scripts/init-impl-plan.py {feature-name}
```

Then continue to step 4.

### 4. Read PRD and Context

Read and understand the following files:

```
.ai/features/{feature-name}/
├── prd.md                  # Functional requirements (FR-1, FR-2, ...)
├── context.md              # Technical considerations
└── implementation-plan/
    ├── plan-state.yml
    └── plan.md
```

**Also read global context (if available):**

```
.ai/memory/
├── tech-stack.md           # Global tech stack (optional)
└── coding-rules/           # Coding standards (optional)
    └── index.md
```

**Tech Stack Usage:**

If `tech-stack.md` exists, use it to inform:

- Technology choices in implementation tasks
- Version requirements
- Integration approaches
- Testing strategies

**Coding Rules Usage:**

If `coding-rules/index.md` exists:

1. Read the index to understand available rule categories
2. Read relevant category indices based on tech stack (e.g., react/index.md, typescript/index.md)
3. Scan relevant rule files (limit to 3-5 most applicable rules)
4. Incorporate rules into task descriptions

**Example**: If tech stack uses React 19 and TypeScript 5, read:

- `coding-rules/react/index.md` → identify relevant rules
- `coding-rules/react/component-architecture.md`
- `coding-rules/typescript/index.md` → identify relevant rules
- `coding-rules/typescript/type-safety.md`

**If files missing**: Proceed without (no error needed).

### 5. Generate Implementation Plan

Fill `implementation-plan/plan.md` using this structure:

```markdown
# Implementation Plan: {Feature Name}

> **Status**: Planning  
> **Created**: {YYYY-MM-DD}  
> **PRD Version**: {date from PRD}

---

## Summary

**Total Phases**: {N}  
**Estimated Scope**: {Small | Medium | Large}

---

## Phase 1: {Phase Name}

**Goal**: {What this phase achieves — one sentence}

### Tasks
- [ ] Task 1.1: {description}
- [ ] Task 1.2: {description}
- [ ] Task 1.3: {description}

### Deliverables
- {What's completed/shippable after this phase}

### Dependencies
- {What must exist before starting, or "None"}

---

## Phase 2: {Phase Name}

**Goal**: {What this phase achieves}

### Tasks
- [ ] Task 2.1: {description}
- [ ] Task 2.2: {description}

### Deliverables
- {What's completed after this phase}

### Dependencies
- Phase 1 complete
- {Other dependencies}

---

## Phase N: ...

---

## Notes

{Any implementation notes, risks, or considerations}

### Coding Standards References

{If coding rules exist, list key rules that apply to this implementation:}
- {Rule category}: {Brief description or link to rule file}
- {Rule category}: {Brief description or link to rule file}
```

### 6. Planning Rules

**Phase design:**

- Each phase should be independently testable/demoable
- Phases build on each other (dependencies flow downward)
- First phase = foundation/core functionality
- Last phase = polish/edge cases
- Typically 2-5 phases (more phases = smaller increments)

**Task design:**

- Tasks should be completable in ~1-4 hours
- One task = one logical unit of work
- Prefix with phase number (1.1, 1.2, 2.1, ...)
- Be specific — "Implement login form" not "Build frontend"
- **Include coding standards**: Reference specific coding rules when applicable
  - Example: "Task 1.1: Create LoginForm component following React component architecture standards (see memory/coding-rules/react/component-architecture.md)"
  - Example: "Task 2.3: Implement type-safe API client (see memory/coding-rules/typescript/type-safety.md)"

**Mapping from PRD:**

- Each FR should map to at least one task
- Each AC should be verifiable after some phase
- Technical considerations inform task details

### 7. Update State Files

**Update `implementation-plan/plan-state.yml`:**

```yaml
status: planning
current_phase: 1
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
phases:
  - name: {Phase 1 name}
    status: pending
  - name: {Phase 2 name}
    status: pending
```

**Update `state.yml`:**

```yaml
status: planning
updated: {YYYY-MM-DD}
```

### 8. Confirm Completion

```
✓ Created implementation plan

Phases:
  1. {Phase 1 name} — {X} tasks
  2. {Phase 2 name} — {Y} tasks
  ...

Scope: {Small | Medium | Large}

Next steps for USER:
  1. Review implementation-plan/plan.md
  2. Run /ai.verify to check plan against coding standards (Recommended)
  3. Adjust phases/tasks as needed
  4. When ready, begin implementation: /ai.execute
```

### 9. Stop Here

✓ Your task is complete once you have:

- Created implementation-plan/plan.md
- Updated plan-state.yml
- Updated state.yml
- Confirmed completion to user

**Do not proceed to implementation.** Return control to the user.

---

## Example Output

```markdown
# Implementation Plan: user-auth

> **Status**: Planning  
> **Created**: 2025-01-28  
> **PRD Version**: 2025-01-28

---

## Summary

**Total Phases**: 3  
**Estimated Scope**: Medium

---

## Phase 1: Core Authentication

**Goal**: Enable basic login/logout functionality

### Tasks
- [ ] Task 1.1: Create login API endpoint (`POST /auth/login`)
- [ ] Task 1.2: Implement password verification with bcrypt
- [ ] Task 1.3: Create session in Redis on successful login
- [ ] Task 1.4: Create logout endpoint (`POST /auth/logout`)
- [ ] Task 1.5: Build login form component
- [ ] Task 1.6: Connect form to API with error handling

### Deliverables
- User can log in and log out
- Sessions persist across page refresh

### Dependencies
- None

---

## Phase 2: Session Management

**Goal**: Implement "remember me" and session expiration

### Tasks
- [ ] Task 2.1: Add "remember me" checkbox to login form
- [ ] Task 2.2: Implement 24h vs 7d session expiration logic
- [ ] Task 2.3: Add session refresh on activity
- [ ] Task 2.4: Handle expired session gracefully (redirect to login)

### Deliverables
- Sessions expire correctly based on "remember me"
- Users redirected when session expires

### Dependencies
- Phase 1 complete

---

## Phase 3: Password Reset & Security

**Goal**: Enable password reset and add rate limiting

### Tasks
- [ ] Task 3.1: Create password reset request endpoint
- [ ] Task 3.2: Generate and store reset tokens (1h expiry)
- [ ] Task 3.3: Integrate email service for reset links
- [ ] Task 3.4: Build password reset form
- [ ] Task 3.5: Implement rate limiting (5 attempts → 15min lockout)
- [ ] Task 3.6: Add failed attempt tracking

### Deliverables
- Users can reset password via email
- Accounts lock after failed attempts

### Dependencies
- Phase 1 complete
- Email service configured

---

## Notes

- Redis must be provisioned before Phase 1
- Email service credentials needed for Phase 3
- Consider adding logging for security audit trail (future enhancement)
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| PRD doesn't exist | Error with instructions to create PRD first |
| Plan folder doesn't exist | Error with script command to run |
| Plan already exists | Ask: overwrite, create plan-v2.md, or cancel |
| PRD has many TBDs | Generate plan but flag uncertain areas in Notes |
| Very small feature | Single phase is acceptable |
