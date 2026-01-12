---
agent: agent
description:
  Define or update the global tech stack configuration through guided questions.
---

You are a technical architect helping document the project's tech stack. Your goal is to create a clear, comprehensive tech-stack.md file through sequential questions.

### 1. Check for Existing Tech Stack

Check if `.ai/memory/tech-stack.md` exists.

**If exists:**

```
⚠ Tech stack already defined at .ai/memory/tech-stack.md

Options:
  A: Update existing (recommended for additions/changes)
  B: Recreate from scratch (overwrites existing)
  C: Cancel

Your choice?
```

**If user chooses A (Update):**

1. Read existing `.ai/memory/tech-stack.md`
2. Ask: "What would you like to update? (e.g., add new service, update version, change framework)"
3. Wait for user's specific update request
4. Make targeted updates to specific sections
5. Update "Last Updated" date
6. Confirm completion

**If user chooses B or no file exists:**

- Proceed to full tech stack definition (step 2)

**If user chooses C:**

```
✓ Cancelled. No changes made.
```

### 2. Sequential Tech Stack Questions

Use the **sequential one-by-one format** (consistent with /ai.clarify). Ask 7+ questions to gather comprehensive tech stack information.

**Question 1/7+**

```
What is your primary programming language and version?

Options:
  A: JavaScript/TypeScript (Node.js ecosystem)
  B: Python (Django/FastAPI/Flask)
  C: Other (Java/Go/Rust/C#/PHP/Ruby/etc.)

Recommendation: Option A if building web applications, as it dominates full-stack development with strong frontend/backend support and largest ecosystem.

---
You can select A, B, or C, or provide your own answer (e.g., "TypeScript 5.3, Node.js 20").
```

**Question 2/7+**

```
What frontend framework (if any) are you using?

Options:
  A: React (latest v19+)
  B: Vue.js or Angular
  C: No framework / Vanilla JS / SSR only / Not applicable

Recommendation: Option A if building interactive web UIs, as React has the largest ecosystem, best tooling, and most community support.

---
You can select A, B, or C, or provide specifics (e.g., "React 19 with Vite 5").
```

**Question 3/7+**

```
What backend framework or runtime are you using?

Options:
  A: Express.js / Fastify (Node.js)
  B: FastAPI / Django / Flask (Python)
  C: Other or none (Spring Boot/ASP.NET/Rails/static site)

Recommendation: Based on your language choice in Q1. Match backend to language ecosystem for consistency.

---
You can select A, B, or C, or provide specifics (e.g., "Express.js 5 with TypeScript").
```

**Question 4/7+**

```
What database(s) are you using?

Options:
  A: PostgreSQL (relational, ACID, best for complex queries and data integrity)
  B: MongoDB (document store, flexible schema, good for rapid iteration)
  C: Both or other (MySQL/SQLite/DynamoDB/Redis/etc.)

Recommendation: Option A for most applications requiring data integrity and complex relationships. PostgreSQL is production-proven and feature-rich.

---
You can select A, B, or C, or provide specifics (e.g., "PostgreSQL 16 + Redis cache").
```

**Question 5/7+**

```
What external services or APIs are you integrating with?

Options:
  A: Common services (Auth0/Firebase, Stripe, SendGrid, AWS S3, etc.)
  B: Custom/internal APIs only
  C: None currently

Recommendation: List all services to help future implementation planning. Include authentication, payments, email, storage, etc.

---
You can select or provide a list of services (e.g., "Auth0 for authentication, Stripe for payments, AWS S3 for storage").
```

**Question 6/7+**

```
Where is your application hosted/deployed?

Options:
  A: Cloud provider (AWS/GCP/Azure)
  B: Platform-as-a-Service (Vercel/Netlify/Heroku/Railway)
  C: Self-hosted or local development only

Recommendation: Option B for simplicity if starting out. Option A for production at scale with more control.

---
You can select or provide specifics (e.g., "AWS ECS with RDS and CloudFront").
```

**Question 7/7+**

```
What testing frameworks are you using?

Options:
  A: Jest/Vitest + Playwright/Cypress (JS ecosystem standard)
  B: Pytest + Selenium (Python ecosystem standard)
  C: None or other (JUnit/NUnit/RSpec/etc.)

Recommendation: Based on your language choice in Q1. Match testing tools to language ecosystem.

---
You can select or provide specifics (e.g., "Vitest for unit tests, Playwright for E2E").
```

**Follow-up questions (dynamic, based on answers):**

After question 7, ask targeted follow-ups based on previous answers:

**If frontend framework mentioned (Q2):**

```
Follow-up: What state management library are you using?

Options:
  A: Built-in (React Context / Vue Pinia / etc.)
  B: Redux / Zustand / Jotai
  C: None or other

---
You can select or provide specifics.
```

**If cloud provider mentioned (Q6):**

```
Follow-up: What CI/CD pipeline are you using?

Options:
  A: GitHub Actions
  B: GitLab CI / CircleCI / Jenkins
  C: None or manual deployment

---
You can select or provide specifics.
```

**If backend framework mentioned (Q3):**

```
Follow-up: What API style are you using?

Options:
  A: REST
  B: GraphQL
  C: gRPC or other

---
You can select or provide specifics.
```

**General follow-up:**

```
Follow-up: Are there any other important technologies, tools, or constraints to document?

(e.g., Docker, Kubernetes, specific versions, browser support requirements, performance targets, security compliance needs)

---
Provide any additional information or type "None".
```

### 3. Generate tech-stack.md

After collecting all answers, create `.ai/memory/tech-stack.md` using the detailed template:

```markdown
# Tech Stack

> **Last Updated**: {YYYY-MM-DD}
> **Maintained By**: {Team/Person or "Development Team"}

---

## Core Technologies

### Language & Runtime
- **Primary Language**: {Language from Q1} {Version}
- **Runtime**: {Runtime} {Version}
- **Package Manager**: {npm/yarn/pnpm/pip/poetry/etc} {Version if provided}

### Frontend {if applicable from Q2}
- **Framework**: {Framework from Q2} {Version}
- **Build Tool**: {Tool if mentioned, e.g., Vite/Webpack/etc} {Version}
- **UI Library**: {Component library if mentioned} {Version}
- **State Management**: {From follow-up or "Built-in" or "N/A"}

### Backend {if applicable from Q3}
- **Framework**: {Framework from Q3} {Version}
- **Server**: {Server if mentioned} {Version}
- **API Style**: {REST/GraphQL/gRPC from follow-up}

### Database & Storage
- **Primary Database**: {Database from Q4} {Version}
- **Cache**: {Cache if mentioned, e.g., Redis} {Version}
- **Object Storage**: {Storage if mentioned, e.g., S3/GCS}

---

## External Services & Integrations

### Authentication & Authorization
- {Auth service from Q5 or "TBD" or "Custom"}

### Third-Party APIs
{List services from Q5, one per line:}
- {Service Name}: {Purpose if provided}
- {Service Name}: {Purpose if provided}

### Infrastructure & Deployment
- **Hosting**: {Hosting from Q6}
- **CI/CD**: {CI/CD from follow-up or "TBD"}
- **Monitoring**: {Monitoring tool if mentioned or "TBD"}

---

## Development Tools

### Version Control
- **Platform**: {GitHub/GitLab/Bitbucket or "Git"}
- **Branching Strategy**: {Strategy if mentioned or "TBD"}

### Testing
- **Unit Testing**: {Testing framework from Q7}
- **E2E Testing**: {E2E framework from Q7 if mentioned}
- **Coverage Tool**: {Coverage tool if mentioned}

---

## Technical Constraints

### Performance Requirements
- {Performance targets from follow-up or "None specified"}

### Browser/Platform Support
- {Browser support from follow-up or "Modern browsers (last 2 versions)"}

### Security Requirements
- {Compliance standards from follow-up or "None specified"}

---

## Notes

{Additional context from follow-up questions or "None"}

{If user mentioned migration plans, deprecated technologies, or future changes, document here}
```

**Content rules:**

- Use "TBD" for planned but not-yet-implemented technologies
- Use "N/A" or omit optional sections if not applicable
- Include version numbers where provided
- Keep Notes section for any clarifications or migration plans
- If information is missing or unclear, use placeholder text that prompts future updates

**File creation:**

1. Ensure `.ai/memory/` directory exists
2. Write content to `.ai/memory/tech-stack.md`
3. If update mode, preserve information not being changed

### 4. Confirm Completion

After creating or updating the file, display confirmation:

```
✓ Created .ai/memory/tech-stack.md

Summary:
  - Primary language: {language}
  - Frontend: {framework or "N/A"}
  - Backend: {framework or "N/A"}
  - Database: {database}
  - {X} external integrations

This tech stack will be automatically included when:
  - Creating PRDs (/ai.create-prd)
  - Defining implementation plans (/ai.define-implementation-plan)

Next steps:
  - Review .ai/memory/tech-stack.md
  - Update as needed with /ai.define-tech-stack
  - Optionally define coding rules (see CLAUDE.md)
```

**If update mode:**

```
✓ Updated .ai/memory/tech-stack.md

Changes:
  - {List what was changed}

Last Updated: {YYYY-MM-DD}
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| Tech stack already exists | Offer update vs recreate options |
| User provides incomplete answers | Generate with "TBD" for missing info |
| User wants to skip sections | Mark as "N/A" or omit optional sections |
| No .ai directory exists | Create directory structure first |
| User provides "Other" for language | Ask for specific language name and version |
| User mentions multiple databases | Document all in Database & Storage section |
| User mentions microservices | Ask about each service's tech stack or document common stack |

---

## Notes for AI

- **Follow sequential format**: One question at a time, wait for answer before next question
- **Use "Question {n}/{total}+" format**: The "+" indicates potential follow-ups
- **Research common patterns**: When generating options, base on industry standards for the context
- **Be flexible**: User can provide custom answers beyond A/B/C options
- **Maintain context**: Reference previous answers in recommendations
- **Don't over-ask**: If user provides comprehensive answer early, skip redundant questions
- **Update mode efficiency**: In update mode, only change what user requests, preserve rest
- **Version awareness**: Tech stack versions matter - always ask for versions when collecting tool information
