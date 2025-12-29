# PRD: http-429-retry

> **Status**: Draft  
> **Created**: 2025-12-29  
> **Last Updated**: 2025-12-29

---

## Overview

Implement a robust wait-and-retry mechanism for handling HTTP 429 (Too Many
Requests) responses from Amplience APIs. This feature ensures the CLI tool can
gracefully handle rate limits by pausing and retrying requests instead of
failing immediately, improving reliability during bulk operations.

## Problem Statement

Currently, `AmplienceService` throws an error immediately when a non-2xx
response is received. When rate limits are hit (returning 429), operations fail
abruptly. This is particularly problematic for bulk publish/unpublish operations
which have strict limits (e.g., 100 requests/minute), causing interruptions in
automated workflows.

## Goals

- Prevent immediate failure on HTTP 429 responses
- Implement configurable retry logic (count and wait time)
- Respect standard `Retry-After` headers from the API
- Provide clear feedback to the user when rate limits are hit
- Preserve error context if all retries fail

## Non-Goals

- Implementing retries for other error codes (e.g., 500, 503) in this phase
- Applying retries to non-Amplience services (e.g., GitHub updates) at this
  stage
- Complex circuit breaker patterns

## User Stories

- As a developer running bulk content updates, I want the tool to automatically
  pause and retry when rate limits are reached, so that my script completes
  without manual intervention.
- As a user, I want to see a message when the tool is waiting due to rate
  limits, so that I know the process hasn't hung.
- As an administrator, I want to configure the number of retries and wait times
  via environment variables, so that I can tune the behavior for different
  environments.

## Functional Requirements

### FR-1: Configurable Retry Count

The system must allow configuring the maximum number of retry attempts via an
environment variable `RETRIES_COUNT`.

- Default value: 3
- If the variable is set, use the provided integer value.

### FR-2: Retry-After Header Support

When a 429 response is received, the system must check for the `Retry-After`
header.

- If present, the system must wait for the specified duration before retrying.
- This takes precedence over the default wait time.

### FR-3: Configurable Backoff Strategy

If `Retry-After` is not present, the system must use a backoff strategy based on
an environment variable `RETRY_AWAIT_TIME`.

- Default value: 60 seconds.
- The wait time should increase with each attempt using a multiplier
  (exponential backoff).

### FR-4: User Feedback

The system must output a log message to the console when a retry is triggered.

- Message format should indicate "Rate limit hit" and the wait time.

### FR-5: Reusable Wrapper

The retry logic must be implemented as a reusable wrapper function or class that
can be applied to any `fetch` operation.

- Initially, this must be applied to `AmplienceService._request`.

### FR-6: Error Handling

If all retry attempts are exhausted, the system must throw an error.

- The error message must include details of the final failure.
- The error should ideally include context about the retry history (e.g.,
  "Failed after X retries").

## Technical Considerations

- **Integration Point**: Modify `src/services/amplience-service.ts`,
  specifically the `_request` method.
- **Environment Variables**:
  - `RETRIES_COUNT` (number)
  - `RETRY_AWAIT_TIME` (number, seconds)
- **Scope**: Apply to all HTTP methods (GET, POST, PUT, DELETE) equally for now.
- **Implementation**: Create a utility function (e.g., `fetchWithRetry`) that
  wraps the native `fetch` or the existing request logic.

## Acceptance Criteria

- [ ] AC-1: `AmplienceService` retries a request up to 3 times (default) when a
      429 is received.
- [ ] AC-2: Setting `RETRIES_COUNT` environment variable changes the maximum
      number of retries.
- [ ] AC-3: System waits for the duration specified in `Retry-After` header if
      present.
- [ ] AC-4: System waits for `RETRY_AWAIT_TIME` (default 60s) \* multiplier if
      `Retry-After` is missing.
- [ ] AC-5: Console displays "Rate limit hit..." message during wait periods.
- [ ] AC-6: An error is thrown containing failure details after all retries are
      exhausted.
- [ ] AC-7: Non-429 errors (e.g., 404, 500) continue to throw immediately
      (unless decided otherwise, but scope is 429).

## Open Questions

None
