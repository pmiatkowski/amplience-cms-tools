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
  lines.push(`| Items Permission Denied | ${result.itemsPermissionDenied.length} |`);
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
    lines.push('| Source ID | Label | Error | Failed Request |');
    lines.push('| --- | --- | --- | --- |');
    for (const item of result.itemsFailed) {
      lines.push(
        `| ${escapeMarkdownTableCell(item.sourceId)} | ${escapeMarkdownTableCell(item.label)} | ${escapeMarkdownTableCell(formatApiError(item.error))} | ${escapeMarkdownTableCell(formatFailedRequest(item.failedRequest))} |`
      );
    }
    lines.push('');
  }

  // Permission denied items
  if (result.itemsPermissionDenied.length > 0) {
    lines.push('## Items Permission Denied (403)');
    lines.push('');
    lines.push(
      'These items were blocked by target hub authorization. The table includes likely cause and what to verify.'
    );
    lines.push('');
    lines.push(
      '| Source ID | Label | Operation | Schema | Target Folder | Target Locale | Likely Cause | Recommended Check | Error | Failed Request |'
    );
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const item of result.itemsPermissionDenied) {
      lines.push(
        `| ${escapeMarkdownTableCell(item.sourceId)} | ${escapeMarkdownTableCell(item.label)} | ${escapeMarkdownTableCell(item.operation)} | ${escapeMarkdownTableCell(item.schemaId || 'Unknown')} | ${escapeMarkdownTableCell(item.targetFolderId || '(repository root)')} | ${escapeMarkdownTableCell(item.targetLocale || 'Keep source')} | ${escapeMarkdownTableCell(item.likelyCause || 'Authorization required')} | ${escapeMarkdownTableCell(item.recommendedAction || 'Verify target hub roles/permissions')} | ${escapeMarkdownTableCell(formatApiError(item.error))} | ${escapeMarkdownTableCell(formatFailedRequest(item.failedRequest))} |`
      );
    }
    lines.push('');

    lines.push('### Permission Denied Summary');
    lines.push('');

    const byCause = new Map<string, number>();
    for (const item of result.itemsPermissionDenied) {
      const cause = item.likelyCause || 'Authorization required';
      byCause.set(cause, (byCause.get(cause) || 0) + 1);
    }

    lines.push('| Likely Cause | Count |');
    lines.push('| --- | --- |');
    for (const [cause, count] of byCause.entries()) {
      lines.push(`| ${escapeMarkdownTableCell(cause)} | ${count} |`);
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

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function formatApiError(error: string): string {
  const compact = error.replace(/\s+/g, ' ').trim();
  const jsonMatch = compact.match(/-\s*(\{.*\})$/);

  if (!jsonMatch) {
    return compact;
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]) as {
      errors?: Array<{ code?: string; message?: string }>;
    };
    const details = (parsed.errors || [])
      .map(entry => {
        const code = entry.code || 'UNKNOWN';
        const message = entry.message || 'No message';

        return `${code}: ${message}`;
      })
      .join('; ');

    return details ? compact.replace(jsonMatch[1], details) : compact;
  } catch {
    return compact;
  }
}

function formatFailedRequest(failedRequest?: {
  endpoint: string;
  method: string;
  payloadJson: string;
}): string {
  if (!failedRequest) {
    return 'N/A';
  }

  return `${failedRequest.method} ${failedRequest.endpoint} payload=${failedRequest.payloadJson}`;
}
