# /task-add-context

Add context to the active task from files, URLs, or auto-discovery.

## Steps

1. Read `.temp/tasks/state.yml` to identify the active task and task path.
2. Check `$ARGUMENTS`:
   - `files <paths>` — read specified files and extract relevant patterns/details.
   - `url <url>` — fetch and summarize the URL (API docs, specs, etc.).
   - `discover` — auto-scan the repository (see below).
   - No argument — ask the user what kind of context they want to add.
3. Gather the context.
4. Present a summary of what was gathered.
5. Ask:
   > "Would you like to add more context, or shall I incorporate this into the PRD?"

## Auto-Discovery (when `discover` is specified or chosen)

Scan the repository for:

- Coding patterns and conventions (component structure, naming, file layout)
- Reusable utilities, hooks, helpers relevant to the task
- Existing implementations of similar features
- Tech stack (read `package.json`, config files, etc.)
- Quality commands: check `package.json` scripts, `Makefile`, `CLAUDE.md`, `.claude/settings.json` for lint/test/build commands. Record these — task-executors will need them.

## Updating PRD

When user confirms, append to or update Section 9 (Additional Context) of the PRD:

```markdown
## 9. Additional Context

### [Source: files | url | discovery] — <date>
[Summarized relevant findings]
```

Update `updated_at` in `state.yml`.
