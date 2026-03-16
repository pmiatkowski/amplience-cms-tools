# /task-constraints

Manage constraints for the active task. Usage: `/task-constraints <add|list|check|remove> [args]`

## Purpose

Constraints are rules that must never be violated during implementation. They come from two sources:
1. **Invariants** - Fixed rules from project requirements
2. **Decision-derived** - Constraints that follow from decisions made in clarification

## Commands

### `add invariant "<constraint>"`

Add a new invariant constraint.

```bash
/task-constraints add invariant "All API calls must be authenticated"
```

### `add decision <D-id> "<constraint>"`

Add a constraint derived from a specific decision.

```bash
/task-constraints add decision D1 "Must use OAuth2, not custom auth"
```

### `list`

List all constraints for the active task.

```bash
/task-constraints list
```

Output:
```
Constraints for task: <task-name>

Invariants (Must Never Change):
| ID | Constraint | Added |
|----|------------|-------|
| I1 | All API calls must be authenticated | 2024-01-15 |

Decision-Derived:
| ID | From | Constraint | Added |
|----|------|------------|-------|
| D1-1 | D1 | Must use OAuth2, not custom auth | 2024-01-15 |
```

### `check`

Verify that current implementation respects all constraints.

```bash
/task-constraints check
```

This reads the implemented files and checks for constraint violations.

### `remove <constraint-id>`

Remove a constraint by ID (use with caution).

```bash
/task-constraints remove I1
```

## Steps

1. Read `.temp/tasks/state.yml` to identify active task.
2. Parse `$ARGUMENTS` to determine command.
3. Execute the appropriate action.

### Add Invariant

1. Read current `state.yml`
2. Add to `constraints.invariants` array:
   ```yaml
   constraints:
     invariants:
       - id: I<n>
         constraint: "<constraint text>"
         added_at: <ISO timestamp>
   ```
3. Also update PRD Section 10
4. Confirm to user

### Add Decision Constraint

1. Read current `state.yml`
2. Verify decision D-id exists in PRD Section 9
3. Add to `constraints.decisions` array:
   ```yaml
   constraints:
     decisions:
       - id: D<n>-<m>
         from_decision: D<n>
         constraint: "<constraint text>"
         added_at: <ISO timestamp>
   ```
4. Also update PRD Section 10
5. Confirm to user

### List Constraints

1. Read `state.yml` constraints section
2. Read PRD Section 10
3. Display formatted output

### Check Constraints

1. Read all constraints
2. Read implemented files (from plan.md)
3. For each constraint:
   - Analyze if code respects it
   - Flag any violations
4. Output report:
   ```
   Constraint Check Report

   | Constraint | Status | Evidence |
   |------------|--------|----------|
   | I1: All API calls authenticated | PASS | All routes use authMiddleware |
   | D1-1: Must use OAuth2 | PASS | OAuth2Strategy used in auth.ts |

   Result: ALL PASS
   ```

### Remove Constraint

1. Verify constraint exists
2. Ask for confirmation (constraints should rarely be removed)
3. Remove from `state.yml` and PRD Section 10
4. Confirm to user

## Integration

Constraints are automatically:
- Checked by task-executor before implementation
- Verified by task-verificator after implementation
- Injected into context by inject-task-context.sh hook
- Updated when decisions are made in /task-clarify
