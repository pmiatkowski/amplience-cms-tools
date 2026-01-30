---
agent: agent
description:
  Add a new work item (feature or bug) with inline clarifications.
---

You are creating a new workflow item. This prompt handles: classification, initialization, and requirements clarification. PRD generation is a separate step via `/ai.create-prd`.

### 1. Extract Description

Parse the user's description from the `/ai.add` command and **preserve it exactly as provided**.

**IMPORTANT**: Store the full original description verbatim. This exact text will be saved to request.md/report.md. Do NOT summarize, shorten, or paraphrase it.

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

**Bug indicators** (fix, bug, error, broken, crash, issue, failing, timeout, etc.):

- "Fix timeout on login page" → bug
- "Login button is broken" → bug
- "Error when submitting form" → bug

**Feature indicators** (add, implement, create, allow, enable, support, etc.):

- "Allow users to reset password" → feature
- "Add email notifications" → feature
- "Implement dark mode" → feature

**Default**: If unclear, classify as **feature**.

### 3. Generate Name

Create a short kebab-case **name** from the description (for folder naming):

- "Fix timeout on login page" → "login-timeout"
- "Allow users to reset password" → "user-password-reset"

**Note**: The name is a short identifier only. The original full description will be passed separately to the init script.

### 4. Check Global Context (Optional)

Before initializing, check for relevant context to inform the user:

**A. Check Tech Stack:**

Check if `.ai-workflow/memory/tech-stack.md` exists (file existence only, don't read contents yet).

**B. Find Related Features (FEATURES only, skip for bugs):**

1. Use glob to find all PRDs: `.ai-workflow/features/*/prd.md`
2. Extract feature names from paths (e.g., `.ai-workflow/features/user-auth/prd.md` → "user-auth")
3. Use simple keyword matching:
   - Split the new feature name by hyphens: "user-password-reset" → ["user", "password", "reset"]
   - Split existing feature names by hyphens
   - Count overlapping words (case-insensitive)
   - If 1+ words overlap, consider it related
   - Return top 1-2 matches (sorted by overlap count)

**Store findings for confirmation message in Step 10.**

**Error handling:**
- If tech-stack.md doesn't exist → no error, continue
- If no features exist → no error, continue
- If no matches found → no error, continue
- If glob fails → no error, continue

**Important**: This context is ONLY for the confirmation message. Do NOT modify files during this step.

### 5. Execute Init Script

Run:

```bash
python .ai-workflow/scripts/init-workflow.py "{name}" "{original_description}" --type {type}
```

Where:
- `{name}` = the short kebab-case name generated in Step 3
- `{original_description}` = the **full original description** from Step 1 (verbatim, not summarized)

**IMPORTANT**: Always pass the complete original user description. If the user wrote 5 sentences, pass all 5 sentences. Never truncate or summarize.

This creates the workflow structure and sets initial state.

**Note**: The init script automatically updates `.ai-workflow/memory/global-state.yml` to set the newly created workflow as current. No manual action needed - the script will confirm with `✓ Set as current {workflow_type}`.

### 5A. Prompt for Context (Optional)

**Purpose**: Give user opportunity to provide codebase/business context before clarification questions.

**Ask user:**

```
Would you like to provide codebase context to inform the PRD and clarification questions?

Context helps me:
- Ask more relevant clarification questions
- Generate a PRD aligned with your existing architecture
- Suggest integration points with existing code

You can provide:
- Relevant files (paths + descriptions)
- Business logic (rules, constraints, existing behavior)
- Technical constraints (stack, dependencies, limitations)
- Notes (any other relevant context)

Answer: yes/no (or 'skip')
```

**If user responds 'yes':**

1. Prompt: "Please provide the context (paste files, describe relevant code, or explain constraints):"
2. Wait for user input
3. Organize input into these sections:
   - File paths → **Relevant Files**
   - Business rules/constraints → **Business Logic**
   - Tech stack mentions → **Technical Constraints**
   - Everything else → **Notes**
4. Write to context.md (`.ai-workflow/features/{name}/context.md` or `.ai-workflow/bugs/{name}/context.md`)
5. Confirm: "✓ Context saved. This will inform clarification questions."

**If user responds 'no' or 'skip':**

- Continue to Step 6 without context

**context.md Format** (from init-workflow.py template):

```markdown
# Context

## Relevant Files
- `path/to/file.ts` — {description from user}

## Business Logic
- {rule from user}

## Technical Constraints
- {constraint from user}

## Notes
{other notes from user}
```

**Only populate sections with content provided by user. Leave other sections with placeholder comments.**

**Edge Cases:**

| Situation | Behavior |
|-----------|----------|
| User provides unstructured text | Best-effort organization; unclear content → Notes |
| User provides only file paths | Only populate Relevant Files |
| User cancels after saying "yes" | Allow "skip"/"cancel" to abort |
| Context already has content (rare) | Ask: merge/replace/cancel (use ai.add-context.prompt.md logic) |

### 6. Read Workflow Context

Now read the created workflow context to inform clarification questions:

**For features**, read from `.ai-workflow/features/{name}/`:
- `state.yml` - current status
- `request.md` - original description
- `context.md` - user-provided context (may have content if user chose to add context)

**For bugs**, read from `.ai-workflow/bugs/{name}/`:
- `state.yml` - current status
- `report.md` - bug description
- `context.md` - user-provided context (may have content if user chose to add context)

**Read global context (if available)**:
- `.ai-workflow/memory/tech-stack.md` - global tech stack (if exists from Step 4 check)

If tech-stack.md doesn't exist, proceed without it (no error).

### 7. Analyze Gaps and Plan Clarification Questions

**IMPORTANT**: If context.md has content, use it to:
- Understand existing architecture and integration points
- Identify what's already known vs. what needs clarification
- Align clarification questions with existing patterns and constraints
- Avoid asking about information already provided

Example:
- If context.md lists relevant files → Reference them when asking integration questions
- If context.md documents business rules → Avoid asking about rules already specified
- If context.md specifies technical constraints → Respect them when presenting option trade-offs

**For FEATURES:**

Based on the request description and available context, identify gaps in:

- **Functional clarity**: What exactly should happen?
- **Edge cases**: What happens when X fails/is empty/exceeds limits?
- **User experience**: Who uses this? What's the flow?
- **Technical integration**: How does this connect to existing code?
- **Scope boundaries**: What's explicitly NOT included?
- **Acceptance criteria**: How do we know it's done?

**For BUGS:**

Based on the bug report and available context, identify gaps in:

- **Reproduction steps**: How to consistently reproduce?
- **Expected vs actual behavior**: What should happen vs what happens?
- **Impact scope**: What's affected? How many users?
- **Error messages/logs**: Any specific errors?
- **Environment**: When/where does this occur?
- **Root cause hints**: Any clues about what's failing?

**Research Common Solution Patterns:**

Use context.md hints (tech stack, existing patterns) and industry knowledge to identify:

- What do similar features/bugs typically do?
- What are the 3 most common approaches for this gap?
- What trade-offs exist between approaches?

**Plan 5-7 Critical Questions:**

- Prioritize most important gaps first
- For each question, prepare 3 options (A, B, C) based on:
  - **PRIORITY 1**: Common industry patterns
  - **PRIORITY 2**: Different solution approaches
  - **FALLBACK**: Spectrum (minimal/moderate/comprehensive)
- Include a recommendation with reasoning

**Example Gap-to-Pattern Mapping:**

- Gap: "How should password reset work?"
  - Pattern research: Email link (most common), SMS code, security questions
  - Context check: User mentioned "existing email system"
  - Options: A=Email link, B=Email+SMS, C=Security questions

### 8. Ask Sequential Clarification Questions

**IMPORTANT**: Ask ONE question at a time, wait for user answer, then ask the next question.

**Question Format:**

```
Question {n}/{total}+

{Clarifying question}

Options:
  A: {Most common pattern/approach with key trade-off}
  B: {Second common pattern/approach with key trade-off}
  C: {Third pattern or alternative with key trade-off}

Recommendation: Option {X}, because {reasoning based on context and common practices}

---
You can select A, B, or C, or provide your own answer.
```

**Option Generation Guidelines:**

- Each option: 1-2 sentences with key trade-off in parentheses
- Make options mutually exclusive
- Align options with context.md constraints when possible
- Focus on what's most common in the industry for this type of work

**After Each Answer:**

1. Acknowledge: `✓ Saved: {brief summary of answer}`
2. Determine next action:
   - If more planned questions remain → Ask next question
   - If user's answer reveals critical new gap → Optionally add 1-2 follow-up questions (update total count)
   - If all questions answered → Proceed to Step 9 (Features) or Step 10 (Bugs)

**Dynamic Follow-ups (Hybrid Approach):**

- Limit to 1-2 follow-ups maximum per session
- Only add if answer reveals critical missing information
- Update progress indicator: `Question 6/6+` → `Question 6/7+`

**Track Progress in Conversation:**

- Track answers in conversation history during the Q&A session
- After ALL questions are answered, proceed to Step 9 to save clarifications

### 9. Save Clarifications (FEATURES ONLY)

**For FEATURES**: After all clarification questions are answered, append the Q&A to request.md.

**For BUGS**: Skip this step and proceed to Step 10.

---

**Append to:** `.ai-workflow/features/{name}/request.md`

**Format to append:**

```markdown

## Clarifications

### Round 1

#### Q1: {question text}
User: {user's answer}

#### Q2: {question text}
User: {user's answer}

... (continue for all questions)
```

**Note:** Only save the question text and user's answer. Do not include the Options A/B/C or Recommendations (those were only for the interactive Q&A).

**After saving clarifications:**

Update `.ai-workflow/features/{name}/state.yml`:

```yaml
status: clarified
updated: {YYYY-MM-DD}
```

### 10. Confirm Completion

**For FEATURES (clarified, ready for PRD):**

Show completion summary with context if available:

```
✓ Feature initialized and clarified!

Created: .ai-workflow/features/{name}/
├── state.yml (status: clarified)
├── request.md ← includes {X} clarifications
└── context.md

{If context found in Step 4:}
📚 Context Available:
  • Tech stack defined: .ai-workflow/memory/tech-stack.md
  {If related features:}
  • Related features found:
    - {feature-name} (shares: {common keywords})

💡 Consider reviewing related features before generating PRD.

Next steps:
  1. /ai.create-prd {name} — generate PRD from clarifications
  2. Or: /ai.clarify {name} — add more clarifications first
```

**For BUGS (no PRD):**

Show completion summary with context if available:

```
✓ Workflow complete! Bug clarified and ready for triage.

Created: .ai-workflow/bugs/{name}/
├── state.yml (status: reported)
├── report.md
├── context.md
├── triage.md (pending)
└── fix-plan.md (pending)

{If context found in Step 4:}
📚 Context Available:
  • Tech stack defined: .ai-workflow/memory/tech-stack.md

💡 Consider referencing tech stack when adding context.

Next steps:
  1. /ai.triage-bug {name} — diagnose root cause and plan fix
```

**Important Formatting**:
- Use 📚 emoji for "Context Available" section
- Use 💡 emoji for helpful suggestions
- Only show context section if tech-stack.md exists OR related features found
- For bugs, never show related features (not relevant)

---

## Example Session: Feature

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
python .ai-workflow/scripts/init-workflow.py "user-data-export" "Allow users to export their data to CSV" --type feature
```

**AI prompts for context:**

```
Would you like to provide codebase context to inform the PRD and clarification questions?

Context helps me:
- Ask more relevant clarification questions
- Generate a PRD aligned with your existing architecture
- Suggest integration points with existing code

You can provide:
- Relevant files (paths + descriptions)
- Business logic (rules, constraints, existing behavior)
- Technical constraints (stack, dependencies, limitations)
- Notes (any other relevant context)

Answer: yes/no (or 'skip')
```

**User:** yes

**AI:** Please provide the context (paste files, describe relevant code, or explain constraints):

**User:**
```
We have existing import feature at src/features/import/
Export should mirror import structure.

Business rule: Exports rate-limited to 1 per hour per user.

Using Node.js streams for large files.
```

**AI:** ✓ Context saved. This will inform clarification questions.

**AI reads context** (request.md, context.md, tech-stack.md if exists)

**AI identifies gaps** and plans 5 questions about export format, data scope, performance, authentication, download mechanism

**AI asks Question 1:**

```
Question 1/5+

What data should users be able to export?

Options:
  A: All user data (profile, settings, activity history)
  B: Specific data categories (user chooses what to export)
  C: Only current profile data (minimal export)

Recommendation: Option B, because it gives users control while limiting file size. Most GDPR-compliant systems (like Google Takeout, Twitter Data Export) allow selective export.

---
You can select A, B, or C, or provide your own answer.
```

**User:** B

**AI acknowledges and continues:**

```
✓ Saved: Users can select specific data categories to export

Question 2/5+

What file format should the export use?

Options:
  A: Single CSV file (simple, universally compatible)
  B: ZIP archive with multiple CSVs (one per data category)
  C: JSON format (more structured, developer-friendly)

Recommendation: Option B, because when users select multiple categories (from previous answer), organizing as separate CSVs in a ZIP makes data easier to parse. This is the industry standard (Facebook, LinkedIn exports).

---
You can select A, B, or C, or provide your own answer.
```

**... continues through all 5 questions ...**

**After final answer, AI appends clarifications** to `request.md`

**AI updates state.yml** to `clarified`

**AI confirms:**

```
✓ Feature initialized and clarified!

Created: .ai-workflow/features/user-data-export/
├── state.yml (status: clarified)
├── request.md ← includes 5 clarifications
└── context.md

📚 Context Available:
  • Tech stack defined: .ai-workflow/memory/tech-stack.md
  • Related features found:
    - user-data-import (shares: data handling, user features)

💡 Consider reviewing related features before generating PRD.

Next steps:
  1. /ai.create-prd user-data-export — generate PRD from clarifications
  2. Or: /ai.clarify user-data-export — add more clarifications first
```

---

## Example Session: Bug

**User:**

```
/ai.add Fix memory leak in WebSocket handler
```

**AI classifies:** bug (keyword "Fix")

**AI executes:**

```bash
python .ai-workflow/scripts/init-workflow.py "websocket-memory-leak" "Fix memory leak in WebSocket handler" --type bug
```

**AI prompts for context:**

```
Would you like to provide codebase context to inform the PRD and clarification questions?

Context helps me:
- Ask more relevant clarification questions
- Generate a PRD aligned with your existing architecture
- Suggest integration points with existing code

You can provide:
- Relevant files (paths + descriptions)
- Business logic (rules, constraints, existing behavior)
- Technical constraints (stack, dependencies, limitations)
- Notes (any other relevant context)

Answer: yes/no (or 'skip')
```

**User:** yes

**AI:** Please provide the context (paste files, describe relevant code, or explain constraints):

**User:**
```
WebSocket handler is at src/services/websocket-handler.ts
Using ws library v8.x
Connection pool managed in src/services/connection-pool.ts

Memory leak appears after ~1000 connections over 24 hours.
```

**AI:** ✓ Context saved. This will inform clarification questions.

**AI reads context** (report.md, context.md, tech-stack.md if exists)

**AI identifies gaps** and plans 4 questions about reproduction, symptoms, environment, scope

**AI asks Question 1:**

```
Question 1/4+

How consistently does the memory leak occur?

Options:
  A: Happens every time WebSocket connections are established (100% reproducible)
  B: Happens intermittently, roughly 20-50% of connections
  C: Happens only under specific conditions (certain message types, long-lived connections, etc.)

Recommendation: Understanding consistency helps identify the failure type. Option A suggests a code-level bug, Option B suggests race conditions, Option C suggests environment-specific or data-dependent issues.

---
You can select A, B, or C, or provide your own answer.
```

**... continues through all 4 questions ...**

**After final question, AI does NOT generate PRD** (bugs skip PRD generation)

**AI confirms:**

```
✓ Workflow complete! Bug clarified and ready for triage.

Created: .ai-workflow/bugs/websocket-memory-leak/
├── state.yml (status: reported)
├── report.md
├── context.md
├── triage.md (pending)
└── fix-plan.md (pending)

📚 Context Available:
  • Tech stack defined: .ai-workflow/memory/tech-stack.md

💡 Consider referencing tech stack when adding context.

Next steps:
  1. Update context.md with WebSocket implementation details (optional but recommended)
  2. /ai.triage-bug websocket-memory-leak — diagnose root cause and plan fix
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| No description provided | Error with usage examples |
| Classification unclear | Default to feature |
| User interrupts mid-clarification | Stop gracefully, note conversation was incomplete, suggest continuing manually |
| User provides contradictory answers | Note contradiction, ask for clarification as follow-up |
| Tech stack doesn't exist | Proceed without tech considerations, note in final message |
| Too many gaps identified (>10) | Prioritize top 5-7 most critical gaps |

---

## Important Notes

- **Single continuous session**: This entire workflow happens in one user invocation
- **Clarifications appended to request.md**: After all Q&A, append to `request.md` for features (not separate files)
- **PRD is separate**: PRD generation happens via `/ai.create-prd`, not in this workflow
- **Bugs skip clarification storage**: Bugs proceed directly to triage (clarifications not saved to file)
- **Context discovery is passive**: Check for tech-stack.md and related features, but only for informational purposes in the final message
