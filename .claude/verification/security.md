# Security Verification Rules

These rules are checked by task-verificator in deep mode.

## OWASP Top 10 Checks

### A01:2021 - Broken Access Control
- [ ] All API endpoints have authentication checks
- [ ] Role-based access control is implemented
- [ ] No direct object references without authorization
- [ ] Session management is secure

### A02:2021 - Cryptographic Failures
- [ ] Passwords are hashed (bcrypt, argon2)
- [ ] Sensitive data encrypted at rest
- [ ] TLS used for data in transit
- [ ] No hardcoded secrets or keys

### A03:2021 - Injection
- [ ] SQL queries use parameterized statements
- [ ] No string concatenation for queries
- [ ] Input validation on all user input
- [ ] Output encoding for XSS prevention

### A04:2021 - Insecure Design
- [ ] Threat modeling documented
- [ ] Security requirements in PRD
- [ ] Rate limiting on sensitive endpoints
- [ ] Principle of least privilege applied

### A05:2021 - Security Misconfiguration
- [ ] Debug mode disabled in production
- [ ] Default credentials changed
- [ ] Unnecessary features disabled
- [ ] Security headers present

### A06:2021 - Vulnerable Components
- [ ] Dependencies scanned for vulnerabilities
- [ ] No known vulnerable packages
- [ ] Dependencies are up to date

### A07:2021 - Authentication Failures
- [ ] Password strength requirements
- [ ] Account lockout after failed attempts
- [ ] Secure password recovery
- [ ] Multi-factor authentication available

### A08:2021 - Software and Data Integrity
- [ ] CI/CD pipeline secure
- [ ] Dependencies from trusted sources
- [ ] Code review required for changes
- [ ] Unsigned data validated

### A09:2021 - Security Logging Failures
- [ ] Security events logged
- [ ] Logs don't contain sensitive data
- [ ] Log injection prevented
- [ ] Alerting configured

### A10:2021 - SSRF
- [ ] User-supplied URLs validated
- [ ] Internal services not accessible
- [ ] URL schemes restricted
- [ ] Response data sanitized

## Language-Specific Checks

### JavaScript/TypeScript
- [ ] No `eval()` usage
- [ ] No `innerHTML` without sanitization
- [ ] Helmet.js or similar for headers
- [ ] CORS configured properly

### Python
- [ ] No `exec()` or `eval()` on user input
- [ ] ORM used (no raw SQL)
- [ ] Secret key management (not in code)
- [ ] CSRF protection enabled

### General
- [ ] Error messages don't leak information
- [ ] Stack traces not shown to users
- [ ] Secrets in environment variables
- [ ] API keys rotated regularly

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| CRITICAL | Active exploitation possible | BLOCK - Fix immediately |
| HIGH | Significant vulnerability | BLOCK - Fix before merge |
| MEDIUM | Moderate risk | WARN - Fix in current sprint |
| LOW | Minor issue | INFO - Address when possible |
