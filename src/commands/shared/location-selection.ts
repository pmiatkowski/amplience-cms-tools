import {
  promptForConfirmation,
  promptForFolder,
  promptForHub,
  promptForRepository,
} from '~/prompts';
import { AmplienceService } from '~/services/amplience-service';

/**
 * Display operation confirmation with consistent formatting
 * @param summary Operation summary data
 * @param confirmationMessage Custom confirmation message
 * @param includeDestructiveWarning Whether to include warning about destructive operations
 * @returns Promise resolving to user's confirmation
 */
export async function confirmOperation(
  summary: OperationSummary,
  confirmationMessage: string,
  includeDestructiveWarning: boolean = true
): Promise<boolean> {
  console.log('\n📊 Operation Summary:');
  console.log(
    `Source: ${summary.sourceHub} > ${summary.sourceRepository} > ${summary.sourceFolder}`
  );
  console.log(
    `Target: ${summary.targetHub} > ${summary.targetRepository} > ${summary.targetFolder}`
  );

  // Display additional summary data
  for (const [key, value] of Object.entries(summary)) {
    if (
      ![
        'sourceHub',
        'sourceRepository',
        'sourceFolder',
        'targetHub',
        'targetRepository',
        'targetFolder',
      ].includes(key)
    ) {
      console.log(`${key}: ${value}`);
    }
  }

  if (includeDestructiveWarning) {
    console.log('\n⚠️  This operation will create new content items in the target location.');
  }

  return await promptForConfirmation(confirmationMessage, true);
}

/**
 * Create a folder mapping from source to target, handling repository root case
 * @param sourceFolder Source folder (null means repository root)
 * @param targetFolder Target folder (null means repository root)
 * @returns Map with folder ID mappings
 */
export function createFolderMapping(
  sourceFolder: Amplience.Folder | null,
  targetFolder: Amplience.Folder | null
): Map<string, string> {
  const folderMapping = new Map<string, string>();

  if (sourceFolder && targetFolder) {
    folderMapping.set(sourceFolder.id, targetFolder.id);
  }

  // Also map empty string (repository root) to target folder or repository root
  if (targetFolder) {
    folderMapping.set('', targetFolder.id);
  }

  return folderMapping;
}

export type OperationSummary = {
  sourceFolder: string;
  sourceHub: string;
  sourceRepository: string;
  targetFolder: string;
  targetHub: string;
  targetRepository: string;
  [key: string]: string | number;
};

/**
 * Unified helper for selecting source location (hub + repository + folder)
 * @param hubConfigs Available hub configurations
 * @param folderPromptMessage Custom message for folder selection
 * @param allowNoFolder Whether to allow selecting repository root (no folder)
 * @returns Promise resolving to the selected source location
 */
export async function selectSourceLocation(
  hubConfigs: Amplience.HubConfig[],
  folderPromptMessage: string = 'Select source folder:',
  allowNoFolder: boolean = false
): Promise<SourceLocation> {
  console.log('📂 Select Source Location:');

  // Prompt for source hub
  const hub = await promptForHub(hubConfigs);
  const service = new AmplienceService(hub);

  // Get source repositories
  const repositories = await service.getRepositories();
  if (repositories.length === 0) {
    throw new Error('No repositories found in the source hub.');
  }

  // Prompt for source repository
  const repository = await promptForRepository(repositories);

  // Prompt for source folder
  const folder = await promptForFolder(service, repository.id, folderPromptMessage, allowNoFolder);

  return { hub, service, repository, folder };
}

/**
 * Unified helper for selecting target location (hub + repository + folder)
 * @param hubConfigs Available hub configurations
 * @param folderPromptMessage Custom message for folder selection
 * @param allowNoFolder Whether to allow selecting repository root (no folder)
 * @returns Promise resolving to the selected target location
 */
export async function selectTargetLocation(
  hubConfigs: Amplience.HubConfig[],
  folderPromptMessage: string = 'Select target folder:',
  allowNoFolder: boolean = true
): Promise<TargetLocation> {
  console.log('\n🎯 Select Target Location:');

  // Prompt for target hub
  const hub = await promptForHub(hubConfigs);
  const service = new AmplienceService(hub);

  // Get target repositories
  const repositories = await service.getRepositories();
  if (repositories.length === 0) {
    throw new Error('No repositories found in the target hub.');
  }

  // Prompt for target repository
  const repository = await promptForRepository(repositories);

  // Prompt for target folder
  const folder = await promptForFolder(service, repository.id, folderPromptMessage, allowNoFolder);

  return { hub, service, repository, folder };
}

export type SourceLocation = {
  folder: Amplience.Folder | null;
  hub: Amplience.HubConfig;
  repository: Amplience.ContentRepository;
  service: AmplienceService;
};

export type TargetLocation = {
  folder: Amplience.Folder | null;
  hub: Amplience.HubConfig;
  repository: Amplience.ContentRepository;
  service: AmplienceService;
};
