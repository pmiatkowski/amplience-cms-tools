# /task-run

Generic task-scoped command. Loads full task context, then executes whatever the user asks.

Usage: `/task-run <anything>`

Examples:
- `/task-run update the README to reflect the new auth flow`
- `/task-run refactor the token utilities to use a class instead of standalone functions`
- `/task-run check if plan phase 2 is still consistent with the PRD after the last clarification`
- `/task-run add JSDoc to all exported functions in src/lib/jwt.ts`
- `/task-run the build is failing with TS2345 — investigate and fix`

## Steps

1. Read `.temp/tasks/state.yml` — load active task name, status, and paths.
2. Read `prd.md` and `plan.md` (if they exist) — understand task intent, requirements, and current implementation plan.
3. Read `$ARGUMENTS` — this is the full instruction. Execute it exactly as described.
4. Use any tools needed: read files, write files, run commands, search the codebase — whatever the instruction requires.
5. After completing, briefly summarize what was done. If any files were modified that relate to the plan or PRD, offer to update them to stay consistent.

## Notes

- No assumed intent — do exactly what the instruction says, nothing more.
- Task context (PRD, plan) is loaded so actions stay coherent with the overall task, but it does not constrain what you can do.
- If `$ARGUMENTS` is empty, ask: "What would you like to do?"
