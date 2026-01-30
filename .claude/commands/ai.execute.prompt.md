---
agent: agent
description:
  Execute implementation plan tasks while tracking phase progress.
---

## Important: This Is Implementation Only

⚠️ **IMPLEMENT ONLY WHAT'S IN THE PLAN**

Your role is to execute the tasks defined in the plan, nothing more.

**Do:**

- ✓ Read the implementation plan
- ✓ Implement tasks exactly as described
- ✓ Update plan-state.yml after completion
- ✓ Stay within scope of current phase

**Do NOT:**

- ✗ Add features not in the plan
- ✗ Over-engineer solutions
- ✗ Add extra error handling not specified
- ✗ Refactor surrounding code
- ✗ Add comments/docs to unchanged code

After completing each phase (or all phases), return control to the user.

## Usage

```
User: /ai.execute                    # Uses current context
User: /ai.execute {feature-name}     # Explicit feature
```

---

## Instructions

You are an implementation engineer executing a pre-defined plan. Your goal is to implement tasks exactly as specified without adding extras.

### 1. Determine Feature Name

**Parameter resolution:**

1. If user provided explicit name (`/ai.execute feature-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`
3. If current context is a bug:

```
⚠ Current context is a bug, not a feature.

Bugs use /ai.plan-fix for lightweight planning instead of full implementation plans.

To work with a feature:
  /ai.set-current {feature-name}
  /ai.execute
```

1. If no current context:

```
⚠ No feature specified and no current context set.

Please either:
  1. Specify the feature name: /ai.execute {name}
  2. Set current context: /ai.set-current {name}
```

**Verify feature exists:**

Check if `.ai-workflow/features/{name}/` exists.

### 2. Verify Plan Exists

Check `.ai-workflow/features/{name}/implementation-plan/plan.md` exists.

If missing:

```
⚠ Implementation plan not found for '{feature-name}'.

Run /ai.define-implementation-plan first.
```

### 3. Read Plan State

Read `.ai-workflow/features/{name}/implementation-plan/plan-state.yml`:

```yaml
status: planning               # or in-progress, completed
current_phase: 1               # Current phase number
phases:
  - name: Phase 1 Name
    status: pending            # pending, in-progress, or completed
  - name: Phase 2 Name
    status: pending
```

**Determine next action:**

- If `status: completed`: All phases done, suggest `/ai.update-feature` for changes
- If `status: planning` or `in-progress`: Continue with execution

### 4. Ask User for Execution Mode

Based on current state, present options:

```
✓ Found implementation plan for '{feature-name}'

Current status: {status}
Current phase: {current_phase} of {total_phases}
Next phase: Phase {N}: {Phase Name} ({X} tasks)

💡 Tip: Run /ai.verify first to check plan against coding standards

How would you like to proceed?

1. Execute Phase {N} only (Recommended)
   - Implement {X} tasks for {Phase Name}
   - Stop after phase for review
   - Run /ai.execute again for next phase

2. Execute entire plan (all {total_phases} phases)
   - Implement all remaining tasks automatically
   - Faster but less control

Please respond with 1 or 2.
```

**Wait for user response** before proceeding.

### 5A. Execute Single Phase

If user selects Option 1:

**Step 1: Start phase**

First, check if this is Phase 1 AND the feature's `state.yml` status is `planning`. If so, update it to `in-progress`:

```bash
# Only if Phase 1 AND state.yml status is 'planning'
python .ai-workflow/scripts/update-plan-state.py {feature-name} update-feature-state in-progress
```

Then start the phase:

```bash
python .ai-workflow/scripts/update-plan-state.py {feature-name} start-phase {N}
```

**Step 2: Read phase details**

Read `implementation-plan/plan.md` and locate Phase {N} section:

```markdown
## Phase N: {Phase Name}

**Goal**: {One sentence goal}

### Tasks
- [ ] Task N.1: {description}
- [ ] Task N.2: {description}
...

### Deliverables
- {What's completed after this phase}

### Dependencies
- {Prerequisites or "None"}
```

**Step 3: Verify dependencies**

Check if dependencies are met. If not:

```
⚠ Dependency not met: {dependency}

Please resolve before proceeding with this phase.
```

**Step 4: Execute each task**

For each task in the phase:

1. Read task description carefully
2. Implement EXACTLY as described
3. Do NOT add features not mentioned
4. Do NOT refactor unrelated code
5. Update task checkbox in plan.md: `- [x] Task N.1: ...`

**Scope enforcement:**

- Implement ONLY tasks listed in plan.md
- Use ONLY the approach described
- Do NOT add error handling beyond what's specified
- Do NOT add validation not mentioned
- Do NOT refactor existing code unless task explicitly states it
- Do NOT add comments to code you didn't change
- Do NOT add logging/monitoring unless in tasks

**When tasks are ambiguous:**

Pause and ask user:

```
⚠ Task {N.X} is ambiguous: "{task description}"

I need clarification on: {specific question}

Please provide guidance.
```

**When encountering blockers:**

Stop and report:

```
⚠ Blocker encountered in Task {N.X}

Issue: {describe the blocker}

I cannot proceed without: {what's needed}

Please provide guidance or update the plan.
```

**Step 5: Verify and complete phase**

After all tasks are done:

1. **Verify all checkboxes are marked**: Review Phase {N} in `plan.md` and ensure ALL task checkboxes for this phase are marked `[x]`. If any checkbox is still `[ ]`, mark it now.

2. **Update plan.md**: Save the file with all checkboxes marked for Phase {N}.

3. **Complete the phase**:

```bash
python .ai-workflow/scripts/update-plan-state.py {feature-name} complete-phase {N}
```

**Step 6: Confirm completion**

```
✓ Phase {N} completed: {Phase Name}

Tasks completed:
  ✓ Task N.1: {description}
  ✓ Task N.2: {description}
  ...

Deliverables:
  - {deliverable}

Next steps:
  1. Run /ai.verify to validate implementation against plan and standards (Recommended)
  2. Review changes and test Phase {N} deliverables
  3. Run /ai.execute to continue with Phase {N+1}: {Next Phase Name}
```

**Step 7: Check for next phase**

Read `.ai-workflow/features/{name}/implementation-plan/plan-state.yml` to determine if more phases remain.

After completing Phase {N}, the script automatically increments `current_phase` to {N+1}.

Check the state:

```yaml
status: in-progress
current_phase: 2              # Already incremented to next phase
phases:
  - name: Phase 1
    status: completed          # Just finished
  - name: Phase 2
    status: in-progress        # Ready to execute
  - name: Phase 3
    status: pending
```

**If more phases exist** (`current_phase` <= total number of phases):

Ask user:

```
✓ Phase {N} complete!

Phase {current_phase} is ready: {Next Phase Name} ({X} tasks)

Would you like to proceed with Phase {current_phase}?

1. Yes, execute Phase {current_phase} now
   - Continue immediately without re-running command
   - Recommended if Phase {N} deliverables look good

2. No, stop here
   - Review and test Phase {N} deliverables
   - Run /ai.execute again when ready to continue

Please respond with 1 or 2.
```

**Wait for user response.**

- **If user responds "1":**
  - Return to **Step 1** of Section 5A
  - Use `current_phase` value from plan-state.yml as the new phase number {N}
  - Execute the next phase
  - After completion, return to this Step 7 again (creating a loop)

- **If user responds "2":**
  - Show final confirmation message (see below)
  - Proceed to Section 6 (Update Feature State)

- **If user provides invalid response:**
  - Re-ask with: "Please respond with 1 or 2."

**If no more phases exist** (all phases completed):

Ask user explicitly about completing the feature:

```
✓ All phases completed for '{feature-name}'!

All implementation tasks have been executed and checkboxes marked.

Would you like to finalize this feature?

1. Mark as completed
   - Sets state.yml status to 'completed'
   - Feature is done and ready for release/merge

2. Mark for review
   - Sets state.yml status to 'in-review'
   - Indicates feature needs code review or QA

3. Keep as in-progress
   - No state change
   - Continue testing or making adjustments

Please respond with 1, 2, or 3.
```

**Wait for user response.**

- **If user responds "1":**

  ```bash
  python .ai-workflow/scripts/update-plan-state.py {feature-name} update-feature-state completed
  ```

  Show confirmation:

  ```
  ✓ Feature '{feature-name}' marked as completed!
  
  The feature is now ready for release/merge.
  ```

- **If user responds "2":**

  ```bash
  python .ai-workflow/scripts/update-plan-state.py {feature-name} update-feature-state in-review
  ```

  Show confirmation:

  ```
  ✓ Feature '{feature-name}' marked for review!
  
  Next steps:
    1. Run /ai.verify to validate implementation against plan and standards
    2. Submit for code review
    3. Run /ai.execute again after review feedback to mark completed
  ```

- **If user responds "3":**
  Show confirmation:

  ```
  ✓ Feature '{feature-name}' remains in-progress.
  
  Next steps:
    1. Run /ai.verify to validate implementation
    2. Continue testing and adjustments
    3. Run /ai.execute again when ready to finalize
  ```

- **If user provides invalid response:**
  - Re-ask with: "Please respond with 1, 2, or 3."

Proceed to Section 6.

### 5B. Execute Entire Plan

If user selects Option 2:

**Step 1: Start plan execution**

First, check if the feature's `state.yml` status is `planning`. If so, update it to `in-progress`:

```bash
# Only if state.yml status is 'planning'
python .ai-workflow/scripts/update-plan-state.py {feature-name} update-feature-state in-progress
```

Then, if plan-state.yml `status` is "planning":

```bash
python .ai-workflow/scripts/update-plan-state.py {feature-name} start-plan
```

**Step 2: Execute phases sequentially**

For each phase (starting from `current_phase`):

1. If phase not already `in-progress`, start it:

   ```bash
   python .ai-workflow/scripts/update-plan-state.py {feature-name} start-phase {N}
   ```

2. Execute phase tasks (same as 5A Step 4)

3. Complete phase:

   ```bash
   python .ai-workflow/scripts/update-plan-state.py {feature-name} complete-phase {N}
   ```

4. If blocker or ambiguity encountered: STOP and report to user

5. Continue to next phase

**Step 3: Confirm completion**

After all phases complete, first verify all checkboxes in `plan.md` are marked `[x]`.

Then ask user explicitly about completing the feature:

```
✓ All phases completed for '{feature-name}'

Summary:
  Phase 1: {name} — {X} tasks ✓
  Phase 2: {name} — {Y} tasks ✓
  Phase 3: {name} — {Z} tasks ✓

All implementation tasks have been executed and checkboxes marked.

Would you like to finalize this feature?

1. Mark as completed
   - Sets state.yml status to 'completed'
   - Feature is done and ready for release/merge

2. Mark for review
   - Sets state.yml status to 'in-review'
   - Indicates feature needs code review or QA

3. Keep as in-progress
   - No state change
   - Continue testing or making adjustments

Please respond with 1, 2, or 3.
```

**Wait for user response** and handle same as Section 5A (see above).

### 6. Feature State Transitions

The feature `state.yml` is updated automatically during execution:

| Event | state.yml Status |
|-------|------------------|
| First phase starts | `planning` → `in-progress` |
| User chooses "Mark as completed" | `in-progress` → `completed` |
| User chooses "Mark for review" | `in-progress` → `in-review` |
| User chooses "Keep as in-progress" | No change |

**Command reference:**

```bash
# Update feature state.yml status
python .ai-workflow/scripts/update-plan-state.py {feature-name} update-feature-state {status}

# Valid statuses: clarifying, clarified, prd-draft, prd-approved, planning, in-progress, in-review, completed
```

### 7. Stop Here

✓ Your task is complete once you have:

- Executed the phase(s) as requested
- Updated plan-state.yml
- Confirmed completion to user

**Return control to the user** for review and next steps.

---

## Example

**Single Phase Execution:**

```
User: /ai.execute user-auth

✓ Found implementation plan for 'user-auth'

Current status: planning
Current phase: 1 of 3
Next phase: Phase 1: Core Authentication (6 tasks)

How would you like to proceed?

1. Execute Phase 1 only (Recommended)
   - Implement 6 tasks for Core Authentication
   - Stop after phase for review
   - Run /ai.execute again for Phase 2

2. Execute entire plan (all 3 phases)
   - Implement all 18 tasks automatically
   - Faster but less control

Please respond with 1 or 2.

---

User: 1

---

✓ Starting Phase 1: Core Authentication

Executing task 1.1: Create login API endpoint (POST /auth/login)...

[Creates src/api/auth.js with login endpoint]
[Implements password verification with bcrypt]
[Adds request validation]

✓ Task 1.1 complete

Executing task 1.2: Implement password verification with bcrypt...

[Adds bcrypt dependency]
[Implements hash comparison]

✓ Task 1.2 complete

Executing task 1.3: Create session in Redis on successful login...

[Configures Redis client]
[Implements session storage]

✓ Task 1.3 complete

Executing task 1.4: Create logout endpoint (POST /auth/logout)...

[Implements logout with session cleanup]

✓ Task 1.4 complete

Executing task 1.5: Build login form component...

[Creates LoginForm.jsx component]
[Adds form validation]

✓ Task 1.5 complete

Executing task 1.6: Connect form to API with error handling...

[Adds API integration]
[Implements error states]

✓ Task 1.6 complete

---

✓ Phase 1 completed: Core Authentication

Tasks completed:
  ✓ Task 1.1: Create login API endpoint (POST /auth/login)
  ✓ Task 1.2: Implement password verification with bcrypt
  ✓ Task 1.3: Create session in Redis on successful login
  ✓ Task 1.4: Create logout endpoint (POST /auth/logout)
  ✓ Task 1.5: Build login form component
  ✓ Task 1.6: Connect form to API with error handling

Deliverables:
  - User can log in and log out
  - Sessions persist across page refresh

Next steps:
  1. Run /ai.verify to validate implementation against plan and standards (Recommended)
  2. Review changes and test Phase 1 deliverables
  3. Run /ai.execute to continue with Phase 2: Session Management
```

---

✓ Phase 1 complete!

Phase 2 is ready: Session Management (4 tasks)

Would you like to proceed with Phase 2?

1. Yes, execute Phase 2 now
   - Continue immediately without re-running command
   - Recommended if Phase 1 deliverables look good

2. No, stop here
   - Review and test Phase 1 deliverables
   - Run /ai.execute again when ready to continue

Please respond with 1 or 2.

---

User: 1

---

✓ Starting Phase 2: Session Management

[AI executes Phase 2 tasks...]

✓ Phase 2 completed: Session Management

[Similar completion flow, followed by another prompt for Phase 3]

---

User: 2

---

✓ Execution paused after Phase 2.

You can review the changes and run /ai.execute again when ready to continue with Phase 3.

```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| Plan doesn't exist | Error: "Run /ai.define-implementation-plan first" |
| All phases complete | Error: "Plan already executed. Use /ai.update-feature for changes." |
| Current phase in-progress | Ask: resume current phase or start over? |
| Task is ambiguous | Pause and ask user for clarification |
| Dependency not met | Error with dependency name and guidance |
| Feature state not 'planning' | Warning but allow execution |
| User selects invalid option | Ask again with valid options (1 or 2) |
| Phase already completed | Skip to next incomplete phase |
