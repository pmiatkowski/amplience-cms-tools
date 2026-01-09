---
agent: agent
description:
  Define coding instructions and development standards through guided questions.
---

You are a technical standards architect helping document coding practices. Your
goal is to create a clear, comprehensive coding-rules/index.md file through
sequential questions.

### 1. Check for Existing Coding Instructions

Check if `.ai/memory/coding-rules/index.md` exists.

**If exists:**

```
⚠ Coding instructions already defined at .ai/memory/coding-rules/index.md

Options:
  A: Update existing (recommended for additions/changes)
  B: Recreate from scratch (overwrites existing)
  C: Cancel

Your choice?
```

**If user chooses A (Update):**

1. Read existing `.ai/memory/coding-rules/index.md`
2. Ask: "What would you like to update? (e.g., change methodology, update review
   standards, add principles)"
3. Wait for user's specific update request
4. Make targeted updates to specific sections
5. Update "Last Updated" date
6. Confirm completion

**If user chooses B or no file exists:**

- Proceed to full coding instructions definition (step 2)

**If user chooses C:**

```
✓ Cancelled. No changes made.
```

### 2. Sequential Coding Instructions Questions

Use the **sequential one-by-one format** (consistent with
/ai.define-tech-stack). Ask 6+ questions to gather comprehensive coding
standards information.

**Question 1/6+**

```
What development methodology does your team follow?

Options:
  A: Test-Driven Development (TDD) - write tests before implementation, strict coverage
  B: Behavior-Driven Development (BDD) - focus on user stories and acceptance criteria
  C: Test-After Development - write tests after implementing features

Recommendation: Option A if your team values regression prevention and has established testing infrastructure. TDD provides confidence for refactoring but requires upfront time investment. Option B is ideal if your team collaborates closely with product/stakeholders on behavior specifications.

---
You can select A, B, or C, or provide your own answer.
```

**Question 2/6+**

```
What level of test coverage do you expect?

Options:
  A: High coverage (80%+ unit test coverage, comprehensive E2E for critical paths)
  B: Pragmatic coverage (focus on business logic, integration points, critical paths)
  C: Minimal coverage (smoke tests, critical bug prevention only)

Recommendation: Option B for most projects - it balances confidence with velocity. Focus testing efforts where they matter most: complex business logic, integration points, and user-critical paths.

---
You can select A, B, or C, or provide your own answer.
```

**Question 3/6+**

```
What architectural principles does your team prioritize?

Options:
  A: SOLID + Clean Architecture (strict separation of concerns, dependency inversion, domain-driven design)
  B: Pragmatic principles (DRY, KISS, YAGNI - balance simplicity with flexibility)
  C: Framework-driven (follow framework conventions and best practices, minimal abstraction)

Recommendation: Option B for most applications - pragmatic principles prevent over-engineering while maintaining code quality. Option A for enterprise/long-term projects with complex domains. Option C for rapid prototyping or framework-heavy stacks.

---
You can select A, B, or C, or provide your own answer.
```

**Question 4/6+**

```
What code review standards does your team follow?

Options:
  A: Strict reviews (2+ approvals required, automated checks must pass, style enforcement)
  B: Standard reviews (1 approval required, automated tests pass, documented changes)
  C: Lightweight reviews (optional review, trust-based approach, quick iteration)

Recommendation: Option B for most teams - ensures quality without slowing down delivery. One approval catches most issues while maintaining velocity.

---
You can select A, B, or C, or provide your own answer.
```

**Question 5/6+**

```
What documentation standards does your team expect?

Options:
  A: Comprehensive (JSDoc/docstrings for all public APIs, architectural decision records, inline comments for complex logic)
  B: Pragmatic (public APIs documented, README/contributing guides maintained, self-documenting code preferred)
  C: Minimal (README only, code should be self-explanatory)

Recommendation: Option B for most projects - documents what matters (public interfaces, getting started) without burdening developers with excessive documentation overhead.

---
You can select A, B, or C, or provide your own answer.
```

**Question 6/6+**

```
Are there any additional coding standards or practices to document?

Options:
  A: Specific conventions (naming patterns, file organization, error handling, state management)
  B: Performance requirements (bundle size limits, response time targets, optimization priorities)
  C: None - covered by the previous questions

Recommendation: Document any team-specific patterns that aren't covered by standard principles. This helps onboard new developers and ensures consistency.

---
You can select A, B, or C, or provide your own answer (describe any additional standards).
```

**Follow-up questions (dynamic, based on answers):**

After question 6, ask targeted follow-ups based on previous answers:

**If user mentioned TDD or BDD (Q1):**

```
Follow-up: What testing tools and frameworks are you using?

(e.g., Jest/Vitest for unit tests, Playwright for E2E, React Testing Library, etc.)

---
Provide testing tools or type "See tech-stack.md" if already documented.
```

**If user mentioned specific principles (Q3):**

```
Follow-up: Are there any anti-patterns or practices to explicitly avoid?

(e.g., avoid deep nesting, no god objects, prefer composition over inheritance, etc.)

---
Provide anti-patterns to avoid or type "None".
```

**If user mentioned strict or standard reviews (Q4):**

```
Follow-up: What should reviewers focus on during code review?

(e.g., correctness, performance, security, readability, test coverage, etc.)

---
Provide review focus areas or type "Standard practices".
```

**General follow-up:**

```
Follow-up: Are there any other important practices, constraints, or team agreements to document?

(e.g., pair programming expectations, refactoring guidelines, commit message format, branch naming conventions)

---
Provide any additional information or type "None".
```

### 3. Generate coding-rules/index.md

After collecting all answers, create `.ai/memory/coding-rules/index.md` using
the detailed template:

```markdown
# Coding Instructions

> **Last Updated**: {YYYY-MM-DD} **Maintained By**: Development Team

---

## General Coding Approach

### Development Methodology

{Based on Q1 answer:} {If TDD: "We follow Test-Driven Development (TDD). Tests
are written before implementation to ensure comprehensive coverage and enable
confident refactoring."} {If BDD: "We follow Behavior-Driven Development (BDD).
Features are specified through user stories and acceptance criteria that guide
implementation."} {If Test-After: "We implement features first, then add tests
for validation and regression prevention."} {If custom: Use their description}

**Testing Strategy**: {Based on Q2 answer} {If High coverage: "- Target: 80%+
unit test coverage"} {If High coverage: "- Comprehensive E2E testing for
critical user paths"} {If High coverage: "- All business logic must have test
coverage"}

{If Pragmatic: "- Focus on business logic, integration points, and critical
paths"} {If Pragmatic: "- Prefer meaningful tests over coverage metrics"} {If
Pragmatic: "- E2E tests for key user workflows"}

{If Minimal: "- Smoke tests for core functionality"} {If Minimal: "- Tests for
critical bug prevention"} {If Minimal: "- Prioritize speed of delivery over
comprehensive coverage"}

{If follow-up provided testing tools:} **Testing Tools**: {List tools from
follow-up}

### Architectural Principles

{Based on Q3 answer:} {If SOLID: "We prioritize SOLID principles and Clean
Architecture patterns."} {If Pragmatic: "We follow pragmatic architectural
principles focused on simplicity and maintainability."} {If Framework-driven:
"We follow framework conventions and best practices as our primary architectural
guide."}

**Key principles we follow:** {If SOLID:}

- Single Responsibility Principle (SRP)
- Dependency Inversion (depend on abstractions, not implementations)
- Domain-Driven Design for complex business logic
- Clear separation of concerns (presentation, business logic, data access)

{If Pragmatic:}

- Don't Repeat Yourself (DRY) - extract common patterns
- Keep It Simple, Stupid (KISS) - prefer simple solutions
- You Aren't Gonna Need It (YAGNI) - avoid premature optimization
- Composition over inheritance

{If Framework-driven:}

- Follow framework conventions and documentation
- Leverage framework features before custom abstractions
- Minimal custom architecture layers
- Community best practices

{If custom: Use their description}

{If follow-up provided anti-patterns:} **Anti-patterns to avoid:** {List from
follow-up}

### Code Review Standards

{Based on Q4 answer:} {If Strict: "All code changes require 2+ approvals before
merging."} {If Standard: "All code changes require 1 approval before merging."}
{If Lightweight: "Code reviews are optional but encouraged for complex
changes."}

**Review requirements:** {If Strict or Standard:}

- Automated tests must pass
- Code style checks must pass
- No unresolved review comments

{If Strict:}

- At least 2 team members must approve
- Security-sensitive changes require senior review

{If Standard:}

- At least 1 team member must approve
- Changes include appropriate tests

{If Lightweight:}

- Self-review before merging
- Ask for reviews on complex or risky changes

{If follow-up provided review focus:} **Review focus areas:** {List from
follow-up}

### Documentation Standards

{Based on Q5 answer:} {If Comprehensive: "We maintain comprehensive
documentation across the codebase."} {If Pragmatic: "We document public
interfaces and maintain essential guides."} {If Minimal: "We keep documentation
minimal, focusing on README and setup instructions."}

**Documentation expectations:** {If Comprehensive:}

- JSDoc/docstrings for all public APIs
- Architectural Decision Records (ADRs) for significant choices
- Inline comments for complex algorithms or business logic
- Maintain README, contributing guides, and architecture docs

{If Pragmatic:}

- Public APIs and exported functions documented
- README with setup, usage, and contribution guidelines
- Self-documenting code preferred over excessive comments
- Comments for non-obvious decisions or workarounds

{If Minimal:}

- README with basic setup and usage
- Code should be self-explanatory
- Comments only when absolutely necessary

{If custom: Use their description}

{If Q6 answer is A or B or custom (not "None"):}

### Additional Standards

{If Q6 mentioned specific conventions:} **Coding Conventions:** {Details from
user's Q6 answer}

{If Q6 mentioned performance requirements:} **Performance Requirements:**
{Details from user's Q6 answer}

{If general follow-up provided additional practices:} **Additional Practices:**
{Details from follow-up}

---

## Rule Categories

> **Note**: Category-specific rules are maintained manually. Create
> subdirectories for each technology category (e.g., `react/`, `typescript/`,
> `testing/`) and add rule files as needed.

**To add category rules:**

1. Create directory: `.ai/memory/coding-rules/{category}/`
2. Create category index: `.ai/memory/coding-rules/{category}/index.md`
3. Add individual rule files:
   `.ai/memory/coding-rules/{category}/{rule-name}.md`
4. Link the category below

### Available Categories

_No category-specific rules defined yet. Add categories manually as needed._

**Example structure:**

- [React Standards](./react/index.md) - React component architecture and
  patterns
- [TypeScript Standards](./typescript/index.md) - TypeScript best practices and
  type safety
- [Testing Standards](./testing/index.md) - Testing patterns and practices

---

## Usage

These coding instructions are automatically referenced when:

- Creating implementation plans (`/ai.define-implementation-plan`)
- Executing implementation phases (`/ai.execute`)

They are NOT included in PRDs, which focus on _what_ to build rather than _how_.

---

## Updating These Instructions

To update these instructions, run:
```

/ai.define-coding-instructions

```

Choose "Update existing" to modify specific sections.
```

**Content rules:**

- Use provided answers verbatim where appropriate
- Expand options A/B/C into full explanations
- Use "TBD" if user provides minimal answers
- Use "None" for optional sections if user skips
- Include version numbers for testing tools if provided
- Keep all sections even if minimal (use "TBD" or "None specified")

**File creation:**

1. Ensure `.ai/memory/coding-rules/` directory exists (create if needed)
2. Write content to `.ai/memory/coding-rules/index.md`
3. If update mode, preserve information not being changed

### 4. Confirm Completion

After creating or updating the file, display confirmation:

```
✓ Created .ai/memory/coding-rules/index.md

Summary:
  - Methodology: {TDD/BDD/Test-After or custom}
  - Principles: {SOLID/Pragmatic/Framework-driven or custom}
  - Review: {Strict/Standard/Lightweight}
  - Documentation: {Comprehensive/Pragmatic/Minimal}

This will be automatically included when:
  - Defining implementation plans (/ai.define-implementation-plan)
  - Executing implementation phases (/ai.execute)

Next steps:
  - Review .ai/memory/coding-rules/index.md
  - Add category-specific rules manually (react/, typescript/, testing/)
  - Update as needed with /ai.define-coding-instructions
```

**If update mode:**

```
✓ Updated .ai/memory/coding-rules/index.md

Changes:
  - {List what was changed}

Last Updated: {YYYY-MM-DD}
```

---

## Edge Cases

| Situation                                               | Behavior                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| Coding instructions already exist                       | Offer update vs recreate vs cancel options                    |
| User chooses "Update"                                   | Read existing file, ask what to update, make targeted changes |
| User provides incomplete answers                        | Generate with "TBD" for missing info                          |
| User wants to skip sections                             | Mark as "None" or use minimal text                            |
| No .ai directory exists                                 | Create directory structure first                              |
| User provides very detailed Q6 answer                   | Create structured subsections under "Additional Standards"    |
| Inconsistent answers (e.g., Test-After + High Coverage) | Note potential challenge in generated file                    |
| User mentions testing tools already in tech-stack       | Reference tech-stack.md instead of duplicating                |
| User provides "None" for all optional follow-ups        | Omit follow-up sections, keep core content only               |

---

## Notes for AI

- **Follow sequential format**: One question at a time, wait for answer before
  next question
- **Use "Question {n}/6+" format**: The "+" indicates potential follow-ups
- **Research common patterns**: When generating options, base on industry
  standards
- **Be flexible**: User can provide custom answers beyond A/B/C options
- **Maintain context**: Reference previous answers in follow-up questions and
  recommendations
- **Don't over-ask**: If user provides comprehensive answer early, skip
  redundant follow-ups
- **Update mode efficiency**: In update mode, only change what user requests,
  preserve rest
- **Template expansion**: Expand A/B/C options into full explanations in the
  generated file
- **Category placeholder**: Leave "Available Categories" empty - user adds
  manually
- **Directory creation**: Create `.ai/memory/coding-rules/` if it doesn't exist
- **Date format**: Use YYYY-MM-DD format for "Last Updated" field
