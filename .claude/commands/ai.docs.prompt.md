---
agent: agent
description:
  Verify documentation accuracy against implemented features or fixed bugs.
---

## Important: This Is Documentation Analysis Only

⚠️ **ANALYZE AND REPORT, DO NOT EDIT**

Your role is to identify gaps between implemented features/bugs and existing documentation, then present findings to the user. **Do NOT make any changes without explicit user instruction.**

**Do:**

- ✓ Read global-state.yml to determine current workflow
- ✓ Read workflow artifacts (request, PRD, implementation plan, fix-plan)
- ✓ Discover and read documentation files
- ✓ Analyze documentation gaps and present findings
- ✓ Wait for user input before any modifications
- ✓ Accept user-specified documentation locations

**Do NOT:**

- ✗ Edit any documentation files without explicit user approval
- ✗ Create new documentation files automatically
- ✗ Make assumptions about what should be documented
- ✗ Proceed with updates without user confirmation
- ✗ Skip presenting findings to user

After presenting the gap analysis, **STOP and wait for user instructions**.

## Usage

```
User: /ai.docs                           # Uses current context, auto-discovers docs
User: /ai.docs {workflow-name}           # Explicit workflow name
User: /ai.docs --docs="CONTRIBUTING.md,docs/api.md"  # User-specified doc locations
User: /ai.docs {name} --docs="custom.md" # Combined: explicit workflow + custom docs
```

---

## Instructions

You are a documentation analyst verifying that project documentation accurately reflects the current state of implemented features or fixed bugs. Your goal is to identify gaps and present them to the user for review.

### 1. Determine Workflow Name and Type

**Parameter resolution:**

1. If user provided explicit name (`/ai.docs feature-name`), use it
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
  1. Specify the workflow name: /ai.docs {name}
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

### 2. Verify Implementation Status

**For features**, check `.ai-workflow/features/{name}/implementation-plan/plan-state.yml`:

```yaml
status: completed  # Should be completed or have significant progress
```

Also check `plan.md` for completed tasks (`- [x]`).

**For bugs**, check `.ai-workflow/bugs/{name}/fix-plan.md` for completed tasks (`- [x]`).

**If implementation has NOT started:**

```
⚠ No implementation progress detected for '{name}'.

Documentation review is most valuable after implementation is complete or 
significantly progressed.

Would you like to:
  1. Continue anyway (review docs against planned changes)
  2. Wait until implementation progresses

Please respond with 1 or 2.
```

**STOP AND WAIT for user response.**

### 3. Load Workflow Artifacts

Read the following artifacts based on workflow type:

**For features:**

1. `.ai-workflow/features/{name}/request.md` - Original request and clarifications
2. `.ai-workflow/features/{name}/prd.md` - Product requirements document
3. `.ai-workflow/features/{name}/implementation-plan/plan.md` - Implementation details

**For bugs:**

1. `.ai-workflow/bugs/{name}/report.md` - Bug description and reproduction
2. `.ai-workflow/bugs/{name}/triage.md` - Root cause analysis
3. `.ai-workflow/bugs/{name}/fix-plan.md` - Fix implementation checklist

**Extract key information:**

- Feature/bug name and description
- Key functionality added or fixed
- API changes or new endpoints
- Configuration changes
- User-facing changes
- Breaking changes (if any)
- Dependencies added or updated

### 4. Discover Documentation Files

**Step 1: Check user-specified locations**

If user provided `--docs="..."` parameter, parse and include those files first.

**Step 2: Auto-discover standard documentation**

Check for these files in order:

| Location | Priority | Purpose |
|----------|----------|---------|
| `CLAUDE.md` | High | AI agent guidance, architecture overview |
| `README.md` | High | Project overview, getting started |
| `AGENTS.md` | High | Multi-agent coordination guidelines |
| `CONTRIBUTING.md` | Medium | Contribution guidelines |
| `docs/` folder | Medium | Detailed documentation |
| `API.md` or `docs/api.md` | Medium | API documentation |
| `CHANGELOG.md` | Low | Version history |

**Step 3: List discovered documentation**

```
📚 Documentation Discovery

Found documentation files:
  ✓ CLAUDE.md (862 lines)
  ✓ README.md (156 lines)
  ✓ docs/api.md (234 lines)
  ✗ AGENTS.md (not found)
  ✗ CONTRIBUTING.md (not found)

{If user specified additional docs:}
User-specified:
  ✓ custom/docs.md (45 lines)
  ✗ missing-file.md (not found)

Proceeding with analysis of {N} documentation files...
```

### 5. Analyze Documentation Gaps

**For each documentation file, analyze:**

1. **Missing Information** - Feature/fix not mentioned at all
2. **Outdated Information** - Existing content contradicts new implementation
3. **Incomplete Information** - Feature mentioned but lacks details
4. **Incorrect Examples** - Code samples don't reflect current implementation

**Analysis Categories:**

| Category | Description | Severity |
|----------|-------------|----------|
| **Missing** | Feature/fix not documented anywhere | High |
| **Outdated** | Existing docs contradict implementation | High |
| **Incomplete** | Docs exist but lack important details | Medium |
| **Examples** | Code samples need updating | Medium |
| **Minor** | Typos, formatting, minor improvements | Low |

**Cross-reference checklist:**

- [ ] Is the feature/fix mentioned in README.md overview?
- [ ] Is the API documented (if applicable)?
- [ ] Are configuration options documented?
- [ ] Are breaking changes noted?
- [ ] Is CLAUDE.md updated with new architecture/commands?
- [ ] Are usage examples current?
- [ ] Is the changelog updated (if exists)?

### 6. Generate Gap Analysis Report

**Display the report inline (do NOT create a file):**

```markdown
# 📋 Documentation Gap Analysis: {workflow-name}

> **Analyzed**: {YYYY-MM-DD HH:MM:SS}
> **Workflow**: {workflow-name} ({workflow_type})
> **Implementation Status**: {status from plan-state.yml}

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

{For each high priority gap:}

#### H-{N}: {Gap Title}

**File**: `{documentation file path}`
**Type**: {Missing | Outdated}
**Details**: {Clear description of what's missing or incorrect}

**What should be documented:**
{Specific information from the implementation that needs to be added}

**Suggested location**: {Section or heading where this should go}

---

### 🟡 Medium Priority

{For each medium priority gap:}

#### M-{N}: {Gap Title}

**File**: `{documentation file path}`
**Type**: {Incomplete | Examples}
**Details**: {Description of what's incomplete}

**Current content**: 
> {Quote existing incomplete content if applicable}

**Missing information:**
{What needs to be added}

---

### 🔵 Low Priority

{For each low priority gap:}

#### L-{N}: {Gap Title}

**File**: `{documentation file path}`
**Observation**: {Minor issue description}

---

## Documents Analyzed

| File | Status | Gaps Found |
|------|--------|------------|
| `CLAUDE.md` | {Analyzed/Not Found} | {count} |
| `README.md` | {Analyzed/Not Found} | {count} |
| ... | ... | ... |

---

## Workflow Artifacts Referenced

- Request/Report: `.ai-workflow/{type}s/{name}/request.md` or `report.md`
- PRD/Triage: `.ai-workflow/{type}s/{name}/prd.md` or `triage.md`
- Plan: `.ai-workflow/{type}s/{name}/implementation-plan/plan.md` or `fix-plan.md`

```

### 7. Wait for User Input

**⚠️ CRITICAL: Do NOT proceed without explicit user instruction.**

After presenting the gap analysis, display:

```
---

## ⏳ Awaiting Your Instructions

I've identified {N} documentation gaps. What would you like to do?

**Options:**

1. **Update all** - I'll update all documentation files with the identified gaps
2. **Update specific** - Tell me which gaps to address (e.g., "Update H-1 and M-2")
3. **Update with notes** - Provide additional context or instructions for the updates
4. **Skip for now** - No documentation changes needed at this time
5. **Add more docs** - Specify additional documentation files to analyze

**Examples:**
- "Update all"
- "Update H-1, H-2, and M-1"
- "Update H-1 with note: also mention the rate limiting feature"
- "Skip"
- "Add docs/deployment.md to the analysis"

---
Please provide your instructions.
```

**STOP AND WAIT for user response before any file modifications.**

### 8. Process User Instructions

Based on user response:

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
✓ Documentation review complete. No changes made.

You can run /ai.docs again later to review documentation.
```

**If "Add more docs":**

1. Add specified files to the analysis
2. Re-run gap analysis with expanded scope
3. Present updated findings
4. Return to waiting for instructions

### 9. Confirm Completion

After making approved changes:

```
✓ Documentation updated for '{workflow-name}'

**Files Modified:**
- CLAUDE.md: {summary of changes}
- README.md: {summary of changes}

**Changes Made:**
- H-1: Added feature description to README overview
- M-2: Updated API examples in docs/api.md

No further documentation gaps identified.
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| No workflow context set | Ask user to specify workflow or set context |
| Workflow has no implementation | Warn user, offer to continue anyway |
| No documentation files exist | Report that no docs found, suggest creating them |
| All docs are up-to-date | Report "UP-TO-DATE" status, no action needed |
| User provides invalid gap IDs | Ask for clarification with valid options |
| User wants to add new doc file | Guide through creation after analyzing existing |
| Implementation is partial | Note which parts are implemented vs. planned |
| Breaking changes detected | Highlight with high priority in report |

---

## Example Scenarios

### Scenario 1: Feature with Outdated README

**User**: `/ai.docs user-auth`

**AI**:

```
📚 Documentation Discovery

Found documentation files:
  ✓ CLAUDE.md (862 lines)
  ✓ README.md (156 lines)
  ✗ AGENTS.md (not found)

Proceeding with analysis of 2 documentation files...

# 📋 Documentation Gap Analysis: user-auth

> **Analyzed**: 2026-01-30 14:32:15
> **Workflow**: user-auth (feature)
> **Implementation Status**: completed

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
**Details**: README has no mention of the new authentication system.

**What should be documented:**
- User registration flow
- Login/logout endpoints
- JWT token handling
- Password reset functionality

**Suggested location**: New "## Authentication" section after "## Getting Started"

#### H-2: CLAUDE.md Missing Auth Commands

**File**: `CLAUDE.md`
**Type**: Missing
**Details**: No documentation of auth-related API endpoints or flows.

**What should be documented:**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/reset-password

**Suggested location**: Under "## API Endpoints" section

---

⏳ Awaiting Your Instructions

I've identified 3 documentation gaps. What would you like to do?
...
```

**User**: "Update H-1 and H-2"

**AI**:

```
I'll update the following:
- README.md: Add "## Authentication" section
- CLAUDE.md: Add auth endpoints documentation

Proceed? (yes/no)
```

**User**: "yes"

**AI**: *Makes edits to both files*

```
✓ Documentation updated for 'user-auth'

Files Modified:
- README.md: Added Authentication section with registration, login, and password reset docs
- CLAUDE.md: Added 4 auth endpoints to API documentation

No further high-priority documentation gaps identified.
```

### Scenario 2: Bug Fix Needing Minor Updates

**User**: `/ai.docs login-timeout`

**AI**:

```
📚 Documentation Discovery

Found documentation files:
  ✓ CLAUDE.md (862 lines)
  ✓ README.md (156 lines)

# 📋 Documentation Gap Analysis: login-timeout

> **Workflow**: login-timeout (bug)
> **Implementation Status**: resolved

---

## Summary

**Documentation Status**: UP-TO-DATE

| Severity | Count |
|----------|-------|
| 🔴 High | 0 |
| 🟡 Medium | 0 |
| 🔵 Low | 1 |

---

## Gaps Found

### 🔵 Low Priority

#### L-1: Consider Adding Troubleshooting Section

**File**: `README.md`
**Observation**: The login timeout fix might be worth mentioning in a troubleshooting section for users who experience similar issues.

---

⏳ Awaiting Your Instructions

Documentation is mostly up-to-date. One minor suggestion found.
...
```

**User**: "Skip"

**AI**:

```
✓ Documentation review complete. No changes made.

You can run /ai.docs again later to review documentation.
```

### Scenario 3: User Specifies Custom Docs

**User**: `/ai.docs user-auth --docs="docs/security.md,DEPLOYMENT.md"`

**AI**:

```
📚 Documentation Discovery

Found documentation files:
  ✓ CLAUDE.md (862 lines)
  ✓ README.md (156 lines)

User-specified:
  ✓ docs/security.md (89 lines)
  ✗ DEPLOYMENT.md (not found)

⚠ Note: DEPLOYMENT.md was not found. Continuing with available files.

Proceeding with analysis of 3 documentation files...
```

---

## Notes for Implementation

**Key Points:**

1. **Never edit without permission** - Always present findings first, wait for explicit instruction
2. **Inline reports only** - Do not create report files, display analysis directly
3. **Discovery + Override** - Auto-discover standard docs AND accept user-specified locations
4. **Confirmation loops** - Always confirm before making changes
5. **Incremental updates** - Allow user to select specific gaps to address
6. **User notes** - Support additional context from user during update process

**Standard Documentation Locations:**

- `CLAUDE.md` - AI guidance (this project uses it extensively)
- `README.md` - Project overview
- `AGENTS.md` - Multi-agent coordination
- `docs/` folder - Detailed documentation
- `CONTRIBUTING.md` - Contribution guidelines
- `CHANGELOG.md` - Version history

**This is a read-only analysis by default. All file modifications require explicit user approval.**
