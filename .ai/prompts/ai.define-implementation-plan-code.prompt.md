---
agent: agent
description:
  Create a phased code-focused implementation plan from an approved PRD with
  actual code snippets, file structures, and implementation examples.
---

## Important: This Is Planning Only

⚠️ **STOP BEFORE IMPLEMENTATION**

Your role is to CREATE A CODE-FOCUSED PLANNING DOCUMENT, not to implement
features.

**Do:**

- ✓ Read the PRD and context
- ✓ Break down requirements into phases with code examples
- ✓ Write specific file paths and code snippets to implementation-plan/plan.md
- ✓ Include complete, runnable code examples
- ✓ Show file structures and imports
- ✓ Update state files

**Do NOT:**

- ✗ Actually create or edit application files
- ✗ Execute the implementation
- ✗ Begin Phase 1 execution
- ✗ Write vague pseudocode or generic descriptions

After completing the code-focused planning document, return control to the user.

## Usage

```
User: /ai.define-implementation-plan                # Uses current context
User: /ai.define-implementation-plan {feature-name} # Explicit feature
```

---

## Instructions

You are a technical lead planning implementation. Your goal is to break down the
PRD into actionable phases with clear tasks and deliverables.

### 1. Determine Feature Name

**Parameter resolution:**

1. If user provided explicit name
   (`/ai.define-implementation-plan feature-name`), use it
2. Otherwise, read current context from `.ai/memory/global-state.yml`
3. If current context is a bug:

```
⚠ Current context is a bug, not a feature.

Bugs use /ai.plan-fix for lightweight planning instead of full implementation plans.

To work with a feature:
  /ai.set-current {feature-name}
  /ai.define-implementation-plan
```

1. If no current context:

```
⚠ No feature specified and no current context set.

Please either:
  1. Specify the feature name: /ai.define-implementation-plan {name}
  2. Set current context: /ai.set-current {name}
```

**Verify feature exists:**

Check if `.ai/features/{name}/` exists.

### 2. Verify PRD Exists

Check `.ai/features/{name}/prd.md` exists.

If missing:

```
⚠ PRD not found for '{feature-name}'.

Run /ai.create-prd first.
```

### 3. Initialize Plan Structure (if needed)

Check if `.ai/features/{name}/implementation-plan/` exists.

If missing, execute:

```bash
python .ai/scripts/init-impl-plan.py {feature-name}
```

Then continue to step 4.

### 4. Read PRD and Context

Read and understand the following files:

```
.ai/features/{feature-name}/
├── prd.md                  # Functional requirements (FR-1, FR-2, ...)
├── context.md              # Technical considerations
└── implementation-plan/
    ├── plan-state.yml
    └── plan.md
```

**Also read global context (if available):**

```
.ai/memory/
├── tech-stack.md           # Global tech stack (optional)
└── coding-rules/           # Coding standards (optional)
    └── index.md
```

**Tech Stack Usage:**

If `tech-stack.md` exists, use it to inform:

- Technology choices in implementation tasks
- Version requirements
- Integration approaches
- Testing strategies

**Coding Rules Usage:**

If `coding-rules/index.md` exists:

1. Read the index to understand available rule categories
2. Read relevant category indices based on tech stack (e.g., react/index.md,
   typescript/index.md)
3. Scan relevant rule files (limit to 3-5 most applicable rules)
4. Incorporate rules into task descriptions

**Example**: If tech stack uses React 19 and TypeScript 5, read:

- `coding-rules/react/index.md` → identify relevant rules
- `coding-rules/react/component-architecture.md`
- `coding-rules/typescript/index.md` → identify relevant rules
- `coding-rules/typescript/type-safety.md`

**If files missing**: Proceed without (no error needed).

### 5. Generate Implementation Plan

Fill `implementation-plan/plan.md` using this code-focused structure:

```markdown
# Implementation Plan: {Feature Name}

> **Status**: Planning  
> **Created**: {YYYY-MM-DD}  
> **PRD Version**: {date from PRD}

---

## Summary

**Total Phases**: {N}  
**Estimated Scope**: {Small | Medium | Large}

---

## Phase 1: {Phase Name}

**Goal**: {What this phase achieves — one sentence}

### Files to Create/Modify
```

path/to/file1.ts # New file - {purpose} path/to/file2.ts # Modify - {what
changes} path/to/file3.test.ts # New file - {test coverage}

````

### Implementation

#### 1.1: {Specific implementation step}

**File**: `path/to/file1.ts`

```typescript
// Complete, runnable code with imports
import { Type } from '~/types';
import { service } from '~/services';

export async function functionName(param: Type): Promise<Result> {
  // Implementation with actual logic
  const result = await service.doSomething(param);
  return result;
}
````

**Key Points:**

- {Important implementation detail}
- {Error handling approach}
- {Integration with existing code}

#### 1.2: {Another implementation step}

**File**: `path/to/file2.ts`

**Changes Required:**

```typescript
// BEFORE:
export function existingFunction() {
  // old implementation
}

// AFTER:
export function existingFunction() {
  // new implementation with feature
  const newFeature = initializeFeature();
  return enhancedResult;
}
```

### Testing

**File**: `path/to/file1.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { functionName } from './file1';

describe('functionName', () => {
  it('should handle success case', async () => {
    const result = await functionName(input);
    expect(result).toBe(expected);
  });

  it('should handle error case', async () => {
    await expect(functionName(invalid)).rejects.toThrow();
  });
});
```

### Deliverables

- {What's completed/shippable after this phase}
- {Specific functionality working}
- {Test coverage achieved}

### Dependencies

- {What must exist before starting, or "None"}
- {Required libraries/services}

---

## Phase 2: {Phase Name}

**Goal**: {What this phase achieves}

### Files to Create/Modify

```
path/to/file4.ts          # New file - {purpose}
```

### Implementation

{Follow same pattern as Phase 1}

### Testing

{Include test code examples}

### Deliverables

- {What's completed after this phase}

### Dependencies

- Phase 1 complete
- {Other dependencies}

---

## Phase N: ...

---

## Notes

{Any implementation notes, risks, or considerations}

### Integration Points

- **Existing Service**: `path/to/service.ts` - {how to integrate}
- **Existing Type**: `path/to/types.ts` - {types to use/extend}

### Coding Standards References

{If coding rules exist, list key rules that apply to this implementation:}

- {Rule category}: {Brief description or link to rule file}
- {Rule category}: {Brief description or link to rule file}

````

### 6. Planning Rules

**Phase design:**

- Each phase should be independently testable/demoable
- Phases build on each other (dependencies flow downward)
- First phase = foundation/core functionality
- Last phase = polish/edge cases
- Typically 2-5 phases (more phases = smaller increments)

**Implementation design:**

- Each implementation step should include complete, runnable code
- Implementation steps should be completable in ~1-4 hours
- Prefix with phase number (1.1, 1.2, 2.1, ...)
- Be specific with file paths — use actual paths like `src/services/auth-service.ts`
- Include actual code snippets, not pseudocode or placeholders
- **Show complete context**: Include imports, types, and surrounding code
- **Include coding standards**: Reference specific coding rules when applicable
  - Example: "1.1: Create LoginForm component following React component
    architecture standards (see
    memory/coding-rules/react/component-architecture.md)"
  - Example: "2.3: Implement type-safe API client (see
    memory/coding-rules/typescript/type-safety.md)"

**Code snippet requirements:**

- Must be complete and runnable (not pseudocode)
- Include all necessary imports
- Show TypeScript types and interfaces
- For modifications, show before/after comparisons
- Include error handling where appropriate
- Reference existing code patterns from the codebase

**File path requirements:**

- Use actual workspace paths (e.g., `src/commands/auth/login.ts`)
- Indicate if file is new or being modified
- Show directory structure when creating multiple related files
- Follow project conventions from `CLAUDE.md` and `tech-stack.md`

**Mapping from PRD:**

- Each FR should map to at least one implementation step with code
- Each AC should be verifiable after some phase with specific tests
- Technical considerations inform implementation details and code examples

### 6A. Code Snippet Guidelines

When writing code snippets in the implementation plan:

**1. Completeness**

- Include all necessary imports at the top
- Show function signatures with complete type annotations
- Include error handling and edge cases
- Don't use placeholders like `// implementation here` or `...`

**Example — Complete:**

```typescript
import { ContentItem } from '~/types/amplience';
import { AmplienceService } from '~/services/amplience-service';

export async function archiveItem(
  service: AmplienceService,
  item: ContentItem
): Promise<void> {
  if (item.version.archived) {
    throw new Error(`Item ${item.id} is already archived`);
  }
  await service.archiveContentItem(item.id);
}
````

**Example — Incomplete (avoid):**

```typescript
function archiveItem(service, item) {
  // Archive the item
  service.archive(item);
}
```

**2. Context**

- Show enough surrounding code to understand the change
- Include the class/module structure if relevant
- For modifications, show before/after with clear markers

**Example — Before/After:**

```typescript
// BEFORE:
export class AuthService {
  async login(email: string, password: string): Promise<Session> {
    const user = await this.validateCredentials(email, password);
    return this.createSession(user);
  }
}

// AFTER:
import { RateLimiter } from '~/utils/rate-limiter';

export class AuthService {
  private rateLimiter = new RateLimiter({ maxAttempts: 5, windowMs: 900000 });

  async login(email: string, password: string): Promise<Session> {
    await this.rateLimiter.checkLimit(email);
    const user = await this.validateCredentials(email, password);
    return this.createSession(user);
  }
}
```

**3. Testing**

- Include test file creation with actual test code
- Show test setup, assertions, and edge cases
- Use the project's testing framework (Vitest for this codebase)

**Example:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { archiveItem } from './archive-item';
import type { AmplienceService } from '~/services/amplience-service';

describe('archiveItem', () => {
  let mockService: AmplienceService;

  beforeEach(() => {
    mockService = {
      archiveContentItem: vi.fn().mockResolvedValue(undefined),
    } as any;
  });

  it('should archive non-archived item', async () => {
    const item = { id: '123', version: { archived: false } };
    await archiveItem(mockService, item);
    expect(mockService.archiveContentItem).toHaveBeenCalledWith('123');
  });

  it('should throw error for already archived item', async () => {
    const item = { id: '123', version: { archived: true } };
    await expect(archiveItem(mockService, item)).rejects.toThrow(
      'Item 123 is already archived'
    );
  });
});
```

**4. Type Definitions**

- Include type definitions inline or reference existing types
- Show interface/type declarations when creating new types
- Reference existing types from the codebase

**Example:**

```typescript
import type { ContentItem } from '~/types/amplience';

// New type for this feature
export interface ArchiveOptions {
  reason?: string;
  skipValidation?: boolean;
  updateReferences?: boolean;
}

// Using existing and new types
export async function archiveWithOptions(
  item: ContentItem,
  options: ArchiveOptions = {}
): Promise<void> {
  // Implementation
}
```

**5. File Structure**

- When creating multiple related files, show directory tree
- Indicate new vs. modified files clearly
- Follow project conventions

**Example:**

```
src/commands/bulk-archive/
├── index.ts                      # New - Barrel export
├── bulk-archive.ts               # New - Main command
├── bulk-archive.test.ts          # New - Command tests
└── prompts/
    ├── index.ts                  # New - Barrel export
    ├── prompt-for-reason.ts      # New - Reason prompt
    └── prompt-for-reason.test.ts # New - Prompt tests
```

**6. Integration References**

- Reference existing code patterns to follow
- Show how to integrate with existing services
- Point to similar implementations in the codebase

**Example:**

```typescript
// Follow the pattern from src/commands/archive-content-item/archive-content-item.ts
import { AmplienceService } from '~/services/amplience-service';
import { promptForHub } from '~/prompts';

export async function runBulkArchive(): Promise<void> {
  // Pattern: Always start with hub selection
  const hubs = getHubConfigs();
  const selectedHub = await promptForHub(hubs);
  const service = new AmplienceService(selectedHub);

  // Pattern: Then get repositories
  const repos = await service.getRepositories();
  // ... rest of implementation
}
```

### 7. Update State Files

**Update `implementation-plan/plan-state.yml`:**

```yaml
status: planning
current_phase: 1
created: { YYYY-MM-DD }
updated: { YYYY-MM-DD }
phases:
  - name: { Phase 1 name }
    status: pending
  - name: { Phase 2 name }
    status: pending
```

**Update `state.yml`:**

```yaml
status: planning
updated: { YYYY-MM-DD }
```

### 8. Confirm Completion

Show completion summary:

```
✓ Created code-focused implementation plan

Phases:
  1. {Phase 1 name} — {X} implementation steps
  2. {Phase 2 name} — {Y} implementation steps
  ...

Scope: {Small | Medium | Large}
Lines of code: ~{estimated LOC}
```

**Do not proceed to section 10 yet** - user needs to see this completion message
first.

### 9. Stop Planning Phase

✓ Your planning task is complete once you have:

- Created implementation-plan/plan.md
- Updated plan-state.yml
- Updated state.yml
- Confirmed completion to user

**Do not proceed to implementation.** Continue to section 10 for verification
prompt.

### 10. Offer Verification

After confirming completion (section 8), present this interactive prompt:

```
Implementation plan created successfully.

Would you like to verify the plan against coding standards now?

1. Yes, verify the plan (Recommended)
   - Check plan alignment with coding standards
   - Identify potential issues before execution
   - Generate verification report
   - ~1 minute

2. No, I'll review manually
   - You can run /ai.verify later
   - Proceed to review plan.md
   - Run /ai.execute when ready

Please respond with 1 or 2.
```

**Wait for user response.**

#### If User Selects Option 1 (Verify)

1. Inform user: `Starting verification...`
2. Invoke verification internally:
   - Read `.ai/prompts/ai.verify.prompt.md`
   - Execute verification using current workflow context
   - Use "plan verification mode" (default)
3. After verification completes, display summary:

```
✓ Verification complete

Report: .ai/reports/verification-{name}-{timestamp}.report.md

{Display verdict from verification: PASS / PASS WITH WARNINGS / FAIL}
```

1. **Automatically proceed to Section 11** (Update Documentation)

#### If User Selects Option 2 (Skip)

```
✓ Verification skipped

You can verify later with: /ai.verify {feature-name}
```

**Automatically proceed to Section 11** (Update Documentation)

#### If User Provides Invalid Response

Accept flexible responses:

- **Option 1**: "1", "yes", "y", "verify"
- **Option 2**: "2", "no", "n", "skip", "later"

If response doesn't match any pattern, re-prompt once:

```
Please respond with 1 or 2:
  1 - Verify the plan now
  2 - Skip verification
```

If still invalid, default to Option 2 (skip) and proceed to Section 11.

---

### 11. Update Documentation

After verification (or skip), automatically present the documentation update
prompt:

```
Would you like to review and update documentation now?

1. Yes, update documentation (Recommended)
   - Analyze documentation gaps against the implementation plan
   - Review README.md, CLAUDE.md, and other docs
   - Update docs with your approval
   - ~2-3 minutes

2. No, skip documentation update
   - You can run /ai.docs later
   - Proceed to finalization

Please respond with 1 or 2.
```

**Wait for user response.**

#### If User Selects Option 1 (Update Docs)

**Step 1: Discover Documentation Files**

Check for these files in order:

| Location                  | Priority | Purpose                                  |
| ------------------------- | -------- | ---------------------------------------- |
| `CLAUDE.md`               | High     | AI agent guidance, architecture overview |
| `README.md`               | High     | Project overview, getting started        |
| `AGENTS.md`               | High     | Multi-agent coordination guidelines      |
| `CONTRIBUTING.md`         | Medium   | Contribution guidelines                  |
| `docs/` folder            | Medium   | Detailed documentation                   |
| `API.md` or `docs/api.md` | Medium   | API documentation                        |
| `CHANGELOG.md`            | Low      | Version history                          |

Display discovery results:

```
📚 Documentation Discovery

Found documentation files:
  ✓ CLAUDE.md ({N} lines)
  ✓ README.md ({N} lines)
  ✗ AGENTS.md (not found)
  ...

Proceeding with analysis of {N} documentation files...
```

**Step 2: Load Workflow Artifacts**

Read the following to extract key information:

1. `.ai/features/{name}/request.md` - Original request
2. `.ai/features/{name}/prd.md` - Product requirements
3. `.ai/features/{name}/implementation-plan/plan.md` - Implementation details

**Extract key information:**

- Feature name and description
- Key functionality to be added
- API changes or new endpoints
- Configuration changes
- User-facing changes
- Breaking changes (if any)
- Dependencies added or updated

**Step 3: Analyze Documentation Gaps**

For each documentation file, analyze:

1. **Missing Information** - Feature not mentioned at all
2. **Outdated Information** - Existing content will contradict new
   implementation
3. **Incomplete Information** - Feature mentioned but lacks details
4. **Incorrect Examples** - Code samples won't reflect planned implementation

**Analysis Categories:**

| Category       | Description                                  | Severity |
| -------------- | -------------------------------------------- | -------- |
| **Missing**    | Feature not documented anywhere              | High     |
| **Outdated**   | Existing docs will contradict implementation | High     |
| **Incomplete** | Docs exist but will lack important details   | Medium   |
| **Examples**   | Code samples will need updating              | Medium   |
| **Minor**      | Typos, formatting, minor improvements        | Low      |

**Cross-reference checklist:**

- [ ] Is the feature mentioned in README.md overview?
- [ ] Is the API documented (if applicable)?
- [ ] Are configuration options documented?
- [ ] Are breaking changes noted?
- [ ] Is CLAUDE.md updated with new architecture/commands?
- [ ] Are usage examples current?
- [ ] Is the changelog updated (if exists)?

**Step 4: Present Gap Analysis Report**

Display the report inline:

```markdown
# 📋 Documentation Gap Analysis: {feature-name}

> **Analyzed**: {YYYY-MM-DD HH:MM:SS} **Feature**: {feature-name} **Plan
> Status**: Planning

---

## Summary

**Documentation Status**: {UP-TO-DATE | NEEDS UPDATE | SIGNIFICANT GAPS}

| Severity                   | Count   |
| -------------------------- | ------- |
| 🔴 High (Missing/Outdated) | {count} |
| 🟡 Medium (Incomplete)     | {count} |
| 🔵 Low (Minor)             | {count} |

---

## Gaps Found

### 🔴 High Priority

#### H-{N}: {Gap Title}

**File**: `{documentation file path}` **Type**: {Missing | Outdated}
**Details**: {Clear description of what's missing or will be incorrect}

**What should be documented:** {Specific information from the plan that needs to
be added}

**Suggested location**: {Section or heading where this should go}

---

### 🟡 Medium Priority

{Similar format for medium priority gaps}

---

### 🔵 Low Priority

{Similar format for low priority gaps}

---

## Documents Analyzed

| File        | Status               | Gaps Found |
| ----------- | -------------------- | ---------- |
| `CLAUDE.md` | {Analyzed/Not Found} | {count}    |
| `README.md` | {Analyzed/Not Found} | {count}    |
| ...         | ...                  | ...        |
```

**Step 5: Wait for User Instructions**

⚠️ **CRITICAL: Do NOT edit documentation without explicit user instruction.**

```
---

## ⏳ Awaiting Your Instructions

I've identified {N} documentation gaps. What would you like to do?

**Options:**

1. **Update all** - I'll update all documentation files with the identified gaps
2. **Update specific** - Tell me which gaps to address (e.g., "Update H-1 and M-2")
3. **Update with notes** - Provide additional context or instructions for the updates
4. **Skip for now** - No documentation changes needed at this time

**Examples:**
- "Update all"
- "Update H-1, H-2, and M-1"
- "Update H-1 with note: also mention the rate limiting feature"
- "Skip"

---
Please provide your instructions.
```

**Wait for user response before any file modifications.**

**Step 6: Process User Instructions**

**If "Update all":**

1. Confirm the changes to be made:

   ```
   I'll update the following files:
   - CLAUDE.md: Add {description}
   - README.md: Update {section}
   - docs/api.md: Add {endpoint documentation}

   Proceed? (yes/no)
   ```

2. Wait for confirmation
3. Make the edits one file at a time
4. Show diff summary for each file

**If "Update specific" (e.g., "H-1 and M-2"):**

1. Confirm which gaps will be addressed
2. Wait for confirmation
3. Make only the specified edits

**If "Update with notes":**

1. Parse user's additional instructions
2. Incorporate notes into the documentation updates
3. Confirm planned changes
4. Wait for confirmation before editing

**If "Skip":**

```
✓ Documentation update skipped

You can update documentation later with: /ai.docs {feature-name}
```

**Step 7: Confirm Documentation Completion**

After making approved changes:

```
✓ Documentation updated for '{feature-name}'

**Files Modified:**
- CLAUDE.md: {summary of changes}
- README.md: {summary of changes}

**Changes Made:**
- H-1: Added feature description to README overview
- M-2: Updated API examples in docs/api.md
```

**Proceed to Section 12** (Finalize Feature Status).

#### If User Selects Option 2 (Skip Docs)

```
✓ Documentation update skipped

You can update documentation later with: /ai.docs {feature-name}
```

**Proceed to Section 12** (Finalize Feature Status).

#### Documentation Edge Cases

| Situation                     | Behavior                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| No documentation files found  | Report "No documentation files found", suggest creating README.md, proceed to finalization |
| All docs are up-to-date       | Report "UP-TO-DATE" status, no action needed, proceed to finalization                      |
| User provides invalid gap IDs | Ask for clarification with valid options                                                   |
| Documentation update fails    | Warn user, allow proceeding to finalization                                                |

---

### 12. Finalize Feature Status

After documentation (or skip), present the finalization prompt:

```
---

✓ Implementation plan complete for '{feature-name}'

Would you like to finalize this feature's status?

1. Mark as ready for implementation
   - Keeps state.yml status as 'planning'
   - Ready to run /ai.execute when you want to start
   - Recommended for most cases

2. Mark for review
   - Sets state.yml status to 'in-review'
   - Indicates plan needs review before execution
   - Good for team workflows

3. Keep as draft
   - No state change
   - Continue refining the plan
   - Can re-run /ai.define-implementation-plan to regenerate

Please respond with 1, 2, or 3.
```

**Wait for user response.**

#### If User Selects Option 1 (Ready for Implementation)

```
✓ Feature '{feature-name}' is ready for implementation!

Next steps:
  1. Review implementation-plan/plan.md
  2. Run /ai.execute {feature-name} to start Phase 1
```

#### If User Selects Option 2 (Mark for Review)

```bash
python .ai/scripts/update-plan-state.py {feature-name} update-feature-state in-review
```

Show confirmation:

```
✓ Feature '{feature-name}' marked for review!

Next steps:
  1. Share implementation-plan/plan.md for review
  2. After approval, run /ai.execute {feature-name}
```

#### If User Selects Option 3 (Keep as Draft)

```
✓ Feature '{feature-name}' remains as draft.

Next steps:
  1. Continue refining implementation-plan/plan.md
  2. Re-run /ai.define-implementation-plan to regenerate if needed
  3. Run /ai.execute when ready
```

#### If User Provides Invalid Response

Accept flexible responses:

- **Option 1**: "1", "yes", "y", "ready", "implement"
- **Option 2**: "2", "review"
- **Option 3**: "3", "no", "n", "draft", "skip"

If response doesn't match any pattern, re-prompt once:

```
Please respond with 1, 2, or 3:
  1 - Ready for implementation
  2 - Mark for review
  3 - Keep as draft
```

If still invalid, default to Option 1 (ready for implementation).

---

## Edge Cases

| Situation                         | Behavior                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| PRD doesn't exist                 | Error with instructions to create PRD first                                                  |
| Plan folder doesn't exist         | Error with script command to run                                                             |
| Plan already exists               | Ask: overwrite, create plan-v2.md, or cancel                                                 |
| PRD has many TBDs                 | Generate plan but flag uncertain areas in Notes                                              |
| Very small feature                | Single phase is acceptable                                                                   |
| No coding standards exist         | Proceed with verification - verify prompt handles this gracefully with minimal PASS report   |
| Verification script fails         | Show error message, suggest manual review of plan.md, provide `/ai.verify` command for retry |
| Verification returns FAIL verdict | Show critical issues summary, recommend fixing plan, but don't block user from proceeding    |
| User wants to execute immediately | Accept "execute" as response to finalization, run `/ai.execute`                              |
| No documentation files found      | Report "No documentation files found", suggest creating README.md, proceed to finalization   |
| Documentation update fails        | Warn user, allow proceeding to finalization                                                  |

---

## Example Output

```markdown
# Implementation Plan: user-auth

> **Status**: Planning  
> **Created**: 2025-01-28  
> **PRD Version**: 2025-01-28

---

## Summary

**Total Phases**: 3  
**Estimated Scope**: Medium

---

## Phase 1: Core Authentication

**Goal**: Enable basic login/logout functionality

### Files to Create/Modify
```

src/services/auth-service.ts # New - Authentication service
src/services/session-service.ts # New - Session management src/types/auth.d.ts #
New - Auth type definitions src/routes/auth.ts # New - Auth API routes
src/components/LoginForm.tsx # New - Login UI component
src/services/auth-service.test.ts # New - Auth service tests
src/components/LoginForm.test.tsx # New - Component tests

````

### Implementation

#### 1.1: Create Authentication Service

**File**: `src/services/auth-service.ts`

```typescript
import bcrypt from 'bcrypt';
import { UserRepository } from '~/repositories/user-repository';
import { SessionService } from './session-service';
import type { LoginCredentials, AuthResult } from '~/types/auth';

const SALT_ROUNDS = 10;

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private sessionService: SessionService
  ) {}

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(credentials.email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const session = await this.sessionService.createSession({
      userId: user.id,
      expiresInMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      sessionToken: session.token,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.sessionService.destroySession(sessionToken);
  }
}
````

**Key Points:**

- Uses bcrypt for password verification (industry standard)
- Returns minimal user data (no password hash)
- Session tokens managed by SessionService
- Generic error messages to prevent user enumeration

#### 1.2: Create Session Service

**File**: `src/services/session-service.ts`

```typescript
import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import type { Session, CreateSessionOptions } from '~/types/auth';

const SESSION_KEY_PREFIX = 'session:';

export class SessionService {
  constructor(private redis: Redis) {}

  async createSession(options: CreateSessionOptions): Promise<Session> {
    const token = randomBytes(32).toString('hex');
    const session: Session = {
      token,
      userId: options.userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + options.expiresInMs,
    };

    const key = `${SESSION_KEY_PREFIX}${token}`;
    const ttlSeconds = Math.floor(options.expiresInMs / 1000);

    await this.redis.setex(key, ttlSeconds, JSON.stringify(session));

    return session;
  }

  async getSession(token: string): Promise<Session | null> {
    const key = `${SESSION_KEY_PREFIX}${token}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as Session;
  }

  async destroySession(token: string): Promise<void> {
    const key = `${SESSION_KEY_PREFIX}${token}`;
    await this.redis.del(key);
  }
}
```

#### 1.3: Define Auth Types

**File**: `src/types/auth.d.ts`

```typescript
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuthResult {
  user: User;
  sessionToken: string;
}

export interface CreateSessionOptions {
  userId: string;
  expiresInMs: number;
}
```

#### 1.4: Create API Routes

**File**: `src/routes/auth.ts`

```typescript
import express from 'express';
import { AuthService } from '~/services/auth-service';
import { body, validationResult } from 'express-validator';

export function createAuthRouter(authService: AuthService): express.Router {
  const router = express.Router();

  router.post(
    '/login',
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const result = await authService.login({
          email: req.body.email,
          password: req.body.password,
        });

        res.json(result);
      } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
      }
    }
  );

  router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({ error: 'No session token provided' });
    }

    try {
      await authService.logout(token);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  return router;
}
```

#### 1.5: Create Login Form Component

**File**: `src/components/LoginForm.tsx`

```typescript
import React, { useState } from 'react';
import type { LoginCredentials } from '~/types/auth';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await onSubmit({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {error && <div role="alert">{error}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  );
}
```

### Testing

**File**: `src/services/auth-service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { AuthService } from './auth-service';
import type { UserRepository } from '~/repositories/user-repository';
import type { SessionService } from './session-service';

vi.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: UserRepository;
  let mockSessionService: SessionService;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: vi.fn(),
    } as any;

    mockSessionService = {
      createSession: vi.fn(),
      destroySession: vi.fn(),
    } as any;

    authService = new AuthService(mockUserRepo, mockSessionService);
  });

  describe('login', () => {
    it('should return auth result for valid credentials', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
      };

      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(mockSessionService.createSession).mockResolvedValue({
        token: 'session-token',
        userId: '123',
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.sessionToken).toBe('session-token');
      expect(mockSessionService.createSession).toHaveBeenCalledWith({
        userId: '123',
        expiresInMs: 24 * 60 * 60 * 1000,
      });
    });

    it('should throw error for invalid password', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        id: '123',
        passwordHash: 'hashed',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for non-existent user', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should destroy session', async () => {
      await authService.logout('session-token');
      expect(mockSessionService.destroySession).toHaveBeenCalledWith(
        'session-token'
      );
    });
  });
});
```

### Deliverables

- User can log in with email/password
- Sessions stored in Redis with 24h expiration
- User can log out (destroys session)
- Login form with error handling
- Sessions persist across page refresh (token in localStorage/cookie)
- Comprehensive test coverage for auth service

### Dependencies

- Redis instance configured and accessible
- `bcrypt` package installed
- `ioredis` package installed
- `express-validator` package installed

---

## Phase 2: Session Management

**Goal**: Implement "remember me" and session expiration

### Files to Create/Modify

```
src/components/LoginForm.tsx           # Modify - Add remember me checkbox
src/services/auth-service.ts           # Modify - Support variable expiration
src/services/session-service.ts        # Modify - Add session refresh
src/middleware/auth-middleware.ts      # New - Session validation middleware
src/middleware/auth-middleware.test.ts # New - Middleware tests
```

### Implementation

#### 2.1: Add Remember Me Option

**File**: `src/components/LoginForm.tsx`

**Changes Required:**

```typescript
// BEFORE:
interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // ...
}

// AFTER:
import type { LoginCredentials } from '~/types/auth';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials, rememberMe: boolean) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await onSubmit({ email, password }, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Email and password fields unchanged */}

      <div>
        <label>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          Remember me for 7 days
        </label>
      </div>

      {/* Rest unchanged */}
    </form>
  );
}
```

#### 2.2: Support Variable Session Expiration

**File**: `src/services/auth-service.ts`

**Changes Required:**

```typescript
// BEFORE:
async login(credentials: LoginCredentials): Promise<AuthResult> {
  // ... validation code

  const session = await this.sessionService.createSession({
    userId: user.id,
    expiresInMs: 24 * 60 * 60 * 1000, // Always 24 hours
  });
  // ...
}

// AFTER:
async login(
  credentials: LoginCredentials,
  rememberMe: boolean = false
): Promise<AuthResult> {
  // ... validation code (unchanged)

  const expirationMs = rememberMe
    ? 7 * 24 * 60 * 60 * 1000  // 7 days
    : 24 * 60 * 60 * 1000;      // 24 hours

  const session = await this.sessionService.createSession({
    userId: user.id,
    expiresInMs: expirationMs,
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    sessionToken: session.token,
  };
}
```

#### 2.3: Add Session Refresh

**File**: `src/services/session-service.ts`

**Add new method:**

```typescript
// Add to existing SessionService class:

async refreshSession(token: string, extendByMs: number): Promise<Session | null> {
  const session = await this.getSession(token);

  if (!session) {
    return null;
  }

  // Extend expiration
  session.expiresAt = Date.now() + extendByMs;

  const key = `${SESSION_KEY_PREFIX}${token}`;
  const ttlSeconds = Math.floor(extendByMs / 1000);

  await this.redis.setex(key, ttlSeconds, JSON.stringify(session));

  return session;
}
```

#### 2.4: Create Auth Middleware

**File**: `src/middleware/auth-middleware.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import { SessionService } from '~/services/session-service';

const SESSION_REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export function createAuthMiddleware(sessionService: SessionService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token' });
    }

    const session = await sessionService.getSession(token);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      await sessionService.destroySession(token);
      return res.status(401).json({ error: 'Session expired' });
    }

    // Refresh session if close to expiration
    const timeUntilExpiry = session.expiresAt - Date.now();
    if (timeUntilExpiry < SESSION_REFRESH_THRESHOLD_MS) {
      const originalDuration = session.expiresAt - session.createdAt;
      await sessionService.refreshSession(token, originalDuration);
    }

    // Attach user ID to request
    (req as any).userId = session.userId;
    next();
  };
}
```

### Testing

**File**: `src/middleware/auth-middleware.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createAuthMiddleware } from './auth-middleware';
import type { SessionService } from '~/services/session-service';

describe('authMiddleware', () => {
  let mockSessionService: SessionService;
  let middleware: ReturnType<typeof createAuthMiddleware>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSessionService = {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      destroySession: vi.fn(),
    } as any;

    middleware = createAuthMiddleware(mockSessionService);

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  it('should reject request without token', async () => {
    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'No authentication token',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with invalid token', async () => {
    mockRequest.headers = { authorization: 'Bearer invalid-token' };
    vi.mocked(mockSessionService.getSession).mockResolvedValue(null);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject expired session', async () => {
    mockRequest.headers = { authorization: 'Bearer valid-token' };
    vi.mocked(mockSessionService.getSession).mockResolvedValue({
      token: 'valid-token',
      userId: '123',
      createdAt: Date.now() - 86400000,
      expiresAt: Date.now() - 1000, // Expired
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockSessionService.destroySession).toHaveBeenCalledWith(
      'valid-token'
    );
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should allow valid session and attach userId', async () => {
    const futureExpiry = Date.now() + 86400000; // 24 hours from now
    mockRequest.headers = { authorization: 'Bearer valid-token' };
    vi.mocked(mockSessionService.getSession).mockResolvedValue({
      token: 'valid-token',
      userId: '123',
      createdAt: Date.now(),
      expiresAt: futureExpiry,
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect((mockRequest as any).userId).toBe('123');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should refresh session when close to expiration', async () => {
    const now = Date.now();
    const createdAt = now - 23 * 60 * 60 * 1000; // 23 hours ago
    const expiresAt = now + 30 * 60 * 1000; // 30 minutes from now

    mockRequest.headers = { authorization: 'Bearer valid-token' };
    vi.mocked(mockSessionService.getSession).mockResolvedValue({
      token: 'valid-token',
      userId: '123',
      createdAt,
      expiresAt,
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockSessionService.refreshSession).toHaveBeenCalledWith(
      'valid-token',
      24 * 60 * 60 * 1000 // Original 24h duration
    );
    expect(mockNext).toHaveBeenCalled();
  });
});
```

### Deliverables

- "Remember me" checkbox in login form
- Sessions last 24 hours by default, 7 days when "remember me" is checked
- Sessions automatically refresh when user is active and close to expiration
- Auth middleware validates sessions and rejects expired ones
- Users gracefully redirected when session expires

### Dependencies

- Phase 1 complete
- Redis sessions working

---

## Phase 3: Password Reset & Security

**Goal**: Enable password reset and add rate limiting

### Files to Create/Modify

```
src/services/password-reset-service.ts      # New - Password reset logic
src/services/email-service.ts               # New - Email sending
src/services/rate-limiter.ts                # New - Rate limiting utility
src/services/auth-service.ts                # Modify - Add rate limiting
src/routes/auth.ts                          # Modify - Add reset endpoints
src/components/PasswordResetForm.tsx        # New - Reset UI component
src/types/auth.d.ts                         # Modify - Add reset types
```

### Implementation

{Similar detailed code snippets for Phase 3...}

### Testing

{Test code for Phase 3...}

### Deliverables

- Users can request password reset via email
- Reset tokens expire after 1 hour
- Rate limiting prevents brute force (5 attempts, 15min lockout)
- Failed login attempts tracked per email
- Email sent with reset link

### Dependencies

- Phase 1 complete
- Email service configured (SMTP credentials)
- Email templates created

---

## Notes

### Integration Points

- **Redis**: Used by SessionService and RateLimiter
- **Email Service**: Requires SMTP configuration in environment variables
- **User Repository**: Assumes `UserRepository` interface exists (see
  `src/repositories/user-repository.ts`)

### Environment Variables Required

```bash
REDIS_URL=redis://localhost:6379
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=secret
FRONTEND_URL=https://app.example.com
```

### Security Considerations

- Passwords hashed with bcrypt (SALT_ROUNDS=10)
- Session tokens use cryptographic randomness (32 bytes)
- Generic error messages prevent user enumeration
- Rate limiting protects against brute force attacks
- Reset tokens single-use and time-limited

### Coding Standards References

- **TypeScript**: Strict mode enabled, all types explicit (see `tech-stack.md`)
- **Testing**: Co-located test files with comprehensive coverage (see
  `coding-rules/testing/`)
- **Error Handling**: Always use try-catch for async operations (see
  `coding-rules/error-handling.md`)
- **File Naming**: Use kebab-case for all files (see `CLAUDE.md` conventions)

```

### Example: Complete Flow with Verification, Documentation, and Finalization

```

✓ Created code-focused implementation plan

Phases:

1. Core Authentication — 6 implementation steps
2. Session Management — 4 implementation steps
3. Password Reset & Security — 6 implementation steps

Scope: Medium Lines of code: ~850

---

Implementation plan created successfully.

Would you like to verify the plan against coding standards now?

1. Yes, verify the plan (Recommended)
   - Check plan alignment with coding standards
   - Identify potential issues before execution
   - Generate verification report
   - ~1 minute

2. No, I'll review manually
   - You can run /ai.verify later
   - Proceed to documentation update

Please respond with 1 or 2.

```

**[User responds: 1]**

```

Starting verification...

✓ Verification complete

Report: .ai/reports/verification-user-auth-20250108-143022.report.md

Verdict: PASS WITH WARNINGS

- Critical issues: 0
- Warnings: 2
- Info: 3

---

Would you like to review and update documentation now?

1. Yes, update documentation (Recommended)
   - Analyze documentation gaps against the implementation plan
   - Review README.md, CLAUDE.md, and other docs
   - Update docs with your approval
   - ~2-3 minutes

2. No, skip documentation update
   - You can run /ai.docs later
   - Proceed to finalization

Please respond with 1 or 2.

```

**[User responds: 1]**

```

📚 Documentation Discovery

Found documentation files: ✓ CLAUDE.md (862 lines) ✓ README.md (156 lines) ✗
AGENTS.md (not found)

Proceeding with analysis of 2 documentation files...

# 📋 Documentation Gap Analysis: user-auth

> **Analyzed**: 2025-01-28 14:35:00 **Feature**: user-auth **Plan Status**:
> Planning

---

## Summary

**Documentation Status**: NEEDS UPDATE

| Severity  | Count |
| --------- | ----- |
| 🔴 High   | 2     |
| 🟡 Medium | 1     |
| 🔵 Low    | 0     |

---

## Gaps Found

### 🔴 High Priority

#### H-1: Missing Authentication Section in README

**File**: `README.md` **Type**: Missing **Details**: README has no mention of
the planned authentication system.

**What should be documented:**

- User registration flow
- Login/logout endpoints
- Session management
- Password reset functionality

**Suggested location**: New "## Authentication" section after "## Getting
Started"

#### H-2: CLAUDE.md Missing Auth Commands

**File**: `CLAUDE.md` **Type**: Missing **Details**: No documentation of planned
auth-related API endpoints.

---

## ⏳ Awaiting Your Instructions

I've identified 3 documentation gaps. What would you like to do?

**Options:**

1. **Update all** - I'll update all documentation files
2. **Update specific** - Tell me which gaps to address
3. **Update with notes** - Provide additional context
4. **Skip for now** - No documentation changes

Please provide your instructions.

```

**[User responds: Update all]**

```

I'll update the following files:

- README.md: Add "## Authentication" section
- CLAUDE.md: Add auth endpoints documentation

Proceed? (yes/no)

```

**[User responds: yes]**

```

✓ Documentation updated for 'user-auth'

**Files Modified:**

- README.md: Added Authentication section
- CLAUDE.md: Added auth endpoints

---

✓ Implementation plan complete for 'user-auth'

Would you like to finalize this feature's status?

1. Mark as ready for implementation
   - Keeps state.yml status as 'planning'
   - Ready to run /ai.execute when you want to start
   - Recommended for most cases

2. Mark for review
   - Sets state.yml status to 'in-review'
   - Indicates plan needs review before execution
   - Good for team workflows

3. Keep as draft
   - No state change
   - Continue refining the plan

Please respond with 1, 2, or 3.

```

**[User responds: 1]**

```

✓ Feature 'user-auth' is ready for implementation!

Next steps:

1. Review implementation-plan/plan.md
2. Run /ai.execute user-auth to start Phase 1

```

### Example: User Skips All Optional Steps

```

✓ Created implementation plan

Phases:

1. Core Authentication — 6 tasks
2. Session Management — 4 tasks

Scope: Medium

---

Implementation plan created successfully.

Would you like to verify the plan against coding standards now? ... Please
respond with 1 or 2.

```

**[User responds: 2]**

```

✓ Verification skipped

You can verify later with: /ai.verify user-auth

---

Would you like to review and update documentation now? ... Please respond with 1
or 2.

```

**[User responds: 2]**

```

✓ Documentation update skipped

You can update documentation later with: /ai.docs user-auth

---

✓ Implementation plan complete for 'user-auth'

Would you like to finalize this feature's status? ... Please respond with 1, 2,
or 3.

```

**[User responds: 1]**

```

✓ Feature 'user-auth' is ready for implementation!

Next steps:

1. Review implementation-plan/plan.md
2. Run /ai.execute user-auth to start Phase 1

```

```
