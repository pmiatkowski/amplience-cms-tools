import * as fs from 'fs/promises';
import * as path from 'path';
import type { MatchedHierarchyPair, MissingHierarchy, SourceHierarchy } from './types';

/**
 * Generate a markdown report of missing hierarchies
 */
export function generateMissingHierarchiesReport(missing: MissingHierarchy[]): string {
  if (missing.length === 0) {
    return '# Missing Hierarchies\n\nNo missing hierarchies found. All source hierarchies have matching targets.\n';
  }

  let report = '# Missing Hierarchies Report\n\n';
  report += `Found ${missing.length} hierarchies in source that do not exist in target.\n\n`;
  report += '## Details\n\n';

  for (const hierarchy of missing) {
    report += `### ${hierarchy.name}\n\n`;
    report += `- **Delivery Key**: ${hierarchy.deliveryKey}\n`;
    report += `- **Schema ID**: ${hierarchy.schemaId}\n`;
    report += `- **Content Items**: ${hierarchy.contentCount}\n`;
    report += '\n';
  }

  report += '## Summary\n\n';
  report += `Total missing hierarchies: ${missing.length}\n`;
  const totalItems = missing.reduce((sum, h) => sum + h.contentCount, 0);
  report += `Total content items in missing hierarchies: ${totalItems}\n`;

  return report;
}

/**
 * Match source hierarchies to target hierarchies by delivery key AND schema ID
 * Returns matched pairs and list of missing hierarchies
 */
export function matchHierarchies(
  sourceItems: SourceHierarchy[],
  targetAllItems: Amplience.ContentItem[]
): {
  matched: MatchedHierarchyPair[];
  missing: MissingHierarchy[];
} {
  const matched: MatchedHierarchyPair[] = [];
  const missing: MissingHierarchy[] = [];

  for (const source of sourceItems) {
    const sourceDeliveryKey = source.item.body?._meta?.deliveryKey || 'unknown';
    const sourceSchemaId = source.item.body?._meta?.schema || 'unknown';

    // Find matching target item by delivery key AND schema ID
    const targetItem = targetAllItems.find(
      item =>
        item.body?._meta?.deliveryKey === sourceDeliveryKey &&
        item.body?._meta?.schema === sourceSchemaId
    );

    if (targetItem) {
      // Match found - create matched pair
      matched.push({
        source,
        target: {
          item: targetItem,
          allItems: targetAllItems,
        },
      });
    } else {
      // No match found - add to missing list
      missing.push({
        deliveryKey: sourceDeliveryKey,
        schemaId: sourceSchemaId,
        name: source.item.label || 'Unnamed',
        contentCount: source.contentCount || source.allItems.length,
      });
    }
  }

  return { matched, missing };
}

/**
 * Save missing hierarchies report to reports folder with timestamp
 * Returns the path to the saved file
 */
export async function saveMissingHierarchiesReport(report: string): Promise<string> {
  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  // Generate filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/T/, '-').replace(/:/g, '-');
  const filename = `missing-hierarchies-${timestamp}.md`;
  const filePath = path.join(reportsDir, filename);

  // Write report to file
  await fs.writeFile(filePath, report, 'utf-8');

  return filePath;
}
