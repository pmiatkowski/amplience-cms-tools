# Context

## Relevant Files

- `src/services/amplience-service.ts` — Central Amplience HTTP wrapper (`_request`) and auth (`_getAccessToken`). Main integration point for 429 wait-and-retry.
- `src/services/update-service.ts` — GitHub update check uses `fetch` (non-Amplience). Decide whether retry/backoff should apply globally or only to Amplience calls.

## Code Snippets

### `AmplienceService._request` (current behavior: throws immediately on non-2xx)

```ts
private async _request<T>(url: string, options: RequestInit = {}): Promise<T> {

  if (!this._accessToken || Date.now() >= this._tokenExpiry) {
    await this._getAccessToken();
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${this._accessToken}`);

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  return response.json() as T;
}
```

## Business Logic

- Fair usage: The Dynamic Content Management API is intended for backend applications (e.g. webhook integrations) and should not be used in production web applications.
- Amplience reserves the right to impose rate limits on Dynamic Content APIs to help guarantee service availability.
- When the API responds with `429 Too Many Requests`, the tool should wait and retry (instead of failing the whole command immediately).

## Verified Limits (Amplience docs)

Source: <https://amplience.com/developers/docs/apis/limits/>

### Dynamic Content Management API — rate limits

- API requests: 5000 requests per minute (enforced as standard; Amplience reserves the right to introduce a lower rate limit).
- Publish/Unpublish content requests: 100 requests per minute (publish + unpublish combined).
- Bulk publish / publish hierarchy nodes requests: 10 requests per minute (per account; shared between the Dynamic Content Management API and the Dynamic Content app).

### Fresh API — rate limits and 429 guidance

- API requests: 100 requests per second (burst limit: 200 requests per second).
- Exceeding the rate limit can return `429` responses.
- When receiving a `429`, the docs recommend retrying after delaying with exponential backoff.

### Virtual staging environment (VSE) — rate limits

- Content and media requests: 7 requests per second with a burst (bucket fill rate) of 350 per minute.

## Technical Constraints

- Retry mechanism should apply consistently to Amplience HTTP calls (and optionally other `fetch` calls if scoped that way).
- Prefer honoring the `Retry-After` header when present; otherwise use exponential backoff (with jitter) between retries.
- Retries must be bounded (max attempts and/or max elapsed time) to avoid infinite loops.
- Error handling currently consumes the response body via `response.text()` on failures; retry logic must preserve useful error messages after retries are exhausted.
- Consider idempotency:
  - Safe methods (`GET`) are generally safe to retry.
  - Mutating calls (publish/unpublish) may be retried on 429, but should be done carefully to avoid excessive repeated requests.

## Notes

- The mechanism is primarily motivated by Dynamic Content Management API publish/unpublish limits (100/min), but should handle any 429 emitted by Amplience endpoints used by this tool.
