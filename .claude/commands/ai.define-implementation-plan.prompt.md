---
agent: agent
description:
  Create a phased implementation plan from an approved PRD.
---


## Important: This Is Planning Only

⚠️ **STOP BEFORE IMPLEMENTATION**

Your role is to CREATE A PLANNING DOCUMENT, not to write code.

**Do:**

- ✓ Read the PRD and context
- ✓ Break down requirements into phases
- ✓ Write tasks to implementation-plan/plan.md
- ✓ Update state files

**Do NOT:**

- ✗ Write application code
- ✗ Edit source files
- ✗ Implement features
- ✗ Begin Phase 1 execution

After completing the planning document, return control to the user.

## Usage

```
User: /ai.define-implementation-plan                # Uses current context
User: /ai.define-implementation-plan {feature-name} # Explicit feature
```

---

## Instructions

You are a technical lead planning implementation. Your goal is to break down the PRD into actionable phases with clear tasks and deliverables.

### 1. Determine Feature Name

**Parameter resolution:**

1. If user provided explicit name (`/ai.define-implementation-plan feature-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`
3. If current context is a bug:

```
⚠ Current context is a bug, not a feature.

Bugs use /ai.plan-fix for lightweight planning instead of full implementation plans.

To work with a feature:
  /ai.set-current {feature-name}
  /ai.define-implementation-plan
```

1. If no current context:

```
⚠ No feature specified and no current context set.

Please either:
  1. Specify the feature name: /ai.define-implementation-plan {name}
  2. Set current context: /ai.set-current {name}
```

**Verify feature exists:**

Check if `.ai-workflow/features/{name}/` exists.

### 2. Verify PRD Exists

Check `.ai-workflow/features/{name}/prd.md` exists.

If missing:

```
⚠ PRD not found for '{feature-name}'.

Run /ai.create-prd first.
```

### 3. Initialize Plan Structure (if needed)

Check if `.ai-workflow/features/{name}/implementation-plan/` exists.

If missing, execute:

```bash
python .ai-workflow/scripts/init-impl-plan.py {feature-name}
```

Then continue to step 4.

### 4. Read PRD and Context

Read and understand the following files:

```
.ai-workflow/features/{feature-name}/
├── prd.md                  # Functional requirements (FR-1, FR-2, ...)
├── context.md              # Technical considerations
└── implementation-plan/
    ├── plan-state.yml
    └── plan.md
```

**Also read global context (if available):**

```
.ai-workflow/memory/
├── tech-stack.md           # Global tech stack (optional)
└── coding-rules/           # Coding standards (optional)
    └── index.md
```

**Tech Stack Usage:**

If `tech-stack.md` exists, use it to inform:

- Technology choices in implementation tasks
- Version requirements
- Integration approaches
- Testing strategies

**Coding Rules Usage:**

If `coding-rules/index.md` exists:

1. Read the index to understand available rule categories
2. Read relevant category indices based on tech stack (e.g., react/index.md, typescript/index.md)
3. Scan relevant rule files (limit to 3-5 most applicable rules)
4. Incorporate rules into task descriptions

**Example**: If tech stack uses React 19 and TypeScript 5, read:

- `coding-rules/react/index.md` → identify relevant rules
- `coding-rules/react/component-architecture.md`
- `coding-rules/typescript/index.md` → identify relevant rules
- `coding-rules/typescript/type-safety.md`

**If files missing**: Proceed without (no error needed).

### 5. Generate Implementation Plan

Fill `implementation-plan/plan.md` using this structure:

```markdown
# Implementation Plan: {Feature Name}

> **Status**: Planning  
> **Created**: {YYYY-MM-DD}  
> **PRD Version**: {date from PRD}

---

## Summary

**Total Phases**: {N}  
**Estimated Scope**: {Small | Medium | Large}

---

## Phase 1: {Phase Name}

**Goal**: {What this phase achieves — one sentence}

### Tasks
- [ ] Task 1.1: {description}
- [ ] Task 1.2: {description}
- [ ] Task 1.3: {description}

### Deliverables
- {What's completed/shippable after this phase}

### Dependencies
- {What must exist before starting, or "None"}

---

## Phase 2: {Phase Name}

**Goal**: {What this phase achieves}

### Tasks
- [ ] Task 2.1: {description}
- [ ] Task 2.2: {description}

### Deliverables
- {What's completed after this phase}

### Dependencies
- Phase 1 complete
- {Other dependencies}

---

## Phase N: ...

---

## Notes

{Any implementation notes, risks, or considerations}

### Coding Standards References

{If coding rules exist, list key rules that apply to this implementation:}
- {Rule category}: {Brief description or link to rule file}
- {Rule category}: {Brief description or link to rule file}
```

### 6. Planning Rules

**Phase design:**

- Each phase should be independently testable/demoable
- Phases build on each other (dependencies flow downward)
- First phase = foundation/core functionality
- Last phase = polish/edge cases
- Typically 2-5 phases (more phases = smaller increments)

**Task design:**

- Tasks should be completable in ~1-4 hours
- One task = one logical unit of work
- Prefix with phase number (1.1, 1.2, 2.1, ...)
- Be specific — "Implement login form" not "Build frontend"
- **Include coding standards**: Reference specific coding rules when applicable
  - Example: "Task 1.1: Create LoginForm component following React component architecture standards (see memory/coding-rules/react/component-architecture.md)"
  - Example: "Task 2.3: Implement type-safe API client (see memory/coding-rules/typescript/type-safety.md)"

**Mapping from PRD:**

- Each FR should map to at least one task
- Each AC should be verifiable after some phase
- Technical considerations inform task details

### 7. Update State Files

**Update `implementation-plan/plan-state.yml`:**

```yaml
status: planning
current_phase: 1
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
phases:
  - name: {Phase 1 name}
    status: pending
  - name: {Phase 2 name}
    status: pending
```

**Update `state.yml`:**

```yaml
status: planning
updated: {YYYY-MM-DD}
```

### 8. Confirm Completion

Show completion summary:

```
✓ Created implementation plan

Phases:
  1. {Phase 1 name} — {X} tasks
  2. {Phase 2 name} — {Y} tasks
  ...

Scope: {Small | Medium | Large}
```

**Do not proceed to section 10 yet** - user needs to see this completion message first.

### 9. Stop Planning Phase

✓ Your planning task is complete once you have:

- Created implementation-plan/plan.md
- Updated plan-state.yml
- Updated state.yml
- Confirmed completion to user

**Do not proceed to implementation.** Continue to section 10 for verification prompt.

### 10. Offer Verification

After confirming completion (section 8), present this interactive prompt:

```
Implementation plan created successfully.

Would you like to verify the plan against coding standards now?

1. Yes, verify the plan (Recommended)
   - Check plan alignment with coding standards
   - Identify potential issues before execution
   - Generate verification report
   - ~1 minute

2. No, I'll review manually
   - You can run /ai.verify later
   - Proceed to review plan.md
   - Run /ai.execute when ready

Please respond with 1 or 2.
```

**Wait for user response.**

#### If User Selects Option 1 (Verify)

1. Inform user: `Starting verification...`
2. Invoke verification internally:
   - Read `.ai-workflow/prompts/ai.verify.prompt.md`
   - Execute verification using current workflow context
   - Use "plan verification mode" (default)
3. After verification completes, display summary:

```
✓ Verification complete

Report: .ai-workflow/reports/verification-{name}-{timestamp}.report.md

{Display verdict from verification: PASS / PASS WITH WARNINGS / FAIL}
```

1. **Automatically proceed to Section 11** (Update Documentation)

#### If User Selects Option 2 (Skip)

```
✓ Verification skipped

You can verify later with: /ai.verify {feature-name}
```

**Automatically proceed to Section 11** (Update Documentation)

#### If User Provides Invalid Response

Accept flexible responses:

- **Option 1**: "1", "yes", "y", "verify"
- **Option 2**: "2", "no", "n", "skip", "later"

If response doesn't match any pattern, re-prompt once:

```
Please respond with 1 or 2:
  1 - Verify the plan now
  2 - Skip verification
```

If still invalid, default to Option 2 (skip) and proceed to Section 11.

---

### 11. Update Documentation

After verification (or skip), automatically present the documentation update prompt:

```
Would you like to review and update documentation now?

1. Yes, update documentation (Recommended)
   - Analyze documentation gaps against the implementation plan
   - Review README.md, CLAUDE.md, and other docs
   - Update docs with your approval
   - ~2-3 minutes

2. No, skip documentation update
   - You can run /ai.docs later
   - Proceed to finalization

Please respond with 1 or 2.
```

**Wait for user response.**

#### If User Selects Option 1 (Update Docs)

**Step 1: Discover Documentation Files**

Check for these files in order:

| Location | Priority | Purpose |
|----------|----------|----------|
| `CLAUDE.md` | High | AI agent guidance, architecture overview |
| `README.md` | High | Project overview, getting started |
| `AGENTS.md` | High | Multi-agent coordination guidelines |
| `CONTRIBUTING.md` | Medium | Contribution guidelines |
| `docs/` folder | Medium | Detailed documentation |
| `API.md` or `docs/api.md` | Medium | API documentation |
| `CHANGELOG.md` | Low | Version history |

Display discovery results:

```
📚 Documentation Discovery

Found documentation files:
  ✓ CLAUDE.md ({N} lines)
  ✓ README.md ({N} lines)
  ✗ AGENTS.md (not found)
  ...

Proceeding with analysis of {N} documentation files...
```

**Step 2: Load Workflow Artifacts**

Read the following to extract key information:

1. `.ai-workflow/features/{name}/request.md` - Original request
2. `.ai-workflow/features/{name}/prd.md` - Product requirements
3. `.ai-workflow/features/{name}/implementation-plan/plan.md` - Implementation details

**Extract key information:**

- Feature name and description
- Key functionality to be added
- API changes or new endpoints
- Configuration changes
- User-facing changes
- Breaking changes (if any)
- Dependencies added or updated

**Step 3: Analyze Documentation Gaps**

For each documentation file, analyze:

1. **Missing Information** - Feature not mentioned at all
2. **Outdated Information** - Existing content will contradict new implementation
3. **Incomplete Information** - Feature mentioned but lacks details
4. **Incorrect Examples** - Code samples won't reflect planned implementation

**Analysis Categories:**

| Category | Description | Severity |
|----------|-------------|----------|
| **Missing** | Feature not documented anywhere | High |
| **Outdated** | Existing docs will contradict implementation | High |
| **Incomplete** | Docs exist but will lack important details | Medium |
| **Examples** | Code samples will need updating | Medium |
| **Minor** | Typos, formatting, minor improvements | Low |

**Cross-reference checklist:**

- [ ] Is the feature mentioned in README.md overview?
- [ ] Is the API documented (if applicable)?
- [ ] Are configuration options documented?
- [ ] Are breaking changes noted?
- [ ] Is CLAUDE.md updated with new architecture/commands?
- [ ] Are usage examples current?
- [ ] Is the changelog updated (if exists)?

**Step 4: Present Gap Analysis Report**

Display the report inline:

```markdown
# 📋 Documentation Gap Analysis: {feature-name}

> **Analyzed**: {YYYY-MM-DD HH:MM:SS}
> **Feature**: {feature-name}
> **Plan Status**: Planning

---

## Summary

**Documentation Status**: {UP-TO-DATE | NEEDS UPDATE | SIGNIFICANT GAPS}

| Severity | Count |
|----------|-------|
| 🔴 High (Missing/Outdated) | {count} |
| 🟡 Medium (Incomplete) | {count} |
| 🔵 Low (Minor) | {count} |

---

## Gaps Found

### 🔴 High Priority

#### H-{N}: {Gap Title}

**File**: `{documentation file path}`
**Type**: {Missing | Outdated}
**Details**: {Clear description of what's missing or will be incorrect}

**What should be documented:**
{Specific information from the plan that needs to be added}

**Suggested location**: {Section or heading where this should go}

---

### 🟡 Medium Priority

{Similar format for medium priority gaps}

---

### 🔵 Low Priority

{Similar format for low priority gaps}

---

## Documents Analyzed

| File | Status | Gaps Found |
|------|--------|------------|
| `CLAUDE.md` | {Analyzed/Not Found} | {count} |
| `README.md` | {Analyzed/Not Found} | {count} |
| ... | ... | ... |
```

**Step 5: Wait for User Instructions**

⚠️ **CRITICAL: Do NOT edit documentation without explicit user instruction.**

```
---

## ⏳ Awaiting Your Instructions

I've identified {N} documentation gaps. What would you like to do?

**Options:**

1. **Update all** - I'll update all documentation files with the identified gaps
2. **Update specific** - Tell me which gaps to address (e.g., "Update H-1 and M-2")
3. **Update with notes** - Provide additional context or instructions for the updates
4. **Skip for now** - No documentation changes needed at this time

**Examples:**
- "Update all"
- "Update H-1, H-2, and M-1"
- "Update H-1 with note: also mention the rate limiting feature"
- "Skip"

---
Please provide your instructions.
```

**Wait for user response before any file modifications.**

**Step 6: Process User Instructions**

**If "Update all":**

1. Confirm the changes to be made:

   ```
   I'll update the following files:
   - CLAUDE.md: Add {description}
   - README.md: Update {section}
   - docs/api.md: Add {endpoint documentation}
   
   Proceed? (yes/no)
   ```

2. Wait for confirmation
3. Make the edits one file at a time
4. Show diff summary for each file

**If "Update specific" (e.g., "H-1 and M-2"):**

1. Confirm which gaps will be addressed
2. Wait for confirmation
3. Make only the specified edits

**If "Update with notes":**

1. Parse user's additional instructions
2. Incorporate notes into the documentation updates
3. Confirm planned changes
4. Wait for confirmation before editing

**If "Skip":**

```
✓ Documentation update skipped

You can update documentation later with: /ai.docs {feature-name}
```

**Step 7: Confirm Documentation Completion**

After making approved changes:

```
✓ Documentation updated for '{feature-name}'

**Files Modified:**
- CLAUDE.md: {summary of changes}
- README.md: {summary of changes}

**Changes Made:**
- H-1: Added feature description to README overview
- M-2: Updated API examples in docs/api.md
```

**Proceed to Section 12** (Finalize Feature Status).

#### If User Selects Option 2 (Skip Docs)

```
✓ Documentation update skipped

You can update documentation later with: /ai.docs {feature-name}
```

**Proceed to Section 12** (Finalize Feature Status).

#### Documentation Edge Cases

| Situation | Behavior |
|-----------|----------|
| No documentation files found | Report "No documentation files found", suggest creating README.md, proceed to finalization |
| All docs are up-to-date | Report "UP-TO-DATE" status, no action needed, proceed to finalization |
| User provides invalid gap IDs | Ask for clarification with valid options |
| Documentation update fails | Warn user, allow proceeding to finalization |

---

### 12. Finalize Feature Status

After documentation (or skip), present the finalization prompt:

```
---

✓ Implementation plan complete for '{feature-name}'

Would you like to finalize this feature's status?

1. Mark as ready for implementation
   - Keeps state.yml status as 'planning'
   - Ready to run /ai.execute when you want to start
   - Recommended for most cases

2. Mark for review
   - Sets state.yml status to 'in-review'
   - Indicates plan needs review before execution
   - Good for team workflows

3. Keep as draft
   - No state change
   - Continue refining the plan
   - Can re-run /ai.define-implementation-plan to regenerate

Please respond with 1, 2, or 3.
```

**Wait for user response.**

#### If User Selects Option 1 (Ready for Implementation)

```
✓ Feature '{feature-name}' is ready for implementation!

Next steps:
  1. Review implementation-plan/plan.md
  2. Run /ai.execute {feature-name} to start Phase 1
```

#### If User Selects Option 2 (Mark for Review)

```bash
python .ai-workflow/scripts/update-plan-state.py {feature-name} update-feature-state in-review
```

Show confirmation:

```
✓ Feature '{feature-name}' marked for review!

Next steps:
  1. Share implementation-plan/plan.md for review
  2. After approval, run /ai.execute {feature-name}
```

#### If User Selects Option 3 (Keep as Draft)

```
✓ Feature '{feature-name}' remains as draft.

Next steps:
  1. Continue refining implementation-plan/plan.md
  2. Re-run /ai.define-implementation-plan to regenerate if needed
  3. Run /ai.execute when ready
```

#### If User Provides Invalid Response

Accept flexible responses:

- **Option 1**: "1", "yes", "y", "ready", "implement"
- **Option 2**: "2", "review"
- **Option 3**: "3", "no", "n", "draft", "skip"

If response doesn't match any pattern, re-prompt once:

```
Please respond with 1, 2, or 3:
  1 - Ready for implementation
  2 - Mark for review
  3 - Keep as draft
```

If still invalid, default to Option 1 (ready for implementation).

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| PRD doesn't exist | Error with instructions to create PRD first |
| Plan folder doesn't exist | Error with script command to run |
| Plan already exists | Ask: overwrite, create plan-v2.md, or cancel |
| PRD has many TBDs | Generate plan but flag uncertain areas in Notes |
| Very small feature | Single phase is acceptable |
| No coding standards exist | Proceed with verification - verify prompt handles this gracefully with minimal PASS report |
| Verification script fails | Show error message, suggest manual review of plan.md, provide `/ai.verify` command for retry |
| Verification returns FAIL verdict | Show critical issues summary, recommend fixing plan, but don't block user from proceeding |
| User wants to execute immediately | Accept "execute" as response to finalization, run `/ai.execute` |
| No documentation files found | Report "No documentation files found", suggest creating README.md, proceed to finalization |
| Documentation update fails | Warn user, allow proceeding to finalization |

---

## Example Output

```markdown
# Implementation Plan: user-auth

> **Status**: Planning  
> **Created**: 2025-01-28  
> **PRD Version**: 2025-01-28

---

## Summary

**Total Phases**: 3  
**Estimated Scope**: Medium

---

## Phase 1: Core Authentication

**Goal**: Enable basic login/logout functionality

### Tasks
- [ ] Task 1.1: Create login API endpoint (`POST /auth/login`)
- [ ] Task 1.2: Implement password verification with bcrypt
- [ ] Task 1.3: Create session in Redis on successful login
- [ ] Task 1.4: Create logout endpoint (`POST /auth/logout`)
- [ ] Task 1.5: Build login form component
- [ ] Task 1.6: Connect form to API with error handling

### Deliverables
- User can log in and log out
- Sessions persist across page refresh

### Dependencies
- None

---

## Phase 2: Session Management

**Goal**: Implement "remember me" and session expiration

### Tasks
- [ ] Task 2.1: Add "remember me" checkbox to login form
- [ ] Task 2.2: Implement 24h vs 7d session expiration logic
- [ ] Task 2.3: Add session refresh on activity
- [ ] Task 2.4: Handle expired session gracefully (redirect to login)

### Deliverables
- Sessions expire correctly based on "remember me"
- Users redirected when session expires

### Dependencies
- Phase 1 complete

---

## Phase 3: Password Reset & Security

**Goal**: Enable password reset and add rate limiting

### Tasks
- [ ] Task 3.1: Create password reset request endpoint
- [ ] Task 3.2: Generate and store reset tokens (1h expiry)
- [ ] Task 3.3: Integrate email service for reset links
- [ ] Task 3.4: Build password reset form
- [ ] Task 3.5: Implement rate limiting (5 attempts → 15min lockout)
- [ ] Task 3.6: Add failed attempt tracking

### Deliverables
- Users can reset password via email
- Accounts lock after failed attempts

### Dependencies
- Phase 1 complete
- Email service configured

---

## Notes

- Redis must be provisioned before Phase 1
- Email service credentials needed for Phase 3
- Consider adding logging for security audit trail (future enhancement)
```

### Example: Complete Flow with Verification, Documentation, and Finalization

```
✓ Created implementation plan

Phases:
  1. Core Authentication — 6 tasks
  2. Session Management — 4 tasks
  3. Password Reset & Security — 6 tasks

Scope: Medium

---

Implementation plan created successfully.

Would you like to verify the plan against coding standards now?

1. Yes, verify the plan (Recommended)
   - Check plan alignment with coding standards
   - Identify potential issues before execution
   - Generate verification report
   - ~1 minute

2. No, I'll review manually
   - You can run /ai.verify later
   - Proceed to documentation update

Please respond with 1 or 2.
```

**[User responds: 1]**

```
Starting verification...

✓ Verification complete

Report: .ai-workflow/reports/verification-user-auth-20250108-143022.report.md

Verdict: PASS WITH WARNINGS
- Critical issues: 0
- Warnings: 2
- Info: 3

---

Would you like to review and update documentation now?

1. Yes, update documentation (Recommended)
   - Analyze documentation gaps against the implementation plan
   - Review README.md, CLAUDE.md, and other docs
   - Update docs with your approval
   - ~2-3 minutes

2. No, skip documentation update
   - You can run /ai.docs later
   - Proceed to finalization

Please respond with 1 or 2.
```

**[User responds: 1]**

```
📚 Documentation Discovery

Found documentation files:
  ✓ CLAUDE.md (862 lines)
  ✓ README.md (156 lines)
  ✗ AGENTS.md (not found)

Proceeding with analysis of 2 documentation files...

# 📋 Documentation Gap Analysis: user-auth

> **Analyzed**: 2025-01-28 14:35:00
> **Feature**: user-auth
> **Plan Status**: Planning

---

## Summary

**Documentation Status**: NEEDS UPDATE

| Severity | Count |
|----------|-------|
| 🔴 High | 2 |
| 🟡 Medium | 1 |
| 🔵 Low | 0 |

---

## Gaps Found

### 🔴 High Priority

#### H-1: Missing Authentication Section in README

**File**: `README.md`
**Type**: Missing
**Details**: README has no mention of the planned authentication system.

**What should be documented:**
- User registration flow
- Login/logout endpoints
- Session management
- Password reset functionality

**Suggested location**: New "## Authentication" section after "## Getting Started"

#### H-2: CLAUDE.md Missing Auth Commands

**File**: `CLAUDE.md`
**Type**: Missing
**Details**: No documentation of planned auth-related API endpoints.

---

## ⏳ Awaiting Your Instructions

I've identified 3 documentation gaps. What would you like to do?

**Options:**
1. **Update all** - I'll update all documentation files
2. **Update specific** - Tell me which gaps to address
3. **Update with notes** - Provide additional context
4. **Skip for now** - No documentation changes

Please provide your instructions.
```

**[User responds: Update all]**

```
I'll update the following files:
- README.md: Add "## Authentication" section
- CLAUDE.md: Add auth endpoints documentation

Proceed? (yes/no)
```

**[User responds: yes]**

```
✓ Documentation updated for 'user-auth'

**Files Modified:**
- README.md: Added Authentication section
- CLAUDE.md: Added auth endpoints

---

✓ Implementation plan complete for 'user-auth'

Would you like to finalize this feature's status?

1. Mark as ready for implementation
   - Keeps state.yml status as 'planning'
   - Ready to run /ai.execute when you want to start
   - Recommended for most cases

2. Mark for review
   - Sets state.yml status to 'in-review'
   - Indicates plan needs review before execution
   - Good for team workflows

3. Keep as draft
   - No state change
   - Continue refining the plan

Please respond with 1, 2, or 3.
```

**[User responds: 1]**

```
✓ Feature 'user-auth' is ready for implementation!

Next steps:
  1. Review implementation-plan/plan.md
  2. Run /ai.execute user-auth to start Phase 1
```

### Example: User Skips All Optional Steps

```
✓ Created implementation plan

Phases:
  1. Core Authentication — 6 tasks
  2. Session Management — 4 tasks

Scope: Medium

---

Implementation plan created successfully.

Would you like to verify the plan against coding standards now?
...
Please respond with 1 or 2.
```

**[User responds: 2]**

```
✓ Verification skipped

You can verify later with: /ai.verify user-auth

---

Would you like to review and update documentation now?
...
Please respond with 1 or 2.
```

**[User responds: 2]**

```
✓ Documentation update skipped

You can update documentation later with: /ai.docs user-auth

---

✓ Implementation plan complete for 'user-auth'

Would you like to finalize this feature's status?
...
Please respond with 1, 2, or 3.
```

**[User responds: 1]**

```
✓ Feature 'user-auth' is ready for implementation!

Next steps:
  1. Review implementation-plan/plan.md
  2. Run /ai.execute user-auth to start Phase 1
```
