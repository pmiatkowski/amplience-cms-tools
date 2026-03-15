# Performance Verification Rules

These rules are checked by task-verificator in deep mode.

## Database Performance

### N+1 Query Detection
- [ ] No queries inside loops
- [ ] Eager loading used for associations
- [ ] Batch queries for bulk operations
- [ ] Data loader pattern for GraphQL

### Index Usage
- [ ] Queries use indexed columns
- [ ] No full table scans on large tables
- [ ] Composite indexes for multi-column queries
- [ ] Index on foreign keys

### Query Optimization
- [ ] SELECT only needed columns (no SELECT *)
- [ ] LIMIT on large result sets
- [ ] Pagination for list endpoints
- [ ] Query timeouts configured

## API Performance

### Response Time
- [ ] Endpoints respond < 200ms (P95)
- [ ] No synchronous external API calls in hot path
- [ ] Caching for frequently accessed data
- [ ] Compression enabled for large responses

### Rate Limiting
- [ ] Rate limits configured
- [ ] Graceful degradation on limit
- [ ] Rate limit headers in response
- [ ] Different limits for authenticated users

### Payload Size
- [ ] Request size limits
- [ ] Response pagination for lists
- [ ] Field selection supported
- [ ] Binary data handled efficiently

## Memory Management

### Leaks
- [ ] No circular references in closures
- [ ] Event listeners cleaned up
- [ ] Large objects released after use
- [ ] Connection pools bounded

### Caching
- [ ] Cache invalidation strategy
- [ ] Cache size limits
- [ ] TTL configured for cached items
- [ ] Cache hit ratio monitored

## Frontend Performance

### Bundle Size
- [ ] No oversized bundles (> 500KB)
- [ ] Code splitting used
- [ ] Tree shaking enabled
- [ ] Lazy loading for routes

### Rendering
- [ ] No layout thrashing
- [ ] Virtual scrolling for long lists
- [ ] Debounced/throttled handlers
- [ ] Memoization for expensive computations

### Assets
- [ ] Images optimized
- [ ] Lazy loading for images
- [ ] Responsive images used
- [ ] Font loading optimized

## Concurrency

### Parallelization
- [ ] Independent operations parallelized
- [ ] Connection pooling used
- [ ] Worker threads for CPU-intensive tasks
- [ ] Async/await pattern used

### Resource Limits
- [ ] Max concurrent connections
- [ ] Queue for backpressure
- [ ] Circuit breaker for external services
- [ ] Timeout on all I/O operations

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| CRITICAL | System unusable | BLOCK - Fix immediately |
| HIGH | Significant degradation | BLOCK - Fix before merge |
| MEDIUM | Noticeable impact | WARN - Fix in current sprint |
| LOW | Minor optimization | INFO - Address when possible |

## Measurement Commands

```bash
# Database query analysis
EXPLAIN ANALYZE <query>

# Bundle size
npm run build -- --analyze

# Lighthouse
npx lighthouse <url> --output=json

# Load testing
npx artillery run load-test.yml
```
