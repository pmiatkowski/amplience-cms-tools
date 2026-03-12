# /task-plan

Create a detailed implementation plan. NO code is implemented at this stage.

## Steps

1. Read `.temp/tasks/state.yml`.
2. Read `prd.md` and `context.md` (if exists).
3. Before generating the plan, ask:
   > "Any notes before I create the plan? (e.g., TDD approach, specific patterns to follow, phases to prioritize)"
   Wait for response (user can say "none" to skip).
4. Scan the repository for coding patterns, file structure, naming conventions.
5. Read `CLAUDE.md` for project-specific guidelines.
6. Generate `plan.md` (structure below).
7. Update `state.yml` status to `planned`.
8. Suggest `/task-execute` next.

## plan.md Structure

```markdown
# Implementation Plan: <task-name>

**Status:** Ready
**Created:** <date>
**Based on PRD:** <prd path>

## Overall Progress
- [ ] Phase 1: <name>
- [ ] Phase 2: <name>
- [ ] Phase N: <name>

---

## Phase 1: <Name>

**Goal:** [What this phase achieves]
**Dependencies:** [Any prior phases or external deps]

### Tasks
- [ ] 1.1 [Task name]
  - File: `path/to/file.ts`
  - What to do: [Detailed description]
  - Code approach:
    ```typescript
    // Write the actual code here — exact implementation, not pseudocode
    ```
- [ ] 1.2 [Task name]
  ...

### Quality Checks After This Phase
- [ ] [command from discovery, e.g., `npm run lint:fix`]
- [ ] [command, e.g., `npm run type-check`]
- [ ] [command, e.g., `npm run test`]

---

## Phase 2: <Name>
...
```

### Key Rules for Plan Generation
- Write actual code in the plan — not pseudocode, not sketches. Executors implement by copying from this plan.
- Every file change must specify the exact file path.
- Quality checks must list the actual commands discovered from the project.
- If TDD was requested: each phase must list failing test code first, then implementation code.
