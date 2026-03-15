# Duplicate Detection Patterns

Patterns for detecting duplicate or similar documentation before adding new content.

## Detection Strategies

### 1. Title Matching

Check for similar titles using fuzzy matching:

```text
Existing: "User Authentication"
New: "Authenticating Users"
Similarity: 85% -> POTENTIAL DUPLICATE

Existing: "API Reference"
New: "API Documentation"
Similarity: 70% -> POTENTIAL DUPLICATE
```

**Threshold**: 70% similarity triggers review

### 2. Content Overlap

Extract key terms and check for overlap:

```text
New content key terms: authentication, OAuth, token, login, session

Search existing docs for these terms:
- authentication: found in ./docs/security.md (3 mentions)
- OAuth: found in ./docs/security.md (2 mentions)
- token: found in ./docs/security.md (4 mentions)
- login: found in ./docs/security.md (1 mention)

Overlap score: 4/4 terms found in single file -> POTENTIAL DUPLICATE
```

**Threshold**: 3+ terms found in single file triggers review

### 3. Scope Analysis

Check if new topic is a subset of existing documentation:

```text
Existing: ./docs/api.md (covers all endpoints)
New: ./docs/users-api.md (covers user endpoints only)
Result: SUBSET - consider merging or clearly delineating

Existing: ./docs/configuration.md (general config)
New: ./docs/database-config.md (database-specific)
Result: ACCEPTABLE - different scope, but cross-reference needed
```

### 4. Code Symbol Reference

Extract and check referenced code:

```text
New doc references: UserService, authenticate(), createSession()

Search for same references in existing docs:
- UserService: found in ./docs/services.md
- authenticate(): found in ./docs/services.md
- createSession(): not found

Overlap: 2/3 symbols -> POTENTIAL DUPLICATE
```

**Threshold**: 2+ symbols found triggers review

## Duplicate Detection Process

### Step 1: Extract Key Information

From the proposed new documentation:

```text
Title: "User Authentication Flow"
Key terms: [authentication, user, login, OAuth, session, token]
Code symbols: [authenticate(), createSession(), validateToken()]
Scope: Authentication process for users
```

### Step 2: Search Existing Documentation

```bash
# Search for title similarity
grep -r -l -i "authentication" ./docs/

# Search for key terms
grep -r -l -i "oauth\|session\|token" ./docs/

# Search for code symbols
grep -r -l "authenticate\|createSession\|validateToken" ./docs/
```

### Step 3: Analyze Results

```markdown
# Duplicate Check Results

## Files Found
- ./docs/authentication.md (6 term matches, 3 symbol matches)
- ./docs/security.md (4 term matches, 1 symbol match)
- ./docs/api.md (2 term matches, 0 symbol matches)

## Highest Overlap: ./docs/authentication.md
- Title similarity: "User Authentication Flow" vs "Authentication" (75%)
- Term overlap: 5/6 terms found
- Symbol overlap: 3/3 symbols found

## Recommendation: POTENTIAL DUPLICATE
```

### Step 4: Present Options

```markdown
# Potential Duplicate Detected

## Existing Documentation
**File:** ./docs/authentication.md
**Size:** 120 lines
**Sections:** Overview, OAuth Flow, Session Management

## Proposed Documentation
**Topic:** User Authentication Flow
**Key Content:** Login process, OAuth, token handling

## Overlap Analysis
- Similar scope: both cover authentication
- 5/6 key terms overlap
- 3/3 code symbols overlap

## Options
1. **Merge** - Add new content to existing ./docs/authentication.md
2. **Create separate** - Create ./docs/user-auth-flow.md with clear distinction
3. **Cancel** - Don't create duplicate documentation

Which would you like to do? [merge/separate/cancel]
```

## False Positive Handling

Not duplicates if:

| Condition | Reason |
|-----------|--------|
| Different audience | Users vs developers |
| Different scope | Overview vs deep-dive |
| Different context | Tutorial vs reference |
| Different version | v1 vs v2 documentation |
| Different format | Guide vs API reference |

Example:

```text
Existing: ./docs/api/authentication.md (API reference)
New: ./docs/guides/auth-tutorial.md (step-by-step tutorial)
Result: NOT DUPLICATE - different format and purpose
Action: Create with cross-reference
```

## Resolution Strategies

### Merge Strategy

When merging content:

1. Read both documents completely
2. Identify unique content in new document
3. Find appropriate section in existing document
4. Insert new content preserving structure
5. Update cross-references
6. Report merged content summary

```markdown
# Merge Complete

**Target:** ./docs/authentication.md

## Added Content
- "Refresh Token Rotation" section (15 lines)
- Token expiry configuration (8 lines)

## Updated
- OAuth section now references token rotation

## No Changes
- Existing OAuth flow documentation preserved
```

### Separate Strategy

When creating separate files:

1. Clearly differentiate the scope in titles
2. Add cross-references between documents
3. Ensure no content duplication
4. Update README.md index

```markdown
# Created Separate Documentation

**New file:** ./docs/auth-token-rotation.md
**Related:** ./docs/authentication.md

## Differentiation
- ./docs/authentication.md: General authentication overview
- ./docs/auth-token-rotation.md: Specific token rotation implementation

## Cross-references Added
- authentication.md: Link to token rotation details
- token-rotation.md: Link back to auth overview
```

## Duplicate Prevention Checklist

Before adding documentation:

- [ ] Searched for similar titles
- [ ] Checked key term overlap
- [ ] Verified code symbol references
- [ ] Confirmed scope is different
- [ ] Considered merge vs separate
- [ ] Planned cross-references

## Integration with ADD Action

The ADD action should always:

1. Run duplicate detection automatically
2. Present findings if potential duplicate
3. Wait for user decision
4. Never create duplicate without confirmation
