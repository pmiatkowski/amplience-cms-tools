# Prompt: add-feature

## Purpose
Initialize a new feature. AI invokes the init script and confirms setup.

## Usage
```
User: /add-feature {feature-name} {description}
```

---

## Instructions

You are initializing a new feature. Execute the setup script and guide the user to next steps.

### 1. Parse Input

Extract from user message:
- **feature-name**: Identifier (will be converted to kebab-case)
- **description**: Brief description of the feature

If missing:
```
Please provide feature name and description:

/add-feature {name} {description}

Example:
/add-feature user-auth Allow users to login with email and password
```

### 2. Execute Init Script

Run:
```bash
python .ai-workflow/scripts/init-feature.py "{feature-name}" "{description}"
```

### 3. Handle Result

**On success:**
```
✓ Feature initialized: {feature-name}

Created:
  .ai-workflow/features/{feature-name}/
  ├── state.yml (status: clarifying)
  ├── request.md
  ├── context.md
  ├── clarifications/
  └── updates/

Next steps:
  1. /add-context {feature-name} — add relevant codebase context
  2. /clarify {feature-name} — start requirements clarification
```

**On error (feature exists):**
```
✗ Feature '{feature-name}' already exists.

Options:
  1. Choose a different name
  2. Delete .ai-workflow/features/{feature-name}/ and retry
  3. Continue with existing feature: /clarify {feature-name}
```

---

## Example

**User:**
```
/add-feature user-auth Allow users to login with email and password
```

**AI executes:**
```bash
python .ai-workflow/scripts/init-feature.py "user-auth" "Allow users to login with email and password"
```

**AI responds:**
```
✓ Feature initialized: user-auth

Created:
  .ai-workflow/features/user-auth/
  ├── state.yml (status: clarifying)
  ├── request.md
  ├── context.md
  ├── clarifications/
  └── updates/

Next steps:
  1. /add-context user-auth — add relevant codebase context
  2. /clarify user-auth — start requirements clarification
```
