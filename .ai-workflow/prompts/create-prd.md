# Prompt: create-prd

## Purpose
Synthesize all feature inputs into a structured PRD document.

## Usage
```
User: /create-prd                     # Uses current context
User: /create-prd {feature-name}      # Explicit feature
```

---

## Instructions

You are a technical product manager. Your goal is to synthesize all gathered information into a clear, actionable PRD.

### 1. Determine Feature Name

**Parameter resolution:**

1. If user provided explicit name in command (`/create-prd feature-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`
3. If current context is a bug, error:

```
⚠ Current context is a bug, not a feature.

Bugs use /triage-bug instead of /create-prd.

To work with a feature:
  /set-current {feature-name}
  /create-prd
```

4. If no current context, error:

```
⚠ No feature specified and no current context set.

Please either:
  1. Specify the feature name: /create-prd {name}
  2. Set current context: /set-current {name}

Example:
  /create-prd user-auth
```

**Verify feature exists:**

Check if `.ai-workflow/features/{name}/` exists.

If not found:
```
✗ Feature '{name}' not found.

Create it first: /add "{description}"
```

### 2. Read All Feature Context

Read everything from `.ai-workflow/features/{name}/`:

```
├── state.yml
├── request.md
├── context.md
└── clarifications/
    ├── round-01.md
    ├── round-02.md
    └── ...
```

### 3. Validate Readiness

Before generating PRD, check:

- [ ] Original request exists (`request.md`)
- [ ] At least one clarification round completed
- [ ] No critical "TBD" items blocking core functionality

If not ready:
```
⚠ Not ready for PRD generation.

Missing:
  - {list what's missing}

Recommendation: Run /clarify to address gaps first.
```

### 4. Generate PRD

Create `prd.md` using this exact structure:

```markdown
# PRD: {Feature Name}

> **Status**: Draft  
> **Created**: {YYYY-MM-DD}  
> **Last Updated**: {YYYY-MM-DD}

---

## Overview
{One-paragraph summary of what this feature does and why it matters}

## Problem Statement
{What problem does this solve? What's the current pain point?}

## Goals
{What does success look like? Be specific and measurable where possible}

- Goal 1
- Goal 2

## Non-Goals
{What is explicitly out of scope for this feature?}

- Non-goal 1
- Non-goal 2

## User Stories
<!-- Optional section — remove if not applicable -->

- As a {role}, I want {action}, so that {benefit}

## Functional Requirements

### FR-1: {Requirement title}
{Description of requirement}

### FR-2: {Requirement title}
{Description of requirement}

...

## Technical Considerations
{Constraints, dependencies, integration points, architectural notes}

## Acceptance Criteria

- [ ] AC-1: {Criterion}
- [ ] AC-2: {Criterion}
- [ ] AC-3: {Criterion}

## Open Questions
{Unresolved items, or "None" if fully resolved}
```

### 5. PRD Quality Rules

**Content rules:**
- All sections required except User Stories (optional)
- Use "TBD" if insufficient information — never omit section
- Functional requirements must be numbered (FR-1, FR-2, ...)
- Acceptance criteria must be checkboxes
- Keep language concise and specific
- Avoid implementation details — focus on *what*, not *how*

**Synthesis rules:**
- Don't just copy from clarifications — synthesize
- Resolve contradictions (note if unresolvable)
- Fill gaps with reasonable assumptions (mark as assumptions)
- Prioritize requirements if many (must-have vs nice-to-have)

### 6. Update State

Update `state.yml`:
```yaml
status: prd-draft
updated: {YYYY-MM-DD}
```

### 7. Confirm Completion

```
✓ Created prd.md (status: prd-draft)

Summary:
  - {X} functional requirements
  - {Y} acceptance criteria
  - {Z} open questions

Next steps:
  1. Review prd.md
  2. If changes needed: run /update-feature
  3. If approved: update state.yml status to 'prd-approved'
  4. Then: run /define-implementation-plan
```

---

## Example Output

```markdown
# PRD: user-auth

> **Status**: Draft  
> **Created**: 2025-01-28  
> **Last Updated**: 2025-01-28

---

## Overview
User authentication feature allowing users to securely log in with email and password, with support for session management and password reset.

## Problem Statement
Currently users cannot access personalized features because there is no authentication system. Users have requested the ability to save preferences and access them across devices.

## Goals
- Enable secure user login with email/password
- Support password reset via email
- Maintain user sessions for 7 days with "remember me"

## Non-Goals
- Social login (Google, GitHub) — future phase
- Two-factor authentication — future phase
- User registration (handled by separate feature)

## User Stories

- As a returning user, I want to log in with my email, so that I can access my saved preferences
- As a forgetful user, I want to reset my password, so that I can regain access to my account

## Functional Requirements

### FR-1: Login form
Display email and password fields with validation. Show inline errors for invalid input.

### FR-2: Session management
Create session on successful login. Session expires after 24 hours, or 7 days if "remember me" checked.

### FR-3: Password reset
Send reset link to email. Link expires after 1 hour. User sets new password via link.

### FR-4: Rate limiting
Lock account for 15 minutes after 5 failed login attempts.

## Technical Considerations
- Must integrate with existing User model in `src/models/user.ts`
- Use existing email service for password reset
- Sessions stored in Redis (existing infrastructure)
- Passwords hashed with bcrypt (minimum 10 rounds)

## Acceptance Criteria

- [ ] AC-1: User can log in with valid email/password
- [ ] AC-2: User sees error message with invalid credentials
- [ ] AC-3: User receives password reset email within 1 minute
- [ ] AC-4: Session persists across browser restart when "remember me" checked
- [ ] AC-5: Account locks after 5 failed attempts

## Open Questions
None
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| Feature doesn't exist | Error: "Feature '{name}' not found" |
| No clarifications yet | Warn and suggest running /clarify first |
| PRD already exists | Ask: overwrite, create prd-v2.md, or cancel |
| Many TBDs in clarifications | Generate PRD with TBD sections, note in summary |
