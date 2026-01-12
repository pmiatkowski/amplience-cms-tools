---
agent: agent
description:
  Diagnose root cause and identify fix approach for a bug.
---

You are triaging a bug to diagnose the root cause and plan the fix.

### 1. Determine Bug Name

**Parameter resolution:**

1. If user provided explicit name (`/ai.triage-bug bug-name`), use it
2. Otherwise, read current context from `.ai/memory/global-state.yml`
3. If current context is a feature:

```
⚠ Current context is a feature, not a bug.

Features use /ai.create-prd instead of /ai.triage-bug.

To triage a bug:
  /ai.set-current {bug-name}
  /ai.triage-bug
```

1. If no current context:

```
⚠ No bug specified and no current context set.

Please either:
  1. Specify the bug name: /ai.triage-bug {name}
  2. Set current context: /ai.set-current {name}
```

**Verify bug exists:**

Check if `.ai/bugs/{name}/` exists.

### 2. Read Bug Information

Read:

- `.ai/bugs/{name}/report.md` — bug description and reproduction steps
- `.ai/bugs/{name}/context.md` — relevant codebase context (if provided)
- `.ai/bugs/{name}/state.yml` — current status

### 3. Determine Diagnostic Approach

**Check if diagnostic questions are needed:**

Read existing information from:

- `report.md` — bug description and reproduction steps
- `context.md` — codebase context (if exists)

**Assess information completeness:**

- Are reproduction steps clear and specific?
- Are error messages/symptoms documented?
- Are affected components identified?
- Is timing/trigger information available?

**If information is sufficient:**

- Skip to Step 4 (Diagnose Root Cause)

**If information is missing:**

- Proceed with sequential diagnostic questioning

### 3A. Plan Diagnostic Questions

**Determine missing information and plan 2-3 focused questions:**

Common diagnostic question types:

- **Reproduction**: Exact steps to reproduce, consistency/intermittency
- **Symptoms**: Error messages, observed behavior, failure mode
- **Scope**: Which components/pages/users affected
- **Timing**: When it started, environmental conditions, triggers
- **Context**: Recent changes, related systems

**Plan questions based on gaps:**

1. Identify 2-3 most critical gaps in understanding
2. For each question, prepare 3 scenario-based options (A, B, C)
3. Create question plan internally (don't reveal all at once)

### 3B. Ask Questions Sequentially (One-by-One)

**For each planned question:**

**Question Format:**

```
Question {n}/{total}

{Diagnostic question}

Options:
  A: {Most common scenario/cause}
  B: {Second common scenario/cause}
  C: {Third scenario or "other/unknown"}

Recommendation: {Guidance on what each option suggests about root cause}

---
You can select A, B, or C, or provide your own answer.
```

**Option Generation Guidelines for Diagnostic Questions:**

**PRIORITY 1: Common Failure Patterns**

- Based on the bug symptoms, identify 3 most common causes
- Use industry knowledge and debugging experience
- Present scenarios from most to least likely

**PRIORITY 2: Diagnostic Scenarios**

- Options should help narrow down root cause
- Each option should suggest different investigation paths
- Example:
  - A: Code-level bug (consistent, reproducible)
  - B: Resource/environment issue (intermittent)
  - C: Configuration/data issue (conditional)

**FORMAT RULES:**

- Each option: Clear scenario description
- Include diagnostic implication in parentheses
- Make scenarios mutually exclusive
- Avoid overly technical jargon unless context suggests expertise

**Recommendation Format:**

```
Understanding [aspect] helps narrow the root cause. Option A would suggest [implication],
Option B suggests [implication], Option C suggests [implication].
```

**After Each Answer:**

1. Acknowledge answer: `✓ Noted: {brief summary of answer}`
2. Store answer internally for diagnosis
3. If more questions remain, ask next question
4. If all questions answered, proceed to diagnosis

**Example Diagnostic Question Flow:**

```
Question 1/3

How consistently does the login timeout occur?

Options:
  A: Happens every time for all users (100% reproducible)
  B: Happens intermittently, roughly 20-50% of attempts
  C: Happens only under specific conditions (certain users, times, or actions)

Recommendation: Understanding consistency helps identify the failure type. Option A suggests a code-level bug or configuration error, Option B suggests resource contention or race conditions, Option C suggests environment-specific or data-dependent issues.

---
You can select A, B, or C, or provide your own answer.
```

**User answers:** B

```
✓ Noted: Intermittent occurrence (20-50% of attempts)

Question 2/3

What symptoms appear when the timeout occurs?

Options:
  A: Specific error message or exception shown to user
  B: Page hangs/loads indefinitely, then times out
  C: Silent failure (no error, just doesn't work)

Recommendation: The symptom type indicates where the failure occurs. Option A suggests application-level error handling is working, Option B suggests network/resource timeout, Option C suggests logic error or silent exception.

---
You can select A, B, or C, or provide your own answer.
```

### 3C. Diagnose Root Cause

Based on report + context + answers, identify:

- **Root cause**: What's actually broken?
- **Affected components**: Which files/modules are involved?
- **Impact**: How severe is this bug?
- **Fix approach**: High-level strategy to fix it

### 4. Save Triage Notes

Create `.ai/bugs/{bug-name}/triage.md`:

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

Update `.ai/bugs/{bug-name}/state.yml`:

- Change `status: reported` → `status: triaged`
- Update `updated: {today}`

### 6. Next Steps

Suggest:

```
✓ Bug triaged: {bug-name}

Next step:
  /ai.plan-fix {bug-name} — create fix implementation checklist
```

---

## Example Session (Sequential Format)

**User:**

```
/ai.triage-bug login-timeout
```

**AI reads:**

- `.ai/bugs/login-timeout/report.md` (missing specific symptoms)
- `.ai/bugs/login-timeout/context.md` (auth system described)

**AI determines:** Information gaps exist, diagnostic questions needed

**AI plans:** 3 questions about consistency, symptoms, and scope

**AI asks Question 1:**

```
Question 1/3

How consistently does the login timeout occur?

Options:
  A: Happens every time for all users (100% reproducible)
  B: Happens intermittently, roughly 20-50% of attempts
  C: Happens only under specific conditions (certain users, times, or actions)

Recommendation: Understanding consistency helps identify the failure type. Option A suggests a code-level bug or configuration error, Option B suggests resource contention or race conditions, Option C suggests environment-specific or data-dependent issues.

---
You can select A, B, or C, or provide your own answer.
```

**User:** B

**AI asks Question 2:**

```
✓ Noted: Intermittent occurrence (20-50% of attempts)

Question 2/3

What symptoms appear when the timeout occurs?

Options:
  A: Specific error message or exception shown to user
  B: Page hangs/loads indefinitely, then times out
  C: Silent failure (no error, just doesn't work)

Recommendation: The symptom type indicates where the failure occurs. Option A suggests application-level error handling is working, Option B suggests network/resource timeout, Option C suggests logic error or silent exception.

---
You can select A, B, or C, or provide your own answer.
```

**User:** "Connection timeout after 30 seconds with error 504"

**AI asks Question 3:**

```
✓ Noted: 504 Gateway Timeout after 30 seconds

Question 3/3

Have there been any recent changes to the authentication system or infrastructure?

Options:
  A: Yes, code changes to auth logic within the last week
  B: Yes, infrastructure/deployment changes recently
  C: No recent changes, issue appeared suddenly

Recommendation: Timing helps identify if this is a regression or environmental issue. Option A suggests code regression, Option B suggests infrastructure/config issue, Option C suggests gradual degradation or external dependency change.

---
You can select A, B, or C, or provide your own answer.
```

**User:** A - Updated session middleware 3 days ago

**After all questions answered, AI diagnoses and creates triage.md**

**AI responds:**

```
✓ Bug triaged: login-timeout

Root cause identified: Session middleware timeout configuration - likely set to 30s instead of 30m during recent update
Severity: Medium
Affected components: auth/session_middleware.py

Next step:
  /ai.plan-fix login-timeout — create fix implementation checklist
```
