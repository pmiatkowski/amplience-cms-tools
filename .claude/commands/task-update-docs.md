# /task-update-docs

Discover documentation locations and update them based on the completed task.

## Steps

1. Read `.temp/tasks/state.yml`, `prd.md`, and `plan.md`.
2. Discover documentation locations:
   - Check `README.md` in root and subdirectories
   - Check `CLAUDE.md` for doc references
   - Check `docs/` directory if present
   - Check `prd.md` Section 9 (Additional Context) for any doc references mentioned
3. For each doc location found, assess: does this task's implementation change anything documented there?
4. Show the user a list of files that need updating and what needs to change.
5. Ask: "Shall I update all of these, or pick specific ones?"
6. Make the updates.
7. Summarize what was changed.
