# Feature Request: vse-bulk-visualizations

## Description

# VSE Bulk Visualizations

Add VSE Management command for bulk updating content type visualizations with predefined configurations.

## Original Description

The idea is to add a new command for managing VSE (virtual staging environments) for content types. When user starts application, they will be able to pick new command "VSE Management". Once selected, they will see additional sub commands. For now, focus solely on the first one: "Bulk visualizations update" which will allow user to update content types visualizations on a selected hub with predefined configurations from a JSON file.

## User Flow

1. User starts application
2. User selects VSE Management command
3. User picks sub command "Bulk visualisations update"
4. User picks TARGET hub
5. User is asked how to pick content-types list:
   - **By API and filtering**: Provide regexp (defaults to `AMP_DEFAULT_SCHEMA_ID`), then multiselect from listed content types shown as `[label] (contentTypeUri)`
   - **By file**: Provide file location with content type URIs (defaults to `AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE`)
6. User provides visualization configuration file location (defaults to `AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE`)
7. System replaces origin in `templatedUri` property with hub-specific URL from env vars (`AMP_HUB_<HUBNAME>_VISUALISATION_APP_URL`)
8. User confirms with summary showing:
   - List of content types
   - Configuration for visualization (with parsed origin)
   - Target HUB
9. System updates content types using `PATCH /content-types/{contentTypeId}` API endpoint

## Technical Notes

- Configuration file contains visualization properties to be set
- `templatedUri` property contains URL with origin that needs replacement
- Hub-specific visualization URLs defined in env: `AMP_HUB_DEV_VISUALISATION_APP_URL`, `AMP_HUB_SIT_VISUALISATION_APP_URL`, etc.
- Process aborts if env var not defined for selected hub
- Only ORIGIN in `templatedUri` should be replaced

## Refined

# Refined Idea: VSE Bulk Visualizations

> **Status**: Refined
> **Created**: 2026-01-16
> **Last Updated**: 2026-01-16
> **Refinement Rounds**: 2

---

## Problem / Opportunity

### What problem does this solve?

Manual visualization management for content types across multiple hubs wastes significant time and leads to environment drift. As the number of content types and environments grows, and VSE (Virtual Staging Environment) adoption expands, the current approach of manually updating visualizations through the Amplience UI is unsustainable.

### Who experiences this problem?

- **Developers** during feature releases (weekly/monthly) when adding or updating content types
- **DevOps/Platform teams** during environment setup when configuring new hubs or migrating environments

### Current impact

When visualizations aren't correctly configured:

- **Content editors can't preview content properly** - broken visualizations or wrong URLs make content QA difficult
- **Environment drift occurs** - different hubs end up with inconsistent visualization setups, making troubleshooting harder
- **Time waste** - repetitive manual updates are slow and inefficient

Currently, there's no systematic approach—visualizations are manually set up through the UI during initial setup and rarely maintained afterward.

---

## Proposed Solution

### Core concept

Add a new "VSE Management" command to the Amplience CMS Tools CLI with a "Bulk visualizations update" sub-command. This allows users to update content type visualizations across selected hubs using predefined JSON configuration files, with automatic URL origin replacement of interpolated value {{ORIGIN_REPLACE}} based on hub-specific environment variables.

### Key components

- **New command structure**: VSE Management → Bulk visualizations update
- **Content type selection**: Choose content types either by API filtering (with regex) or from a JSON file
- **Configuration file**: JSON file defining visualization properties to apply
- **Dynamic URL replacement**: Automatically replace URL origins in `templatedUri` with hub-specific visualization app URLs
- **Confirmation workflow**: Show summary (content types, parsed config, target hub) before applying changes
- **Environment validation**: Abort if required hub-specific env vars are missing

### How it addresses the problem

This solution eliminates manual, repetitive visualization updates by:

1. **Batch processing** multiple content types at once
2. **Environment-aware configuration** using hub-specific URLs from env vars
3. **Flexible content type selection** via API filtering or file-based lists
4. **Validation and confirmation** to prevent errors before execution
5. **Integration** with existing CLI tool workflow that teams already use

---

## Assumptions Tested

### Desirability

- **Assumption**: Developers and DevOps teams will adopt this CLI command instead of manual updates
- **Evidence**: Strong confidence - teams have explicitly requested automation tools, and CLI fits their existing workflow (they already use other commands in this tool)
- **Risk**: **Low** - high adoption likelihood due to explicit requests and workflow fit

### Viability

- **Assumption**: Feature value justifies development investment
- **Evidence**: Value extends beyond pure time savings to include consistency benefits and reduced environment drift
- **Risk**: **Low** - ROI calculations not critical; qualitative benefits (consistency, reduced errors) justify the feature regardless of time-based metrics

### Feasibility

- **Assumption**: Amplience API and URL replacement logic are straightforward to implement
- **Evidence**: PATCH `/content-types/{contentTypeId}` API is well-documented, and string replacement for origin in `templatedUri` is simple
- **Risk**: **Low** - technical implementation is straightforward with no significant unknowns

### Usability

- **Assumption**: Users can validate configurations before applying changes
- **Evidence**: Technical users prefer JSON validation + testing in dev environments over extensive dry-run previews in the tool
- **Risk**: **Low** - sophisticated users who test in dev/staging environments; config validation prevents basic errors

### Ethical/Risk Considerations

- **Concerns**: Bulk update could deploy wrong URLs or break visualizations across many content types
- **Mitigation**: Errors are easily reversible with another bulk update; technical users test in dev environments first; config validation catches format errors
- **Overall Risk**: **Low** - mistakes are easily correctable, and users have dev environments to test

---

## Alternatives Considered

### Current approach is chosen solution

Alternative approaches (Infrastructure-as-code, Amplience DC-CLI extension, hub-level templates) were not explored as the bulk CLI command approach aligns with:

- Existing tool architecture and user workflow
- Team's explicit request for automation within this CLI tool
- Need for immediate, manual-triggered updates rather than automated pipelines

---

## Success Metrics

### Primary metrics

- **Time savings**: Track reduction in time spent on visualization updates (e.g., "2 hours → 10 minutes")
- **Consistency**: Measure reduction in visualization configuration errors and environment drift incidents

### Secondary metrics

- Feature adoption rate by developers and DevOps teams
- Number of content types updated per operation

### Definition of "good enough"

- Feature is used regularly (weekly/monthly) by developers during releases
- Visualization configuration errors decrease noticeably
- Teams report time savings and improved consistency

---

## Open Questions

### Critical (must resolve before proceeding)

None - all critical aspects are well-defined

### Important (should resolve during implementation)

- **Visualization JSON structure**: What is the exact structure of visualization objects in content types? (Should be validated during implementation)
- **Error handling patterns**: How should partial failures be reported? (Follow existing CLI tool patterns)
- **Progress feedback**: Should there be a progress bar for bulk operations? (Follow existing CLI tool patterns)

### Nice to know

- Could this be extended to other VSE operations beyond visualizations in the future?
- Should there be an export function to dump current visualization configs?

---

## Next Steps

### Recommended action

**Convert to feature** - this idea is well-validated and ready for implementation planning

### Rationale

- **Problem is validated**: Time waste and environment drift are real, measurable issues
- **Users are identified and requesting it**: Developers and DevOps explicitly want automation
- **Technical approach is clear**: Straightforward API usage with simple URL replacement
- **Risk is low**: Errors are reversible, users test in dev environments
- **Adoption is likely**: Teams already use the CLI tool and requested this capability

### If proceeding, start with

1. **Explore existing codebase patterns**: Review similar commands (especially those with file-based config and bulk operations) to follow established patterns
2. **Design command structure**: Map out the VSE Management parent command and sub-command architecture
3. **Create implementation plan**: Break down into phases (command structure, content type selection, config parsing, URL replacement, API integration, confirmation workflow)

---

## Refinement History

- **Round 1** (2026-01-16): Identified time waste problem, users (developers + DevOps), impact (broken previews + drift), current manual approach, timing drivers (scale + VSE adoption), and success metrics (time savings + consistency)
- **Round 2** (2026-01-16): Tested assumptions around adoption (strong), viability (value beyond ROI), feasibility (straightforward API), usability (validation + dev testing), and risk (low/easily reversible); confirmed bulk CLI approach without exploring alternatives

## Created

2026-01-16
