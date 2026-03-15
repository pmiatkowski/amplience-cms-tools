# /task-verify

Verify quality at a specific stage. Usage: `/task-verify <prd|plan|code> [deep]`

## Steps

1. Read `.temp/tasks/state.yml`.
2. Parse `$ARGUMENTS` to determine verification type and mode.

## Verification Types

### `prd`
Check PRD quality:
- Does it have clear, unambiguous requirements?
- Are all gaps and ambiguities addressed?
- Is it consistent with the project's existing features and patterns?
- Are non-functional requirements realistic?
- **Deep mode**: Check decision matrix completeness, constraint traceability
- Produce a gap report with actionable suggestions.

### `plan`
Check plan quality against the PRD:
- Does the plan cover all functional requirements?
- Are the phases logically ordered with correct dependencies?
- Is the code in the plan consistent with repo patterns and conventions?
- Are quality checks defined for each phase?
- **Deep mode**: Run plan-verificator agent for comprehensive analysis
- Produce a coverage report.

### `code`
Check implementation quality:
- Discover and run all quality commands (`package.json`, `Makefile`, `CLAUDE.md`).
- Compare implemented code against `plan.md` — flag any deviations.
- Check adherence to coding guidelines from `CLAUDE.md`.
- **Deep mode**: Check constraint compliance, run security/performance checks
- Produce a verification report at `.temp/tasks/<name>/verify-report.md`.

## Deep Mode

When `deep` is specified, spawn specialized agents:

| Type | Agent | Additional Checks |
|------|-------|-------------------|
| prd | - | Decision matrix, constraint derivation |
| plan | plan-verificator | Coverage, dependencies, file conflicts |
| code | task-verificator | Constraints, security, performance |

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
