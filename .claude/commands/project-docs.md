# /project-docs

Manage project documentation (README.md, ./docs/*.md). Usage: `/project-docs <action> [args]`

## Actions

| Action | Description | Example |
|--------|-------------|---------|
| `init` | Initialize docs structure with templates | `/project-docs init` |
| `research <query>` | Find information in docs/codebase | `/project-docs research authentication` |
| `add <topic>` | Add new documentation | `/project-docs add API endpoints` |
| `change <topic>` | Update existing documentation | `/project-docs change installation` |
| `delete <topic>` | Remove documentation | `/project-docs delete legacy-api` |
| `scan` | Scan codebase and suggest doc updates | `/project-docs scan` |

## Steps

1. Parse `$ARGUMENTS` to determine the action:
   - First word is the action (`init`, `research`, `add`, `change`, `delete`, `scan`)
   - Remainder is the argument (search query, topic, or nothing for init/scan)

2. Execute the appropriate action using the docs skill:

   - **init**: Spawn `docs-initializer` agent to set up documentation structure
   - **research**: Spawn `docs-researcher` agent to find information
   - **add/change/delete**: Spawn `docs-manager` agent for CRUD operations
   - **scan**: Run codebase discovery to find undocumented areas

3. For `add`, `change`, `delete` actions:
   - ALWAYS research first to find existing similar content
   - If potential duplicates found, ask user: merge, create separate, or cancel
   - Present a summary of changes before applying

4. For `research`:
   - Search documentation first, then codebase if needed
   - If no results found, return "NO RESULTS for <query>" (never guess)

5. For `init`:
   - Check for existing docs (README.md, ./docs/*)
   - If docs exist: ask to extend, reorganize, or create new
   - If no docs: ask for empty templates, scan codebase, or interactive mode

## Action Details

### init

Initialize or reorganize project documentation structure.

**Process:**
1. Check for existing README.md and ./docs/ directory
2. If docs exist:
   - Present summary of existing structure
   - Ask: Extend (add missing), Reorganize (move details to ./docs/), or Create new
3. If no docs:
   - Ask: Empty templates, Scan codebase first, or Interactive Q&A
4. Create README.md as index with links to ./docs/*.md
5. Create ./docs/ structure based on choice

### research

Search documentation and codebase for information.

**Critical:** NEVER guess or infer. If no explicit information found, return "NO RESULTS".

**Process:**
1. Search README.md for query
2. Search ./docs/*.md for query
3. Search codebase (source files, configs, comments)
4. Return findings with exact citations, or "NO RESULTS" if nothing found

### add

Add new documentation with duplicate checking.

**Process:**
1. Research existing docs for similar topics
2. If potential duplicate: offer merge, separate, or cancel
3. Determine location (README.md overview vs ./docs/<topic>.md detail)
4. Create from template
5. Update README.md feature index if new ./docs/ file created

### change

Modify existing documentation.

**Process:**
1. Search for matching documentation
2. Present all matches with context
3. Ask user to confirm which to modify
4. Apply changes preserving structure
5. Update cross-references if needed

### delete

Remove documentation.

**Process:**
1. Search for matching documentation
2. Present matches with full context
3. Ask user to confirm deletion
4. Remove file/section
5. Clean up cross-references in README.md

### scan

Scan codebase for documentation gaps.

**Process:**
1. Detect undocumented features (public APIs, config options, modules)
2. Detect outdated documentation (removed code still documented)
3. Produce scan report with recommendations
4. Offer to create/update documentation

## Reference

This command activates the `docs` skill. See `.claude/skills/docs/` for implementation details.
