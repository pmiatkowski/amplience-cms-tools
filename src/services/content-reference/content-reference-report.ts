/**
 * Content Reference Report Service
 *
 * This module provides comprehensive reporting, rollback guidance, and user feedback
 * for content reference resolution operations.
 */
import * as fs from 'fs';
import * as path from 'path';
import { detectCircularGroups } from './content-reference-mapping';
import type { ReferenceResolutionResult, ReferenceRegistry } from './types';



/**
 * Report for a circular reference group
 */
export type CircularGroupReport = {
  /** Index of the group */
  groupIndex: number;
  /** Item IDs in the circular group */
  itemIds: string[];
  /** Labels of items in the circular group */
  itemLabels: string[];
}





/**
 * Report for a created item
 */
export type CreatedItemReport = {
  /** Source content item ID */
  sourceId: string;
  /** Target content item ID after creation */
  targetId: string;
  /** Label of the item */
  label: string;
  /** Whether this item had circular references */
  hadCircularRefs: boolean;
}





/**
 * Report for a discovered item
 */
export type DiscoveredItemReport = {
  /** Source content item ID */
  sourceId: string;
  /** Label of the item */
  label: string;
  /** Schema ID of the content type */
  schemaId: string;
  /** Number of references this item makes */
  referenceCount: number;
  /** Number of items that reference this item */
  referencedByCount: number;
}






/**
 * Display a summary of the report to the console
 *
 * @param report - The reference report to display
 */
export function displayReportSummary(report: ReferenceReport): void {
  console.log('\n=== Content Reference Resolution Summary ===\n');

  console.log('Statistics:');
  console.log(`  Total Discovered:     ${report.summary.totalDiscovered}`);
  console.log(`  Matched (existing):   ${report.summary.matchedCount}`);
  console.log(`  Created:              ${report.summary.createdCount}`);
  console.log(`  Unresolved:           ${report.summary.unresolvedCount}`);
  console.log(`  External References:  ${report.summary.externalCount}`);
  console.log(`  Circular Groups:      ${report.summary.circularGroupCount}`);

  if (report.summary.phase1Count > 0) {
    console.log(`  Phase 1 (created):    ${report.summary.phase1Count}`);
    console.log(`  Phase 2 (updated):    ${report.summary.phase2Count}`);
  }

  if (report.unresolved.length > 0) {
    console.log('\nUnresolved Items:');
    for (const item of report.unresolved) {
      console.log(`  - ${item.label} (${item.sourceId})`);
      console.log(`    Reason: ${item.reason}`);
    }
  }

  if (report.external.length > 0) {
    console.log('\nExternal References:');
    for (const item of report.external) {
      console.log(`  - ${item.sourceId} (referenced by ${item.referencedByIds.length} items)`);
    }
  }

  if (report.circularGroups.length > 0) {
    console.log('\nCircular Reference Groups:');
    for (const group of report.circularGroups) {
      console.log(`  Group ${group.groupIndex}: ${group.itemIds.length} items`);
    }
  }

  console.log('\n==========================================\n');
}







/**
 * Report for an external reference
 */
export type ExternalReferenceReport = {
  /** Source content item ID */
  sourceId: string;
  /** IDs of items that reference this external item */
  referencedByIds: string[];
  /** Note about the external reference */
  note: string;
}







/**
 * Format the report as markdown for file output
 *
 * @param report - The reference report to format
 * @returns Markdown formatted string
 */
export function formatReportAsMarkdown(report: ReferenceReport): string {
  const lines: string[] = [];

  // Header
  lines.push('# Content Reference Resolution Report');
  lines.push('');
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total Discovered | ${report.summary.totalDiscovered} |`);
  lines.push(`| Matched (existing) | ${report.summary.matchedCount} |`);
  lines.push(`| Created | ${report.summary.createdCount} |`);
  lines.push(`| Unresolved | ${report.summary.unresolvedCount} |`);
  lines.push(`| External References | ${report.summary.externalCount} |`);
  lines.push(`| Circular Groups | ${report.summary.circularGroupCount} |`);
  lines.push(`| Phase 1 (nullified refs) | ${report.summary.phase1Count} |`);
  lines.push(`| Phase 2 (resolved refs) | ${report.summary.phase2Count} |`);
  lines.push('');

  // Matched Items
  if (report.matched.length > 0) {
    lines.push('## Matched Items');
    lines.push('');
    lines.push('Items that were matched to existing content in the target hub:');
    lines.push('');
    lines.push('| Source ID | Source Label | Target ID | Match Method |');
    lines.push('|-----------|--------------|-----------|--------------|');
    for (const item of report.matched) {
      lines.push(`| ${item.sourceId} | ${item.sourceLabel} | ${item.targetId} | ${item.matchMethod} |`);
    }
    lines.push('');
  }

  // Created Items
  if (report.created.length > 0) {
    lines.push('## Created Items');
    lines.push('');
    lines.push('Items that were created in the target hub:');
    lines.push('');
    lines.push('| Source ID | Target ID | Label | Had Circular Refs |');
    lines.push('|-----------|-----------|-------|-------------------|');
    for (const item of report.created) {
      lines.push(`| ${item.sourceId} | ${item.targetId} | ${item.label} | ${item.hadCircularRefs ? 'Yes' : 'No'} |`);
    }
    lines.push('');
  }

  // Unresolved Items
  if (report.unresolved.length > 0) {
    lines.push('## Unresolved Items');
    lines.push('');
    lines.push('Items that could not be matched or created:');
    lines.push('');
    lines.push('| Source ID | Label | Reason | Suggested Action |');
    lines.push('|-----------|-------|--------|------------------|');
    for (const item of report.unresolved) {
      lines.push(`| ${item.sourceId} | ${item.label} | ${item.reason} | ${item.suggestedAction} |`);
    }
    lines.push('');
  }

  // External References
  if (report.external.length > 0) {
    lines.push('## External References');
    lines.push('');
    lines.push('References to items outside the source repository:');
    lines.push('');
    lines.push('| Source ID | Referenced By | Note |');
    lines.push('|-----------|---------------|------|');
    for (const item of report.external) {
      lines.push(`| ${item.sourceId} | ${item.referencedByIds.length} items | ${item.note} |`);
    }
    lines.push('');
  }

  // Circular Groups
  if (report.circularGroups.length > 0) {
    lines.push('## Circular Reference Groups');
    lines.push('');
    lines.push('Groups of items with circular references that required two-phase creation:');
    lines.push('');
    for (const group of report.circularGroups) {
      lines.push(`### Group ${group.groupIndex}`);
      lines.push('');
      lines.push('| Item ID | Label |');
      lines.push('|---------|-------|');
      for (let i = 0; i < group.itemIds.length; i++) {
        lines.push(`| ${group.itemIds[i]} | ${group.itemLabels[i]} |`);
      }
      lines.push('');
    }
  }

  // Discovered Items (detailed list)
  if (report.discovered.length > 0) {
    lines.push('## All Discovered Items');
    lines.push('');
    lines.push('Complete list of all items discovered during resolution:');
    lines.push('');
    lines.push('| Source ID | Label | Schema | References | Referenced By |');
    lines.push('|-----------|-------|--------|------------|---------------|');
    for (const item of report.discovered) {
      lines.push(`| ${item.sourceId} | ${item.label} | ${item.schemaId} | ${item.referenceCount} | ${item.referencedByCount} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}









/**
 * Format rollback guidance as markdown
 *
 * @param guidance - The rollback guidance to format
 * @returns Markdown formatted string
 */
export function formatRollbackGuidanceAsMarkdown(guidance: RollbackGuidance): string {
  const lines: string[] = [];

  lines.push(`# ${guidance.title}`);
  lines.push('');
  lines.push(`**Generated:** ${guidance.generatedAt}`);
  lines.push('');
  lines.push(guidance.introduction);
  lines.push('');

  // Prerequisites
  lines.push('## Prerequisites');
  lines.push('');
  for (const prereq of guidance.prerequisites) {
    lines.push(`- ${prereq}`);
  }
  lines.push('');

  // Steps
  lines.push('## Rollback Steps');
  lines.push('');
  for (const step of guidance.steps) {
    lines.push(`### Step ${step.step}: ${step.action}`);
    lines.push('');
    if (step.command) {
      lines.push('```');
      lines.push(step.command);
      lines.push('```');
      lines.push('');
    }
    if (step.warning) {
      lines.push(`> **Warning:** ${step.warning}`);
      lines.push('');
    }
  }

  // Warnings
  lines.push('## Important Warnings');
  lines.push('');
  for (const warning of guidance.warnings) {
    lines.push(`- ${warning}`);
  }
  lines.push('');

  return lines.join('\n');
}










/**
 * Generate a comprehensive report from resolution results
 *
 * @param resolution - The resolution result from resolveContentReferences
 * @param registry - The populated reference registry
 * @returns Complete reference report
 */
export function generateResolutionReport(
  resolution: ReferenceResolutionResult,
  registry: ReferenceRegistry
): ReferenceReport {
  const discovered: DiscoveredItemReport[] = [];
  const matched: MatchedItemReport[] = [];
  const created: CreatedItemReport[] = [];
  const unresolved: UnresolvedItemReport[] = [];
  const external: ExternalReferenceReport[] = [];

  // Detect circular groups
  const circularGroupItems = detectCircularGroups(registry);
  const circularItemIds = new Set(circularGroupItems.flat());

  // Process each registry entry
  for (const [sourceId, entry] of registry.entries) {
    // Build discovered report
    discovered.push({
      sourceId,
      label: entry.sourceItem.label || 'Unknown',
      schemaId: entry.sourceItem.schemaId || entry.sourceItem.body._meta?.schema || 'Unknown',
      referenceCount: entry.referencesTo.length,
      referencedByCount: entry.referencedBy.length,
    });

    // Categorize the item
    if (registry.externalReferenceIds.has(sourceId)) {
      // External reference
      external.push({
        sourceId,
        referencedByIds: entry.referencedBy,
        note: 'This item exists outside the source repository and was not copied',
      });
    } else if (entry.targetId) {
      // Check if it was matched or created
      const wasCreated = !registry.sourceToTargetIdMap.has(sourceId) ||
        registry.unresolvedIds.has(sourceId) === false;

      if (wasCreated && circularItemIds.has(sourceId)) {
        // Created with circular refs (needs phase 2)
        created.push({
          sourceId,
          targetId: entry.targetId,
          label: entry.sourceItem.label || 'Unknown',
          hadCircularRefs: true,
        });
      } else if (wasCreated) {
        // Created without circular refs
        created.push({
          sourceId,
          targetId: entry.targetId,
          label: entry.sourceItem.label || 'Unknown',
          hadCircularRefs: false,
        });
      } else {
        // Matched to existing item
        matched.push({
          sourceId,
          sourceLabel: entry.sourceItem.label || 'Unknown',
          targetId: entry.targetId,
          targetLabel: 'Matched Item', // Would need to fetch target item for actual label
          matchMethod: entry.sourceItem.body._meta?.deliveryKey ? 'delivery_key' : 'schema_label',
        });
      }
    } else if (registry.unresolvedIds.has(sourceId)) {
      // Unresolved item
      unresolved.push({
        sourceId,
        label: entry.sourceItem.label || 'Unknown',
        reason: 'Could not find matching item in target hub',
        suggestedAction: 'Manually create this item in target hub or verify it exists',
      });
    }
  }

  // Build circular group reports
  const circularGroups: CircularGroupReport[] = circularGroupItems.map((group, index) => ({
    groupIndex: index + 1,
    itemIds: group,
    itemLabels: group.map(id => {
      const entry = registry.entries.get(id);

      return entry?.sourceItem.label || 'Unknown';
    }),
  }));

  // Calculate phase counts
  const phase1Count = created.filter(c => c.hadCircularRefs).length;
  const phase2Count = phase1Count; // Phase 2 updates same items as phase 1

  return {
    summary: {
      totalDiscovered: resolution.totalDiscovered,
      matchedCount: matched.length,
      createdCount: created.length,
      unresolvedCount: unresolved.length,
      externalCount: external.length,
      circularGroupCount: circularGroups.length,
      phase1Count,
      phase2Count,
    },
    discovered,
    matched,
    created,
    unresolved,
    external,
    circularGroups,
    generatedAt: new Date().toISOString(),
  };
}











/**
 * Generate rollback guidance for the resolution
 *
 * @param registry - The populated reference registry
 * @param resolution - The resolution result
 * @returns Rollback guidance document
 */
export function generateRollbackGuidance(
  registry: ReferenceRegistry,
  resolution: ReferenceResolutionResult
): RollbackGuidance {
  // Get created items (items with targetId that were not pre-matched)
  const createdItems: Array<{ sourceId: string; targetId: string; label: string }> = [];

  for (const [sourceId, entry] of registry.entries) {
    if (entry.targetId && !registry.externalReferenceIds.has(sourceId)) {
      createdItems.push({
        sourceId,
        targetId: entry.targetId,
        label: entry.sourceItem.label || 'Unknown',
      });
    }
  }

  const steps: RollbackStep[] = [];
  let stepNumber = 1;

  // Step 1: Archive or delete created items
  if (createdItems.length > 0) {
    steps.push({
      step: stepNumber++,
      action: `Archive or delete ${createdItems.length} created content items in the target hub`,
      warning: 'This will remove all content items created during this operation',
    });

    // Add specific item list
    steps.push({
      step: stepNumber++,
      action: 'Items to remove:',
      command: `# Target item IDs to remove:\n${createdItems.map(i => `#   - ${i.targetId} (${i.label})`).join('\n')}`,
    });
  }

  // Step 2: Handle delivery keys
  const itemsWithDeliveryKeys = createdItems.filter(i => {
    const entry = registry.entries.get(i.sourceId);

    return entry?.sourceItem.body._meta?.deliveryKey;
  });

  if (itemsWithDeliveryKeys.length > 0) {
    steps.push({
      step: stepNumber++,
      action: `Release ${itemsWithDeliveryKeys.length} delivery keys that were assigned`,
      warning: 'Delivery keys may need to be manually released if items are not deleted',
    });
  }

  // Step 3: Handle hierarchy relationships
  const hierarchyItems = createdItems.filter(i => {
    const entry = registry.entries.get(i.sourceId);

    return entry?.sourceItem.hierarchy;
  });

  if (hierarchyItems.length > 0) {
    steps.push({
      step: stepNumber++,
      action: `Remove ${hierarchyItems.length} hierarchy relationships`,
      warning: 'Hierarchy relationships are automatically removed when items are archived',
    });
  }

  // Step 4: Verify rollback
  steps.push({
    step: stepNumber++,
    action: 'Verify rollback is complete',
    command: '# Verify items are removed by checking the target repository',
  });

  const warnings: string[] = [
    'Rollback operations cannot be easily undone',
    'Items that were matched (not created) are not affected by rollback',
    'External references point to items that were not copied and remain unchanged',
  ];

  if (resolution.circularGroups.length > 0) {
    warnings.push(
      'Items in circular reference groups may require manual verification after rollback'
    );
  }

  return {
    title: 'Content Reference Resolution Rollback Guide',
    introduction: `This guide provides steps to undo the content reference resolution operation ` +
      `that created ${createdItems.length} items in the target hub.`,
    prerequisites: [
      'Access to the target hub with archive/delete permissions',
      'List of target item IDs (provided below)',
      'Confirmation that rollback is desired (this action is destructive)',
    ],
    steps,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}












/**
 * Report for a matched item
 */
export type MatchedItemReport = {
  /** Source content item ID */
  sourceId: string;
  /** Label of the source item */
  sourceLabel: string;
  /** Target content item ID */
  targetId: string;
  /** Label of the target item */
  targetLabel: string;
  /** Method used for matching */
  matchMethod: 'delivery_key' | 'schema_label';
}











/**
 * Complete reference resolution report
 */
export type ReferenceReport = {
  /** Summary statistics */
  summary: ReportSummary;
  /** All discovered items */
  discovered: DiscoveredItemReport[];
  /** Successfully matched items */
  matched: MatchedItemReport[];
  /** Created items */
  created: CreatedItemReport[];
  /** Unresolved items */
  unresolved: UnresolvedItemReport[];
  /** External references */
  external: ExternalReferenceReport[];
  /** Circular reference groups */
  circularGroups: CircularGroupReport[];
  /** Timestamp when report was generated */
  generatedAt: string;
}










/**
 * Summary statistics for the report
 */
export type ReportSummary = {
  /** Total items discovered */
  totalDiscovered: number;
  /** Items matched to existing target items */
  matchedCount: number;
  /** Items created in target */
  createdCount: number;
  /** Items that could not be resolved */
  unresolvedCount: number;
  /** External references */
  externalCount: number;
  /** Circular reference groups */
  circularGroupCount: number;
  /** Phase 1 creation count (items with nullified refs) */
  phase1Count: number;
  /** Phase 2 update count (items with resolved refs) */
  phase2Count: number;
}









/**
 * Rollback guidance document
 */
export type RollbackGuidance = {
  /** Title of the guidance */
  title: string;
  /** Introduction message */
  introduction: string;
  /** Prerequisites for rollback */
  prerequisites: string[];
  /** Rollback steps */
  steps: RollbackStep[];
  /** Warnings and caveats */
  warnings: string[];
  /** Generated timestamp */
  generatedAt: string;
}








/**
 * Rollback step for guidance
 */
export type RollbackStep = {
  /** Step number */
  step: number;
  /** Description of the action */
  action: string;
  /** Command to execute (if applicable) */
  command?: string;
  /** Warning or note about the step */
  warning?: string;
}





/**
 * Save report to file in the reports directory
 *
 * @param report - The report to save
 * @param filename - Name of the file (without extension)
 * @param reportsDir - Directory to save reports (defaults to 'reports')
 * @returns Path to the saved file
 */
export function saveReportToFile(
  report: ReferenceReport,
  filename: string,
  reportsDir: string = 'reports'
): string {
  // Ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fullFilename = `${filename}-${timestamp}.md`;
  const filePath = path.join(reportsDir, fullFilename);

  // Format and save
  const markdown = formatReportAsMarkdown(report);
  fs.writeFileSync(filePath, markdown, 'utf-8');

  return filePath;
}



/**
 * Save rollback guidance to file
 *
 * @param guidance - The rollback guidance to save
 * @param filename - Name of the file (without extension)
 * @param reportsDir - Directory to save reports (defaults to 'reports')
 * @returns Path to the saved file
 */
export function saveRollbackGuidanceToFile(
  guidance: RollbackGuidance,
  filename: string,
  reportsDir: string = 'reports'
): string {
  // Ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fullFilename = `${filename}-${timestamp}.md`;
  const filePath = path.join(reportsDir, fullFilename);

  // Format and save
  const markdown = formatRollbackGuidanceAsMarkdown(guidance);
  fs.writeFileSync(filePath, markdown, 'utf-8');

  return filePath;
}


/**
 * Report for an unresolved item
 */
export type UnresolvedItemReport = {
  /** Source content item ID */
  sourceId: string;
  /** Label of the item */
  label: string;
  /** Reason why it could not be resolved */
  reason: string;
  /** Suggested action for resolution */
  suggestedAction: string;
}
