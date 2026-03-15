# /task-clarify

Run a structured clarification session for the active task.

## Steps

1. Read `.temp/tasks/state.yml` to identify the active task.
2. Read the task's `prd.md` file.
3. Check `$ARGUMENTS`:
   - If user specified a number (e.g., `5`) — run exactly that many questions.
   - If user specified a topic (e.g., `auth flow`) — focus questions on that topic.
   - If no arguments — analyze the PRD's "Gaps & Ambiguities" and "Open Questions" sections and decide how many questions are needed (typically 3–8, scaled to complexity).
4. Run the clarification session using the format below.
5. After the final question, ask the user:
   > "That covers the key questions. Would you like another round of clarification, or shall I update the PRD with your answers?"

## Clarification Session Format

Use this exact format for each question. Ask questions one at a time — do NOT ask if the user wants to continue between questions; maintain a natural flow.

```markdown
## Question [N]: [Topic Name]

[1–2 sentences explaining why this decision matters for the PRD]

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **A** | **[Short name]** — [Description] | [Pros/Cons] |
| **B** | **[Short name]** — [Description] | [Pros/Cons] |
| **C** | **[Short name]** — [Description] | [Pros/Cons] |
| **D** | **[Short name]** — [Description] | [Pros/Cons] |

---

**My Recommendation: Option [X]**

[2–3 sentences explaining reasoning, acknowledging tradeoffs]

---
```

Wait for the user's response before asking the next question. Accept:
- Single option: `B`
- Combination: `B + D`
- Modification: `B but without X`

After each answer, note it internally. Do NOT recap after every question — only summarize at the very end.

## After Session Ends

When the user says "update PRD" (or equivalent):
1. Rewrite `.temp/tasks/<n>/prd.md` incorporating all clarification answers directly into the relevant sections — update requirements, resolve ambiguities, fill gaps in place. Do not add change annotations, diff markers, or "previously X, now Y" notes. The document should read as if it was always written this way.
2. **Populate the Decision Matrix** (Section 9 in PRD):
   - For each question asked, add a row: `| D{N} | {Question topic} | {Options presented} | {User's choice} | {Why this choice} | {Date} |`
   - Number decisions sequentially: D1, D2, D3...
3. **Extract constraints to Section 10**:
   - Add any invariants (constraints that must always hold) discovered
   - For each decision, add derived constraints: `From D{N}: {constraint that follows}`
4. **Update state.yml constraints**:
   ```yaml
   constraints:
     invariants:
       - "First invariant from discussion"
       - "Second invariant"
     decisions:
       - id: D1
         constraint: "Constraint derived from D1"
       - id: D2
         constraint: "Constraint derived from D2"
   ```
5. Update `updated_at` in `state.yml`.
6. Tell the user what changed and suggest `/task-add-context` or `/task-plan` next.
