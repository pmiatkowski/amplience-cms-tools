import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createReferenceRegistry, recordMapping } from './content-reference-mapping';
import {
  extractPublishingStatus,
  replicatePublishingStatus,
  publishItem,
  type PublishingStatus,
} from './content-reference-publisher';
import type { AmplienceService } from '../amplience-service';
import type { ReferenceRegistry } from './types';

// Mock AmplienceService
const createMockService = (): AmplienceService => {
  return {
    publishContentItem: vi.fn(),
  } as unknown as AmplienceService;
};

// Helper to create mock content item with publishing status
const createMockItem = (
  id: string,
  publishingStatus?: 'LATEST' | 'EARLY' | undefined
): Amplience.ContentItemWithDetails => {
  return {
    id,
    label: `Item ${id}`,
    body: {},
    status: 'ACTIVE',
    version: 1,
    publishingStatus,
  } as Amplience.ContentItemWithDetails;
};

describe('extractPublishingStatus', () => {
  it('should identify LATEST items', () => {
    const items = [createMockItem('item-1', 'LATEST')];

    const statusMap = extractPublishingStatus(items);

    expect(statusMap.get('item-1')).toBe('LATEST');
  });

  it('should identify EARLY items', () => {
    const items = [createMockItem('item-1', 'EARLY')];

    const statusMap = extractPublishingStatus(items);

    expect(statusMap.get('item-1')).toBe('EARLY');
  });

  it('should identify UNPUBLISHED items', () => {
    const items = [createMockItem('item-1', undefined)];

    const statusMap = extractPublishingStatus(items);

    expect(statusMap.get('item-1')).toBe('UNPUBLISHED');
  });

  it('should handle items without publishingStatus', () => {
    const items = [createMockItem('item-1')];

    const statusMap = extractPublishingStatus(items);

    expect(statusMap.get('item-1')).toBe('UNPUBLISHED');
  });

  it('should handle multiple items with different statuses', () => {
    const items = [
      createMockItem('item-1', 'LATEST'),
      createMockItem('item-2', 'EARLY'),
      createMockItem('item-3', undefined),
    ];

    const statusMap = extractPublishingStatus(items);

    expect(statusMap.get('item-1')).toBe('LATEST');
    expect(statusMap.get('item-2')).toBe('EARLY');
    expect(statusMap.get('item-3')).toBe('UNPUBLISHED');
  });
});

describe('replicatePublishingStatus', () => {
  let mockTargetService: AmplienceService;
  let registry: ReferenceRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTargetService = createMockService();
    registry = createReferenceRegistry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should publish LATEST items', async () => {
    recordMapping(registry, 'source-1', 'target-1');
    const sourceStatusMap = new Map<string, PublishingStatus>();
    sourceStatusMap.set('source-1', 'LATEST');

    vi.mocked(mockTargetService.publishContentItem).mockResolvedValue({ success: true });

    const result = await replicatePublishingStatus(
      mockTargetService,
      registry,
      sourceStatusMap
    );

    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockTargetService.publishContentItem).toHaveBeenCalledWith('target-1');
  });

  it('should publish EARLY items', async () => {
    recordMapping(registry, 'source-1', 'target-1');
    const sourceStatusMap = new Map<string, PublishingStatus>();
    sourceStatusMap.set('source-1', 'EARLY');

    vi.mocked(mockTargetService.publishContentItem).mockResolvedValue({ success: true });

    const result = await replicatePublishingStatus(
      mockTargetService,
      registry,
      sourceStatusMap
    );

    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('should skip UNPUBLISHED items', async () => {
    recordMapping(registry, 'source-1', 'target-1');
    const sourceStatusMap = new Map<string, PublishingStatus>();
    sourceStatusMap.set('source-1', 'UNPUBLISHED');

    const result = await replicatePublishingStatus(
      mockTargetService,
      registry,
      sourceStatusMap
    );

    expect(result.published).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockTargetService.publishContentItem).not.toHaveBeenCalled();
  });

  it('should handle partial publish failures', async () => {
    recordMapping(registry, 'source-1', 'target-1');
    recordMapping(registry, 'source-2', 'target-2');
    const sourceStatusMap = new Map<string, PublishingStatus>();
    sourceStatusMap.set('source-1', 'LATEST');
    sourceStatusMap.set('source-2', 'LATEST');

    vi.mocked(mockTargetService.publishContentItem)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'Publish failed' });

    const result = await replicatePublishingStatus(
      mockTargetService,
      registry,
      sourceStatusMap
    );

    expect(result.published).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].itemId).toBe('target-2');
  });

  it('should call progress callback', async () => {
    recordMapping(registry, 'source-1', 'target-1');
    const sourceStatusMap = new Map<string, PublishingStatus>();
    sourceStatusMap.set('source-1', 'LATEST');
    const progressCallback = vi.fn();

    vi.mocked(mockTargetService.publishContentItem).mockResolvedValue({ success: true });

    await replicatePublishingStatus(
      mockTargetService,
      registry,
      sourceStatusMap,
      progressCallback
    );

    expect(progressCallback).toHaveBeenCalledWith(1, 1);
  });

  it('should handle exceptions during publish', async () => {
    recordMapping(registry, 'source-1', 'target-1');
    const sourceStatusMap = new Map<string, PublishingStatus>();
    sourceStatusMap.set('source-1', 'LATEST');

    vi.mocked(mockTargetService.publishContentItem).mockRejectedValue(
      new Error('Network error')
    );

    const result = await replicatePublishingStatus(
      mockTargetService,
      registry,
      sourceStatusMap
    );

    expect(result.published).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0].error).toBe('Network error');
  });
});

describe('publishItem', () => {
  let mockTargetService: AmplienceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTargetService = createMockService();
  });

  it('should return success when publish succeeds', async () => {
    vi.mocked(mockTargetService.publishContentItem).mockResolvedValue({ success: true });

    const result = await publishItem(mockTargetService, 'item-1');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return error when publish fails', async () => {
    vi.mocked(mockTargetService.publishContentItem).mockResolvedValue({
      success: false,
      error: 'Item not found',
    });

    const result = await publishItem(mockTargetService, 'item-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found');
  });

  it('should handle exceptions', async () => {
    vi.mocked(mockTargetService.publishContentItem).mockRejectedValue(
      new Error('Unexpected error')
    );

    const result = await publishItem(mockTargetService, 'item-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unexpected error');
  });
});
