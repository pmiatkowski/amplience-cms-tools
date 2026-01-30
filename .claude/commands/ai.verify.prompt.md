---
agent: agent
description:
  Verify implementation plan or actual code against coding standards.
---

## Important: This Is Verification Only

⚠️ **ANALYZE AND REPORT, DO NOT FIX**

Your role is to identify discrepancies between implementation plans/code and coding standards, then generate a report. Nothing more.

**Do:**

- ✓ Read implementation plan or user-provided code
- ✓ Read coding standards from memory
- ✓ Analyze discrepancies and categorize by severity
- ✓ Generate verification report
- ✓ Create reports directory if needed

**Do NOT:**

- ✗ Fix any issues found
- ✗ Modify implementation plans
- ✗ Edit source code files
- ✗ Make suggestions beyond the report
- ✗ Begin implementation or fixes

After generating the report, return control to the user.

## Usage

```
User: /ai.verify                    # Uses current context, verifies plan
User: /ai.verify {workflow-name}    # Explicit workflow, verifies plan
User: /ai.verify {workflow-name} code  # Verify actual code implementation
```

---

## Instructions

You are a quality assurance analyst verifying alignment between implementation artifacts and coding standards. Your goal is to identify and categorize discrepancies without making fixes.

### 1. Determine Workflow Name and Type

**Parameter resolution:**

1. If user provided explicit name (`/ai.verify feature-name` or `/ai.verify bug-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`

```yaml
current:
  name: {workflow-name}
  workflow_type: feature|bug|idea
```

1. If no current context:

```
⚠ No workflow specified and no current context set.

Please either:
  1. Specify the workflow name: /ai.verify {name}
  2. Set current context: /ai.set-current {name}
```

**Verify workflow exists:**

Check if `.ai-workflow/{workflow_type}s/{name}/` exists.

If missing:

```
⚠ Workflow '{name}' not found.

Available workflows:
  Features: {list feature folders}
  Bugs: {list bug folders}
```

### 2. Determine Verification Mode

**Step 1: Check for explicit mode in command**

1. User command includes "code" → Code verification mode (skip to Step 3)
2. User provides file paths → Code verification mode (skip to Step 3)
3. Otherwise → Continue to Step 2

**Step 2: Detect implementation progress**

Check if implementation has started by examining:

**For features**, read `.ai-workflow/features/{name}/implementation-plan/plan-state.yml`:

```yaml
status: in-progress | completed  # Either indicates implementation started
current_phase: N
phases:
  - name: Phase 1
    status: completed | in-progress  # Either indicates work done
```

**Also check for completed tasks** in `plan.md` or `fix-plan.md`:

- Search for `- [x]` (checked checkboxes) in the plan file
- Any checked task indicates implementation has started

**For bugs**, check `.ai-workflow/bugs/{name}/fix-plan.md`:

- Search for `- [x]` (checked checkboxes)
- Any checked task indicates implementation has started

**Implementation detection summary:**

| Indicator | Location | Condition |
|-----------|----------|--------|
| Plan state status | `plan-state.yml` | `status: in-progress` or `completed` |
| Phase status | `plan-state.yml` | Any `phases[].status: in-progress` or `completed` |
| Completed tasks | `plan.md` or `fix-plan.md` | Any `- [x]` checkboxes found |

**Step 3: Determine prompt based on detection**

**If implementation has NOT started** (no indicators found):

Default to plan verification mode. Display:

```
Found workflow: {name} ({workflow_type})
Status: Planning (no implementation started)

Proceeding with plan verification...
```

**If implementation HAS started** (any indicator found):

⚠️ **STOP AND WAIT for user input.** Display:

```
⚠️ Implementation in progress detected!

Workflow: {name} ({workflow_type})
Plan Status: {status from plan-state.yml or "Tasks started"}
Progress: {X} of {Y} phases completed | {N} tasks completed

Both the implementation plan AND code exist. What would you like to verify?

1. Verify implementation plan only
   - Check plan.md or fix-plan.md against coding standards
   - Useful if plan was recently updated

2. Verify code implementation (Recommended)
   - Check source files against plan and coding standards
   - You'll need to provide file paths

3. Verify both plan and code
   - Full verification of plan AND code against standards
   - Most comprehensive option

Please respond with 1, 2, or 3.
```

**STOP AND WAIT for user response before proceeding.**

Do NOT continue until user provides their choice (1, 2, or 3).

### 3. Read Artifacts to Verify

**For Plan Verification Mode:**

**If workflow is a feature:**

- Read `.ai-workflow/features/{name}/implementation-plan/plan.md`
- If missing:

  ```
  ⚠ Implementation plan not found for '{name}'.

  Run /ai.define-implementation-plan first.
  ```

**If workflow is a bug:**

- Read `.ai-workflow/bugs/{name}/fix-plan.md`
- If missing:

  ```
  ⚠ Fix plan not found for '{name}'.

  Run /ai.plan-fix first.
  ```

**If workflow is an idea:**

```
⚠ Ideas don't have implementation plans.

To verify an idea:
  1. Convert to feature: /ai.add "Feature based on {idea-name}"
  2. Create plan: /ai.define-implementation-plan
  3. Verify: /ai.verify
```

**For Code Verification Mode:**

Ask user for file paths:

```
Please provide the file paths to verify (one per line, or comma-separated):

Example:
  src/auth/login.ts
  src/auth/session.ts
  tests/auth.test.ts
```

Read the provided files.

**For Both Mode (Plan + Code):**

When user selects option 3 (verify both):

1. First, read the plan artifact:
   - For features: `.ai-workflow/features/{name}/implementation-plan/plan.md`
   - For bugs: `.ai-workflow/bugs/{name}/fix-plan.md`

2. Then, ask user for code file paths:

```
Plan loaded. Now provide the code file paths to verify (one per line, or comma-separated):

Example:
  src/auth/login.ts
  src/auth/session.ts
  tests/auth.test.ts
```

1. Read the provided code files.

2. Verification will check:
   - Plan against coding standards
   - Code against coding standards
   - Code against plan requirements (cross-verification)

### 4. Read Coding Standards

**Step 1: Check if coding standards exist**

Check if `.ai-workflow/memory/coding-rules/index.md` exists.

If missing:

```
⚠ No coding standards defined.

Cannot perform verification without standards. Options:

1. Define coding standards: /ai.define-coding-instructions
2. Skip verification for now

A minimal report will be generated noting the absence of standards.
```

Generate a minimal PASS report and skip to step 7.

**Step 2: Read coding standards hierarchy**

Read in this order:

1. `.ai-workflow/memory/coding-rules/index.md` - General principles and methodology
2. Check for category-specific rules mentioned in index.md
3. Read relevant category indices (e.g., `react/index.md`, `typescript/index.md`)
4. Read up to 10-15 most relevant individual rule files based on:
   - Tech stack (from `.ai-workflow/memory/tech-stack.md` if exists)
   - Plan/code content (technologies mentioned)
   - Testing, architecture, security categories (high priority)

**Step 3: Organize standards for analysis**

Group standards into categories:

- **Development Methodology** (TDD, BDD, testing approach)
- **Architectural Principles** (SOLID, DRY, patterns)
- **Testing Requirements** (coverage, types of tests)
- **Code Review Standards** (what to check)
- **Documentation Standards** (what to document)
- **Technology-Specific Rules** (React patterns, TypeScript types, etc.)
- **Security & Error Handling** (validation, error patterns)

### 5. Perform Verification Analysis

**Analysis Strategy:**

Compare the implementation plan/code against coding standards and identify discrepancies across three severity levels.

**Critical Issues (Blocks Implementation):**

- Plan/code violates architectural constraints from coding rules
- Missing required testing strategy per standards (e.g., standards require TDD but plan has no test tasks)
- Inconsistent with tech stack requirements (e.g., using wrong framework version)
- Security standards violations (e.g., no input validation when standards require it)
- Missing error handling when standards mandate it

**Warnings (Should Address):**

- Plan tasks don't reference relevant coding rules where they should
- Naming conventions not aligned with standards
- Incomplete documentation standards application
- Testing coverage appears insufficient per standards
- Code review requirements not addressed in plan

**Info (Suggestions):**

- Could leverage additional coding standards for better quality
- Opportunities to enhance with best practices from standards
- Alternative approaches mentioned in standards worth considering
- Minor improvements for consistency

**Verification Checks by Mode:**

**Plan Verification:**

- Does each phase align with development methodology?
- Are testing tasks included per testing standards?
- Do architectural decisions match architectural principles?
- Are documentation requirements addressed?
- Do task descriptions reference applicable coding rules?
- Is error handling strategy consistent with standards?

**Code Verification:**

- Does code structure match architectural standards?
- Are naming conventions followed?
- Is test coverage adequate per standards?
- Are documentation standards met?
- Is error handling implemented per standards?
- Do code patterns match technology-specific rules?

### 6. Generate Verification Report

**Step 1: Create reports directory**

Check if `.ai-workflow/reports/` exists. If not, create it:

```bash
mkdir -p .ai-workflow/reports
```

**Step 2: Generate timestamp**

Format: `YYYYMMDD-HHMMSS` (e.g., `20250103-143022`)

**Step 3: Create report filename**

`verification-{workflow-name}-{timestamp}.report.md`

**Step 4: Write report**

Use this template:

```markdown
# Verification Report: {workflow-name}

> **Verified**: {YYYY-MM-DD HH:MM:SS}
> **Workflow**: {workflow-name}
> **Workflow Type**: {feature | bug | idea}
> **Verification Mode**: {plan | code | both}
> **Coding Standards**: {last updated date from coding-rules/index.md, or "Not defined"}

---

## Summary

**Total Issues**: {count}
- 🔴 Critical: {count}
- 🟡 Warning: {count}
- 🔵 Info: {count}

**Verdict**: {PASS | PASS WITH WARNINGS | FAIL}
- PASS: No critical issues, warnings acceptable
- PASS WITH WARNINGS: No critical issues, but warnings exist
- FAIL: One or more critical issues found

---

## Critical Issues

{If no critical issues:}
None found.

{Otherwise, for each critical issue:}

### C-{N}: {Issue Title}

**Location**: `{file path or plan section reference}`
**Standard**: `{coding-rules/category/rule.md}` or "General principles from index.md"
**Issue**: {Clear description of what violates the standard}
**Recommendation**: {Specific action to fix, e.g., "Add unit test tasks for authentication logic per TDD methodology"}

---

## Warnings

{If no warnings:}
None found.

{Otherwise, for each warning:}

### W-{N}: {Issue Title}

**Location**: `{file path or plan section reference}`
**Standard**: `{coding-rules/category/rule.md}`
**Issue**: {Description of the warning}
**Recommendation**: {Suggested action}

---

## Info

{If no info items:}
None.

{Otherwise, for each info item:}

### I-{N}: {Issue Title}

**Location**: `{file path or plan section reference}`
**Standard**: `{coding-rules/category/rule.md}`
**Observation**: {What was noticed}
**Suggestion**: {Optional improvement}

---

## Verification Details

### Standards Checked

{List all coding rule files that were read and applied:}
- `coding-rules/index.md` - General principles and methodology
- `coding-rules/{category}/index.md` - {Category description}
- `coding-rules/{category}/{rule}.md` - {Rule description}

{If no standards exist:}
⚠ No coding standards defined. Verification could not be performed comprehensively.

### Standards Not Applicable

{List standards that were read but not relevant:}
- `coding-rules/{category}/{rule}.md` - Reason: {why not applicable, e.g., "Mobile-specific rules, but project is web-only"}

{If all standards were applicable:}
All loaded standards were applicable to this verification.

### Coverage Analysis

**For Plan Verification:**
- Total phases: {count}
- Total tasks: {count}
- Tasks referencing standards: {X} of {Y} ({percentage}%)
- Phases with testing tasks: {X} of {Y}
- Phases with documentation tasks: {X} of {Y}

**For Code Verification:**
- Files checked: {count}
- Total lines analyzed: {count}
- Standards violations: {count}
- Standards compliance: {percentage}%

---

## Next Steps

{Provide recommendations based on severity:}

**If FAIL (Critical issues found):**
1. Address all critical issues before proceeding with implementation
2. Update implementation plan or fix code as needed
3. Re-run /ai.verify to confirm issues are resolved
4. Review coding standards at `coding-rules/`

**If PASS WITH WARNINGS:**
1. Consider addressing warnings before execution (recommended)
2. Document any warnings you choose not to address
3. Proceed with implementation: /ai.execute
4. Run /ai.verify again after implementation to check code

**If PASS:**
1. Proceed with implementation: /ai.execute
2. Run /ai.verify after implementation to validate code against plan and standards
3. Keep coding standards in mind during development

---

## Report History

- **Current report**: `verification-{workflow-name}-{timestamp}.report.md`
- **Latest report link**: `verification-{workflow-name}-latest.report.md`

{If previous reports exist, list the 5 most recent:}

**Previous verifications:**
1. `verification-{workflow-name}-{timestamp-1}.report.md` - {verdict-1}
2. `verification-{workflow-name}-{timestamp-2}.report.md` - {verdict-2}
...

---

*This verification was performed automatically and does not modify any files.*
```

**Step 5: Create symlink to latest report**

**On Windows:**

```bash
# Create copy as "latest" (Windows may not support symlinks without admin)
copy .ai-workflow\reports\verification-{name}-{timestamp}.report.md .ai-workflow\reports\verification-{name}-latest.report.md
```

**On Linux/Mac:**

```bash
# Create symlink
ln -sf verification-{name}-{timestamp}.report.md .ai-workflow/reports/verification-{name}-latest.report.md
```

### 7. Update State (Optional)

**Do NOT update workflow state** - verification is read-only and doesn't change workflow status.

The workflow remains in its current state:

- Features: prd-approved, planning, or in-progress
- Bugs: reported, triaged, or fixing

### 8. Confirm Completion

Display to user:

```
✓ Verification complete for '{workflow-name}'

Report generated: .ai-workflow/reports/verification-{name}-{timestamp}.report.md
Latest report: .ai-workflow/reports/verification-{name}-latest.report.md

Verdict: {PASS | PASS WITH WARNINGS | FAIL}
- Critical issues: {count}
- Warnings: {count}
- Info: {count}

{If FAIL:}
⚠ Critical issues found. Review report before proceeding with implementation.

{If PASS WITH WARNINGS:}
💡 Warnings found. Consider reviewing before implementation.

{If PASS:}
✓ All clear! Ready to proceed with implementation.

Next steps:
  1. Review report: cat .ai-workflow/reports/verification-{name}-latest.report.md
  2. {If FAIL: Fix issues and re-verify}
     {If PASS/WARNINGS: Proceed with /ai.execute}
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| No coding standards exist | Generate minimal report with warning: "No standards defined. Run /ai.define-coding-instructions first." Mark verdict as PASS (can't fail without standards). |
| Plan exists + implementation started | Require explicit user choice (1=plan, 2=code, 3=both). Suggest code verification as recommended. STOP and WAIT for user input before proceeding. |
| No implementation plan exists | For plan mode: Error and suggest /ai.define-implementation-plan or /ai.plan-fix. For code mode: Skip plan comparison. |
| Workflow is a bug | Use fix-plan.md instead of implementation-plan/plan.md. Apply simplified verification (bugs have lighter planning). |
| Workflow is an idea | Error: Ideas don't have implementation plans. Suggest converting to feature first. |
| No current context | Error: Require explicit workflow name or /ai.set-current. |
| Reports directory doesn't exist | Create it automatically with mkdir. |
| No discrepancies found | Generate PASS report with congratulations message. |
| Coding rules incomplete | Use available rules, note missing categories in "Standards Not Applicable" section. |
| User provides file paths for code verification | Read those files and verify against plan (if exists) and standards. |
| Plan references coding standards correctly | Mark as Info: "Plan appropriately references coding standards." |
| Multiple verification runs | List previous reports in "Report History" section (up to 5 most recent). |
| Symlink creation fails on Windows | Fall back to copying file instead of creating symlink. |
| Very large plan/code | Limit analysis to most critical standards (testing, architecture, security) and note in report. |
| Standards contradict each other | Mark as Warning: "Coding standards contain contradictions" and list them. |

---

## Example Verification Scenarios

### Scenario 1: Feature with Good Plan

```
User: /ai.verify user-authentication

AI: Reading implementation plan for 'user-authentication'...
AI: Reading coding standards...
AI: Analyzing 4 phases with 23 tasks...
AI: Generating report...

✓ Verification complete for 'user-authentication'

Verdict: PASS
- Critical issues: 0
- Warnings: 2
- Info: 3

Report: .ai-workflow/reports/verification-user-authentication-20250103-143022.report.md

💡 Warnings found. Consider reviewing before implementation.

Next steps:
  1. Review report
  2. Proceed with /ai.execute
```

### Scenario 2: Bug Fix Missing Tests

```
User: /ai.verify login-timeout

AI: Reading fix plan for 'login-timeout'...
AI: Reading coding standards...
AI: Standards require TDD with unit tests...
AI: Analyzing fix plan...

✓ Verification complete for 'login-timeout'

Verdict: FAIL
- Critical issues: 1
- Warnings: 0
- Info: 1

Critical: Fix plan missing test tasks (TDD methodology requires tests first)

⚠ Critical issues found. Review report before proceeding.

Next steps:
  1. Review report
  2. Fix critical issues
  3. Re-verify: /ai.verify
```

### Scenario 3: No Coding Standards

```
User: /ai.verify new-feature

AI: Reading implementation plan for 'new-feature'...
AI: Checking coding standards...

⚠ No coding standards defined.

Generating minimal report...

✓ Verification complete for 'new-feature'

Verdict: PASS (no standards to verify against)

To enable full verification:
  1. Define coding standards: /ai.define-coding-instructions
  2. Re-verify: /ai.verify
```

### Scenario 4: Implementation In Progress

```
User: /ai.verify user-authentication

AI: Reading workflow 'user-authentication'...
AI: Checking implementation progress...
AI: Found plan-state.yml with status: in-progress
AI: Found 8 completed tasks in plan.md

⚠️ Implementation in progress detected!

Workflow: user-authentication (feature)
Plan Status: in-progress
Progress: 2 of 4 phases completed | 8 tasks completed

Both the implementation plan AND code exist. What would you like to verify?

1. Verify implementation plan only
   - Check plan.md against coding standards
   - Useful if plan was recently updated

2. Verify code implementation (Recommended)
   - Check source files against plan and coding standards
   - You'll need to provide file paths

3. Verify both plan and code
   - Full verification of plan AND code against standards
   - Most comprehensive option

Please respond with 1, 2, or 3.

User: 2

AI: Please provide the file paths to verify:

User: src/auth/login.ts, src/auth/session.ts

AI: Reading code files...
AI: Reading coding standards...
AI: Verifying code against standards and plan...

✓ Verification complete for 'user-authentication'

Verdict: PASS WITH WARNINGS
- Critical issues: 0
- Warnings: 3
- Info: 2

Report: .ai-workflow/reports/verification-user-authentication-20250130-143022.report.md
```

---

## Notes for Implementation

- Verification is **read-only** - never modify plans or code
- Keep analysis focused on **actionable** discrepancies
- Reference specific standards with file paths for traceability
- Be **conservative** with Critical severity (only true blockers)
- Use **constructive** language in recommendations
- Reports are **timestamped** to track improvement over time
- Verification integrates with workflow but doesn't change state
