# Clarification Round 1

<!-- METADATA
format_version: 2.0
round_type: sequential
planned_questions: 6
current_question: 6
allow_followups: true
-->

## Date

2026-01-16

## Questions & Answers

### Q1: What is the exact JSON structure of the visualization object that will be sent to the PATCH API endpoint?

**Options:**
- A: Full visualization object replacement - The config file contains complete visualization objects (e.g., `{ "visualizations": [{ "label": "...", "templatedUri": "...", "default": true }] }`) that completely replace existing visualizations
- B: Partial property merge - The config file contains partial visualization properties (e.g., `{ "templatedUri": "https://...", "default": true }`) that get merged with existing visualizations
- C: Custom visualization descriptor - The config file uses a custom format that gets transformed into Amplience's visualization format before the API call

**Recommendation:** Option A, because content type PATCH operations typically require full object replacement for nested structures, this approach gives users complete control over the final visualization state, and it's simpler to implement (no merge logic needed).

**Answer:** A

### Q2: How should the URL origin replacement work in the templatedUri property?

**Options:**
- A: Placeholder string replacement - The config file uses a literal placeholder string like `{{ORIGIN_REPLACE}}` or `{{HUB_URL}}` anywhere in the templatedUri, which gets replaced with the hub-specific URL from env vars (e.g., `"{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}"` → `"https://vse.mycompany.com/preview?id={{contentItemId}}"`)
- B: URL origin parsing - Parse the templatedUri as a URL and replace only the origin part (protocol + domain + port) while preserving the path and query parameters (e.g., `"https://example.com/preview?id={{contentItemId}}"` → `"https://vse.mycompany.com/preview?id={{contentItemId}}"`)
- C: Full URL replacement - Replace the entire templatedUri value with the hub-specific URL from env vars, with content item placeholders appended (requires env var to include the full URL pattern)

**Recommendation:** Option A, because placeholder-based replacement is explicit and clear (users know exactly what will be replaced), it's flexible (placeholder can appear anywhere), it prevents accidental replacement of legitimate domain names in the path/query, and it follows common templating patterns used in infrastructure-as-code tools.

**Answer:** A

### Q3: When users select content types "By file", what should the file format be for the content types list?

**Options:**
- A: JSON array of URIs - A JSON file containing an array of content type URIs (e.g., `["https://schema.example.com/type1.json", "https://schema.example.com/type2.json"]`) which is easy to validate and commonly used for structured data
- B: Plain text line-separated - A text file with one content type URI per line (e.g., one URI on each line) which is simpler to create manually and easier to edit in any text editor
- C: CSV with metadata - A CSV file with columns like `uri,label,description` allowing users to include additional context for documentation purposes

**Recommendation:** Option A, because JSON is consistent with the visualization config file format (users work with one format), it's easy to programmatically validate and parse, it prevents issues with trailing whitespace/empty lines common in text files, and it aligns with the tool's TypeScript/Node.js ecosystem where JSON is the standard data format.

**Answer:** A

### Q4: How should the command handle partial failures when updating multiple content types?

**Options:**
- A: Continue on error with full report - Continue processing all content types even if some fail, then generate a detailed report showing successes and failures with error details (most resilient, standard pattern in the codebase based on CLAUDE.md)
- B: Stop on first error - Abort the entire operation as soon as any content type update fails, leaving some content types updated and others unchanged (fail-fast approach, prevents inconsistent states)
- C: Transactional rollback - If any content type update fails, attempt to roll back all previous changes to restore original visualizations (safest but complex, requires storing original state)

**Recommendation:** Option A, because it aligns with existing CLI tool patterns (CLAUDE.md mentions "generate Markdown reports" and "item-by-item results with error details"), it maximizes the work completed (successful updates aren't wasted), users can review the report and retry only failed items, and visualization updates are independent operations where partial completion is acceptable.

**Answer:** A

### Q5: Should the command support dry-run mode and generate markdown reports like other commands in the tool?

**Options:**
- A: Yes, both dry-run and reports - Implement dry-run mode (shows what would be updated without making changes) and generate markdown reports in `reports/` directory with operation summary, success/failure counts, and item-by-item results (follows established CLI tool patterns from CLAUDE.md)
- B: Reports only, no dry-run - Generate markdown reports after execution but skip dry-run mode, since users can test in dev environments and the confirmation summary provides sufficient preview
- C: Neither - Skip both features to keep the implementation simpler, relying on the confirmation summary and console output for feedback

**Recommendation:** Option A, because CLAUDE.md explicitly states "Most commands support dry-run mode" and "All operations generate Markdown reports in `reports/` directory", following these established patterns ensures consistency across the tool, dry-run provides an extra safety layer for bulk operations, and reports are valuable for audit trails and troubleshooting.

**Answer:** A

### Q6: Should the command display a progress bar during bulk content type updates?

**Options:**
- A: Yes, use progress bar - Display a progress bar using `createProgressBar()` utility (mentioned in CLAUDE.md) to show real-time progress during bulk updates, following the established pattern used by other bulk operation commands
- B: Simple console logging - Use basic console output (e.g., "Updated 5/20 content types...") without a visual progress bar, which is simpler but provides less visual feedback
- C: Silent operation - Don't show progress during execution, only display the final summary and report after completion

**Recommendation:** Option A, because CLAUDE.md explicitly shows progress bars as the standard pattern for bulk operations (with code example: `const progress = createProgressBar(total); ... progress.increment(); ... progress.stop()`), this provides better user experience for long-running operations, and consistency with other commands in the tool is important for usability.

**Answer:** A

## Summary

Established core technical implementation decisions: Full visualization object replacement via API, placeholder-based URL replacement ({{ORIGIN_REPLACE}}), JSON array format for content type lists, continue-on-error with detailed reporting, dry-run mode + markdown reports following existing CLI patterns, and progress bar for bulk operations.

