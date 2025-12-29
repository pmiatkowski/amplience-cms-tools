# Clarification Round 1

## Date

2025-12-29

## Questions & Answers

### Q1: Retry Bounds

What should be the maximum number of retry attempts and/or maximum total elapsed
time before giving up?

**A**: Retry by default 3 times. This can be overridden with new .env variable
`RETRIES_COUNT=6`

### Q2: Retry-After Header Priority

When Amplience returns a `Retry-After` header with a 429 response, should we
always honor that value exactly, or should we cap it at some maximum wait time?

**A**: If Amplience returns Retry-After - honor the header. If not - use new
.env variable `RETRY_AWAIT_TIME=60`. If not defined explicitly, use 60s as
default.

### Q3: Exponential Backoff Parameters

When `Retry-After` is not present, what backoff strategy should we use?

**A**: Use `RETRY_AWAIT_TIME` or default 60s and use multiplier on each next
try.

### Q4: User Feedback

Should the CLI display messages when retrying or should it be silent unless it
exhausts all retries?

**A**: Use feedback as suggested: "Rate limit hit..."

### Q5: Scope of Retry Logic

Should the retry mechanism apply only to Amplience APIs, all fetch calls, or be
a reusable wrapper?

**A**: Create reusable retry wrapper that other services can opt into and apply
it for now only to `AmplienceService._request`.

### Q6: Mutation Safety

For mutating operations (publish/unpublish), should we treat 429 retries the
same as GET requests, or should we have different retry policies?

**A**: Treat same as GET for now.

### Q7: Error Context Preservation

When all retries are exhausted, should the error message include retry attempt
history or just the final error?

**A**: Both - include retry history and final error details.

## Summary

Key decisions made:

- **Retry policy**: 3 attempts by default, configurable via `RETRIES_COUNT` env
  variable
- **Wait strategy**: Honor `Retry-After` header when present; otherwise use
  `RETRY_AWAIT_TIME` (default 60s) with exponential backoff multiplier
- **User experience**: Display informative messages during retries ("Rate limit
  hit...")
- **Architecture**: Implement as reusable wrapper, initially applied only to
  `AmplienceService._request`
- **Scope**: Same retry behavior for all HTTP methods (GET, POST, etc.)
- **Error reporting**: Include both retry attempt history and final error
  details when retries are exhausted
