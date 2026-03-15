/**
 * Tests for Content Reference Report Service
 */
import * as fs from 'fs';
import { describe, it, expect, vi } from 'vitest';
import { createReferenceRegistry, registerItem } from './content-reference-mapping';
import {
  generateResolutionReport,
  formatReportAsMarkdown,
  displayReportSummary,
  generateRollbackGuidance,
  formatRollbackGuidanceAsMarkdown,
  saveReportToFile,
  saveRollbackGuidanceToFile,
  type ReferenceReport,
  type RollbackGuidance,
} from './content-reference-report';
import type { ReferenceResolutionResult, ReferenceRegistry } from './types';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

/**
 * Helper to create a mock content item
 */
function createMockContentItem(
  id: string,
  label: string,
  schemaId: string,
  options: {
    deliveryKey?: string;
    references?: string[];
    hierarchy?: { root: boolean; parentId?: string };
  } = {}
): Amplience.ContentItemWithDetails {
  const body: Record<string, unknown> = {
    _meta: {
      schema: schemaId,
      deliveryKey: options.deliveryKey,
      hierarchy: options.hierarchy,
    },
  };

  // Add references to body if present
  if (options.references && options.references.length > 0) {
    body.refs = options.references.map((refId) => ({
      id: refId,
      _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
    }));
  }

  return {
    id,
    label,
    schemaId,
    version: 1,
    status: 'ACTIVE',
    publishingStatus: 'LATEST',
    body,
  } as unknown as Amplience.ContentItemWithDetails;
}

/**
 * Helper to create a reference registry with items
 */
function createTestRegistry(): ReferenceRegistry {
  const registry = createReferenceRegistry();

  // Item A - references B
  const itemA = createMockContentItem('id-a', 'Item A', 'https://schema.com/a.json', {
    references: ['id-b'],
  });
  registerItem(registry, itemA, [
    {
      sourceId: 'id-b',
      contentType: 'https://schema.com/b.json',
      path: '$.item',
      isArrayElement: false,
      referenceSchemaType: 'content-reference',
    },
  ]);

  // Item B - references C
  const itemB = createMockContentItem('id-b', 'Item B', 'https://schema.com/b.json', {
    references: ['id-c'],
  });
  registerItem(registry, itemB, [
    {
      sourceId: 'id-c',
      contentType: 'https://schema.com/c.json',
      path: '$.item',
      isArrayElement: false,
      referenceSchemaType: 'content-reference',
    },
  ]);

  // Item C - no references
  const itemC = createMockContentItem('id-c', 'Item C', 'https://schema.com/c.json');
  registerItem(registry, itemC, []);

  return registry;
}

describe('Content Reference Report Service', () => {
  describe('generateResolutionReport', () => {
    it('should generate a report with correct summary statistics', () => {
      const registry = createTestRegistry();
      const resolution: ReferenceResolutionResult = {
        totalDiscovered: 3,
        matchedCount: 1,
        toCreateCount: 2,
        unresolvedCount: 0,
        externalCount: 0,
        circularGroups: [],
        registry,
        creationOrder: ['id-c', 'id-b', 'id-a'],
      };

      const report = generateResolutionReport(resolution, registry);

      expect(report.summary.totalDiscovered).toBe(3);
      expect(report.summary.unresolvedCount).toBe(0);
      expect(report.summary.externalCount).toBe(0);
      expect(report.summary.circularGroupCount).toBe(0);
      expect(report.discovered).toHaveLength(3);
      expect(report.generatedAt).toBeDefined();
    });

    it('should identify external references correctly', () => {
      const registry = createTestRegistry();

      // Mark item C as external
      registry.externalReferenceIds.add('id-c');

      const resolution: ReferenceResolutionResult = {
        totalDiscovered: 3,
        matchedCount: 0,
        toCreateCount: 2,
        unresolvedCount: 0,
        externalCount: 1,
        circularGroups: [],
        registry,
        creationOrder: ['id-c', 'id-b', 'id-a'],
      };

      const report = generateResolutionReport(resolution, registry);

      expect(report.summary.externalCount).toBe(1);
      expect(report.external).toHaveLength(1);
      expect(report.external[0].sourceId).toBe('id-c');
    });

    it('should identify unresolved items correctly', () => {
      const registry = createTestRegistry();

      // Mark item B as unresolved
      registry.unresolvedIds.add('id-b');

      const resolution: ReferenceResolutionResult = {
        totalDiscovered: 3,
        matchedCount: 0,
        toCreateCount: 2,
        unresolvedCount: 1,
        externalCount: 0,
        circularGroups: [],
        registry,
        creationOrder: ['id-c', 'id-b', 'id-a'],
      };

      const report = generateResolutionReport(resolution, registry);

      expect(report.summary.unresolvedCount).toBe(1);
      expect(report.unresolved).toHaveLength(1);
      expect(report.unresolved[0].sourceId).toBe('id-b');
      expect(report.unresolved[0].reason).toContain('Could not find');
    });

    it('should identify circular reference groups', () => {
      const registry = createReferenceRegistry();

      // Create circular reference: A -> B -> A
      const itemA = createMockContentItem('id-a', 'Item A', 'https://schema.com/a.json');
      const itemB = createMockContentItem('id-b', 'Item B', 'https://schema.com/b.json');

      registerItem(registry, itemA, [
        {
          sourceId: 'id-b',
          contentType: 'https://schema.com/b.json',
          path: '$.item',
          isArrayElement: false,
          referenceSchemaType: 'content-reference',
        },
      ]);
      registerItem(registry, itemB, [
        {
          sourceId: 'id-a',
          contentType: 'https://schema.com/a.json',
          path: '$.item',
          isArrayElement: false,
          referenceSchemaType: 'content-reference',
        },
      ]);

      // Build reverse references
      for (const [id, entry] of registry.entries) {
        for (const refId of entry.referencesTo) {
          const refEntry = registry.entries.get(refId);
          if (refEntry && !refEntry.referencedBy.includes(id)) {
            refEntry.referencedBy.push(id);
          }
        }
      }

      const resolution: ReferenceResolutionResult = {
        totalDiscovered: 2,
        matchedCount: 0,
        toCreateCount: 2,
        unresolvedCount: 0,
        externalCount: 0,
        circularGroups: [['id-a', 'id-b']],
        registry,
        creationOrder: ['id-a', 'id-b'],
      };

      const report = generateResolutionReport(resolution, registry);

      expect(report.summary.circularGroupCount).toBe(1);
      expect(report.circularGroups).toHaveLength(1);
      expect(report.circularGroups[0].itemIds).toContain('id-a');
      expect(report.circularGroups[0].itemIds).toContain('id-b');
    });

    it('should include reference counts in discovered items', () => {
      const registry = createTestRegistry();

      const resolution: ReferenceResolutionResult = {
        totalDiscovered: 3,
        matchedCount: 0,
        toCreateCount: 3,
        unresolvedCount: 0,
        externalCount: 0,
        circularGroups: [],
        registry,
        creationOrder: ['id-c', 'id-b', 'id-a'],
      };

      const report = generateResolutionReport(resolution, registry);

      // Item A references 1 item (B)
      const itemA = report.discovered.find(d => d.sourceId === 'id-a');
      expect(itemA?.referenceCount).toBe(1);

      // Item C references 0 items
      const itemC = report.discovered.find(d => d.sourceId === 'id-c');
      expect(itemC?.referenceCount).toBe(0);
    });
  });

  describe('formatReportAsMarkdown', () => {
    it('should format report as markdown with summary table', () => {
      const report: ReferenceReport = {
        summary: {
          totalDiscovered: 5,
          matchedCount: 2,
          createdCount: 2,
          unresolvedCount: 1,
          externalCount: 0,
          circularGroupCount: 0,
          phase1Count: 0,
          phase2Count: 0,
        },
        discovered: [],
        matched: [
          {
            sourceId: 'src-1',
            sourceLabel: 'Source 1',
            targetId: 'tgt-1',
            targetLabel: 'Target 1',
            matchMethod: 'delivery_key',
          },
        ],
        created: [
          {
            sourceId: 'src-2',
            targetId: 'tgt-2',
            label: 'Created 1',
            hadCircularRefs: false,
          },
        ],
        unresolved: [
          {
            sourceId: 'src-3',
            label: 'Unresolved 1',
            reason: 'No match found',
            suggestedAction: 'Create manually',
          },
        ],
        external: [],
        circularGroups: [],
        generatedAt: '2026-03-15T12:00:00Z',
      };

      const markdown = formatReportAsMarkdown(report);

      expect(markdown).toContain('# Content Reference Resolution Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('| Total Discovered | 5 |');
      expect(markdown).toContain('| Matched (existing) | 2 |');
      expect(markdown).toContain('## Matched Items');
      expect(markdown).toContain('src-1');
      expect(markdown).toContain('## Created Items');
      expect(markdown).toContain('tgt-2');
      expect(markdown).toContain('## Unresolved Items');
      expect(markdown).toContain('No match found');
    });

    it('should include circular groups section when present', () => {
      const report: ReferenceReport = {
        summary: {
          totalDiscovered: 2,
          matchedCount: 0,
          createdCount: 2,
          unresolvedCount: 0,
          externalCount: 0,
          circularGroupCount: 1,
          phase1Count: 2,
          phase2Count: 2,
        },
        discovered: [],
        matched: [],
        created: [],
        unresolved: [],
        external: [],
        circularGroups: [
          {
            groupIndex: 1,
            itemIds: ['id-a', 'id-b'],
            itemLabels: ['Item A', 'Item B'],
          },
        ],
        generatedAt: '2026-03-15T12:00:00Z',
      };

      const markdown = formatReportAsMarkdown(report);

      expect(markdown).toContain('## Circular Reference Groups');
      expect(markdown).toContain('### Group 1');
      expect(markdown).toContain('Item A');
      expect(markdown).toContain('Item B');
    });

    it('should include external references section when present', () => {
      const report: ReferenceReport = {
        summary: {
          totalDiscovered: 2,
          matchedCount: 0,
          createdCount: 0,
          unresolvedCount: 0,
          externalCount: 1,
          circularGroupCount: 0,
          phase1Count: 0,
          phase2Count: 0,
        },
        discovered: [],
        matched: [],
        created: [],
        unresolved: [],
        external: [
          {
            sourceId: 'ext-1',
            referencedByIds: ['id-a', 'id-b'],
            note: 'External reference',
          },
        ],
        circularGroups: [],
        generatedAt: '2026-03-15T12:00:00Z',
      };

      const markdown = formatReportAsMarkdown(report);

      expect(markdown).toContain('## External References');
      expect(markdown).toContain('ext-1');
      expect(markdown).toContain('2 items');
    });
  });

  describe('displayReportSummary', () => {
    it('should display summary to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const report: ReferenceReport = {
        summary: {
          totalDiscovered: 5,
          matchedCount: 2,
          createdCount: 2,
          unresolvedCount: 1,
          externalCount: 0,
          circularGroupCount: 0,
          phase1Count: 0,
          phase2Count: 0,
        },
        discovered: [],
        matched: [],
        created: [],
        unresolved: [
          {
            sourceId: 'src-1',
            label: 'Unresolved Item',
            reason: 'No match',
            suggestedAction: 'Create manually',
          },
        ],
        external: [],
        circularGroups: [],
        generatedAt: '2026-03-15T12:00:00Z',
      };

      displayReportSummary(report);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Content Reference Resolution Summary')
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total Discovered'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('5'));

      consoleSpy.mockRestore();
    });
  });

  describe('generateRollbackGuidance', () => {
    it('should generate rollback guidance with correct steps', () => {
      const registry = createTestRegistry();

      // Add target IDs to simulate created items
      const entryA = registry.entries.get('id-a');
      if (entryA) {
        entryA.targetId = 'target-id-a';
      }

      const resolution: ReferenceResolutionResult = {
        totalDiscovered: 3,
        matchedCount: 0,
        toCreateCount: 3,
        unresolvedCount: 0,
        externalCount: 0,
        circularGroups: [],
        registry,
        creationOrder: ['id-c', 'id-b', 'id-a'],
      };

      const guidance = generateRollbackGuidance(registry, resolution);

      expect(guidance.title).toContain('Rollback');
      expect(guidance.prerequisites.length).toBeGreaterThan(0);
      expect(guidance.steps.length).toBeGreaterThan(0);
      expect(guidance.warnings.length).toBeGreaterThan(0);
    });

    it('should include delivery key warnings when applicable', () => {
      const registry = createReferenceRegistry();

      // Create item with delivery key
      const itemWithKey = createMockContentItem('id-a', 'Item A', 'https://schema.com/a.json', {
        deliveryKey: 'my-delivery-key',
      });
      registerItem(registry, itemWithKey, []);

      // Set target ID
      const entry = registry.entries.get('id-a');
      if (entry) {
        entry.targetId = 'target-id-a';
      }

      const resolution: ReferenceResolutionResult = {
        totalDiscovered: 1,
        matchedCount: 0,
        toCreateCount: 1,
        unresolvedCount: 0,
        externalCount: 0,
        circularGroups: [],
        registry,
        creationOrder: ['id-a'],
      };

      const guidance = generateRollbackGuidance(registry, resolution);

      // Should have a step for delivery keys
      const deliveryKeyStep = guidance.steps.find(
        s => s.action.toLowerCase().includes('delivery key')
      );
      expect(deliveryKeyStep).toBeDefined();
    });

    it('should include circular reference warnings when applicable', () => {
      const registry = createTestRegistry();

      const resolution: ReferenceResolutionResult = {
        totalDiscovered: 3,
        matchedCount: 0,
        toCreateCount: 3,
        unresolvedCount: 0,
        externalCount: 0,
        circularGroups: [['id-a', 'id-b']],
        registry,
        creationOrder: ['id-c', 'id-b', 'id-a'],
      };

      const guidance = generateRollbackGuidance(registry, resolution);

      const circularWarning = guidance.warnings.find(w =>
        w.toLowerCase().includes('circular')
      );
      expect(circularWarning).toBeDefined();
    });
  });

  describe('formatRollbackGuidanceAsMarkdown', () => {
    it('should format rollback guidance as markdown', () => {
      const guidance: RollbackGuidance = {
        title: 'Test Rollback Guide',
        introduction: 'Test introduction',
        prerequisites: ['Prereq 1', 'Prereq 2'],
        steps: [
          {
            step: 1,
            action: 'First step',
            warning: 'First warning',
          },
          {
            step: 2,
            action: 'Second step',
            command: 'echo test',
          },
        ],
        warnings: ['Warning 1', 'Warning 2'],
        generatedAt: '2026-03-15T12:00:00Z',
      };

      const markdown = formatRollbackGuidanceAsMarkdown(guidance);

      expect(markdown).toContain('# Test Rollback Guide');
      expect(markdown).toContain('## Prerequisites');
      expect(markdown).toContain('## Rollback Steps');
      expect(markdown).toContain('### Step 1');
      expect(markdown).toContain('First step');
      expect(markdown).toContain('## Important Warnings');
      expect(markdown).toContain('Warning 1');
    });
  });

  describe('saveReportToFile', () => {
    it('should save report to file with timestamp', () => {
      const report: ReferenceReport = {
        summary: {
          totalDiscovered: 1,
          matchedCount: 0,
          createdCount: 0,
          unresolvedCount: 0,
          externalCount: 0,
          circularGroupCount: 0,
          phase1Count: 0,
          phase2Count: 0,
        },
        discovered: [],
        matched: [],
        created: [],
        unresolved: [],
        external: [],
        circularGroups: [],
        generatedAt: '2026-03-15T12:00:00Z',
      };

      const filePath = saveReportToFile(report, 'test-report', '/tmp/reports');

      expect(filePath).toContain('test-report');
      expect(filePath).toContain('.md');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('saveRollbackGuidanceToFile', () => {
    it('should save rollback guidance to file with timestamp', () => {
      const guidance: RollbackGuidance = {
        title: 'Test Guide',
        introduction: 'Test',
        prerequisites: [],
        steps: [],
        warnings: [],
        generatedAt: '2026-03-15T12:00:00Z',
      };

      const filePath = saveRollbackGuidanceToFile(guidance, 'test-rollback', '/tmp/reports');

      expect(filePath).toContain('test-rollback');
      expect(filePath).toContain('.md');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
