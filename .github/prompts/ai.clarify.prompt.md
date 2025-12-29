# Prompt: clarify

## Purpose
Refine workflow requirements through clarifying questions.

## Usage
```
User: /clarify                        # Uses current context
User: /clarify {workflow-name}        # Explicit workflow
User: /clarify {workflow-name} --questions 3
```

---

## Instructions

You are a requirements analyst. Your goal is to ask clarifying questions that will help produce a complete, unambiguous PRD (for features) or triage document (for bugs).

### 1. Determine Workflow Name

**Parameter resolution:**

1. If user provided explicit name in command (`/clarify workflow-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`
3. If no current context set, error:

```
⚠ No workflow specified and no current context set.

Please either:
  1. Specify the workflow name: /clarify {name}
  2. Set current context: /set-current {name}

Example:
  /clarify user-auth
```

**Verify workflow exists:**

Check if `.ai-workflow/features/{name}/` or `.ai-workflow/bugs/{name}/` exists.

If not found:
```
✗ Workflow '{name}' not found.

Create it first: /add "{description}"
```

### 2. Read Workflow Context

Based on workflow type, read from the appropriate path:

- Features: `.ai-workflow/features/{name}/`
- Bugs: `.ai-workflow/bugs/{name}/`

Read these files from the workflow directory:

```
├── state.yml           # current status
├── request.md or report.md  # original description
├── context.md          # codebase/business context (if exists)
└── clarifications/     # previous rounds (if any)
    ├── round-01.md
    └── ...
```

### 3. Analyze Gaps

Based on what you've read, identify gaps in:

- **Functional clarity**: What exactly should happen?
- **Edge cases**: What happens when X fails/is empty/exceeds limits?
- **User experience**: Who uses this? What's the flow?
- **Technical integration**: How does this connect to existing code?
- **Scope boundaries**: What's explicitly NOT included?
- **Acceptance criteria**: How do we know it's done?

### 4. Ask Questions

**Rules:**
- Ask questions that can't be answered from existing context
- Don't repeat questions from previous rounds
- Focus on gaps that would block PRD creation
- Unless user specifies count, decide based on complexity (typically 3-7)
- Ask all questions at once, numbered

**Question format:**
```
Based on the feature request and context, I have the following questions:

1. [Question about X]
2. [Question about Y]
...

Please answer each question. If unsure, say "TBD" and we can revisit.
```

### 5. Save Clarification Round

After user answers, create `clarifications/round-{n}.md`:

```markdown
# Clarification Round {n}

## Date
{YYYY-MM-DD}

## Questions & Answers

### Q1: {question}
**A**: {user's answer}

### Q2: {question}
**A**: {user's answer}

...

## Summary
{Brief summary of key decisions/clarifications made this round}
```

### 6. Update State

Update `state.yml`:
```yaml
updated: {YYYY-MM-DD}
```

### 7. Suggest Next Step

After saving:
```
✓ Saved clarifications/round-{n}.md

Options:
  - Run /clarify again if more questions needed
  - Run /create-prd if ready to generate PRD
```

---

## Example Session

**User:**
```
/clarify user-auth
```

**AI reads:** request.md, context.md, (no previous clarifications)

**AI responds:**
```
Based on the feature request for user-auth, I have the following questions:

1. Should users be able to reset their password? If yes, via email or SMS?
2. Is there a maximum login attempt limit before account lockout?
3. Should the session expire after a certain time of inactivity?
4. Are there any existing user tables/models this needs to integrate with?
5. Should we support "remember me" functionality?

Please answer each question. If unsure, say "TBD" and we can revisit.
```

**User answers, AI saves to `clarifications/round-01.md`**

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| No previous clarifications | This is round-01 |
| User says "enough" mid-round | Save partial answers, note incomplete |
| User specifies `--questions N` | Ask exactly N questions |
| All questions already answered | Suggest proceeding to /create-prd |
| Feature doesn't exist | Error: "Feature '{name}' not found" |

---

## Question Quality Checklist

Good questions are:
- [ ] Specific (not "tell me more about X")
- [ ] Actionable (answer leads to concrete decision)
- [ ] Non-redundant (not answered in context.md or previous rounds)
- [ ] Scoped (about this feature, not general architecture)
- [ ] Prioritized (most important gaps first)
