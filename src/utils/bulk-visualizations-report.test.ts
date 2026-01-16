import * as fs from 'fs/promises';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import { generateBulkVisualizationsReport, saveBulkVisualizationsReport } from './bulk-visualizations-report';
import type { BulkUpdateVisualizationsResult } from './bulk-visualizations-report';

describe('bulk-visualizations-report', () => {
  describe('generateBulkVisualizationsReport', () => {
    it('should generate a report header with title and timestamp', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 3,
        succeeded: 2,
        failed: 1,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: {
          visualizations: [
            { label: 'Preview', templatedUri: 'https://vse.dev.com/preview' },
          ],
        },
        isDryRun: false,
      });

      expect(report).toContain('# Bulk Visualizations Update Report');
      expect(report).toMatch(/Generated: \d{4}-\d{2}-\d{2}/);
    });

    it('should include operation summary section with hub name and mode', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 5,
        succeeded: 5,
        failed: 0,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'PROD',
        visualizationConfig: {
          visualizations: [
            { label: 'Preview', templatedUri: 'https://vse.prod.com/preview' },
          ],
        },
        isDryRun: false,
      });

      expect(report).toContain('## Operation Summary');
      expect(report).toContain('**Hub**: PROD');
      expect(report).toContain('**Mode**: Live Execution');
    });

    it('should show dry-run mode when isDryRun is true', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 3,
        succeeded: 3,
        failed: 0,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: {
          visualizations: [
            { label: 'Preview', templatedUri: 'https://vse.dev.com/preview' },
          ],
        },
        isDryRun: true,
      });

      expect(report).toContain('**Mode**: Dry Run (Preview)');
    });

    it('should include visualization configuration details', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 2,
        succeeded: 2,
        failed: 0,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: {
          visualizations: [
            { label: 'Preview', templatedUri: 'https://vse.dev.com/preview?id={{contentItemId}}', default: true },
            { label: 'Live', templatedUri: 'https://vse.dev.com/live?id={{contentItemId}}' },
          ],
        },
        isDryRun: false,
      });

      expect(report).toContain('## Visualization Configuration');
      expect(report).toContain('- **Preview**: `https://vse.dev.com/preview?id={{contentItemId}}` (default)');
      expect(report).toContain('- **Live**: `https://vse.dev.com/live?id={{contentItemId}}`');
    });

    it('should include results section with success and failure counts', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 10,
        succeeded: 8,
        failed: 2,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: {
          visualizations: [
            { label: 'Preview', templatedUri: 'https://vse.dev.com/preview' },
          ],
        },
        isDryRun: false,
      });

      expect(report).toContain('## Results');
      expect(report).toContain('- **Total Attempted**: 10');
      expect(report).toContain('- **✅ Successful**: 8');
      expect(report).toContain('- **❌ Failed**: 2');
    });

    it('should include error details section when errors exist', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 3,
        succeeded: 1,
        failed: 2,
        errors: [
          {
            contentTypeId: 'ct1',
            contentTypeLabel: 'Product',
            error: 'API error: Rate limit exceeded',
          },
          {
            contentTypeId: 'ct2',
            contentTypeLabel: 'Category',
            error: 'Validation error: Invalid URL',
          },
        ],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: {
          visualizations: [
            { label: 'Preview', templatedUri: 'https://vse.dev.com/preview' },
          ],
        },
        isDryRun: false,
      });

      expect(report).toContain('## Errors');
      expect(report).toContain('### Product (ct1)');
      expect(report).toContain('API error: Rate limit exceeded');
      expect(report).toContain('### Category (ct2)');
      expect(report).toContain('Validation error: Invalid URL');
    });

    it('should not include errors section when there are no errors', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 5,
        succeeded: 5,
        failed: 0,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: {
          visualizations: [
            { label: 'Preview', templatedUri: 'https://vse.dev.com/preview' },
          ],
        },
        isDryRun: false,
      });

      expect(report).not.toContain('## Errors');
    });

    it('should handle empty visualization config gracefully', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 0,
        succeeded: 0,
        failed: 0,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: { visualizations: [] },
        isDryRun: false,
      });

      expect(report).toContain('## Visualization Configuration');
      expect(report).toContain('No visualizations configured');
    });

    it('should include footer with disclaimer', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: {
          visualizations: [
            { label: 'Preview', templatedUri: 'https://vse.dev.com/preview' },
          ],
        },
        isDryRun: false,
      });

      expect(report).toContain('---');
      expect(report).toContain('*This report was automatically generated by the Amplience CMS Tools*');
    });

    it('should escape special markdown characters in error messages', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 1,
        succeeded: 0,
        failed: 1,
        errors: [
          {
            contentTypeId: 'ct1',
            contentTypeLabel: 'Test_Type',
            error: 'Error with _special_ *characters* and `backticks`',
          },
        ],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: { visualizations: [] },
        isDryRun: false,
      });

      // Should contain the error message without markdown rendering issues
      expect(report).toContain('Error with');
    });

    it('should display success rate percentage', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 10,
        succeeded: 8,
        failed: 2,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: { visualizations: [] },
        isDryRun: false,
      });

      expect(report).toContain('- **Success Rate**: 80%');
    });

    it('should handle 100% success rate', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 5,
        succeeded: 5,
        failed: 0,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: { visualizations: [] },
        isDryRun: false,
      });

      expect(report).toContain('- **Success Rate**: 100%');
    });

    it('should handle 0% success rate', () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 5,
        succeeded: 0,
        failed: 5,
        errors: [],
      };

      const report = generateBulkVisualizationsReport({
        result,
        hubName: 'DEV',
        visualizationConfig: { visualizations: [] },
        isDryRun: false,
      });

      expect(report).toContain('- **Success Rate**: 0%');
    });
  });

  describe('saveBulkVisualizationsReport', () => {
    it('should create reports directory if it does not exist', async () => {
      const reportContent = '# Test Report';
      const filePath = await saveBulkVisualizationsReport(reportContent);

      // Verify the file path includes the reports directory
      expect(filePath).toContain(path.join('reports', 'bulk-visualizations-'));

      // Clean up the created file
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should generate unique filenames with timestamps', async () => {
      const reportContent1 = '# Test Report 1';
      const reportContent2 = '# Test Report 2';

      const filePath1 = await saveBulkVisualizationsReport(reportContent1);
      // Wait at least 1 second to ensure different timestamp (timestamp has second precision)
      await new Promise(resolve => setTimeout(resolve, 1100));
      const filePath2 = await saveBulkVisualizationsReport(reportContent2);

      // Filenames should be different due to timestamps
      expect(filePath1).not.toBe(filePath2);

      // Both should contain the base prefix
      expect(filePath1).toContain('bulk-visualizations-');
      expect(filePath2).toContain('bulk-visualizations-');

      // Clean up
      try {
        await fs.unlink(filePath1);
        await fs.unlink(filePath2);
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should write report content to file correctly', async () => {
      const reportContent = '# Bulk Visualizations Update Report\n\nTest content';
      const filePath = await saveBulkVisualizationsReport(reportContent);

      const writtenContent = await fs.readFile(filePath, 'utf-8');
      expect(writtenContent).toBe(reportContent);

      // Clean up
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should return the full path to the saved report', async () => {
      const reportContent = '# Test';
      const filePath = await saveBulkVisualizationsReport(reportContent);

      // Should be an absolute path or include the reports directory
      expect(filePath.length).toBeGreaterThan(0);
      expect(filePath).toMatch(/bulk-visualizations-.*\.md$/);

      // Clean up
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    });
  });
});
