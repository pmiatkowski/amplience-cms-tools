import inquirer from 'inquirer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promptForProtectedEnvironment } from './prompt-for-protected-environment';

const protectedHub = {
  name: 'Production',
  envKey: 'PROD',
  hubId: 'production-hub-id',
  patToken: 'pat-token',
  protected: true,
} satisfies Amplience.HubConfig;

const repository = {
  id: 'repository-id',
  name: 'content-production',
  label: 'Content Production',
} as Amplience.ContentRepository;

describe('promptForProtectedEnvironment', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- inquirer v10 has an overloaded prompt signature
  let inquirerPromptSpy: any;

  beforeEach(() => {
    inquirerPromptSpy = vi.spyOn(inquirer, 'prompt').mockResolvedValue({} as never);
  });

  afterEach(() => {
    inquirerPromptSpy.mockRestore();
  });

  it('should skip confirmation when protected is false', async () => {
    await promptForProtectedEnvironment({ ...protectedHub, protected: false });

    expect(inquirerPromptSpy).not.toHaveBeenCalled();
  });

  it('should skip confirmation when protected is undefined', async () => {
    const hubWithoutProtection: Amplience.HubConfig = {
      name: protectedHub.name,
      envKey: protectedHub.envKey,
      hubId: protectedHub.hubId,
      patToken: protectedHub.patToken,
    };

    await promptForProtectedEnvironment(hubWithoutProtection);

    expect(inquirerPromptSpy).not.toHaveBeenCalled();
  });

  it('should require the exact hub name for a protected hub', async () => {
    await promptForProtectedEnvironment(protectedHub);

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'input',
        name: 'hubName',
        message: expect.stringContaining('Production'),
      }),
    ]);

    const [questions] = inquirerPromptSpy.mock.calls[0];
    expect(questions[0].validate('Production')).toBe(true);
    expect(questions[0].validate('production')).toBe('Hub name does not match "Production".');
  });

  it('should require hub and repository names for a protected repository operation', async () => {
    await promptForProtectedEnvironment(protectedHub, repository);

    const [questions] = inquirerPromptSpy.mock.calls[0];
    expect(questions).toEqual([
      expect.objectContaining({
        type: 'input',
        name: 'hubName',
        message: expect.stringContaining('Production'),
      }),
      expect.objectContaining({
        type: 'input',
        name: 'repositoryName',
        message: expect.stringContaining('content-production'),
      }),
    ]);
    expect(questions[0].validate('Production')).toBe(true);
    expect(questions[1].validate('content-production')).toBe(true);
    expect(questions[1].validate('Content Production')).toBe(
      'Repository name does not match "content-production".'
    );
  });
});
