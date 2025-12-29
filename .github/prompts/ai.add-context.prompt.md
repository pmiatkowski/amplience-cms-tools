# Prompt: add-context

## Purpose
Add or update codebase and business context for a workflow (feature or bug).

## Usage
```
User: /add-context                    # Uses current context
User: /add-context {workflow-name}     # Explicit workflow
```

Then user provides context (code snippets, file references, business rules, etc.)

---

## Instructions

You are helping the user document relevant context for a workflow. Your goal is to organize provided information into a structured `context.md` file.

### 1. Determine Workflow Name

**Parameter resolution:**

1. If user provided explicit name in command (`/add-context workflow-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`
3. If no current context set, error:

```
⚠ No workflow specified and no current context set.

Please either:
  1. Specify the workflow name: /add-context {name}
  2. Set current context: /set-current {name}

Example:
  /add-context user-auth
```

**After determining name, verify it exists:**

Check if `.ai-workflow/features/{name}/` or `.ai-workflow/bugs/{name}/` exists.

If not found:
```
✗ Workflow '{name}' not found.

Create it first: /add "{description}"
```

### 2. Read Existing Context

Based on workflow type, check if `context.md` exists:

- Features: `.ai-workflow/features/{name}/context.md`
- Bugs: `.ai-workflow/bugs/{name}/context.md`

### 3. Prompt for Context

If user hasn't provided context in their message, ask:

```
What context would you like to add for {feature-name}?

You can provide any of the following:
- **Relevant files**: paths + brief descriptions
- **Code snippets**: existing code this feature interacts with
- **Business logic**: rules, constraints, current behavior
- **Technical constraints**: stack, dependencies, limitations
- **Notes**: anything else relevant

Paste or describe the context, and I'll organize it into context.md.
```

### 4. Organize Context

Take user's input and organize into `context.md` structure:

```markdown
# Context

## Relevant Files
<!-- Files this feature will interact with -->

- `path/to/file.ts` — {brief description}
- `path/to/another.ts` — {brief description}

## Code Snippets
<!-- Existing code relevant to this feature -->

### {Snippet description}
```{language}
{code}
```

## Business Logic
<!-- Rules, constraints, existing behavior -->

- {rule 1}
- {rule 2}

## Technical Constraints
<!-- Stack, dependencies, limitations -->

- {constraint 1}
- {constraint 2}

## Notes
<!-- Any other relevant context -->

{notes}
```

### 5. Merge or Replace

If context.md already has content:

```
context.md already has content. How should I proceed?

1. **Merge** — Add new context to existing sections
2. **Replace** — Overwrite with new context
3. **Cancel** — Keep existing, don't change
```

### 6. Save and Confirm

After saving:

```
✓ Updated context.md

Added:
  - {X} relevant files
  - {Y} code snippets
  - {summary of other additions}

Next steps:
  - Run /add-context again to add more
  - Run /clarify to start requirements clarification
```

---

## Example Session

**User:**
```
/add-context user-auth

Here's what's relevant:

We have an existing User model at src/models/user.ts that has email and passwordHash fields.

The auth should use our existing Redis setup for sessions - config is in src/config/redis.ts.

Business rules:
- Passwords must be 8+ chars
- Email must be verified before login (we have isVerified field)
- Max 5 login attempts per hour

We're using Express + TypeScript.
```

**AI saves to `context.md`:**

```markdown
# Context

## Relevant Files

- `src/models/user.ts` — User model with email and passwordHash fields
- `src/config/redis.ts` — Redis configuration for sessions

## Code Snippets
<!-- No code snippets provided yet -->

## Business Logic

- Passwords must be 8+ characters
- Email must be verified before login (isVerified field exists)
- Maximum 5 login attempts per hour

## Technical Constraints

- Express + TypeScript stack
- Redis for session storage (existing infrastructure)

## Notes
<!-- No additional notes -->
```

**AI responds:**
```
✓ Updated context.md

Added:
  - 2 relevant files
  - 3 business rules
  - 2 technical constraints

Next steps:
  - Run /add-context again to add more
  - Run /clarify to start requirements clarification
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| Feature doesn't exist | Error: "Feature '{name}' not found" |
| Empty context provided | Ask user to provide at least some context |
| Only code snippets provided | Fill other sections with placeholder comments |
| User pastes large file | Summarize and ask if full content needed |
| Conflicting info with existing | Flag conflict, ask user to resolve |

---

## Context Quality Tips

When organizing context, ensure:

- [ ] File paths are relative to project root
- [ ] Code snippets have language tags for syntax highlighting
- [ ] Business rules are actionable (not vague)
- [ ] Technical constraints mention specific technologies/versions
- [ ] No sensitive data (passwords, API keys) included
