# /task-update-docs

Update project documentation based on the completed task implementation.

## Steps

1. Read `.temp/tasks/state.yml` to identify the active task.

2. Read the task artifacts:
   - `prd.md` - What was requested and why
   - `plan.md` - What was implemented (check for completed phases)

3. Analyze what changed:
   - New features added
   - Existing features modified
   - Features/APIs removed
   - Configuration changes
   - New dependencies

4. **Research existing documentation** (using docs-researcher patterns):
   - Search README.md for related content
   - Search ./docs/*.md for related content
   - Identify documentation gaps and overlaps

5. **Generate ADRs from Decision Matrix**:
   - Read PRD Section 9 (Decisions)
   - For each significant decision (architectural, technology choice, pattern):
     - Create ADR file: `docs/adr/NNN-[slug].md`
     - Number sequentially based on existing ADRs
   - ADR format:

```markdown
# ADR-N: [Title]

## Status
Accepted

## Context
[Why this decision was needed - from PRD]

## Decision
[What was decided - from Decision Matrix]

## Consequences
[Derived constraints from PRD Section 10]

## Alternatives Considered
| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|

## Date
[From Decision Matrix]
```

6. Generate documentation update suggestions:

```markdown
# Documentation Update Analysis

## Implementation Summary
[Brief summary from PRD/plan]

## Related Existing Documentation
| File | Section | Relevance |
|------|---------|-----------|
| ./docs/authentication.md | OAuth | Partial coverage - missing new flow |
| README.md | Features | Missing new endpoints |

## Suggested Updates

### New Documentation Needed
| Priority | Topic | Suggested File |
|----------|-------|----------------|
| HIGH | Token refresh flow | ./docs/token-refresh.md |

### Updates to Existing Docs
| File | Section | Change |
|------|---------|--------|
| ./docs/authentication.md | OAuth | Add refresh token section |
| README.md | Features | Add 3 new endpoints to table |

### Potential Duplicates Detected
| New Topic | Existing Doc | Action |
|-----------|--------------|--------|
| OAuth flow | ./docs/authentication.md | Merge recommended |
```

6. Ask user:
   > "Apply which updates? [all/selective/none]"
   >
   > For selective: "Which items would you like to apply?"

7. Spawn `docs-manager` agent with:
   - `action`: "add" or "change" based on update type
   - `prd_path`: path to PRD for context
   - `plan_path`: path to plan for context
   - Specific updates to apply

8. After docs-manager completes, summarize:

```markdown
# Documentation Updated

## Files Changed
- ./docs/authentication.md (+45 lines: OAuth refresh flow)
- README.md (features table updated)

## Files Created
- ./docs/api-endpoints.md (new: 3 endpoints documented)

## Cross-references Verified
- All links in README.md verified
- Related docs cross-linked
```

## Integration with /project-docs

This command uses the `docs` skill infrastructure:
- Uses `docs-researcher` patterns for finding existing content
- Spawns `docs-manager` agent for CRUD operations
- Follows duplicate detection rules before adding
- Uses templates from `.claude/skills/docs/references/`

## Discovery Locations

Always check these locations:
- `README.md` (root)
- `./docs/*.md` (feature documentation)
- `./docs/api/*.md` (API reference)
- `./docs/guides/*.md` (tutorials)
- `CLAUDE.md` (AI guidelines - separate from user docs)
- PRD Section 9 (Additional Context) for doc references

## Hard Rules

- ALWAYS research existing docs before suggesting updates
- ALWAYS check for duplicates before creating new docs
- ALWAYS ask user before applying changes
- NEVER update CLAUDE.md from this command (use /rules for that)
- Keep README.md concise - details go in ./docs/
