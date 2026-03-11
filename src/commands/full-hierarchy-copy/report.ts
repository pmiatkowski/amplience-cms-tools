import fs from 'node:fs';
import path from 'node:path';
import type { DuplicateStrategy } from '~/services/actions/duplicate-handler';
import type { FullHierarchyCopyResult } from '~/services/actions/full-hierarchy-copy';

/**
 * Generates a Markdown report for the full hierarchy copy operation
 * and saves it to the reports/ directory.
 *
 * @param result - The operation result
 * @param context - Additional context for the report header
 */
export function generateFullHierarchyCopyReport(
  result: FullHierarchyCopyResult,
  context: ReportContext
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `full-hierarchy-copy-${timestamp}.md`;
  const reportPath = path.join('reports', filename);

  const content = buildReportContent(result, context);

  // Ensure reports directory exists
  if (!fs.existsSync('reports')) {
    fs.mkdirSync('reports', { recursive: true });
  }

  fs.writeFileSync(reportPath, content, 'utf-8');
  console.log(`\n📄 Report saved: ${reportPath}`);

  return reportPath;
}

function buildReportContent(result: FullHierarchyCopyResult, context: ReportContext): string {
  const lines: string[] = [];

  lines.push(`# Full Hierarchy Copy Report`);
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Summary
  lines.push('## Operation Summary');
  lines.push('');
  lines.push(`| Property | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Source Hub | ${context.sourceHubName} |`);
  lines.push(`| Target Hub | ${context.targetHubName} |`);
  lines.push(`| Source Repository | ${context.sourceRepositoryName} |`);
  lines.push(`| Target Repository | ${context.targetRepositoryName} |`);
  lines.push(`| Duplicate Strategy | ${context.duplicateStrategy} |`);
  lines.push(`| Target Locale | ${context.targetLocale || 'Keep source'} |`);
  lines.push(`| Duration | ${(result.duration / 1000).toFixed(1)}s |`);
  lines.push(`| Items Created/Updated | ${result.itemsCreated.length} |`);
  lines.push(`| Items Skipped | ${result.itemsSkipped.length} |`);
  lines.push(`| Items Failed | ${result.itemsFailed.length} |`);
  lines.push(`| Items Published | ${result.itemsPublished.length} |`);
  lines.push('');

  // Validation
  if (result.validationResult) {
    lines.push('## Validation');
    lines.push('');
    if (result.validationResult.valid) {
      lines.push(
        `✅ All ${result.validationResult.schemasChecked} schemas validated successfully.`
      );
    } else {
      lines.push(`❌ Validation failed with ${result.validationResult.errors.length} errors:`);
      lines.push('');
      for (const error of result.validationResult.errors) {
        lines.push(`- **[${error.type}]** ${error.message}`);
      }
    }
    lines.push('');
  }

  // Created items
  if (result.itemsCreated.length > 0) {
    lines.push('## Items Created/Updated');
    lines.push('');
    lines.push('| Source ID | Target ID | Label | Action |');
    lines.push('| --- | --- | --- | --- |');
    for (const item of result.itemsCreated) {
      lines.push(`| ${item.sourceId} | ${item.targetId} | ${item.label} | ${item.action} |`);
    }
    lines.push('');
  }

  // Skipped items
  if (result.itemsSkipped.length > 0) {
    lines.push('## Items Skipped');
    lines.push('');
    lines.push('| Source ID | Target ID | Label | Reason |');
    lines.push('| --- | --- | --- | --- |');
    for (const item of result.itemsSkipped) {
      lines.push(`| ${item.sourceId} | ${item.targetId} | ${item.label} | ${item.reason} |`);
    }
    lines.push('');
  }

  // Failed items
  if (result.itemsFailed.length > 0) {
    lines.push('## Items Failed');
    lines.push('');
    lines.push('| Source ID | Label | Error |');
    lines.push('| --- | --- | --- |');
    for (const item of result.itemsFailed) {
      lines.push(`| ${item.sourceId} | ${item.label} | ${item.error} |`);
    }
    lines.push('');
  }

  // Folder mappings
  if (result.folderMappings.size > 0) {
    lines.push('## Folder Mappings');
    lines.push('');
    lines.push('| Source Folder ID | Target Folder ID |');
    lines.push('| --- | --- |');
    for (const [source, target] of result.folderMappings) {
      lines.push(`| ${source || '(repository root)'} | ${target} |`);
    }
    lines.push('');
  }

  // Discovery warnings
  if (result.discoveryWarnings.length > 0) {
    lines.push('## Discovery Warnings');
    lines.push('');
    for (const warning of result.discoveryWarnings) {
      lines.push(
        `- **[${warning.type}]** Item "${warning.sourceItemLabel}" (${warning.sourceItemId}): ${warning.message}`
      );
    }
    lines.push('');
  }

  // Published items
  if (result.itemsPublished.length > 0) {
    lines.push('## Published Items');
    lines.push('');
    lines.push('| Source ID | Target ID |');
    lines.push('| --- | --- |');
    for (const item of result.itemsPublished) {
      lines.push(`| ${item.sourceId} | ${item.targetId} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// --- Types ---

export type ReportContext = {
  duplicateStrategy: DuplicateStrategy;
  sourceHubName: string;
  sourceRepositoryName: string;
  targetHubName: string;
  targetLocale?: string | null;
  targetRepositoryName: string;
};
