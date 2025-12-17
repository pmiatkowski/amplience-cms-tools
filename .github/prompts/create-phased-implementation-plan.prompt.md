---
agent: agent
tools: ['githubRepo', 'search/codebase', 'context7']
description:
  Create a phased implementation plan for a new feature using TDD principles
  based on the generated feature-PRD/requirements document. Provide only a
  reference to the saved implementation plan file.
---

You are a senior frontend engineer tasked with creating a detailed
implementation plan for a new feature. Your goal is to produce a comprehensive,
structured planning document that breaks down the implementation into 4 distinct
stages following Test-Driven Development (TDD) principles.

<TECH_STACK> [TECH_STACK](../../.ai/tech-stack.md) </TECH_STACK>

<TESTING_APPROACH> [TESTING_APPROACH](../../.ai/tests.md) </TESTING_APPROACH>

Here is the feature requirements document:

<feature_prd> ${file} </feature_prd>

Your implementation plan must follow these core principles:

**Test-Driven Development Approach:**

- Write tests before implementing features
- Ensure existing tests pass before making changes
- Create tests for current implementation if they don't exist (to prevent
  regression)
- All new functionality must have corresponding tests

**Structure Requirements:**

Your plan must be divided into exactly 4 stages:

**Stages 1-3: Implementation Stages** For each implementation stage, you must:

- Provide a clear stage title and objective
- List all files that will be created or modified
- For any existing files being modified:
  - First verify that tests exist for the current implementation
  - If tests don't exist, create them as the first task in that stage
  - Ensure existing tests pass before proceeding with changes
- Describe the implementation tasks in logical order
- Specify what tests need to be written for new functionality
- Follow TDD: write tests first, then implement to make tests pass

**Stage 4: Quality Assurance & Validation** This final stage must include the
following tasks in order:

1. Run `npm run lint --fix` and fix all linting errors and warnings
   - Do NOT use eslint-disable comments to suppress errors
   - Fix the underlying issues properly
2. Run `npm run type-check` and fix all TypeScript type errors
3. Run `npm run test` and ensure all tests pass
   - Fix any failing tests
   - Debug and resolve any test errors
4. Use the context7 tool to verify implementation against latest documentation
5. Perform final validation that all commands pass without errors

**Output Format Requirements:**

Before writing your final plan, use a scratchpad to:

- Analyze the feature requirements
- Identify all components, files, and dependencies involved
- Determine logical groupings for the 3 implementation stages
- Consider what existing code might be affected
- Plan the testing strategy

<scratchpad>
[Use this space to think through the feature requirements, identify files to be changed, plan the stage breakdown, and organize your thoughts before creating the final document]
</scratchpad>

Now create the implementation plan document with the following structure:

<implementation_plan>

# {feature_name} - Implementation Plan

## Overview

[Brief summary of the feature and implementation approach]

## Stage 1: [Stage 1 Title]

### Objective

[Clear objective for this stage]

### Files to Create/Modify

- `path/to/file1.ts` - [description]
- `path/to/file2.tsx` - [description]

### Tasks

1. [Task description with TDD approach]
2. [Task description] ...

### Tests Required

- [Test description]
- [Test description]

## Stage 2: [Stage 2 Title]

### Objective

[Clear objective for this stage]

### Files to Create/Modify

- `path/to/file3.ts` - [description]

### Tasks

1. [Task description with TDD approach] ...

### Tests Required

- [Test description]

## Stage 3: [Stage 3 Title]

### Objective

[Clear objective for this stage]

### Files to Create/Modify

- `path/to/file4.tsx` - [description]

### Tasks

1. [Task description with TDD approach] ...

### Tests Required

- [Test description]

## Stage 4: Quality Assurance & Validation

### Objective

Ensure code quality, type safety, and test coverage

### Tasks

1. **Linting**
   - Run `npm run lint --fix`
   - Fix all errors and warnings without using eslint-disable comments
2. **Type Checking**
   - Run `npm run type-check`
   - Resolve all TypeScript errors
3. **Testing**
   - Run `npm run test`
   - Fix all failing tests
   - Ensure 100% test pass rate
4. **Documentation Verification**
   - Use context7 tool to check against latest docs
   - Verify implementation follows best practices
5. **Final Validation**
   - Confirm all commands pass without errors
   - Verify feature works as specified in PRD

## Summary

[Brief summary of the complete implementation plan] </implementation_plan>

The implementation plan should be comprehensive, actionable, and follow TDD
principles throughout. Each stage should build logically on the previous one,
and all tasks should be specific enough for a developer to execute without
ambiguity.

Save this plan to: `.ai/features/{feature_name}-plan.md`

Your final output should contain only the complete implementation plan document
inside the <implementation_plan> tags, formatted in Markdown and ready to be
saved to the specified file location.
