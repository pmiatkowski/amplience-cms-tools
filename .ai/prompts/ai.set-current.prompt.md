---
agent: agent
description:
  Manually set the current workflow context (feature or bug).
---

You are setting the current workflow context that will be used by other commands when no explicit name is provided.

### 1. Parse Input

Extract workflow name from user message.

If missing:

```
Please specify which workflow to set as current:

/ai.set-current {name}

Examples:
  /ai.set-current user-auth
  /ai.set-current login-timeout
```

### 2. Execute Set-Current Script

Run:

```bash
python .ai/scripts/ai.set-current.py "{name}"
```

Or with explicit type:

```bash
python .ai/scripts/ai.set-current.py "{name}" --type feature
python .ai/scripts/ai.set-current.py "{name}" --type bug
```

### 3. Confirm to User

**On success:**

```
✓ Current {type} set to: {name}

Status: {current-status}

Next steps:
  /ai.add-context — add codebase context
  /ai.clarify — start requirements clarification
```

**On error (not found):**

```
✗ Workflow '{name}' not found.

Create it first: /ai.add "{description}"
```

---

## Examples

**Example 1: Switch to existing feature**

User: `/ai.set-current user-auth`

AI executes:

```bash
python .ai/scripts/ai.set-current.py "user-auth"
```

AI responds:

```
✓ Current feature set to: user-auth

Status: clarifying

Next steps:
  /ai.add-context — add codebase context
  /ai.clarify — start requirements clarification
```

**Example 2: Switch to bug**

User: `/ai.set-current login-timeout`

AI executes:

```bash
python .ai/scripts/ai.set-current.py "login-timeout"
```

AI responds:

```
✓ Current bug set to: login-timeout

Status: reported

Next steps:
  /ai.add-context — add codebase context (optional)
  /ai.triage-bug — diagnose root cause
```

---

## Notes

- The `--type` parameter is optional; the script auto-detects if a workflow is a feature or bug
- This command does NOT create new workflows; use `/add` for that
- Current context is stored in `.ai/memory/global-state.yml`
- All subsequent commands (`/ai.clarify`, `/ai.add-context`, etc.) will use this context when no explicit name is provided
