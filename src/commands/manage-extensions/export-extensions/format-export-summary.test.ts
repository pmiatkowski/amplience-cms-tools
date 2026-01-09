import { describe, expect, it } from 'vitest';

import type { ExportExtensionsResult } from '~/services/actions/export-extensions';

import { formatExportSummary } from './format-export-summary';

const buildResult = (overrides: Partial<ExportExtensionsResult> = {}): ExportExtensionsResult => ({
  mode: 'full-overwrite',
  outputDir: '/tmp/exports',
  totalFilesInHub: 3,
  totalFilesDownloaded: 3,
  kept: [
    {
      fileName: 'match.json',
      filePath: '/tmp/exports/match.json',
      id: 'match-id',
    },
  ],
  removed: [
    {
      fileName: 'skip.json',
      filePath: '/tmp/exports/skip.json',
      id: 'skip-id',
    },
  ],
  existing: [],
  pattern: /match/,
  filtered: true,
  ...overrides,
});

describe('formatExportSummary', () => {
  it('includes totals, kept ids, removed count, and path', () => {
    const lines = formatExportSummary(buildResult());

    expect(lines).toContain('Mode: Full overwrite');
    expect(lines).toContain('Total extensions in hub: 3');
    expect(lines).toContain('Total downloaded: 3');
    expect(lines).toContain('Kept (1): match-id');
    expect(lines).toContain('Removed: 1');
    expect(lines).toContain('Export directory: /tmp/exports');
  });

  it('handles empty exports and skipped filtering messaging', () => {
    const lines = formatExportSummary(
      buildResult({
        totalFilesInHub: 0,
        totalFilesDownloaded: 0,
        kept: [],
        removed: [],
        filtered: false,
      })
    );

    expect(lines).toContain('Mode: Full overwrite');
    expect(lines).toContain('Total extensions in hub: 0');
    expect(lines).toContain('Total downloaded: 0');
    expect(lines).toContain('Kept: 0 (no matching extensions)');
    expect(lines).toContain('Removed: 0');
    expect(lines).toContain('Operation was cancelled by user.');
  });
});
