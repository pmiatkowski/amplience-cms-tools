---
agent: agent
description: Create a lightweight fix implementation checklist.
---

You are creating a simple fix plan checklist.

### 1. Determine Bug Name

**Parameter resolution:**

1. If user provided explicit name (`/ai.plan-fix bug-name`), use it
2. Otherwise, read current context from `.ai/memory/global-state.yml`
3. If current context is a feature:

```
⚠ Current context is a feature, not a bug.

Features use /ai.define-implementation-plan instead of /ai.plan-fix.

To plan a bug fix:
  /ai.set-current {bug-name}
  /ai.plan-fix
```

1. If no current context:

```
⚠ No bug specified and no current context set.

Please either:
  1. Specify the bug name: /ai.plan-fix {name}
  2. Set current context: /ai.set-current {name}
```

**Verify bug exists and triaged:**

Check if `.ai/bugs/{name}/triage.md` exists.

If not found:

```
⚠ Bug must be triaged first.

Run: /ai.triage-bug
```

### 2. Read Triage Information

Read:

- `.ai/bugs/{name}/triage.md` — root cause and fix approach
- `.ai/bugs/{name}/context.md` — codebase context

### 3. Generate Fix Checklist

Create 5-10 actionable tasks for implementing the fix.

### 4. Save Fix Plan

Create `.ai/bugs/{name}/fix-plan.md`:

```markdown
# Fix Plan: {bug-name}

## Fix Checklist

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
- [ ] Test the fix
- [ ] Update documentation (if needed)

## Estimated Complexity

[Simple / Medium / Complex]

## Testing Strategy

[How to verify the fix works]

## Created

{date}
```

### 4. Update State

Update `.ai/bugs/{bug-name}/state.yml`:

- Change `status: triaged` → `status: fixing`
- Update `updated: {today}`

### 5. Next Steps

Suggest:

```
✓ Fix plan created: {bug-name}

Ready to implement! The checklist is in:
  .ai/bugs/{bug-name}/fix-plan.md
```

---

## Example

**User:**

```
/ai.plan-fix login-timeout
```

**AI reads triage.md and context.md**

**AI creates fix-plan.md:**

```markdown
# Fix Plan: login-timeout

## Fix Checklist

- [ ] Update SESSION_TIMEOUT in auth/session.py from 30 to 1800 (30 minutes)
- [ ] Add timeout configuration to environment variables
- [ ] Update auth tests to verify new timeout value
- [ ] Test login flow with extended timeout
- [ ] Update documentation with new timeout configuration

## Estimated Complexity

Simple

## Testing Strategy

1. Login to application
2. Wait 5 minutes without activity
3. Verify session is still active
4. Wait 35 minutes without activity
5. Verify session has expired

## Created

2025-01-15
```

**AI responds:**

```
✓ Fix plan created: login-timeout

Ready to implement! The checklist is in:
  .ai/bugs/login-timeout/fix-plan.md

The fix involves:
  - Updating SESSION_TIMEOUT from 30s to 30m
  - Adding env config
  - Updating tests

Estimated complexity: Simple
```
