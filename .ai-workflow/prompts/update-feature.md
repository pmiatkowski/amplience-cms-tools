# Prompt: update-feature

## Purpose
Handle requirement changes after PRD exists. Captures the change, triggers clarification if needed, and refines the PRD.

## Usage
```
User: /update-feature                # Uses current context
User: /update-feature {feature-name} # Explicit feature
```

Then user describes what changed.

---

## Instructions

You are managing a requirements change. Your goal is to capture the change, assess its impact, and update documentation accordingly.

### 1. Determine Feature Name

**Parameter resolution:**

1. If user provided explicit name (`/update-feature feature-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`
3. If current context is a bug:

```
⚠ Current context is a bug, not a feature.

Features have PRDs and updates. Bugs use /triage-bug and /plan-fix.

To update a feature:
  /set-current {feature-name}
  /update-feature
```

4. If no current context:

```
⚠ No feature specified and no current context set.

Please either:
  1. Specify the feature name: /update-feature {name}
  2. Set current context: /set-current {name}
```

**Verify feature exists:**

Check if `.ai-workflow/features/{name}/` exists.

### 2. Verify PRD Exists

Check `.ai-workflow/features/{name}/prd.md` exists.

If not:
```
⚠ No PRD found for '{feature-name}'.

Use /update-feature for changes after PRD is created.
For initial development, use:
  - /add-context to add context
  - /clarify to refine requirements
  - /create-prd to generate PRD
```

### 2. Prompt for Change Description

If user hasn't provided change details:

```
What's changing for {feature-name}?

Describe:
- What needs to change
- Why it's changing (if known)
- Any new constraints or requirements
```

### 3. Save Update Record

Create `updates/update-{n}.md`:

```markdown
# Feature Update {n}

## Date
{YYYY-MM-DD}

## Change Description
{user's description of what changed}

## Reason
{why it's changing, or "Not specified"}

## Impact Assessment
<!-- AI fills this -->

**Affected PRD sections:**
- {section 1}
- {section 2}

**Severity:** {Minor | Moderate | Major}

- **Minor**: Wording changes, small tweaks, no new requirements
- **Moderate**: New requirements, modified acceptance criteria
- **Major**: Scope change, architectural impact, affects multiple FRs
```

### 4. Assess Impact

Read current `prd.md` and determine:

1. Which sections are affected
2. Severity of change
3. Whether clarification is needed

**Clarification needed if:**
- Change introduces ambiguity
- Change conflicts with existing requirements
- Change has unclear scope
- User said "not sure" or "maybe"

### 5. Branch Based on Severity

**Minor changes:**
```
This appears to be a minor change affecting:
  - {affected sections}

I can update the PRD directly. Proceed? (yes/no)
```

If yes → Update PRD inline, skip clarification.

**Moderate/Major changes:**
```
This change affects:
  - {affected sections}

Severity: {Moderate | Major}

Recommendation: Run /clarify {feature-name} to address:
  - {question 1}
  - {question 2}

Then run /create-prd {feature-name} to regenerate PRD.

Or if you're confident, I can update the PRD directly.
```

### 6. Update PRD (if proceeding directly)

When updating PRD:

1. Add update reference at top:
```markdown
> **Last Updated**: {YYYY-MM-DD}  
> **Updates**: See updates/update-{n}.md
```

2. Modify affected sections
3. Mark modified items with `[Updated]` tag temporarily
4. Update acceptance criteria if needed
5. Add to Open Questions if unresolved items

### 7. Update State

Update `state.yml`:
```yaml
status: prd-draft  # reset to draft if was approved
updated: {YYYY-MM-DD}
```

### 8. Confirm Completion

```
✓ Saved updates/update-{n}.md

Impact:
  - Severity: {Minor | Moderate | Major}
  - Affected: {list sections}

{If PRD updated directly}
✓ Updated prd.md

Changes made:
  - {change 1}
  - {change 2}

{If clarification recommended}
Next step:
  Run /clarify {feature-name} to address open questions
```

---

## Example Session

**User:**
```
/update-feature user-auth

We need to add support for OAuth with Google. Users should be able to login with their Google account as an alternative to email/password.
```

**AI assesses and responds:**

```
✓ Saved updates/update-01.md

Impact:
  - Severity: Major
  - Affected: Functional Requirements, Technical Considerations, Acceptance Criteria

This is a significant scope addition that requires:
  - New OAuth flow implementation
  - Google API integration
  - Account linking strategy (what if email exists?)

Recommendation: Run /clarify user-auth to address:
  1. Should Google login create a new account or require existing account?
  2. How to handle email conflicts (Google email matches existing account)?
  3. Should users be able to link/unlink Google after registration?
  4. Is Google the only OAuth provider, or plan for others?

Then run /create-prd user-auth to regenerate PRD with changes.
```

---

## Example: Minor Change

**User:**
```
/update-feature user-auth

Change the session timeout from 24 hours to 12 hours for non-remembered sessions.
```

**AI responds:**
```
✓ Saved updates/update-02.md

Impact:
  - Severity: Minor
  - Affected: FR-2 (Session management)

This is a straightforward value change. I can update the PRD directly.

Proceed? (yes/no)
```

**User:** yes

**AI updates PRD and responds:**
```
✓ Updated prd.md

Changes made:
  - FR-2: Changed session expiration from 24h to 12h for non-remembered sessions
  - AC-4: Updated to reflect 12h timeout

Status reset to: prd-draft
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| Feature doesn't exist | Error: "Feature '{name}' not found" |
| No PRD exists | Redirect to normal flow (add-context → clarify → create-prd) |
| Implementation already started | Warn that plan may need updating too |
| Contradicts existing requirement | Flag conflict, require user resolution |
| Vague change description | Ask clarifying questions before saving |
| Multiple changes at once | Save as single update, assess combined impact |
