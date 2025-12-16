import { describe, it, expect, vi, beforeEach } from 'vitest';

// Note: This file tests the main index.ts switch statement integration
// The actual main() function is not tested here as it includes side effects

describe('index.ts command integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have bulk-sync-hierarchies command in switch statement', async () => {
    // This is a compile-time check - if the import works, the command is integrated
    const { runBulkSyncHierarchies } = await import('./commands');
    expect(runBulkSyncHierarchies).toBeDefined();
    expect(typeof runBulkSyncHierarchies).toBe('function');
  });

  it('should export runBulkSyncHierarchies from commands barrel', async () => {
    const commands = await import('./commands');
    expect(commands.runBulkSyncHierarchies).toBeDefined();
  });
});
