import fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { FullHierarchyCopyResult } from '~/services/actions/full-hierarchy-copy';
import { generateFullHierarchyCopyReport } from './report';

vi.mock('node:fs');

describe('generateFullHierarchyCopyReport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate report with all sections', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    const result: FullHierarchyCopyResult = {
      itemsCreated: [{ sourceId: 's1', targetId: 't1', label: 'Item 1', action: 'created' }],
      itemsSkipped: [
        {
          sourceId: 's2',
          targetId: 't2',
          label: 'Item 2',
          reason: 'duplicate-skipped',
        },
      ],
      itemsFailed: [{ sourceId: 's3', label: 'Item 3', error: 'Content type missing' }],
      itemsPublished: [{ sourceId: 's1', targetId: 't1' }],
      folderMappings: new Map([['folder-1', 'folder-2']]),
      discoveryWarnings: [
        {
          type: 'dangling-reference',
          sourceItemId: 's1',
          sourceItemLabel: 'Item 1',
          referencedId: 'deleted-id',
          message: 'Referenced item not found',
        },
      ],
      validationResult: { valid: true, errors: [], schemasChecked: 3 },
      duration: 5000,
    };

    const reportPath = generateFullHierarchyCopyReport(result, {
      sourceHubName: 'DEV',
      targetHubName: 'PROD',
      sourceRepositoryName: 'Content',
      targetRepositoryName: 'Content',
      duplicateStrategy: 'skip',
      targetLocale: 'en-GB',
    });

    expect(reportPath).toMatch(/reports[/\\]full-hierarchy-copy-.*\.md/);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

    const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    expect(writtenContent).toContain('Full Hierarchy Copy Report');
    expect(writtenContent).toContain('DEV');
    expect(writtenContent).toContain('Items Created/Updated');
    expect(writtenContent).toContain('Items Skipped');
    expect(writtenContent).toContain('Items Failed');
    expect(writtenContent).toContain('Discovery Warnings');
  });
});
