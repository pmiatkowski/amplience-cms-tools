# VSE Management

## Overview

The `VSE Management` command provides operations for managing Visual Studio
Edition (VSE) visualization settings across multiple content types in Amplience
CMS. This command enables bulk updates to visualization configurations, making
it easier to maintain consistent preview and live view settings across
environments.

## When to Use

Use `VSE Management` when you need to:

- Bulk update visualization settings for multiple content types at once
- Synchronize visualization configurations between environments (DEV, STAGING,
  PROD)
- Update visualization URLs after migrating content types to a new hub
- Apply consistent visualization templates across content types
- Preview visualization changes before applying them (dry-run mode)

## Available Operations

### Bulk Update Visualizations

Updates the visualization settings for multiple content types with a provided
configuration.

### Initialize Default Files

Displays setup instructions and validates configuration files for VSE default
visualization settings. This command helps users:

1. **Environment Variable Setup** - Shows required environment variables and
   recommended file paths
2. **File Validation** - Checks if configured VSE files exist at specified paths
3. **Example Content** - Displays example JSON content for both configuration
   files

This is a **non-destructive** command that only displays information and
validates file existence - no files are created or modified.

## How It Works

### Content Type Selection

The command supports two methods for selecting content types:

1. **API Filtering with Regex**
   - Filter content types by schema URI pattern
   - Multi-select from filtered results
   - Useful for updating all content types matching a schema pattern

2. **File-Based Selection**
   - Provide a JSON file with content type URIs
   - Multi-select from matched results
   - Useful for predefined lists of content types

### Visualization Configuration

Visualizations are defined in a JSON configuration file:

```json
{
  "visualizations": [
    {
      "label": "Preview",
      "templatedUri": "{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}",
      "default": true
    },
    {
      "label": "Live View",
      "templatedUri": "{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}"
    }
  ]
}
```

The `{{ORIGIN_REPLACE}}` placeholder is automatically replaced with the
hub-specific visualization URL configured via environment variable:

```env
AMP_HUB_<HUBNAME>_VISUALISATION_APP_URL=https://vse.example.com
```

### Operation Flow

1. **Hub Selection**
   - Select the target hub from configured environments

2. **Content Type Selection**
   - Choose selection method (API or File)
   - Filter or load content types
   - Multi-select content types to update

3. **Visualization Configuration**
   - Provide visualization config file path
   - System validates and parses the configuration

4. **Configuration Options**
   - Choose dry-run mode to preview changes
   - Or execute live mode to apply updates

5. **Confirmation**
   - Review summary of selected content types
   - Review visualization configuration
   - Confirm to proceed

6. **Execution**
   - Progress tracking for bulk updates
   - Continues on individual failures
   - Collects detailed error information

7. **Results & Reporting**
   - Displays success/failure counts
   - Generates markdown report with full details
   - Saves report to `reports/` directory

## Configuration Options

### Dry-Run Mode

```text
? Run in dry-run mode (preview changes without executing)? (y/N)
```

- **No** (default): Execute live updates to content types
- **Yes**: Preview what would be updated without making changes

### Content Type Selection Methods

#### API Filtering (Regex)

```text
? Filter by schema ID pattern: https://schema.example.com/.*
```

Enter a regex pattern to filter content types by their schema URI. For example:

- `https://schema.example.com/.*` - All content types from this schema domain
- `https://schema.example.com/product.*` - Product-related content types only
- `.*-local.*` - Content types with "local" in schema URI

#### File-Based Selection

```text
? Content types list file path: ./config/content-types.json
```

Provide a JSON file containing an array of content type URIs:

```json
[
  "https://schema.example.com/product.json",
  "https://schema.example.com/category.json",
  "https://schema.example.com/blog.json"
]
```

### Visualization Configuration File

```text
? Visualization config file path: ./config/visualizations.json
```

Provide a JSON file with visualization definitions (see format above).

## Environment Variables

### Content Type Selection Defaults

```env
# Default regex pattern for API filtering
AMP_DEFAULT_SCHEMA_ID=https://schema.example.com/.*

# Default content types list file path
AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE=./config/content-types.json

# Default visualization configuration file path
AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE=./config/visualizations.json
```

### Hub-Specific Visualization URLs

```env
# Hub-specific visualization URL for origin replacement
AMP_HUB_DEV_VISUALISATION_APP_URL=https://vse.dev.example.com
AMP_HUB_PROD_VISUALISATION_APP_URL=https://vse.prod.example.com
```

## Initialize Default Files Operation

The Initialize Default Files operation helps you set up and validate VSE
configuration files.

### When Environment Variables Are Not Set

If you haven't configured the required environment variables, the command
displays:

```text
========================================
  Environment Variables Not Configured
========================================

To use VSE Default Files, set the following environment variables:

  AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE
    Recommended: .Amplience/content-types.json

  AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE
    Recommended: .Amplience/visualizations.json

========================================
  Example: content-types.json
========================================

[
  "https://schema.example.com/product.json",
  "https://schema.example.com/category.json"
]

========================================
  Example: visualizations.json
========================================

{
  "preview": {
    "label": "Preview",
    "uri": "{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}",
    "default": true
  },
  "liveView": {
    "label": "Live View",
    "uri": "{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}"
  }
}
```

### When Environment Variables Are Set

If the environment variables are configured, the command validates file
existence:

```text
🎨 Initialize Default Files
========================

Environment variables configured:
  Content Types List: .Amplience/content-types.json
  Visualizations Config: .Amplience/visualizations.json

========================================
  File Validation Results
========================================

Content Types List: ✓ Found
  Path: .Amplience/content-types.json

Visualizations Config: ✗ Missing
  Path: .Amplience/visualizations.json

  Example content:

    {
      "preview": {
        "label": "Preview",
        "uri": "{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}",
        "default": true
      },
      "liveView": {
        "label": "Live View",
        "uri": "{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}"
      }
    }
```

### Setting Up Configuration Files

Follow these steps to set up your VSE default files:

1. **Create the .Amplience directory** (if it doesn't exist):

   ```bash
   mkdir .Amplience
   ```

2. **Create content-types.json** with your content type URIs:

   ```json
   [
     "https://schema.example.com/product.json",
     "https://schema.example.com/category.json",
     "https://schema.example.com/blog.json"
   ]
   ```

3. **Create visualizations.json** with your visualization definitions:

   ```json
   {
     "visualizations": [
       {
         "label": "Preview",
         "templatedUri": "{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}",
         "default": true
       },
       {
         "label": "Live View",
         "templatedUri": "{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}"
       }
     ]
   }
   ```

4. **Set the environment variables** in your `.env` file:

   ```env
   AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE=./.Amplience/content-types.json
   AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE=./.Amplience/visualizations.json
   ```

5. **Run Initialize Default Files** to validate your setup

## Reports

All operations generate detailed markdown reports in the `reports/` directory
with:

- Operation summary (hub, mode, timestamp)
- Visualization configuration applied
- Success/failure counts and success rate
- Detailed error information for failures
- Content type-by-content type results

### Report Format

```markdown
# Bulk Visualizations Update Report

Generated: 2025-01-16

## Operation Summary

- **Hub**: DEV
- **Mode**: Live Execution

## Visualization Configuration

- **Preview**: `https://vse.dev.example.com/preview?id={{contentItemId}}`
  (default)
- **Live View**:
  `https://vse.dev.example.com/live?id={{contentItemId}}&locale={{locale}}`

## Results

- **Total Attempted**: 5
- **✅ Successful**: 4
- **❌ Failed**: 1
- **Success Rate**: 80%

## Errors

### Product (https://schema.example.com/product.json)

API Error: 409 Conflict - Content type version mismatch

---

_This report was automatically generated by the Amplience CMS Tools_
```

## Best Practices

### 1. Always Start with Dry-Run

Before making live changes, run in dry-run mode to preview:

```bash
# Select dry-run mode when prompted
? Run in dry-run mode? Yes
```

### 2. Use Appropriate Regex Patterns

Craft regex patterns carefully to avoid updating unintended content types:

```bash
# Too broad - updates everything
? Filter by schema ID: https://schema.example.com/

# Better - specific to content types you want
? Filter by schema ID: https://schema.example.com/product-.*
```

### 3. Verify Visualization Config Syntax

Ensure your visualization config JSON is valid before running:

```bash
# Validate JSON syntax
cat ./config/visualizations.json | jq .
```

### 4. Test with Small Batches First

When updating many content types:

1. Use regex to select a small subset first
2. Run dry-run to verify
3. Execute live on the small batch
4. Check results in report
5. Then proceed with full batch

### 5. Review Reports After Execution

Always review the generated report for:

- Failed updates and their reasons
- Success rate percentage
- Any unexpected content types in results

## Error Handling

### Individual Content Type Failures

The command continues processing remaining content types when one fails:

```text
✅ Product (https://schema.example.com/product.json)
❌ Category (https://schema.example.com/category.json): API Error: 409 Conflict
✅ Blog (https://schema.example.com/blog.json)
```

### Common Errors

| Error                 | Cause                               | Solution                              |
| --------------------- | ----------------------------------- | ------------------------------------- |
| "Schema not found"    | Content type URI doesn't exist      | Verify content type exists in the hub |
| "Rate limit exceeded" | Too many API calls                  | Wait and retry, or reduce batch size  |
| "Version mismatch"    | Content type was modified elsewhere | Fetch latest version and retry        |
| "Invalid config"      | Visualization config has errors     | Validate JSON syntax and structure    |

## Troubleshooting

### No Content Types Match Pattern

**Problem**: Regex pattern returns zero results.

**Possible Causes**:

- Pattern is too restrictive
- Schema URIs don't match expected format
- Content types don't exist in hub

**Solutions**:

1. Test pattern with broader match first
2. Use `*` wildcard: `https://schema.example.com/.*`
3. Verify content types exist using Amplience Management API

### Visualization URLs Not Replaced

**Problem**: `{{ORIGIN_REPLACE}}` placeholder not replaced in output.

**Possible Causes**:

- Missing hub visualization URL environment variable
- Environment variable name doesn't match hub name

**Solutions**:

1. Verify environment variable format: `AMP_HUB_<HUBNAME>_VISUALISATION_APP_URL`
2. Check hub name matches exactly (case-sensitive)
3. Ensure URL is valid HTTPS format

### All Updates Fail

**Problem**: Every content type update fails with same error.

**Possible Causes**:

- Invalid credentials
- Insufficient permissions
- Network connectivity issues

**Solutions**:

1. Verify API credentials in `.env` file
2. Check user has write permissions for content types
3. Test network connectivity to Amplience API

## Examples

### Example 1: Update All Product Content Types

```bash
# Command output:
🎨 VSE Management
=================

? Select a hub: › DEV
📋 Content Type Selection
─────────────────────────

? Select content types: › API filtering
? Filter by schema ID pattern: › https://schema.example.com/product-.*
🔍 Fetching content types from API...
Found 25 total content types
Filtered to 10 content types matching pattern

? Select content types to update:
  ✓ Select All
  ──────────────
  ☑ Product (https://schema.example.com/product.json)
  ☑ Product Variant (https://schema.example.com/product-variant.json)
  ☑ Product Bundle (https://schema.example.com/product-bundle.json)

🎨 Visualization Configuration
──────────────────────────────

? Visualization config file path: › ./config/visualizations.json
🔗 Retrieving hub-specific visualization URL...
Hub visualization URL: https://vse.dev.example.com

⚙️  Configuration Options
─────────────────────────

? Run in dry-run mode? › No

✅ Configuration: EXECUTE (live mode)

📊 Summary
Selected 3 content types
Applying 2 visualizations

? Do you want to proceed with updating visualizations? › Yes

🚀 Executing Bulk Update
────────────────────────

██████████████████████████████████████████ 100%

📊 Results Summary
─────────────────
Total attempted: 3
✅ Successful: 3
❌ Failed: 0

📄 Generating report...
Report saved to: reports/bulk-visualizations-2025-01-16-14-30-45.md

✅ Bulk update complete!
```

### Example 2: Dry-Run Preview with File-Based Selection

```bash
? Select a hub: › PROD
📋 Content Type Selection
─────────────────────────

? Select content types: › File-based
? Content types list file path: › ./config/content-types.json
📄 Parsing content types list file...
Found 5 content type URIs in file

🔍 Fetching content types from API...
Matched 5 content types from file

✅ Selected 5 content type(s) for visualization update

⚙️  Configuration Options
─────────────────────────

? Run in dry-run mode? › Yes

✅ Configuration: DRY-RUN (preview only)

[DRY RUN] Would update Product (https://schema.example.com/product.json)
  Old visualizations: []
  New visualizations: [{"label":"Preview","templatedUri":"https://vse.prod.example.com/preview?id={{contentItemId}}","default":true}]

[DRY RUN] Would update Category (https://schema.example.com/category.json)
  Old visualizations: [{"label":"Old Preview","templatedUri":"https://old.example.com/preview"}]
  New visualizations: [{"label":"Preview","templatedUri":"https://vse.prod.example.com/preview?id={{contentItemId}}","default":true}]

📊 Results Summary
─────────────────
Total attempted: 5
✅ Successful: 5
❌ Failed: 0

📄 Generating report...
Report saved to: reports/bulk-visualizations-2025-01-16-14-35-12.md

✅ Bulk update complete! (No changes executed - dry-run mode)
```

### Example 3: Handling Partial Failures

```bash
🚀 Executing Bulk Update
────────────────────────

██████████████████████████████████████████ 100%

📊 Results Summary
─────────────────
Total attempted: 10
✅ Successful: 8
❌ Failed: 2

⚠️  Errors:
  - Category (https://schema.example.com/category.json): API Error: 409 Conflict - Content type version mismatch
  - Blog Post (https://schema.example.com/blog-post.json): Network timeout

📄 Generating report...
Report saved to: reports/bulk-visualizations-2025-01-16-14-40-00.md

💡 Tip: Review the report for detailed error information and retry failed content types individually.
```

## Command Workflow Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                     START: VSE Management                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  1. HUB SELECTION                                            │
│     • Select hub from configured environments                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CONTENT TYPE SELECTION METHOD                            │
│     • Choose API filtering (regex) OR File-based selection   │
└────────────────────┬────────────────────┬───────────────────┘
                     │                    │
                     ▼                    ▼
          ┌──────────────────┐  ┌──────────────────┐
          │  API FILTERING   │  │  FILE-BASED      │
          │  - Enter regex   │  │  - Provide file  │
          │  - Multi-select   │  │  - Multi-select  │
          └────────┬─────────┘  └────────┬─────────┘
                   │                      │
                   └──────────┬───────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. VISUALIZATION CONFIGURATION                              │
│     • Provide config file path                               │
│     • Validate and parse config                              │
│     • Get hub-specific visualization URL                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  4. CONFIGURATION OPTIONS                                    │
│     • Choose dry-run or live mode                             │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  5. SUMMARY & CONFIRMATION                                    │
│     • Display selected content types                          │
│     • Show visualization configuration                        │
│     • Show mode (dry-run or live)                             │
│     • Request confirmation                                    │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────────┐
    │  Confirmed?     │           │  Cancelled?         │
    │  → Continue     │           │  → Exit             │
    └────────┬────────┘           └─────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│  6. EXECUTE BULK UPDATE                                      │
│     • Sequential processing of content types                 │
│     • Progress tracking                                      │
│     • Continue on individual failures                        │
│     • Collect errors                                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  7. RESULTS & REPORTING                                      │
│     • Display success/failure counts                         │
│     • Show errors if any                                     │
│     • Generate markdown report                               │
│     • Save report to reports/ directory                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│           COMPLETE                                            │
└─────────────────────────────────────────────────────────────┘
```

## Related Commands

- **`Manage Extensions`**: Bulk export/import extensions for VSE
- **`Sync Content Types`**: Align cross-hub content type settings and rewrite
  configured source VSE origins to the target origin
- **`Sync Content Type Properties`**: Synchronize content types with schemas

Use VSE Management when applying a shared visualization configuration file to
content types on one hub. Use Sync Content Types when visualizations should be
copied from a source hub as part of complete content type alignment.

Sync Content Types compares visualization arrays exported from the two hubs; it
does not read the VSE Management configuration file. It rewrites only URLs using
the configured source hub origin, while third-party and localhost URLs remain
unchanged.

## Technical Notes

### Performance Considerations

- Content types are updated **sequentially** (not in parallel) to avoid API rate
  limiting
- Each content type update involves one PATCH request
- Estimated time: ~1-2 seconds per content type

### Data Safety

- Dry-run mode available for risk-free preview
- Continues on individual failures (doesn't roll back successful operations)
- Detailed error reporting for debugging
- All operations generate reports for audit trail

### API Interactions

- Uses Amplience Dynamic Content API
- Requires read access to view content types
- Requires write access to update content type settings
- Respects API rate limits through sequential processing

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting) above
2. Review error messages in command output
3. Check the generated report for detailed information
4. Consult the main README for general setup
5. Open an issue on the project repository
