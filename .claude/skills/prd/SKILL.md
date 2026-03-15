---
name: prd
description: Create comprehensive Product Requirements Documents through iterative discovery. Use when the user wants to define a new product, feature, or initiative with structured requirements gathering.
argument-hint: [product-brief]
disable-model-invocation: true
---

# Product Requirements Document (PRD) Skill

Guide users through creating comprehensive PRDs using a **Socratic, multi-phase discovery process**. This is NOT a document generator — it's a facilitated conversation that surfaces assumptions, validates thinking, and builds genuine understanding.

## Usage

```
/prd [product-brief]
```

- **With brief**: Start discovery with initial context
- **Without brief**: Begin with guided questions to gather context

## Core Philosophy

> "The quality of a product decision is determined by the quality of the questions asked before it."

**Operating Principles:**
1. **No assumptions go unchallenged** — Every claim requires evidence
2. **No features without value traceability** — Connect everything to outcomes
3. **No single-path thinking** — Present alternatives and trade-offs
4. **No premature solutions** — Understand problems deeply first
5. **No one-shot generation** — This is a conversation, not a document factory

## Interaction Rules

1. **NEVER generate a full PRD in one response** — This violates the philosophy
2. **ALWAYS ask clarifying questions** before advancing phases
3. **PAUSE for user confirmation** at phase boundaries
4. **SURFACE conflicts** between business goals, user needs, and technical constraints
5. **DOCUMENT decisions and rationale** as you go

---

## Phase 1: Discovery & Challenge

### Your First Response

When the user provides a product idea, DO NOT generate any PRD content. Instead:

1. **Reflection**: Briefly restate what you understand their idea to be
2. **Assumption Audit**: List 5-7 assumptions embedded in their idea
3. **Critical Questions**: Ask 3-5 high-leverage questions

**Question Categories:**

| Category | Example |
|----------|---------|
| Problem Validity | "What evidence do you have that this problem exists and matters?" |
| User Reality | "Who specifically has this problem? Can you name 3 real people?" |
| Value Exchange | "Why would users choose this over their current workaround?" |
| Business Viability | "How does solving this translate to revenue/cost savings?" |
| Technical Feasibility | "What's the hardest technical challenge you anticipate?" |
| Market Timing | "Why is now the right time for this?" |
| Competitive Landscape | "Why hasn't someone solved this already?" |
| Success Definition | "What would need to be true in 6 months for success?" |

**Wait for user responses before proceeding.**

---

## Phase 2: Problem Validation

Guide the user through:

### 2.1 Problem Statement Template
> **[Specific user type]** experience **[concrete problem]** when **[specific context]**, resulting in **[quantified impact]**.

### 2.2 Evidence Assessment
Create an inventory of quantitative data, qualitative research, competitive signals, internal data, and expert opinions.

**Clarity Check**: Is there sufficient evidence to proceed?

---

## Phase 3: User Deep-Dive

Develop 2-3 primary personas with:
- Demographics and psychographics
- Narrative story
- Jobs to Be Done (functional, emotional, social)
- Current workarounds and pain points
- Success metrics from their perspective

Map the user journey (current state vs future state).

**Clarity Check**: Can we trace every feature to a specific user need?

---

## Phase 4: Business Viability

Assess:
- Market opportunity (TAM/SAM/SOM)
- Competitive landscape with advantages
- Business goals & KPIs
- ROI framework (conservative/moderate/optimistic scenarios)

**Clarity Check**: Is the business case compelling?

---

## Phase 5: Solution Definition

Define:
- Product vision (one-line statement)
- Value proposition
- Experience principles (3-5)
- Core capabilities with priorities
- Scope (in/out/future)

**Clarity Check**: Can we deliver value with P0 scope alone?

---

## Phase 6-8: Requirements & Architecture

Cover:
- **Functional requirements** organized by user goal (with acceptance criteria)
- **Non-functional requirements** (performance, reliability, security, accessibility)
- **Technical architecture** (components, data flow, APIs, integrations)

Use templates in `references/TEMPLATES.md` for detailed formats.

---

## Phase 9: Risk Assessment

Create risk matrix covering:
- Probability × Impact scoring
- Mitigation strategies
- Contingency plans
- Assumption validation plans

---

## Phase 10: Go-to-Market

Define:
- Positioning & messaging
- Pricing & packaging
- Launch plan (Alpha → Beta → GA)
- Channel strategy

---

## Phase 11: Success Metrics

Establish KPI framework:
- User metrics (activation, NPS/CSAT)
- Business metrics (revenue, CAC/LTV)
- Technical metrics (uptime, error rate)

Define learning goals for each phase.

---

## Phase 12-13: Execution & Alignment

Document:
- Resource requirements
- Timeline & milestones
- Critical path items
- Stakeholder map and RACI matrix
- Sign-off requirements

---

## Final Output

Once all phases complete, compile into:

1. **Executive Summary** (1 page max)
2. **Full PRD** following the phase structure
3. **Appendices** (glossary, research, revision history, open questions)

---

## Quality Checklist

Before finalizing, verify:

- [ ] Business goals are SMART and measurable
- [ ] Every feature traces to a documented user need
- [ ] Architecture is sufficient for MVP
- [ ] Requirements are testable
- [ ] Key risks identified with mitigations
- [ ] Stakeholders aligned

---

## Remember

> "A PRD is not a specification of a solution. It is a shared understanding of a problem worth solving, for people worth serving, in a way that creates value worth capturing."

**Your job is to ensure this understanding is genuine, not assumed.**
