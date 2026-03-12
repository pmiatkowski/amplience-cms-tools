# /task-fix

Ad-hoc fix or enhancement in the context of the active task.

## Steps

1. Read `.temp/tasks/state.yml` to get active task context.
2. Read `prd.md` and `plan.md` (if they exist) — understand the task's intent.
3. Read `$ARGUMENTS` — this is the user's description of what to fix or enhance.
4. If arguments are empty, ask:
   > "What would you like to fix or change? (describe the issue, paste an error, or describe the enhancement)"
5. Analyze the issue in context of the task's PRD and plan.
6. Implement the fix or enhancement.
7. Run discovered quality commands to verify the fix doesn't break anything.
8. If the fix changes something significant, offer to update `plan.md` to reflect it.

## Notes
- This command is intentionally open-ended — it's the escape hatch for anything not covered by other commands.
- Always operate within the task's context: respect the PRD's goals and the plan's approach.
- For errors: read the full error message, trace it to the source, fix root cause — not symptoms.
