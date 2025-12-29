# Implementation Plan: HTTP 429 Retry Logic

This plan outlines the steps to implement the HTTP 429 (Too Many Requests) retry
mechanism in the `AmplienceService` using a Test-Driven Development (TDD)
approach.

## Reference Documents

- **PRD**: `.ai-workflow/features/http-429-retry/prd.md`
- **Testing Guidelines**: `.ai/tests.md`

## Phase 1: Test Creation (Red Phase)

**Goal**: Create a comprehensive test suite that defines the expected behavior
for rate limit handling. These tests will initially fail.

1. **Create Test File**: `src/services/amplience-service.retry.test.ts`
   - _Note_: We are creating a separate test file to isolate the retry logic
     tests from the main service tests, keeping the test file size manageable.
     This follows the co-location strategy (same directory).

2. **Define Test Cases**:
   - **Scenario 1: Successful Retry**: Mock a 429 response followed by a 200 OK.
     Verify the request is retried and succeeds.
   - **Scenario 2: Max Retries Exceeded**: Mock continuous 429 responses. Verify
     the service throws an error after `RETRIES_COUNT` attempts.
   - **Scenario 3: Retry-After Header**: Mock a 429 response with a
     `Retry-After` header. Verify the service waits for the specified duration
     before retrying.
   - **Scenario 4: Exponential Backoff**: Mock a 429 response without a header.
     Verify the service waits for `RETRY_AWAIT_TIME` (with backoff multiplier)
     before retrying.
   - **Scenario 5: Configuration**: Verify that `RETRIES_COUNT` and
     `RETRY_AWAIT_TIME` environment variables are respected.

## Phase 2: Implementation (Green Phase)

**Goal**: Implement the retry logic in `AmplienceService` to make the tests
pass.

1. **Modify `src/services/amplience-service.ts`**:
   - Update the `_request` method.
   - Wrap the `fetch` call in a loop or recursive function to handle retries.

2. **Implement Logic**:
   - **Check Status**: If status is 429, initiate retry flow.
   - **Retry Count**: Decrement a counter or increment an attempt tracker. Throw
     error if limit reached.
   - **Wait Strategy**:
     - Check `Retry-After` header (parse seconds or date).
     - If no header, calculate backoff:
       `RETRY_AWAIT_TIME * (multiplier ^ attempt)`.
   - **Delay**: Use a `setTimeout` promise wrapper to pause execution.
   - **Logging**: Log a warning message when a retry is triggered (FR-4).

## Phase 3: Refactoring & Verification (Refactor Phase)

**Goal**: Clean up the code and ensure all tests pass.

1. **Refactor**:
   - Extract the delay calculation logic into a private helper method
     `_calculateRetryDelay(response, attempt)`.
   - Ensure code readability and type safety.

2. **Verify**:
   - Run `npm test src/services/amplience-service.retry.test.ts`.
   - Run existing tests `npm test src/services/amplience-service.test.ts` to
     ensure no regressions.

## Phase 4: Documentation

1. Update `README.md` (if applicable) to mention the new environment variables:
   - `RETRIES_COUNT` (default: 3)
   - `RETRY_AWAIT_TIME` (default: 60000ms)
