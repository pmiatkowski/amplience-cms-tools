# /task-create

Create a new task. Usage: `/task-create <task-name> <brief description>`

## Steps

1. Parse `$ARGUMENTS`: first word is `<task-name>` (slugified, lowercase, hyphens), remainder is the description.
2. Create directory `.temp/tasks/<task-name>/`.
3. Analyze the user's description carefully. Generate `.temp/tasks/<task-name>/prd.md` using the structure below.
4. Write `.temp/tasks/state.yml` with active task info.
5. Confirm to the user with a summary and suggest running `/task-clarify` next.

## PRD Structure

```markdown
# PRD: <task-name>

**Status:** Draft
**Created:** <today's date>
**Last Updated:** <today's date>

## 1. Overview
[Synthesize user's description into a clear problem statement]

## 2. Goals
[Primary and secondary goals inferred from the brief]

## 3. Functional Requirements
### 3.1 Core Features
[Concrete requirements inferred from the brief]
### 3.2 Edge Cases & Error Handling
[Any edge cases that are implied or obvious]

## 4. Non-Functional Requirements
[Performance, security, accessibility — infer what's relevant]

## 5. Technical Considerations
[Known patterns, dependencies, constraints — leave blank if none known yet]

## 6. Out of Scope
[Things explicitly or implicitly NOT included]

## 7. Gaps & Ambiguities
[Things the user did NOT mention but that will need decisions. Be thorough here — this is critical for the clarification step.]

## 8. Open Questions
[Questions that must be answered before implementation can start]

## 9. Decisions
| ID | Question | Options | Chosen | Rationale | Date |
|----|----------|---------|--------|-----------|------|
[Populated by /task-clarify — records all decisions made during clarification]

## 10. Constraints
### Invariants (Must Never Change)
- [Constraints that must always hold — from project requirements or architecture]

### Derived from Decisions
- From D[n]: [Constraint that follows from a decision]

## 11. Additional Context
[Reserved — populated by /task-add-context]
```

## state.yml Structure

```yaml
active_task: <task-name>
created_at: <ISO date>
updated_at: <ISO date>
status: draft
task_path: .temp/tasks/<task-name>
prd: .temp/tasks/<task-name>/prd.md
plan: .temp/tasks/<task-name>/plan.md
context: .temp/tasks/<task-name>/context.md
constraints:
  invariants: []  # Constraints that must always hold
  decisions: []   # Constraints derived from decisions made in clarification
```
