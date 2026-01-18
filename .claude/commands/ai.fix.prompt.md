---
agent: agent
description:
  Execute bug fix from fix-plan.md checklist.
---

You are executing a bug fix from a pre-defined checklist. Your role is to implement the fix tasks exactly as specified without adding extras.

## Important: This Is Bug Fix Execution Only

⚠️ **IMPLEMENT ONLY WHAT'S IN THE FIX-PLAN**

Your role is to execute the fix tasks defined in fix-plan.md, nothing more.

**Do:**

- Read the fix plan
- Implement tasks exactly as described
- Update fix-plan.md checkboxes
- Update bug state.yml

**Do NOT:**

- Add features not in the plan
- Over-engineer solutions
- Add extra error handling not specified
- Refactor surrounding code
- Add comments/docs to unchanged code

## Usage

```
User: /ai.fix                    # Uses current context
User: /ai.fix {bug-name}         # Explicit bug name
```

---

## Instructions

### 1. Verify Bug Scope

**Parameter resolution:**

1. If user provided explicit name (`/ai.fix bug-name`), use it
2. Otherwise, read current context from `.ai/memory/global-state.yml`
3. **CRITICAL**: Check if `current.workflow_type` is `bug`

**If workflow_type is NOT bug:**

```
This command is designed to work with bugs only.

Current context is a {workflow_type}, not a bug.

To fix a bug:
  1. Use /ai.set-current {bug-name} to switch to a bug
  2. Or run /ai.fix {bug-name} with an explicit bug name

This command will not proceed. STOP.
```

**If no current context:**

```
No bug specified and no current context set.

Please either:
  1. Specify the bug name: /ai.fix {name}
  2. Set current context: /ai.set-current {bug-name}
```

### 2. Verify Bug Exists

Check if `.ai/bugs/{name}/` exists.

If not found:

```
Bug '{name}' not found at .ai/bugs/{name}/

Available bugs: {list available bugs from .ai/bugs/}

Please either:
  1. Use an existing bug name
  2. Create a new bug: /ai.add "{description}"
```

### 3. Verify Fix Plan Exists

Check `.ai/bugs/{name}/fix-plan.md` exists.

If not found:

```
Fix plan not found for '{bug-name}'.

Run: /ai.plan-fix {bug-name} to create the fix checklist first.
```

### 4. Read Bug Information

Read from `.ai/bugs/{name}/`:

- `state.yml` - current status
- `report.md` - bug description and reproduction
- `context.md` - codebase context (if exists)
- `triage.md` - root cause analysis (if exists)
- `fix-plan.md` - fix checklist

### 5. Update State to in-progress

Update `.ai/bugs/{name}/state.yml`:

- Change `status: fixing` → `status: in-progress`
- Update `updated: {today}`

### 6. Execute Fix Checklist

Read `fix-plan.md` and extract all unchecked tasks (lines starting with `- [ ]`).

**For each task:**

1. Read task description carefully
2. Implement EXACTLY as described
3. Do NOT add extras beyond what's specified
4. Update checkbox in fix-plan.md: `- [ ]` → `- [x]`
5. Show progress: `✓ Task {n}: {description}`

**Scope enforcement:**

- Implement ONLY tasks listed in fix-plan.md
- Use ONLY the approach described
- Do NOT add error handling beyond what's specified
- Do NOT add validation not mentioned
- Do NOT refactor existing code unless task explicitly states it
- Do NOT add comments to code you didn't change
- Do NOT add logging/monitoring unless in tasks

**When tasks are ambiguous:**

Pause and ask user:

```
Task is ambiguous: "{task description}"

I need clarification on: {specific question}

Please provide guidance.
```

**When encountering blockers:**

Stop and report:

```
Blocker encountered in Task {n}

Issue: {describe the blocker}

I cannot proceed without: {what's needed}

Please provide guidance or update the fix plan.
```

### 7. Run Verification Commands

Read `.ai/config.yml` and extract `workflows.verification.commands`.

If the section doesn't exist:

```
Warning: No verification commands found in config.yml

Consider adding a 'workflows.verification.commands' section to config.yml:
  workflows:
    verification:
      commands:
        - "npm run lint:fix"
        - "npm run type-check"
        - "npm run test"

Skipping verification step...
```

If verification commands exist, run each command in sequence:

```bash
{command}
```

**If any command fails:**

```
Verification failed: {command}

{error output from command}

Please fix the issue and run /ai.fix again to continue.

The bug fix has been applied but verification did not pass.
You may need to:
  1. Fix the verification errors manually
  2. Update the fix-plan.md if verification approach needs adjustment
```

### 8. Update State to resolved

After all tasks are complete and verification passes, update `.ai/bugs/{name}/state.yml`:

- Change `status: in-progress` → `status: resolved`
- Update `updated: {today}`

### 9. Confirm Completion

```
✓ Bug fix completed: {bug-name}

Tasks completed:
  ✓ Task 1: {description}
  ✓ Task 2: {description}
  ...

Verification passed:
  ✓ {command 1}
  ✓ {command 2}
  ✓ {command 3}

Bug status: resolved

Next steps:
  1. Manual testing to verify the fix works in your environment
  2. Update state.yml to 'closed' when verified: /ai.set-current {bug-name} and edit state.yml
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| Current context is a feature | Stop with explicit error message |
| Bug doesn't exist | Error with list of available bugs |
| Fix plan missing | Error, suggest /ai.plan-fix |
| Verification commands fail | Report which command failed, stop with state as in-progress |
| Task is ambiguous | Pause and ask user for clarification |
| Blocker encountered | Report issue, stop |
| config.yml missing verification section | Warning, skip verification |
| Bug already resolved | Error, suggest checking state.yml |
| No unchecked tasks in fix-plan | Inform user all tasks are already complete |

---

## Example Session

**User:**

```
/ai.fix login-timeout
```

**AI reads:**

- `.ai/memory/global-state.yml` → confirms current is bug, name=login-timeout
- `.ai/bugs/login-timeout/state.yml` → status=fixing
- `.ai/bugs/login-timeout/fix-plan.md` → has 5 tasks

**AI updates state.yml:**

```yaml
status: in-progress
updated: 2025-01-18
```

**AI executes tasks:**

```
✓ Task 1: Update SESSION_TIMEOUT in auth/session.py from 30 to 1800
[Modifies src/auth/session.py]

✓ Task 2: Add timeout configuration to environment variables
[Updates .env.example]

✓ Task 3: Update auth tests to verify new timeout value
[Modifies tests/auth.test.js]

✓ Task 4: Test login flow with extended timeout
[Runs manual test or test command]

✓ Task 5: Update documentation with new timeout configuration
[Updates docs/auth.md]
```

**AI runs verification:**

```
Running verification commands...
  ✓ npm run lint:fix
  ✓ npm run type-check
  ✓ npm run test
```

**AI updates state.yml:**

```yaml
status: resolved
updated: 2025-01-18
```

**AI confirms:**

```
✓ Bug fix completed: login-timeout

Tasks completed:
  ✓ Task 1: Update SESSION_TIMEOUT in auth/session.py from 30 to 1800
  ✓ Task 2: Add timeout configuration to environment variables
  ✓ Task 3: Update auth tests to verify new timeout value
  ✓ Task 4: Test login flow with extended timeout
  ✓ Task 5: Update documentation with new timeout configuration

Verification passed:
  ✓ npm run lint:fix
  ✓ npm run type-check
  ✓ npm run test

Bug status: resolved

Next steps:
  1. Manual testing to verify the fix works in your environment
  2. Update state.yml to 'closed' when verified: /ai.set-current login-timeout and edit state.yml
```

---

## Important Notes

- **Single continuous session**: Execute all fix tasks in one user invocation
- **Strict scope enforcement**: Only implement what's in the checklist
- **Verification is mandatory**: All verification commands must pass before marking as resolved
- **State transitions**: fixing → in-progress → resolved
- **User keeps control**: Return control to user after completion for manual testing
