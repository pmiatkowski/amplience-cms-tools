---
name: docs
description: |
  Manage project documentation (README.md, ./docs/*.md). Use when the user wants to
  initialize, research, add, change, delete, or scan documentation. Triggers include:
  "docs", "documentation", "README", "initialize docs", "update docs", "find in docs",
  "living docs", "project documentation".
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, Agent
---

# Docs Skill

Manage project documentation stored in README.md and ./docs/*.md files.

## Documentation Hierarchy

| Priority | Location | Purpose |
|----------|----------|---------|
| 1 | README.md | Project overview, quick start, feature index |
| 2 | ./docs/*.md | Detailed feature/module documentation |
| 3 | ./docs/api/*.md | API reference documentation |
| 4 | ./docs/guides/*.md | Tutorials and how-to guides |
| 5 | CLAUDE.md | AI coding guidelines (separate from user docs) |

**Default assumption**: README.md is the index, details go in ./docs/*.md.

## Critical Rules

1. **NEVER guess** - If information is not explicitly found, return "NO RESULTS"
2. **Always research first** - Before add/change/delete, check for existing similar content
3. **Ask before destructive operations** - Confirm before deleting or major reorganization
4. **Keep README concise** - It's an index, move details to ./docs/

## Actions

### INIT Documentation

Initialize documentation structure using templates.

**Process:**

1. Check if README.md exists
2. Check if ./docs/ directory with .md files exists
3. If docs exist:
   - Present summary of existing docs
   - Ask: "Extend existing docs" or "Reorganize" or "Create new (preserve old)"
   - If reorganize: extract details from README to ./docs/*.md files
4. If no docs:
   - Ask: "Empty templates" or "Scan codebase first" or "Interactive"
   - If scan: run discovery first, then create populated templates
5. Create README.md from template (see references/README_TEMPLATE.md)
6. Create ./docs/ structure as needed
7. Ensure all ./docs/*.md files are linked from README.md

**Template usage:**
- README.md: overview + feature index with links
- ./docs/<feature>.md: detailed documentation per feature/module

### RESEARCH Documentation

Search documentation and codebase for information.

**CRITICAL CONSTRAINT:**
> MUST only return information explicitly found in documentation or codebase.
> FORBIDDEN to guess or infer. If no explicit information found, return:
> "NO RESULTS for <search text>"

**Process:**

1. Search README.md for query matches using Grep
2. Search ./docs/*.md for query matches using Grep
3. Search codebase (source files, configs, comments)
4. Compile findings with source citations (file:line format)
5. If absolutely no results: return "NO RESULTS for <query>"
6. NEVER fabricate or assume information

**Output format (found):**

```markdown
# Research Results: <query>

## Summary
[Direct answer synthesized from found information ONLY]

## Sources

### Documentation
| File | Line | Excerpt |
|------|------|---------|
| README.md | 45 | "To configure authentication..." |
| ./docs/auth.md | 12-18 | "Authentication supports OAuth2..." |

### Codebase
| File | Line | Context |
|------|------|---------|
| src/auth.ts | 23 | Function with JSDoc |

## Related
- Links to related documentation sections
```

**Output format (not found):**

```markdown
# Research Results: <query>

**Result:** NO RESULTS for "<query>"

## Locations Searched
- README.md
- ./docs/*.md (X files)
- Source files
- Configuration files

## Suggestions
1. Try different search terms: [alternatives]
2. Run `/project-docs scan` to identify documentation gaps
3. Run `/project-docs add <topic>` to create this documentation
```

### ADD Documentation

Add new documentation.

**Process:**

1. **ALWAYS check for duplicates first** (see references/DUPLICATE_CHECK.md)
2. Scan existing docs for similar topics using semantic matching
3. If potential duplicate found:
   - Present existing doc with overlap details
   - Ask: "Merge with existing" or "Create separate" or "Cancel"
4. Determine appropriate location:
   - README.md: for overview/quick-start additions
   - ./docs/<topic>.md: for detailed feature documentation
   - ./docs/api/<topic>.md: for API reference
   - ./docs/guides/<topic>.md: for tutorials
5. Create from template (see references/FEATURE_DOC_TEMPLATE.md)
6. Update README.md feature index if new ./docs/ file created
7. Report what was created and where

**Duplicate detection:**
- Title similarity (fuzzy match)
- Content overlap (key terms)
- Same code symbols referenced

### CHANGE Documentation

Modify existing documentation.

**Process:**

1. Search for documentation matching the query
2. Present all matching docs with context (file, section, preview)
3. Ask user to confirm which to modify
4. Accept the modification (full replacement or guided edit)
5. Apply change preserving markdown structure
6. Update cross-references if titles change
7. Report before/after summary

**Matching strategies:**
- Exact file name match
- Section header match
- Content keyword search
- Fuzzy match for partial queries

### DELETE Documentation

Remove documentation.

**Process:**

1. Search for documentation matching the query
2. Present matching docs with full context:
   - File path and size
   - Preview of content
   - Links from other docs (cross-references)
3. Ask user to confirm deletion
4. Remove file or section
5. Clean up cross-references in README.md
6. If ./docs/<file>.md deleted, update README.md feature index
7. Report what was deleted

### SCAN Codebase

Scan codebase and suggest documentation updates.

**Process:**

1. Detect undocumented features:
   - Public functions/classes without doc comments
   - API endpoints not in docs
   - Configuration options not documented
   - Modules without ./docs/*.md files
2. Detect outdated documentation:
   - Code symbols that no longer exist
   - Version references that are outdated
   - Commands that have changed
3. Produce scan report with recommendations:
   - Missing documentation (priority ranked)
   - Outdated documentation (specific issues)
   - Suggested new ./docs/*.md files
4. Offer to create/update documentation based on findings

**Output format:**

```markdown
# Documentation Scan Report

## Summary
- Total docs: X files
- Coverage: Y% of modules documented
- Issues: Z findings

## Missing Documentation
| Priority | Item | Suggested Location |
|----------|------|-------------------|
| HIGH | Authentication module | ./docs/authentication.md |
| MEDIUM | Config options | ./docs/configuration.md |

## Outdated Documentation
| File | Issue | Action |
|------|-------|--------|
| ./docs/api.md | References removed endpoint | Remove or update |

## Suggested Actions
1. Create ./docs/authentication.md
2. Update ./docs/api.md section 3
3. Add config table to ./docs/configuration.md

---
Apply suggestions? [all/selective/none]
```

## Reference Files

- `references/README_TEMPLATE.md` - Industry-standard README template
- `references/FEATURE_DOC_TEMPLATE.md` - Template for ./docs/*.md files
- `references/SEARCH_PATTERNS.md` - Patterns for effective documentation search
- `references/DUPLICATE_CHECK.md` - Duplicate detection patterns

## Best Practices

1. **Keep README.md concise**: It's an index, not the full documentation
2. **Cross-reference liberally**: Link between docs using relative paths
3. **Update with code**: Docs should evolve with the codebase
4. **Be specific**: "Click Submit button" > "Submit the form"
5. **Include examples**: Code snippets, commands, screenshots
6. **Research before changing**: Always check for existing similar content
7. **Never guess**: Return "NO RESULTS" rather than fabricating information
