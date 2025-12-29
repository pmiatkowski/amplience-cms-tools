# Prompt: set-current

## Purpose
Manually set the current workflow context (feature or bug).

## Usage
```
User: /set-current {name}
User: /set-current {name} --type feature
User: /set-current {name} --type bug
```

---

## Instructions

You are setting the current workflow context that will be used by other commands when no explicit name is provided.

### 1. Parse Input

Extract workflow name from user message.

If missing:
```
Please specify which workflow to set as current:

/set-current {name}

Examples:
  /set-current user-auth
  /set-current login-timeout
```

### 2. Execute Set-Current Script

Run:
```bash
python .ai-workflow/scripts/set-current.py "{name}"
```

Or with explicit type:
```bash
python .ai-workflow/scripts/set-current.py "{name}" --type feature
python .ai-workflow/scripts/set-current.py "{name}" --type bug
```

### 3. Confirm to User

**On success:**
```
✓ Current {type} set to: {name}

Status: {current-status}

Next steps:
  /add-context — add codebase context
  /clarify — start requirements clarification
```

**On error (not found):**
```
✗ Workflow '{name}' not found.

Create it first: /add "{description}"
```

---

## Examples

**Example 1: Switch to existing feature**

User: `/set-current user-auth`

AI executes:
```bash
python .ai-workflow/scripts/set-current.py "user-auth"
```

AI responds:
```
✓ Current feature set to: user-auth

Status: clarifying

Next steps:
  /add-context — add codebase context
  /clarify — start requirements clarification
```

**Example 2: Switch to bug**

User: `/set-current login-timeout`

AI executes:
```bash
python .ai-workflow/scripts/set-current.py "login-timeout"
```

AI responds:
```
✓ Current bug set to: login-timeout

Status: reported

Next steps:
  /add-context — add codebase context (optional)
  /triage-bug — diagnose root cause
```

---

## Notes

- The `--type` parameter is optional; the script auto-detects if a workflow is a feature or bug
- This command does NOT create new workflows; use `/add` for that
- Current context is stored in `.ai-workflow/memory/global-state.yml`
- All subsequent commands (`/clarify`, `/add-context`, etc.) will use this context when no explicit name is provided
