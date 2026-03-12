# /task-verify

Verify quality at a specific stage. Usage: `/task-verify <prd|plan|code>`

## Steps

1. Read `.temp/tasks/state.yml`.
2. Parse `$ARGUMENTS` to determine verification type.

## Verification Types

### `prd`
Check PRD quality:
- Does it have clear, unambiguous requirements?
- Are all gaps and ambiguities addressed?
- Is it consistent with the project's existing features and patterns?
- Are non-functional requirements realistic?
- Produce a gap report with actionable suggestions.

### `plan`
Check plan quality against the PRD:
- Does the plan cover all functional requirements?
- Are the phases logically ordered with correct dependencies?
- Is the code in the plan consistent with repo patterns and conventions?
- Are quality checks defined for each phase?
- Produce a coverage report.

### `code`
Check implementation quality:
- Discover and run all quality commands (`package.json`, `Makefile`, `CLAUDE.md`).
- Compare implemented code against `plan.md` — flag any deviations.
- Check adherence to coding guidelines from `CLAUDE.md`.
- Produce a verification report at `.temp/tasks/<name>/verify-report.md`.

## Output

Always produce a structured report:
```markdown
# Verification Report: <type> — <task-name>
**Date:** <date>
**Result:** PASS | PARTIAL | FAIL

## Issues Found
| # | Severity | Location | Issue | Recommendation |
|---|----------|----------|-------|----------------|

## Summary
[Brief overall assessment]
```
