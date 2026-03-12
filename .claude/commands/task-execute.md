# /task-execute

Execute the implementation plan by spawning executor agents.

## Steps

1. Read `.temp/tasks/state.yml`.
2. Read `plan.md` — identify all phases and their status.
3. Ask the user:

   > **What would you like to execute?**
   > - `all` — all phases
   > - `phase <N>` — a specific phase
   > - `phases <N,M>` — specific phases

   Then ask:

   > **How should phases run?**
   > - `parallel` — all selected phases simultaneously (independent phases only)
   > - `sequential` — one after another in order

4. Spawn executor agents using the Task tool based on the choice.
5. After all executors complete, automatically spawn the **Verificator agent**.
6. Report final status to user.

## Executor Agent Instructions (pass to each Task invocation)

```
You are an Executor agent for task: <task-name>, Phase <N>: <phase-name>.

Read the full implementation plan at: <plan.md path>
Implement ONLY Phase <N>. Do not touch other phases.

After implementation:
1. Discover quality commands: check `package.json` scripts, `Makefile`, `CLAUDE.md`, `.claude/settings.json` — look for lint, type-check, test commands.
2. Run all discovered quality commands. Fix any errors before finishing.
3. Mark Phase <N> tasks as complete in plan.md (change `- [ ]` to `- [x]`).
4. Write a brief summary of what you implemented to `.temp/tasks/<name>/phase-<N>-summary.md`.

Do NOT implement anything outside Phase <N>.
```

## Parallel vs Sequential

- **Parallel**: Use multiple simultaneous Task tool calls. Only safe when phases have no dependencies on each other.
- **Sequential**: Await each Task tool call before starting the next.

## Verificator

After all executors finish, spawn the Verificator agent (see `.claude/agents/verificator.md`).
Pass it: task name, plan.md path, list of phase summaries.
