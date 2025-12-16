import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promptForHierarchyFilters } from './prompt-for-hierarchy-filters';

vi.mock('inquirer');

describe('promptForHierarchyFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt for schema ID, label, and delivery key filters', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      schemaId: 'https://schema.com/hierarchy',
      label: 'nav',
      deliveryKey: 'main',
    });

    await promptForHierarchyFilters();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'input',
        name: 'schemaId',
        message: 'Filter by schema ID (leave blank for any):',
      }),
      expect.objectContaining({
        type: 'input',
        name: 'label',
        message: 'Filter by label (partial match, leave blank for any):',
      }),
      expect.objectContaining({
        type: 'input',
        name: 'deliveryKey',
        message: 'Filter by delivery key (partial match, leave blank for any):',
      }),
    ]);
  });

  it('should return filter criteria when all filters provided', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      schemaId: 'https://schema.com/hierarchy',
      label: 'navigation',
      deliveryKey: 'nav-main',
    });

    const result = await promptForHierarchyFilters();

    expect(result).toEqual({
      schemaId: 'https://schema.com/hierarchy',
      label: 'navigation',
      deliveryKey: 'nav-main',
    });
  });

  it('should return undefined for empty filter values', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      schemaId: '',
      label: '',
      deliveryKey: '',
    });

    const result = await promptForHierarchyFilters();

    expect(result).toEqual({
      schemaId: undefined,
      label: undefined,
      deliveryKey: undefined,
    });
  });

  it('should return partial filters when only some filters provided', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      schemaId: 'https://schema.com/hierarchy',
      label: '',
      deliveryKey: 'nav',
    });

    const result = await promptForHierarchyFilters();

    expect(result).toEqual({
      schemaId: 'https://schema.com/hierarchy',
      label: undefined,
      deliveryKey: 'nav',
    });
  });

  it('should handle only schema ID filter', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      schemaId: 'https://schema.com/category',
      label: '',
      deliveryKey: '',
    });

    const result = await promptForHierarchyFilters();

    expect(result).toEqual({
      schemaId: 'https://schema.com/category',
      label: undefined,
      deliveryKey: undefined,
    });
  });

  it('should handle only label filter', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      schemaId: '',
      label: 'footer',
      deliveryKey: '',
    });

    const result = await promptForHierarchyFilters();

    expect(result).toEqual({
      schemaId: undefined,
      label: 'footer',
      deliveryKey: undefined,
    });
  });

  it('should handle only delivery key filter', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      schemaId: '',
      label: '',
      deliveryKey: 'blog',
    });

    const result = await promptForHierarchyFilters();

    expect(result).toEqual({
      schemaId: undefined,
      label: undefined,
      deliveryKey: 'blog',
    });
  });
});
