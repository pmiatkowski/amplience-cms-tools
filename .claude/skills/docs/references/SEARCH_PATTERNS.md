# Documentation Search Patterns

Patterns for effective documentation and codebase search.

## Query Processing

### Multi-Word Queries

Split and search both combined and individual terms:

```text
Query: "user authentication"
Search patterns:
  - "user authentication" (exact phrase)
  - "authentication" (key term)
  - "auth" (common abbreviation)
  - "login" (synonym)
  - "user" (context term)
```

### Technical Terms

Handle variations and related terms:

```text
Query: "API endpoint"
Also search:
  - "endpoint"
  - "route"
  - "API"
  - "REST"
  - "HTTP method"
  - "handler"
```

### Case Sensitivity

- Default: case-insensitive for documentation
- Code symbols: case-sensitive (`getUser` vs `getuser`)
- File paths: case-sensitive on Unix, insensitive on Windows

## Search Strategy

### Tier 1: Documentation First

Always start with documentation files:

1. **README.md** - Project overview
2. **./docs/*.md** - Feature documentation
3. **./docs/**/*.md** - Nested documentation (api/, guides/)
4. **CLAUDE.md** - AI coding guidelines (separate concern)

### Tier 2: Code (if Tier 1 insufficient)

Search source code when docs don't have the answer:

1. **Source file comments** - Inline documentation
2. **Docstrings/JSDoc** - Function documentation
3. **Type definitions** - Interface/type docs
4. **Configuration files** - Config documentation

### Tier 3: Extended Search

For comprehensive searches:

1. **Test files** - Describe expected behavior
2. **Examples directory** - Usage examples
3. **Changelog** - Feature history
4. **Issue tracker** - Design decisions

## Grep Patterns

### Find Headers

```regex
^#{1,6}\s+.*query.*
```

### Find Code Blocks with Query

```regex
```[\s\S]*?query[\s\S]*?```
```

### Find Links

```regex
\[.*?query.*?\]\(.*?\)
```

### Find Bold/Italic Emphasis

```regex
(\*{1,2}|_{1,2}).*?query.*?(\*{1,2}|_{1,2})
```

### Find List Items

```regex
^[-*+]\s+.*?query.*
```

## Search Implementation

### Documentation Search

```bash
# Search README
grep -n -i "query" README.md

# Search all docs
grep -r -n -i "query" ./docs/

# Search with context
grep -C 3 -n "query" ./docs/*.md
```

### Code Search

```bash
# Search source files
grep -r -n "query" --include="*.ts" --include="*.js" src/

# Search comments
grep -r -n "//.*query\|/\*.*query" src/

# Search config files
grep -r -n "query" --include="*.json" --include="*.yaml" .
```

## Result Ranking

Order results by relevance:

1. **Exact match in header** - Highest priority
2. **Exact match in content** - High priority
3. **Partial match in header** - Medium priority
4. **Partial match in content** - Lower priority
5. **Match in code example** - Context priority
6. **Match in related link** - Discovery priority

## Synonym Expansion

Common synonym mappings:

| Term | Synonyms |
|------|----------|
| authentication | auth, login, signin, oauth |
| configuration | config, settings, options |
| deployment | deploy, release, ship |
| environment | env, environment variable |
| endpoint | route, handler, API |
| test | testing, spec, tests |
| build | compile, bundle, transpile |

## Output Formatting

### With Results

```markdown
# Research Results: "<query>"

## Summary
[Direct answer from found information]

## Sources

### Documentation
| File | Line | Excerpt |
|------|------|---------|
| ./docs/auth.md | 23 | "Authentication uses OAuth2..." |

### Codebase
| File | Line | Context |
|------|------|---------|
| src/auth.ts | 45 | export function authenticate() |
```

### No Results

```markdown
# Research Results: "<query>"

**Result:** NO RESULTS for "<query>"

## Locations Searched
- README.md
- ./docs/*.md (5 files)
- Source files (src/)
- Configuration files

## Suggestions
1. Try: "alternative1", "alternative2"
2. Check spelling
3. Run `/project-docs scan` for doc gaps
```

## Error Handling

### No Documentation Directory

If ./docs/ doesn't exist:
1. Note that only README.md was searched
2. Suggest running `/project-docs init`
3. Search codebase more thoroughly

### Empty Results

If search returns nothing:
1. Double-check with broader terms
2. Check for typos
3. Try synonym expansion
4. Return "NO RESULTS" (never guess)
