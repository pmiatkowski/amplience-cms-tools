# PRD Templates Reference

Detailed templates for each PRD phase. Use these formats when documenting specific sections.

---

## Problem Statement Template

> **[Specific user type]** experience **[concrete problem]** when **[specific context]**, resulting in **[quantified impact]**. This affects **[frequency/magnitude]** and costs them **[time/money/emotional toll]**.

---

## Evidence Assessment Template

| Evidence Type | What We Have | Confidence Level | Gap to Fill |
|---------------|--------------|------------------|-------------|
| Quantitative Data | | High/Med/Low | |
| Qualitative Research | | High/Med/Low | |
| Competitive Signals | | High/Med/Low | |
| Internal Data | | High/Med/Low | |
| Expert Opinion | | High/Med/Low | |

---

## Persona Template

**Persona: [Descriptive Name]**

| Dimension | Detail |
|-----------|--------|
| **Demographics** | Age, role, company size, location, tech comfort |
| **Psychographics** | Goals, fears, values, decision criteria |
| **The Story** | 2-3 paragraph narrative of their life and how this problem shows up |
| **Jobs to Be Done** | Functional: "I need to..." / Emotional: "I want to feel..." / Social: "I want others to see me as..." |
| **Current Workaround** | How they solve this today, and what's painful about it |
| **Quote** | "I just wish..." — their deepest frustration |
| **Success Metrics** | How *they* would measure success |

---

## User Journey Template (Current State)

| Stage | User Action | Touchpoint | Emotion | Pain Points | Opportunity |
|-------|-------------|------------|---------|-------------|-------------|
| Awareness | | | | | |
| Consideration | | | | | |
| Action | | | | | |
| Retention | | | | | |
| Advocacy | | | | | |

---

## User Journey Template (Future State)

| Stage | User Action | Touchpoint | Emotion | Delight Moments | Success Metric |
|-------|-------------|------------|---------|-----------------|----------------|
| Discovery | | | | | |
| Onboarding | | | | | |
| First Value | | | | | |
| Regular Use | | | | | |
| Mastery | | | | | |
| Advocacy | | | | | |

---

## Market Opportunity Template

| Metric | Value | Source/Assumption |
|--------|-------|-------------------|
| Total Addressable Market (TAM) | | |
| Serviceable Addressable Market (SAM) | | |
| Serviceable Obtainable Market (SOM) | Years 1-3 | |
| Market Growth Rate | | |
| Timing: Why Now? | | |

---

## Competitive Landscape Template

| Competitor | Strengths | Weaknesses | Market Position | Our Advantage |
|------------|-----------|------------|-----------------|---------------|
| | | | | |

---

## Business Goals & KPIs Template

| Goal | Metric | Baseline | Year 1 | Year 3 | Priority |
|------|--------|----------|--------|--------|----------|
| | | | | | P0/P1/P2 |

---

## ROI Framework Template

| Scenario | Investment | Year 1 Revenue | Year 3 Revenue | Payback Period | Confidence |
|----------|------------|----------------|----------------|----------------|------------|
| Conservative | | | | | |
| Moderate | | | | | |
| Optimistic | | | | | |

---

## Value Proposition Template

- **For**: [target customer]
- **Who**: [need/opportunity]
- **The product is**: [category]
- **That provides**: [key benefit]
- **Unlike**: [competitive alternative]
- **Our product**: [primary differentiation]

---

## Experience Principle Template

**Principle: [Name]**
- **Definition**: What it means
- **User Benefit**: Why it matters to users
- **Application**: How we apply it
- **Anti-Pattern**: What to avoid

---

## Core Capabilities Template

| Capability | Business Value | User Benefit | Technical Complexity | Priority |
|------------|----------------|--------------|---------------------|----------|
| | | | | P0/P1/P2 |

---

## Scope Definition Template

**In Scope (This Release):**
- [Item] — Rationale: [Why this, why now]

**Out of Scope (Explicitly):**
- [Item] — Rationale: [Why not yet / why never]

**Future Considerations:**
- [Item] — Rationale: [What needs to be true to include this]

---

## Functional Requirements Template

**User Goal: [Goal Name]**

**User Story**: As a [persona], I want to [action] so that [benefit].

**Acceptance Criteria** (Gherkin):
```gherkin
Scenario: [Scenario name]
  Given [precondition]
  When [action]
  Then [expected outcome]
```

**Requirements Table:**

| ID | Requirement | Priority | User Value | Dependencies |
|----|-------------|----------|------------|--------------|
| F-001 | | P0/P1/P2 | | |

---

## Performance Requirements Template

| Metric | Target | User Impact | Measurement Method |
|--------|--------|-------------|-------------------|
| Time to Interactive | | | |
| API Response Time (p95) | | | |
| Throughput | | | |

---

## Reliability Requirements Template

| Metric | Target | Business Impact |
|--------|--------|-----------------|
| Uptime SLA | | |
| Data Durability | | |
| Recovery Time Objective | | |

---

## Security & Privacy Template

| Category | Requirement | Implementation | Compliance |
|----------|-------------|----------------|------------|
| Authentication | | | |
| Authorization | | | |
| Data Encryption | | | |
| Audit Logging | | | |
| Data Retention | | | |

---

## Accessibility Template (WCAG 2.1 AA)

| Category | Requirements |
|----------|--------------|
| Visual | Color contrast, screen reader, text resizing |
| Motor | Keyboard nav, touch targets, voice control |
| Cognitive | Clear language, consistent patterns, error prevention |
| Hearing | Captions, transcripts, visual alerts |

---

## Scalability Template

| Metric | Current Target | 10x Target | Architecture Implication |
|--------|----------------|------------|-------------------------|
| Concurrent Users | | | |
| Data Volume | | | |
| Request Rate | | | |

---

## API Specification Template

| Method | Endpoint | Purpose | Auth | Rate Limit |
|--------|----------|---------|------|------------|
| | | | | |

**Error Handling:**

| Code | Meaning | User Message | Recovery Action |
|------|---------|--------------|-----------------|
| 400 | Bad Request | | |
| 401 | Unauthorized | | |
| 500 | Internal Error | | |

---

## Integration Points Template

| System | Purpose | Type | SLA | Failure Mode |
|--------|---------|------|-----|--------------|
| | | REST/gRPC/Event | | |

---

## Risk Matrix Template

| ID | Risk | Category | Probability | Impact | Score | Mitigation | Contingency | Owner |
|----|------|----------|-------------|--------|-------|------------|-------------|-------|
| R-001 | | Market/Tech/Ops/Financial/Compliance | H/M/L | H/M/L | P×I | | | |

---

## Dependency Risks Template

| Dependency | Type | Status | Impact if Delayed | Mitigation |
|------------|------|--------|-------------------|------------|
| | Internal/External/Vendor | | | |

---

## Assumption Validation Template

| Assumption | Confidence | Validation Method | Status | Plan if Wrong |
|------------|------------|-------------------|--------|---------------|
| | H/M/L | | Validated/Pending/Invalid | |

---

## Pricing & Packaging Template

| Tier | Price | Features | Target Segment | Revenue Projection |
|------|-------|----------|----------------|-------------------|
| | | | | |

---

## Launch Plan Template

| Phase | Timeline | Scope | Success Criteria | Rollback Trigger |
|-------|----------|-------|------------------|------------------|
| Alpha | | Internal | | |
| Beta | | Limited users | | |
| GA | | Full launch | | |

---

## KPI Framework Template

| Level | Metric | Definition | Target | Data Source | Review Cadence |
|-------|--------|------------|--------|-------------|----------------|
| **User** | Activation Rate | | | | |
| **User** | NPS/CSAT | | | | |
| **Business** | Revenue | | | | |
| **Business** | CAC / LTV | | | | |
| **Technical** | Uptime | | | | |
| **Technical** | Error Rate | | | | |

---

## Resource Requirements Template

| Role | FTE | Duration | Cost | Source |
|------|-----|----------|------|--------|
| | | | | Internal/Contract/Hire |

---

## Timeline Template

| Phase | Duration | Deliverables | Gate Criteria | Dependencies |
|-------|----------|--------------|---------------|--------------|
| Discovery | | | | |
| Design | | | | |
| Development | | | | |
| Testing | | | | |
| Launch | | | | |

---

## RACI Matrix Template

| Decision | Product | Engineering | Design | Executive | Sales |
|----------|---------|-------------|--------|-----------|-------|
| Scope | R/A | C | C | I | C |
| Timeline | R | A | C | I | I |
| Architecture | C | R/A | I | I | I |

---

## Stakeholder Map Template

| Stakeholder | Role | Key Concerns | Success Criteria | Communication Plan |
|-------------|------|--------------|------------------|-------------------|
| | | | | |
