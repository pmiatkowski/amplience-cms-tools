# Prompt: triage-bug

## Purpose
Diagnose root cause and identify fix approach for a bug.

## Usage
```
User: /triage-bug           # Uses current context
User: /triage-bug {bug-name} # Explicit bug
```

---

## Instructions

You are triaging a bug to diagnose the root cause and plan the fix.

### 1. Determine Bug Name

**Parameter resolution:**

1. If user provided explicit name (`/triage-bug bug-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`
3. If current context is a feature:

```
⚠ Current context is a feature, not a bug.

Features use /create-prd instead of /triage-bug.

To triage a bug:
  /set-current {bug-name}
  /triage-bug
```

4. If no current context:

```
⚠ No bug specified and no current context set.

Please either:
  1. Specify the bug name: /triage-bug {name}
  2. Set current context: /set-current {name}
```

**Verify bug exists:**

Check if `.ai-workflow/bugs/{name}/` exists.

### 2. Read Bug Information

Read:

- `.ai-workflow/bugs/{name}/report.md` — bug description and reproduction steps
- `.ai-workflow/bugs/{name}/context.md` — relevant codebase context (if provided)
- `.ai-workflow/bugs/{name}/state.yml` — current status

### 3. Ask Diagnostic Questions

If information is missing, ask 2-3 focused questions:
- What are the exact reproduction steps?
- What error messages appear (if any)?
- Which components/files are affected?
- When did this start happening?

### 3. Diagnose Root Cause

Based on report + context + answers, identify:
- **Root cause**: What's actually broken?
- **Affected components**: Which files/modules are involved?
- **Impact**: How severe is this bug?
- **Fix approach**: High-level strategy to fix it

### 4. Save Triage Notes

Create `.ai-workflow/bugs/{bug-name}/triage.md`:

```markdown
# Triage: {bug-name}

## Root Cause
[What's actually broken and why]

## Affected Components
- File/module 1
- File/module 2

## Severity
[Critical / High / Medium / Low]

## Fix Approach
[High-level strategy for fixing this]

## Notes
[Any additional context or considerations]

## Triaged
{date}
```

### 5. Update State

Update `.ai-workflow/bugs/{bug-name}/state.yml`:
- Change `status: reported` → `status: triaged`
- Update `updated: {today}`

### 6. Next Steps

Suggest:
```
✓ Bug triaged: {bug-name}

Next step:
  /plan-fix {bug-name} — create fix implementation checklist
```

---

## Example

**User:**
```
/triage-bug login-timeout
```

**AI reads:**
- `.ai-workflow/bugs/login-timeout/report.md`
- `.ai-workflow/bugs/login-timeout/context.md`

**AI asks questions** (if needed):
```
To help diagnose the issue, I need a bit more information:

1. What exact error message appears when the timeout occurs?
2. Does this happen only on specific pages or all login attempts?
3. Have there been any recent changes to authentication logic?
```

**After getting answers, AI creates triage.md and updates state.yml**

**AI responds:**
```
✓ Bug triaged: login-timeout

Root cause identified: Session timeout set too low (30s instead of 30m)
Severity: Medium
Affected components: auth/session.py

Next step:
  /plan-fix login-timeout — create fix implementation checklist
```
