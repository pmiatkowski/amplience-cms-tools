# Clarification Round 1

<!-- METADATA
format_version: 2.0
round_type: sequential
planned_questions: 5
current_question: 5
allow_followups: true
-->

## Date

2026-01-16

## Questions & Answers

### Q1: How should users access this new default files functionality?

**Options:**

- A: **Add as a new VSE subcommand** (e.g., "Initialize Default Files" option in VSE Management menu) - keeps all VSE-related functionality together, consistent with existing architecture (bulk-update-visualizations is already a subcommand)
- B: **Create a standalone CLI command** (e.g., `npm run init-vse-config`) - simpler to invoke directly, but fragments VSE functionality across the CLI
- C: **Add as a flag to existing VSE Management** (e.g., `--init-config` flag that creates files then exits) - minimal UI changes, but less discoverable for users

**Recommendation:** Option A, because the existing VSE Management already uses a subcommand pattern (see `src/commands/vse-management/vse-management.ts:18`), this keeps related functionality organized together, and users will naturally discover it when exploring VSE operations. The overhead is minimal - just adding one choice to the existing `promptForVseOperation` menu.

**Answer:** Show text instructions - File details, env name, file content

### Q2: What should happen when the environment variables `AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE` and `AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE` are not set?

**Options:**

- A: **Always create files** regardless of env vars (create at `./config/content-types.json` and `./config/visualizations.json` by default) - simplest approach, users get files immediately
- B: **Show instructions only** when env vars not set (display file paths and example content to console, don't create files) - follows original request more closely, allows users to create manually
- C: **Prompt for behavior** when env vars missing (ask user: "Create default config files? (y/n): ") - gives user control, adds one prompt

**Recommendation:** Option C, because it provides flexibility - users who want quick setup can say yes, while users who prefer manual setup can decline and follow the text instructions. It's consistent with the CLI's interactive nature (all other commands use prompts for user decisions).

**Answer:** Show text instructions - File details, env name, file content

### Q3: When the environment variables ARE set (pointing to valid file paths), what should the subcommand do?

**Options:**

- A: **Create the files at those locations** (e.g., if `AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE=./config/my-content-types.json`, create that file with example content) - honors user configuration, files go where expected
- B: **Validate that files exist and show status** (check if files exist at the paths, display "✓ Found" or "✗ Missing" with instructions to create) - non-destructive, informative, safer
- C: **Prompt to confirm creation** (show paths from env vars and ask: "Create these files? (y/n): ") - prevents accidental file creation, adds control

**Recommendation:** Option B, because the existing CLI pattern favors safety and information (dry-run modes, confirmation prompts), and it helps users understand their current setup without making changes. Users can then choose to run the command again or create files manually.

**Answer:** B

### Q4: What example content should be included in the default `visualizations.json` configuration file?

**Options:**

- A: **Single basic example** (just a "Preview" visualization with `{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}`) - minimal, easy to understand, gets users started
- B: **Two common examples** (Preview and Live View visualizations, as shown in docs) - matches the documentation example, covers most use cases
- C: **Comprehensive examples** (Preview, Live View, plus additional examples with locale, variantId, and other common parameters) - more complete reference, but potentially overwhelming

**Recommendation:** Option B, because it matches the existing documentation (see `docs/vse-management.md:43-56`) which already shows Preview + Live View as the standard pattern, and it covers the 90% use case without overwhelming new users with edge cases.

**Answer:** B

### Q5: What example content should be included in the default `content-types.json` file?

**Options:**

- A: **Empty array** (`[]`) with comments explaining the format - forces users to populate with their own content types, avoids confusion
- B: **Mock/example URIs** (e.g., `["https://schema.example.com/product.json", "https://schema.example.com/category.json"]`) - shows the expected format, but requires users to replace with real URIs
- C: **Realistic placeholder pattern** (e.g., `["https://<your-domain>/product.json", "https://<your-domain>/category.json"]` with `<your-domain>` as a clear placeholder) - shows format while making it obvious what needs to change

**Recommendation:** Option C, because the `<your-domain>` placeholder pattern makes it immediately clear what needs to be replaced (unlike option B where users might try to use the example URIs), while still showing the correct JSON structure and array format (unlike option A which gives no structural guidance).

**Answer:** B

## Summary

Added "Initialize Default Files" as a new VSE Management subcommand. When env vars are not set, shows text instructions with file details, env names, and example content. When env vars are set, validates file existence and shows status (✓ Found / ✗ Missing). Default files contain Preview + Live View visualizations and mock content type URIs for reference.
