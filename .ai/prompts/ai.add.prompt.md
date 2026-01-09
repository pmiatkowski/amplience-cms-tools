---
agent: agent
description:
  Add a new work item (feature, bug, etc.). AI classifies the type
  automatically.
---

You are adding a new work item. Classify the type and initialize appropriately.

### 1. Extract Description

Parse the user's description from the `/ai.add` command.

If missing:

```
Please provide a description:

/ai.add {description}

Examples:
  /ai.add Fix timeout on login page
  /ai.add Allow users to reset their password
```

### 2. Classify Work Type

Analyze the description to determine if this is a **feature** or **bug**:

**Bug indicators** (fix, bug, error, broken, crash, issue, failing, timeout,
etc.):

- "Fix timeout on login page" → bug
- "Login button is broken" → bug
- "Error when submitting form" → bug

**Feature indicators** (add, implement, create, allow, enable, support, etc.):

- "Allow users to reset password" → feature
- "Add email notifications" → feature
- "Implement dark mode" → feature

**Default**: If unclear, classify as **feature**.

### 3. Generate Name

Create a kebab-case name from the description:

- "Fix timeout on login page" → "login-timeout"
- "Allow users to reset password" → "user-password-reset"

### 4. Check Global Context (Optional)

Before initializing, check for relevant context to inform the user:

**A. Check Tech Stack:**

Check if `.ai/memory/tech-stack.md` exists (file existence only, don't read
contents).

**B. Find Related Features (FEATURES only, skip for bugs):**

1. Use glob to find all PRDs: `.ai/features/*/prd.md`
2. Extract feature names from paths (e.g., `.ai/features/user-auth/prd.md` →
   "user-auth")
3. Use simple keyword matching:
   - Split the new feature name by hyphens: "user-password-reset" → ["user",
     "password", "reset"]
   - Split existing feature names by hyphens
   - Count overlapping words (case-insensitive)
   - If 1+ words overlap, consider it related
   - Return top 1-2 matches (sorted by overlap count)

**Example matching:**

- New: "user-password-reset" → ["user", "password", "reset"]
- Existing: "user-auth" → ["user", "auth"]
- Overlap: ["user"] → 1 match → RELATED

**Store findings for Step 6 (Confirmation).**

**Error handling:**

- If tech-stack.md doesn't exist → no error, continue
- If no features exist → no error, continue
- If no matches found → no error, continue
- If glob fails → no error, continue

**Important**: This context is ONLY for confirmation message. Do NOT modify
`request.md` or `report.md` files.

### 5. Execute Init Script

Run:

```bash
python .ai/scripts/init-workflow.py "{name}" "{description}" --type {type}
```

### 6. Confirm to User (with Context)

**Conditional Messaging:**

Based on findings from Step 4, customize the confirmation message:

**For Features:**

- If tech stack exists AND related features found → show both
- If tech stack exists only → show tech stack note
- If related features found only → show related features note
- If neither → use basic template (no context section)

**For Bugs:**

- If tech stack exists → show tech stack note
- If not → use basic template (no context section)
- Never show related features for bugs (not relevant)

**Formatting Rules:**

- Use 📚 emoji for "Context Available" section
- Use 💡 emoji for helpful suggestions
- Limit related features to top 2 matches
- For related features, describe relationship: "(shares: user management)"
- Keep formatting clean and scannable

**Example for bug (WITH context):**

```
✓ Classified as: bug
✓ Bug initialized: login-timeout

Created: .ai/bugs/login-timeout/
Status: reported

📚 Context Available:
  • Tech stack defined: .ai/memory/tech-stack.md

💡 Consider referencing tech stack when adding context.

Next steps:
  1. /ai.add-context login-timeout — add relevant codebase context (optional)
  2. /ai.triage-bug login-timeout — diagnose root cause and plan fix
```

**Example for bug (WITHOUT context):**

```
✓ Classified as: bug
✓ Bug initialized: login-timeout

Created: .ai/bugs/login-timeout/
Status: reported

Next steps:
  1. /ai.add-context login-timeout — add relevant codebase context (optional)
  2. /ai.triage-bug login-timeout — diagnose root cause and plan fix
```

**Example for feature (WITH context):**

```
✓ Classified as: feature
✓ Feature initialized: user-password-reset

Created: .ai/features/user-password-reset/
Status: clarifying

📚 Context Available:
  • Tech stack defined: .ai/memory/tech-stack.md
  • Related features found:
    - user-auth (shares: user management)
    - password-policy (shares: password requirements)

💡 Consider reviewing related features when adding context in the next step.

Next steps:
  1. /ai.add-context user-password-reset — add relevant codebase context
  2. /ai.clarify user-password-reset — start requirements clarification
```

**Example for feature (WITHOUT context):**

```
✓ Classified as: feature
✓ Feature initialized: user-password-reset

Created: .ai/features/user-password-reset/
Status: clarifying

Next steps:
  1. /ai.add-context user-password-reset — add relevant codebase context
  2. /ai.clarify user-password-reset — start requirements clarification
```

### 7. STOP AND WAIT

**IMPORTANT: Your task ends here.**

**Do NOT continue to the next steps automatically:**

- Do NOT run `/ai.add-context`
- Do NOT run `/ai.clarify`
- Do NOT run `/ai.triage-bug`
- Do NOT start implementing or coding
- Do NOT ask follow-up questions about the workflow

**Wait for the user to explicitly run one of the suggested next commands.**

This is a step-by-step workflow where each command must be explicitly invoked by
the user. Your role was to classify and initialize the workflow. The user will
decide when to proceed.

---

## Example

**User:**

```
/ai.add Fix timeout on login page
```

**AI classifies:** bug (keyword "Fix")

**AI executes:**

```bash
python .ai/scripts/init-workflow.py "login-timeout" "Fix timeout on login page" --type bug
```

**AI responds:**

```
✓ Classified as: bug
✓ Bug initialized: login-timeout

Created: .ai/bugs/login-timeout/
├── state.yml (status: reported)
├── report.md
├── context.md
├── clarifications/
├── triage.md (pending)
└── fix-plan.md (pending)

Next steps:
  1. /ai.add-context login-timeout — add relevant codebase context (optional)
  2. /ai.triage-bug login-timeout — diagnose root cause and plan fix
```

---

## Example 2: Feature with Context

**User:**

```
/ai.add Allow users to export their data to CSV
```

**AI classifies:** feature (keyword "Allow")

**AI checks context:**

- Tech stack exists: ✓
- Related features: "user-data-import" (shares: user, data)

**AI executes:**

```bash
python .ai/scripts/init-workflow.py "user-data-export" "Allow users to export their data to CSV" --type feature
```

**AI responds:**

```
✓ Classified as: feature
✓ Feature initialized: user-data-export

Created: .ai/features/user-data-export/
Status: clarifying

📚 Context Available:
  • Tech stack defined: .ai/memory/tech-stack.md
  • Related features found:
    - user-data-import (shares: data handling, user features)

💡 Consider reviewing related features when adding context in the next step.

Next steps:
  1. /ai.add-context user-data-export — add relevant codebase context
  2. /ai.clarify user-data-export — start requirements clarification
```
