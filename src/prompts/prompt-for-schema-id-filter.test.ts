import inquirer from 'inquirer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promptForSchemaIdFilter } from './prompt-for-schema-id-filter';

describe('promptForSchemaIdFilter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vi.spyOn has complex types incompatible with inquirer v10's prompt signature
  let inquirerPromptSpy: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.AMP_DEFAULT_SCHEMA_ID;
    inquirerPromptSpy = vi
      .spyOn(inquirer, 'prompt')
      .mockResolvedValue({ schemaIdFilter: '' } as never);
  });

  afterEach(() => {
    inquirerPromptSpy.mockRestore();
    process.env = originalEnv;
  });

  it('should use provided default value', async () => {
    process.env.AMP_DEFAULT_SCHEMA_ID = 'env/.*';
    await promptForSchemaIdFilter({ defaultValue: 'content/.*' });

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        default: 'content/.*',
      }),
    ]);
  });

  it('should use env default value when no default is provided', async () => {
    process.env.AMP_DEFAULT_SCHEMA_ID = 'env/.*';

    await promptForSchemaIdFilter();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        default: 'env/.*',
      }),
    ]);
  });

  it('should return empty string when user provides empty input', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ schemaIdFilter: '' });

    const result = await promptForSchemaIdFilter();

    expect(result).toBe('');
  });

  it('should validate regex patterns and allow blank input', async () => {
    await promptForSchemaIdFilter();

    const question = inquirerPromptSpy.mock.calls[0][0][0];
    const validate = question.validate as (value: string) => boolean | string;

    expect(validate('')).toBe(true);
    expect(validate('content/.*')).toBe(true);
    expect(validate('[')).toBe('Invalid regex pattern');
  });

  it('should use the updated prompt message', async () => {
    await promptForSchemaIdFilter();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'Filter by schema ID (leave blank for any):',
      }),
    ]);
  });
});
