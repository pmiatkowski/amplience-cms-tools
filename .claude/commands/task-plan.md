# /task-plan

Create a detailed implementation plan. NO code is implemented at this stage.

## Steps

1. Read `.temp/tasks/state.yml`.
2. Read `prd.md` and `context.md` (if exists).
3. Scan the repository for coding patterns, file structure, naming conventions.
4. Read `CLAUDE.md` for project-specific guidelines.
5. **Analyze complexity and suggest a plan format** (see Plan Format Selection below).
6. Wait for the user to pick a format.
7. Ask:
   > "Any notes before I write the plan? (e.g., TDD approach, specific patterns to follow, phases to prioritize)"
   Wait for response (user can say "none" to skip).
8. Generate `plan.md` using the chosen format (see Plan Format Specs below).
9. Store the chosen format in `state.yml` as `plan_format`.
10. Update `state.yml` status to `planned`.
11. **Optional: Run localization analysis**
    > "Would you like me to analyze file impact before execution? This helps identify potential conflicts. [yes/no]"
    If yes, spawn the localization-agent to generate `localization.md`.
12. Suggest `/task-execute` next.

---

## Plan Format Selection

Before writing anything, analyze the PRD and codebase, then present this to the user:

```markdown
## Plan Format

I've analyzed the task. Here's my assessment:

**Complexity signals:**
- [e.g., "Touches 8+ files across 3 layers — high integration surface"]
- [e.g., "2 external APIs with undocumented edge cases"]
- [e.g., "Mostly CRUD scaffolding — mechanical and low-risk"]

**My recommendation: [Format name]**
[2–3 sentences explaining why this format fits the task complexity and risk profile]

| Format | Description | Best for |
|--------|-------------|----------|
| **A — Full code** | Every task contains complete, ready-to-run implementation code | Small, well-scoped tasks; isolated utilities; low ambiguity |
| **B — Detailed todos** | Each task has thorough description of what, why, constraints, patterns — no code | Large features; complex integrations; anything touching many files |
| **C — Hybrid** | Per-phase decision: mechanical phases get full code, complex logic phases get detailed todos | Most real-world features |
| **D — Skeleton + signatures** | Function/component signatures and interfaces only; bodies described not written | When type contracts must be locked in early |
| **B+D — Todos with signatures** | Detailed todos plus typed signatures — no implementation bodies | Large tasks where type safety matters from the start |

What format would you like? (A, B, C, D, or B+D)
```

Wait for the user's choice. Accept single options or combinations.
Record the chosen format in `state.yml` as `plan_format`.

---

## Plan Format Specs

All formats share the same outer structure. The **task block** content differs per format.

### Shared Outer Structure

```markdown
# Implementation Plan: <task-name>

**Status:** Ready
**Created:** <date>
**Based on PRD:** <prd path>
**Plan Format:** <A | B | C | D | B+D>

## Overall Progress
- [ ] Phase 1: <name>
- [ ] Phase 2: <name>
- [ ] Phase N: <name>

---

## Phase N: <name>

**Goal:** [What this phase achieves]
**Format:** <Full code | Detailed todos | Hybrid — [which phases get what] | Skeleton | Todos+Signatures>
**Dependencies:** [Prior phases or external deps, or "None"]

### Tasks
[Task blocks — format depends on chosen format, see specs below]

### Quality Checks After This Phase
- [ ] [e.g., `npm run lint:fix`]
- [ ] [e.g., `npm run type-check`]
- [ ] [e.g., `npm run test`]
```

---

### Format A — Full Code

```markdown
- [ ] N.N [Task name]
  - **File:** `path/to/file.ts`
  - **Action:** create | modify | delete
  - **What:** [One sentence summary]
  - **Implementation:**
    ```typescript
    // Complete, working implementation — not pseudocode
    // Include imports, error handling, edge cases
    ```
```

---

### Format B — Detailed Todos

```markdown
- [ ] N.N [Task name]
  - **File:** `path/to/file.ts`
  - **Action:** create | modify | delete
  - **What:** [Clear description of what needs to be built]
  - **Why:** [How this fits into the phase goal and overall task]
  - **Constraints:**
    - [e.g., "Must use existing `useAuth` hook, not create a new one"]
    - [e.g., "Return type must match `ApiResponse<T>` generic"]
  - **Patterns to follow:** [Reference to existing file, e.g., "Follow `src/hooks/useUser.ts`"]
  - **Edge cases to handle:**
    - [e.g., "Empty array response — return empty state, not error"]
    - [e.g., "Network timeout — surface user-facing message"]
  - **Do NOT:** [Anything the task-executor must avoid]
```

---

### Format C — Hybrid

Apply Format A or B per phase based on complexity.
Each phase must declare its format in the `**Format:**` header.

Typical split:

- Scaffolding, config, file creation → Format A (mechanical, low risk)
- Business logic, integrations, state → Format B (complex, needs reasoning)

---

### Format D — Skeleton + Signatures

```markdown
- [ ] N.N [Task name]
  - **File:** `path/to/file.ts`
  - **Action:** create | modify | delete
  - **Interfaces / Types:**
    ```typescript
    export interface TokenPayload {
      userId: string;
      role: UserRole;
    }
    ```
  - **Signatures:**
    ```typescript
    export async function signToken(payload: TokenPayload, expiresIn?: string): Promise<string>
    export async function verifyToken(token: string): Promise<TokenPayload | null>
    ```
  - **Implementation notes:** [What the body should do — prose, no code]
  - **Edge cases:** [List]
```

---

### Format B+D — Todos with Signatures

Combine Format B and Format D: full detailed todos AND typed signatures. No implementation bodies.

```markdown
- [ ] N.N [Task name]
  - **File:** `path/to/file.ts`
  - **Action:** create | modify | delete
  - **Interfaces / Types:**
    ```typescript
    // All types this task introduces or depends on
    ```
  - **Signatures:**
    ```typescript
    // All function/component signatures — no bodies
    ```
  - **What:** [Clear description]
  - **Why:** [Context]
  - **Constraints:** [List]
  - **Patterns to follow:** [Reference]
  - **Edge cases:** [List]
  - **Do NOT:** [Restrictions]
```

---

## Key Rules

- Every task must specify exact file path and action (create / modify / delete).
- Quality checks must list commands actually discovered from the project.
- If TDD was requested: each phase lists failing test signatures/stubs first, then implementation tasks.
- Format C: always declare the format in each phase header so task-executors know how to interpret tasks.
- Always write `plan_format` to `state.yml` — task-executor agents read it to know how to work with the plan.
