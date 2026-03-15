# /task-execute

Execute the implementation plan by spawning task-executor agents.

## Steps

1. Read `.temp/tasks/state.yml`.
2. Read `plan.md` — identify all phases and their status.
3. **Pre-Execution Verification Gate:**
   - Verify every PRD requirement maps to at least one task
   - Verify phase dependencies have no cycles
   - Verify quality commands are defined for each phase
   - If any fail: BLOCK and suggest `/task-verify plan deep`
4. Ask the user:

   > **What would you like to execute?**
   > - `all` — all phases
   > - `phase <N>` — a specific phase
   > - `phases <N,M>` — specific phases

5. **Determine orchestration strategy** (see Orchestration Strategy below).
6. Spawn task-executor agents using the Task tool based on the strategy.
7. After all task-executors complete, automatically spawn the **task-verificator agent**.
8. Report final status to user.

## Orchestration Strategy

| Phase Relationship | Files | Strategy | Notes |
|-------------------|-------|----------|-------|
| Independent | Different | **Parallel** | Safe to run simultaneously |
| Sequential Dep | Any | **Sequential** | One after another with handoffs |
| Shared Files | Overlapping | **Sequential + handoff** | Must coordinate via handoffs |
| Complex + Risky | Core files | **Builder → Reviewer** | Task-Executor then reviewer agent |

**How to determine:**

1. Read each phase's `**Dependencies:**` header in plan.md
2. Check if phases modify the same files (read file paths in each phase)
3. Apply the strategy from the table above
4. For shared-file phases, always use sequential with handoffs

## task-executor Agent Instructions (pass to each Task invocation)

```
You are an Task-Executor agent for task: <task-name>, Phase <N>: <phase-name>.

Read the full implementation plan at: <plan.md path>
Implement ONLY Phase <N>. Do not touch other phases.

Handoff from previous phase (if sequential): <handoff_path or "none">

After implementation:
1. Discover quality commands: check `package.json` scripts, `Makefile`, `CLAUDE.md`, `.claude/settings.json` — look for lint, type-check, test commands.
2. Run self-refine loop (max 3 iterations):
   - Run quality commands, fix errors
   - Self-critique for improvements
   - Iterate until clean or max iterations
3. Mark Phase <N> tasks as complete in plan.md (change `- [ ]` to `- [x]`).
4. Generate handoff file if next phase exists: .temp/tasks/<task-name>/handoffs/phase-N-to-N+1.yml

Do NOT implement anything outside Phase <N>.
```

## Parallel vs Sequential

- **Parallel**: Use multiple simultaneous Task tool calls. Only safe when phases have no dependencies and touch different files.
- **Sequential**: Await each Task tool call before starting the next. Pass handoff path from previous task-executor to next.

## task-verificator

After all task-executors finish, spawn the Task-Verificator agent (see `.claude/agents/task-verificator.md`).
Pass it: task name, plan.md path, list of phase summaries.

## Builder-Reviewer Pattern (for complex phases)

For phases marked as "high risk" or touching core architecture:

1. Spawn task-executor agent for the phase
2. After completion, spawn phase-reviewer agent
3. Reviewer checks implementation against plan, PRD, and constraints
4. If reviewer rejects: spawn task-executor again with feedback
5. Repeat until approved or max retries (2) reached
