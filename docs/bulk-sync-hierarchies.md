# Bulk Sync Hierarchies

## Overview

The `bulk-sync-hierarchies` command enables efficient synchronization of
multiple content item hierarchies from a source hub/repository to a target
hub/repository in a single operation. This command extends the functionality of
the single `sync-hierarchy` command to support bulk operations while maintaining
the same level of control and safety.

## When to Use

Use `bulk-sync-hierarchies` when you need to:

- Migrate multiple hierarchical content structures between environments
- Synchronize several navigation menus or category trees at once
- Update multiple hierarchy structures after schema changes
- Clone hierarchical content from one hub to another in bulk

Use the single `sync-hierarchy` command instead when:

- You need to sync just one hierarchy
- You want maximum control over individual hierarchy synchronization
- You're testing hierarchy synchronization for the first time

## How It Works

### Matching Criteria

The command matches source hierarchies to target hierarchies using **strict
matching**:

- **Delivery Key**: Must match exactly (`body._meta.deliveryKey`)
- **Schema ID**: Must match exactly (`body._meta.schema`)

Both conditions must be met for a hierarchy to be considered matched. This
prevents accidental type mismatches and ensures data integrity.

### Synchronization Flow

1. **Source Selection**
   - Select source hub and repository
   - Filter content items (by schema, label, delivery key)
   - Multi-select hierarchies using checkboxes with "Select All" option

2. **Target Selection**
   - Select target hub and repository
   - System automatically fetches all target repository items

3. **Hierarchy Matching**
   - System matches source hierarchies to target by delivery key + schema ID
   - Displays matched and missing hierarchies
   - Generates detailed missing hierarchies report

4. **Configuration**
   - Update content mode (structure only vs. full content sync)
   - Locale strategy (keep, remove, or replace)
   - Publish after sync option
   - Dry-run mode

5. **Summary & Confirmation**
   - Review all selected hierarchies
   - Review matched vs. missing counts
   - Confirm configuration settings
   - Final confirmation prompt

6. **Execution**
   - Sequential synchronization of each matched hierarchy
   - Progress tracking (overall and per-hierarchy)
   - Error handling (continues on individual failures)

7. **Results Display**
   - Success/failure counts
   - Detailed per-hierarchy results
   - Missing hierarchies reminder

## Configuration Options

### Update Content

```
? Update content of existing items (body comparison)? (y/N)
```

- **No** (default): Only sync hierarchy structure (create/remove items)
- **Yes**: Also update content body of existing items when differences detected

### Locale Strategy

```
? Select locale strategy for delivery keys:
  ❯ Keep original locale
    Remove locale from all keys
    Replace locale with new value
```

- **Keep original**: Preserve delivery keys exactly as they are
- **Remove locale**: Strip locale prefixes from delivery keys (e.g.,
  `en-us/item` → `item`)
- **Replace locale**: Replace locale prefix with new value (e.g., `en-us/item` →
  `fr-fr/item`)

### Publish After Sync

```
? Publish content items after synchronization? (y/N)
```

- **No** (default): Leave items in draft state
- **Yes**: Automatically publish items after successful synchronization

### Dry-Run Mode

```
? Run in dry-run mode (preview changes without executing)? (y/N)
```

- **No** (default): Execute changes
- **Yes**: Preview what would be synchronized without making changes

## Missing Hierarchies Report

When hierarchies are missing from the target, a detailed report is generated and
saved to the reports folder.

### Report Format

```markdown
# Missing Hierarchies Report

Found 2 hierarchies in source that do not exist in target.

## Details

### Main Navigation

- **Delivery Key**: nav-main
- **Schema ID**: https://schema.com/navigation
- **Content Items**: 8

### Product Categories

- **Delivery Key**: cat-products
- **Schema ID**: https://schema.com/category
- **Content Items**: 12

## Summary

Total missing hierarchies: 2 Total content items in missing hierarchies: 20
```

### Report Location

Reports are saved to: `reports/missing-hierarchies-YYYY-MM-DD-HH-mm-ss.md`

## Best Practices

### 1. Start with Dry-Run

Always run a dry-run first to preview changes:

```bash
# Select dry-run mode when prompted
? Run in dry-run mode (preview changes without executing)? Yes
```

### 2. Review Missing Hierarchies

If hierarchies are missing in the target:

1. Review the generated report
2. Decide if you want to create the missing hierarchies manually first
3. Or proceed with only the matched hierarchies

### 3. Use Filtering Effectively

Use the initial filtering step to narrow down hierarchies:

```bash
? Filter by schema ID: https://schema.com/navigation
? Filter by label: nav
? Filter by delivery key: nav-
```

This helps when you have many content items but only want to sync specific
hierarchies.

### 4. Consider Batch Sizes

For very large numbers of hierarchies (>20):

- Consider running in batches by filtering
- Monitor system performance during execution
- Use off-peak hours for production environments

### 5. Verify Schemas First

Ensure all required schemas exist in the target hub before syncing:

- Missing schemas will cause synchronization failures
- Use the `copy-content-type-schemas` command if needed

### 6. Test Locale Strategies

If using locale transformation:

- Test with a single hierarchy first using `sync-hierarchy`
- Verify delivery keys are transformed correctly
- Then proceed with bulk operation

## Error Handling

### Individual Hierarchy Failures

The command continues processing remaining hierarchies when one fails:

```
✅ Main Navigation (nav-main): 2 created, 1 removed
❌ Footer Links (nav-footer): API error: Rate limit exceeded
✅ Product Categories (cat-products): 5 created, 0 removed
```

### Common Errors

| Error                     | Cause                              | Solution                                      |
| ------------------------- | ---------------------------------- | --------------------------------------------- |
| "Schema not found"        | Target hub missing required schema | Copy schema using `copy-content-type-schemas` |
| "Rate limit exceeded"     | Too many API calls                 | Wait and retry, or reduce batch size          |
| "Item already exists"     | Delivery key conflict              | Check for duplicate keys in target            |
| "No matching hierarchies" | Schema ID or delivery key mismatch | Verify matching criteria                      |

## Troubleshooting

### No Hierarchies Matched

**Problem**: All selected hierarchies show as "missing" in target.

**Possible Causes**:

- Schema IDs don't match between source and target
- Delivery keys are different
- Items don't exist in target repository

**Solutions**:

1. Check schema IDs match exactly
2. Verify delivery keys are identical
3. Review the missing hierarchies report for details
4. Manually create target root items if needed

### Synchronization Fails for Some Hierarchies

**Problem**: Some hierarchies sync successfully, others fail.

**Possible Causes**:

- Schema missing in target
- Content validation errors
- Network issues
- Permissions problems

**Solutions**:

1. Review detailed error messages in results
2. Check target hub has all required schemas
3. Verify API credentials have write permissions
4. Retry failed hierarchies individually with `sync-hierarchy`

### Slow Performance

**Problem**: Bulk synchronization takes very long.

**Possible Causes**:

- Large number of items in hierarchies
- Network latency
- API rate limiting

**Solutions**:

1. Run during off-peak hours
2. Reduce batch size by filtering
3. Use dry-run to estimate time first
4. Contact Amplience support about rate limits if needed

## Examples

### Example 1: Sync All Navigation Hierarchies

```bash
# Command output:
📍 Step 1: Select SOURCE hierarchies
? Select a hub: › DEV
? Select a repository: › Content Repository
? Filter by schema ID: › https://schema.com/navigation
? Filter by label: ›
? Filter by delivery key: ›
Found 3 matching hierarchies

? Select hierarchies to synchronize:
  ✓ Select All
  ──────────────
  ☑ Main Navigation (nav-main) - https://schema.com/navigation
  ☑ Footer Links (nav-footer) - https://schema.com/navigation
  ☑ Mobile Menu (nav-mobile) - https://schema.com/navigation

✅ Selected 3 hierarchies for synchronization

🎯 Step 2: Select TARGET hub & repository
? Select a hub: › PROD
? Select a repository: › Content Repository

🔍 Step 3: Matching hierarchies...
✅ Matched: 3 hierarchies found in target

⚙️  Step 4: Configuration Options
? Update content of existing items? › No
? Select locale strategy: › Keep original locale
? Publish after synchronization? › Yes
? Run in dry-run mode? › No

📊 Step 5: Summary
Hierarchies to synchronize: 3
  1. Main Navigation (nav-main)
  2. Footer Links (nav-footer)
  3. Mobile Menu (nav-mobile)

? Do you want to proceed? › Yes

🚀 Step 7: Executing Bulk Synchronization
✅ Bulk Synchronization Complete!

📊 Final Summary:
  • Total selected: 3 hierarchies
  • Matched & processed: 3 hierarchies
  • Successfully synchronized: 3 hierarchies
  • Failed: 0 hierarchies
```

### Example 2: Partial Match with Missing Hierarchies

```bash
🔍 Step 3: Matching hierarchies...
✅ Matched: 2 hierarchies found in target
  • nav-main → nav-main
  • nav-footer → nav-footer

⚠️  Missing: 1 hierarchy not found in target
  • cat-products (https://schema.com/category)
    Name: Product Categories
    Content items in source: 12

📋 Missing hierarchies report saved to: reports/missing-hierarchies-2025-12-16-14-30-45.md

# You can:
# 1. Proceed with only matched hierarchies
# 2. Cancel and create missing hierarchies first
# 3. Review the report for details
```

### Example 3: Dry-Run Preview

```bash
⚙️  Step 4: Configuration Options
? Run in dry-run mode? › Yes

✅ Configuration:
  • Structure only
  • Locale: Keep original
  • Do not publish
  • DRY-RUN (preview only)

🚀 Step 7: Executing Bulk Synchronization
📋 [DRY-RUN] Generating synchronization plan...
✅ [DRY-RUN] Plan: 2 to create, 1 to remove
📋 [DRY-RUN] Generating synchronization plan...
✅ [DRY-RUN] Plan: 3 to create, 0 to remove

✅ Bulk Synchronization Complete!
📊 Final Summary:
  • Total items to create: 5
  • Total items to remove: 1
  • No changes executed (dry-run mode)
```

## Command Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     START: bulk-sync-hierarchies             │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  1. SOURCE SELECTION                                         │
│     • Select hub & repository                                │
│     • Filter items (schema/label/key)                        │
│     • Multi-select hierarchies                               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  2. TARGET SELECTION                                         │
│     • Select hub & repository                                │
│     • Fetch all repository items                             │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  3. MATCHING                                                 │
│     • Match by deliveryKey + schemaId                        │
│     • Generate missing hierarchies report                    │
│     • Display matched vs. missing                            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
          ┌──────────────────┴──────────────────┐
          │                                      │
          ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│  All Missing?       │              │  Has Matches?       │
│  → Exit             │              │  → Continue         │
└─────────────────────┘              └──────────┬──────────┘
                                                │
                                                ▼
                             ┌──────────────────────────────────┐
                             │  4. CONFIGURATION                 │
                             │     • Update content?             │
                             │     • Locale strategy             │
                             │     • Publish after sync?         │
                             │     • Dry-run mode?               │
                             └──────────┬───────────────────────┘
                                        │
                                        ▼
                             ┌──────────────────────────────────┐
                             │  5. SUMMARY & CONFIRMATION        │
                             │     • Display all selections      │
                             │     • Show configuration          │
                             │     • Request confirmation        │
                             └──────────┬───────────────────────┘
                                        │
                      ┌─────────────────┴─────────────────┐
                      │                                    │
                      ▼                                    ▼
            ┌─────────────────┐              ┌─────────────────────┐
            │  Confirmed?     │              │  Cancelled?         │
            │  → Continue     │              │  → Exit             │
            └────────┬────────┘              └─────────────────────┘
                     │
                     ▼
          ┌──────────────────────────────────┐
          │  6. BUILD HIERARCHY TREES         │
          │     • For each matched pair       │
          │     • Build source tree           │
          └──────────┬───────────────────────┘
                     │
                     ▼
          ┌──────────────────────────────────┐
          │  7. EXECUTE SYNCHRONIZATION       │
          │     • Sequential processing       │
          │     • Progress tracking           │
          │     • Error handling              │
          │     • Continue on failures        │
          └──────────┬───────────────────────┘
                     │
                     ▼
          ┌──────────────────────────────────┐
          │  8. DISPLAY RESULTS               │
          │     • Success/failure counts      │
          │     • Detailed per-hierarchy      │
          │     • Missing hierarchies note    │
          └──────────┬───────────────────────┘
                     │
                     ▼
          ┌──────────────────────────────────┐
          │           COMPLETE                │
          └───────────────────────────────────┘
```

## Related Commands

- **`sync-hierarchy`**: Sync a single content item hierarchy
- **`copy-content-type-schemas`**: Copy schemas before syncing content
- **`recreate-content-items`**: Recreate individual content items
- **`update-locale`**: Update delivery key locales

## Technical Notes

### Performance Considerations

- Hierarchies are processed **sequentially** (not in parallel) to avoid API rate
  limiting
- Each hierarchy synchronization may involve multiple API calls (create, update,
  remove operations)
- Estimated time: ~30-60 seconds per hierarchy for typical sizes (10-50 items)

### Data Safety

- Dry-run mode available for risk-free preview
- Continues on individual failures (doesn't roll back successful operations)
- Detailed error reporting for debugging
- Missing hierarchies report prevents accidental data loss

### API Interactions

- Uses Amplience Dynamic Content API
- Requires read access to source repository
- Requires write access to target repository
- Respects API rate limits through sequential processing

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting) above
2. Review error messages in command output
3. Check the missing hierarchies report if applicable
4. Consult the main README for general setup
5. Open an issue on the project repository
