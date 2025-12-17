import * as fs from 'fs/promises';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateMissingHierarchiesReport,
  matchHierarchies,
  saveMissingHierarchiesReport,
} from './utils';
import type { MissingHierarchy, SourceHierarchy } from './types';

// Mock fs/promises
vi.mock('fs/promises');

describe('Bulk Sync Hierarchies Utils', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const createContentItem = (
    id: string,
    deliveryKey: string,
    schemaId: string,
    label: string
  ): Amplience.ContentItem =>
    ({
      id,
      label,
      body: {
        _meta: {
          deliveryKey,
          schema: schemaId,
        },
      },
    }) as Amplience.ContentItem;

  describe('matchHierarchies', () => {
    describe('Hierarchy Matching', () => {
      it('should match hierarchies by delivery key AND schema ID', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            allItems: [
              createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            ],
            contentCount: 1,
          },
        ];

        const targetItems = [
          createContentItem('target-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
        ];

        const result = matchHierarchies(sourceItems, targetItems);

        expect(result.matched).toHaveLength(1);
        expect(result.matched[0].source.item.id).toBe('source-1');
        expect(result.matched[0].target.item.id).toBe('target-1');
        expect(result.missing).toHaveLength(0);
      });

      it('should not match if delivery key matches but schema ID differs', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            allItems: [
              createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            ],
            contentCount: 1,
          },
        ];

        const targetItems = [
          createContentItem('target-1', 'nav-main', 'https://schema.com/different', 'Main Nav'),
        ];

        const result = matchHierarchies(sourceItems, targetItems);

        expect(result.matched).toHaveLength(0);
        expect(result.missing).toHaveLength(1);
        expect(result.missing[0].deliveryKey).toBe('nav-main');
        expect(result.missing[0].schemaId).toBe('https://schema.com/nav');
      });

      it('should not match if schema ID matches but delivery key differs', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            allItems: [
              createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            ],
            contentCount: 1,
          },
        ];

        const targetItems = [
          createContentItem('target-1', 'nav-footer', 'https://schema.com/nav', 'Footer Nav'),
        ];

        const result = matchHierarchies(sourceItems, targetItems);

        expect(result.matched).toHaveLength(0);
        expect(result.missing).toHaveLength(1);
      });

      it('should return matched pairs with source and target data', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            allItems: [
              createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
              createContentItem('source-2', 'nav-child', 'https://schema.com/nav', 'Child'),
            ],
            contentCount: 2,
          },
        ];

        const targetItems = [
          createContentItem('target-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
          createContentItem('target-2', 'other-item', 'https://schema.com/other', 'Other'),
        ];

        const result = matchHierarchies(sourceItems, targetItems);

        expect(result.matched).toHaveLength(1);
        expect(result.matched[0].source.allItems).toHaveLength(2);
        expect(result.matched[0].target.allItems).toEqual(targetItems);
      });

      it('should identify missing hierarchies (no match in target)', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            allItems: [
              createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            ],
            contentCount: 5,
          },
          {
            item: createContentItem(
              'source-2',
              'nav-footer',
              'https://schema.com/nav',
              'Footer Nav'
            ),
            allItems: [
              createContentItem('source-2', 'nav-footer', 'https://schema.com/nav', 'Footer Nav'),
            ],
            contentCount: 3,
          },
        ];

        const targetItems = [
          createContentItem('target-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
        ];

        const result = matchHierarchies(sourceItems, targetItems);

        expect(result.matched).toHaveLength(1);
        expect(result.missing).toHaveLength(1);
        expect(result.missing[0]).toEqual({
          deliveryKey: 'nav-footer',
          schemaId: 'https://schema.com/nav',
          name: 'Footer Nav',
          contentCount: 3,
        });
      });

      it('should handle empty source list', () => {
        const result = matchHierarchies(
          [],
          [createContentItem('target-1', 'nav-main', 'https://schema.com/nav', 'Main Nav')]
        );

        expect(result.matched).toHaveLength(0);
        expect(result.missing).toHaveLength(0);
      });

      it('should handle empty target list', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            allItems: [
              createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            ],
            contentCount: 1,
          },
        ];

        const result = matchHierarchies(sourceItems, []);

        expect(result.matched).toHaveLength(0);
        expect(result.missing).toHaveLength(1);
      });

      it('should handle no matches found', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            allItems: [
              createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            ],
            contentCount: 1,
          },
        ];

        const targetItems = [
          createContentItem('target-1', 'different-key', 'https://schema.com/other', 'Different'),
        ];

        const result = matchHierarchies(sourceItems, targetItems);

        expect(result.matched).toHaveLength(0);
        expect(result.missing).toHaveLength(1);
      });
    });

    describe('Edge Cases', () => {
      it('should handle duplicate delivery keys in source', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: createContentItem(
              'source-1',
              'nav-main',
              'https://schema.com/nav',
              'Main Nav V1'
            ),
            allItems: [
              createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav V1'),
            ],
            contentCount: 1,
          },
          {
            item: createContentItem(
              'source-2',
              'nav-main',
              'https://schema.com/nav',
              'Main Nav V2'
            ),
            allItems: [
              createContentItem('source-2', 'nav-main', 'https://schema.com/nav', 'Main Nav V2'),
            ],
            contentCount: 1,
          },
        ];

        const targetItems = [
          createContentItem('target-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
        ];

        const result = matchHierarchies(sourceItems, targetItems);

        // Both should match to the same target item
        expect(result.matched).toHaveLength(2);
        expect(result.matched[0].target.item.id).toBe('target-1');
        expect(result.matched[1].target.item.id).toBe('target-1');
      });

      it('should handle missing delivery key field', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: {
              id: 'source-1',
              label: 'No Delivery Key',
              body: {
                _meta: {
                  schema: 'https://schema.com/nav',
                },
              },
            } as Amplience.ContentItem,
            allItems: [],
            contentCount: 1,
          },
        ];

        const targetItems = [
          createContentItem('target-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
        ];

        const result = matchHierarchies(sourceItems, targetItems);

        expect(result.matched).toHaveLength(0);
        expect(result.missing).toHaveLength(1);
        expect(result.missing[0].deliveryKey).toBe('unknown');
      });

      it('should handle missing schema ID field', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: {
              id: 'source-1',
              label: 'No Schema',
              body: {
                _meta: {
                  deliveryKey: 'nav-main',
                },
              },
            } as Amplience.ContentItem,
            allItems: [],
            contentCount: 1,
          },
        ];

        const targetItems = [
          createContentItem('target-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
        ];

        const result = matchHierarchies(sourceItems, targetItems);

        expect(result.matched).toHaveLength(0);
        expect(result.missing).toHaveLength(1);
        expect(result.missing[0].schemaId).toBe('unknown');
      });

      it('should count items in hierarchy tree correctly', () => {
        const sourceItems: SourceHierarchy[] = [
          {
            item: createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
            allItems: [
              createContentItem('source-1', 'nav-main', 'https://schema.com/nav', 'Main Nav'),
              createContentItem('source-2', 'child-1', 'https://schema.com/nav', 'Child 1'),
              createContentItem('source-3', 'child-2', 'https://schema.com/nav', 'Child 2'),
            ],
            contentCount: 3,
          },
        ];

        const targetItems: Amplience.ContentItem[] = [];

        const result = matchHierarchies(sourceItems, targetItems);

        expect(result.missing).toHaveLength(1);
        expect(result.missing[0].contentCount).toBe(3);
      });
    });
  });

  describe('generateMissingHierarchiesReport', () => {
    describe('Missing Hierarchies Report', () => {
      it('should generate report with delivery key, schema ID, name', () => {
        const missing: MissingHierarchy[] = [
          {
            deliveryKey: 'nav-main',
            schemaId: 'https://schema.com/nav',
            name: 'Main Navigation',
            contentCount: 5,
          },
        ];

        const report = generateMissingHierarchiesReport(missing);

        expect(report).toContain('nav-main');
        expect(report).toContain('https://schema.com/nav');
        expect(report).toContain('Main Navigation');
      });

      it('should include content count for each missing hierarchy', () => {
        const missing: MissingHierarchy[] = [
          {
            deliveryKey: 'nav-main',
            schemaId: 'https://schema.com/nav',
            name: 'Main Navigation',
            contentCount: 12,
          },
        ];

        const report = generateMissingHierarchiesReport(missing);

        expect(report).toContain('12');
      });

      it('should format report as markdown', () => {
        const missing: MissingHierarchy[] = [
          {
            deliveryKey: 'nav-main',
            schemaId: 'https://schema.com/nav',
            name: 'Main Navigation',
            contentCount: 5,
          },
        ];

        const report = generateMissingHierarchiesReport(missing);

        // Check for markdown headers
        expect(report).toContain('#');
        // Check for markdown list items
        expect(report).toMatch(/[-*]/);
      });

      it('should handle hierarchies without delivery keys', () => {
        const missing: MissingHierarchy[] = [
          {
            deliveryKey: 'unknown',
            schemaId: 'https://schema.com/nav',
            name: 'No Delivery Key',
            contentCount: 3,
          },
        ];

        const report = generateMissingHierarchiesReport(missing);

        expect(report).toContain('unknown');
      });

      it('should handle hierarchies without schema IDs', () => {
        const missing: MissingHierarchy[] = [
          {
            deliveryKey: 'nav-main',
            schemaId: 'unknown',
            name: 'No Schema',
            contentCount: 3,
          },
        ];

        const report = generateMissingHierarchiesReport(missing);

        expect(report).toContain('unknown');
      });

      it('should handle multiple missing hierarchies', () => {
        const missing: MissingHierarchy[] = [
          {
            deliveryKey: 'nav-main',
            schemaId: 'https://schema.com/nav',
            name: 'Main Navigation',
            contentCount: 5,
          },
          {
            deliveryKey: 'nav-footer',
            schemaId: 'https://schema.com/nav',
            name: 'Footer Navigation',
            contentCount: 3,
          },
          {
            deliveryKey: 'cat-products',
            schemaId: 'https://schema.com/category',
            name: 'Product Categories',
            contentCount: 12,
          },
        ];

        const report = generateMissingHierarchiesReport(missing);

        expect(report).toContain('nav-main');
        expect(report).toContain('nav-footer');
        expect(report).toContain('cat-products');
        expect(report).toContain('5');
        expect(report).toContain('3');
        expect(report).toContain('12');
      });

      it('should handle empty missing hierarchies list', () => {
        const report = generateMissingHierarchiesReport([]);

        expect(report).toContain('No missing hierarchies');
      });
    });
  });

  describe('saveMissingHierarchiesReport', () => {
    beforeEach(() => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    describe('Report Saving', () => {
      it('should save report to reports folder with timestamp', async () => {
        const report = '# Missing Hierarchies\nTest report';

        const filePath = await saveMissingHierarchiesReport(report);

        expect(filePath).toMatch(
          /reports[/\\]missing-hierarchies-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.md/
        );
        expect(fs.mkdir).toHaveBeenCalledWith(
          expect.stringContaining('reports'),
          expect.objectContaining({ recursive: true })
        );
        expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), report, 'utf-8');
      });

      it('should create filename with format: missing-hierarchies-YYYY-MM-DD-HH-mm-ss.md', async () => {
        const report = 'Test report';

        const filePath = await saveMissingHierarchiesReport(report);

        const filename = path.basename(filePath);
        expect(filename).toMatch(/^missing-hierarchies-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.md$/);
      });

      it('should handle file system errors gracefully', async () => {
        const report = 'Test report';
        vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('Permission denied'));

        await expect(saveMissingHierarchiesReport(report)).rejects.toThrow('Permission denied');
      });

      it('should create reports directory if it does not exist', async () => {
        const report = 'Test report';

        await saveMissingHierarchiesReport(report);

        expect(fs.mkdir).toHaveBeenCalledWith(
          expect.stringContaining('reports'),
          expect.objectContaining({ recursive: true })
        );
      });
    });
  });
});
