import { getHubConfigs } from '~/app-config';
import {
  promptForConfirmation,
  promptForDryRun,
  promptForHub,
  promptForProtectedEnvironment,
  promptForSchemaIdFilter,
} from '~/prompts';
import type {
  ContentTypeAlignmentResult,
  ExecuteContentTypeAlignmentContext,
} from '~/services/actions';
import { executeContentTypeAlignment, exportContentTypeDefinitions } from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';
import { ContentTypeService } from '~/services/content-type-service';
import {
  generateContentTypeSyncReport,
  saveContentTypeSyncReport,
} from '~/utils/content-type-sync-report';
import { validateContentTypeSyncCapabilities } from '~/utils/dc-cli-executor';
import { getHubVisualizationUrl } from '~/utils/env-validator';
import { copyContentTypeSchemas } from '../copy-content-type-schemas/copy-content-type-schemas';
import { syncContentTypeProperties } from '../sync-content-type-properties/sync-content-type-properties';
import {
  promptForContentTypeDefinitions,
  promptForContentTypeRepositories,
  promptForContentTypeRepositoryMode,
  promptForContentTypeRepositoryStrategy,
} from './prompts';
import type {
  CopyContentTypeSchemasOptions,
  CopyResult,
} from '../copy-content-type-schemas/copy-content-type-schemas';
import type {
  SyncContentTypePropertiesOptions,
  SyncResult,
} from '../sync-content-type-properties/sync-content-type-properties';

type ContentTypeAlignmentDisplayOptions = {
  sourceHubName: string;
  targetHubName: string;
  copySchemas: boolean;
  syncProperties: boolean;
  isDryRun: boolean;
};

export function displayContentTypeAlignmentPlan(
  plan: Amplience.ContentTypeAlignmentPlan,
  options: ContentTypeAlignmentDisplayOptions
): void {
  console.log('\nContent type synchronization plan');
  console.log(`Source hub: ${options.sourceHubName}`);
  console.log(`Target hub: ${options.targetHubName}`);
  console.log(`Mode: ${options.isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Repository alignment: ${plan.repositoryMode}`);
  console.log(`Copy schemas: ${options.copySchemas ? 'yes' : 'no'}`);
  console.log(`Synchronize schema properties: ${options.syncProperties ? 'yes' : 'no'}`);

  for (const item of plan.items) {
    console.log(`\n- ${item.source.settings?.label || item.contentTypeUri}`);
    console.log(`  Actions: ${item.actions.join(', ')}`);
    if (item.settingsChanges.length > 0) {
      console.log('  Settings changes:');
      for (const change of item.settingsChanges) {
        console.log(`    - ${change.setting}`);
        console.log(
          `      Current target (${options.targetHubName}): ${formatSettingValue(change.currentTargetValue)}`
        );
        const plannedLabel =
          change.setting === 'visualizations'
            ? `Planned target (from ${options.sourceHubName}, visualization origin adapted for ${options.targetHubName})`
            : `Planned target (from ${options.sourceHubName})`;
        console.log(`      ${plannedLabel}: ${formatSettingValue(change.plannedTargetValue)}`);
      }
    }
    console.log('  Repository assignments:');
    console.log(
      `    Current target (${options.targetHubName}): ${formatRepositoryList(item.target?.repositories)}`
    );
    console.log(
      `    Planned target (${plan.repositoryMode}): ${formatRepositoryList(item.desiredRepositories)}`
    );
    if (item.repositoriesToAssign.length > 0) {
      console.log(`    Assign: ${item.repositoriesToAssign.join(', ')}`);
    }
    if (item.repositoriesToUnassign.length > 0) {
      console.log(`    Unassign: ${item.repositoriesToUnassign.join(', ')}`);
    }
    if (item.repositoriesToAssign.length === 0 && item.repositoriesToUnassign.length === 0) {
      console.log('    Changes: none');
    }
  }
}

export async function executePreparedContentTypeSync(
  prepared: PreparedContentTypeSync,
  dependencies: PreparedContentTypeSyncDependencies
): Promise<PreparedContentTypeSyncResult> {
  if (prepared.isDryRun) {
    const alignment = await dependencies.executeAlignment({
      targetHub: prepared.targetHub,
      plan: prepared.alignmentPlan,
      isDryRun: true,
    });

    return {
      success: alignment.success,
      alignment,
      propertySyncStatus: prepared.syncProperties ? 'PLANNED' : 'SKIPPED_BY_USER',
    };
  }

  let schemaCopy: CopyResult | undefined;
  if (prepared.copySchemas) {
    schemaCopy = await dependencies.copySchemas({
      context: {
        sourceHub: prepared.sourceHub,
        targetHub: prepared.targetHub,
        specificSchemas: prepared.schemaIds,
        skipConfirmations: true,
        skipValidation: false,
        protectedEnvironmentConfirmed: true,
        failOnValidationErrors: true,
      },
    });

    if (!schemaCopy.success) {
      return {
        success: false,
        schemaCopy,
        propertySyncStatus: prepared.syncProperties ? 'NOT_APPLICABLE' : 'SKIPPED_BY_USER',
      };
    }

    if (dependencies.waitForSchemaIndexing) {
      await dependencies.waitForSchemaIndexing(schemaCopy.processedSchemas);
    }
  }

  const alignment = await dependencies.executeAlignment({
    targetHub: prepared.targetHub,
    plan: prepared.alignmentPlan,
    isDryRun: false,
  });

  if (!prepared.syncProperties) {
    return {
      success: alignment.success,
      ...(schemaCopy && { schemaCopy }),
      alignment,
      propertySyncStatus: 'SKIPPED_BY_USER',
    };
  }

  const candidateUris = getSuccessfulPropertySyncCandidates(prepared, alignment, schemaCopy);
  if (candidateUris.length === 0) {
    return {
      success: alignment.success,
      ...(schemaCopy && { schemaCopy }),
      alignment,
      propertySyncStatus: 'NOT_APPLICABLE',
    };
  }

  const targetContentTypes = await dependencies.listTargetContentTypes();
  const candidateSet = new Set(candidateUris);
  const targetContentTypeIds = targetContentTypes
    .filter(contentType => candidateSet.has(contentType.contentTypeUri))
    .map(contentType => contentType.id);

  if (targetContentTypeIds.length === 0) {
    return {
      success: false,
      ...(schemaCopy && { schemaCopy }),
      alignment,
      propertySyncStatus: 'NOT_APPLICABLE',
    };
  }

  const propertySync = await dependencies.syncProperties({
    context: {
      targetHub: prepared.targetHub,
      targetContentTypeIds,
      skipConfirmations: true,
      protectedEnvironmentConfirmed: true,
    },
  });

  return {
    success: alignment.success && propertySync.success,
    ...(schemaCopy && { schemaCopy }),
    alignment,
    propertySync,
    propertySyncStatus: propertySync.success ? 'SUCCEEDED' : 'FAILED',
  };
}

export async function prepareContentTypeSync(
  dependencies: PrepareContentTypeSyncDependencies
): Promise<PreparedContentTypeSync | undefined> {
  const hubs = dependencies.getHubConfigs();
  if (hubs.length < 2) {
    throw new Error('At least two configured hubs are required to synchronize content types.');
  }

  const sourceHub = await dependencies.selectHub(hubs, 'source');
  const targetHub = await dependencies.selectHub(
    hubs.filter(hub => hub.hubId !== sourceHub.hubId),
    'target'
  );
  if (sourceHub.hubId === targetHub.hubId) {
    throw new Error('Source and target hubs must be different.');
  }

  const sourceDefinitions = await dependencies.exportDefinitions(sourceHub, false);
  const targetDefinitions = await dependencies.exportDefinitions(targetHub, true);
  const schemaFilter = (await dependencies.promptSchemaFilter()).trim();
  const filteredDefinitions = filterDefinitions(sourceDefinitions, schemaFilter);
  const selectedDefinitions = await dependencies.selectDefinitions(filteredDefinitions);
  if (selectedDefinitions.length === 0) {
    return undefined;
  }

  const copySchemas = await dependencies.promptCopySchemas();
  const schemaIds = selectedDefinitions.map(definition => definition.contentTypeUri);
  if (!copySchemas) {
    const targetSchemaIds = new Set(await dependencies.getTargetSchemaIds());
    const missingSchemas = schemaIds.filter(schemaId => !targetSchemaIds.has(schemaId));
    if (missingSchemas.length > 0) {
      throw new Error(`Missing target schemas: ${missingSchemas.join(', ')}`);
    }
  }

  const targetRepositories = await dependencies.getTargetRepositories();
  const repositoryMode = await dependencies.promptRepositoryMode();
  const repositoryStrategy = await dependencies.promptRepositoryStrategy();
  const mappedDefinitions = await mapDefinitionRepositories(
    selectedDefinitions,
    targetRepositories,
    repositoryStrategy,
    dependencies.selectRepositories
  );
  const transformedDefinitions = rewriteSelectedVisualizations(
    mappedDefinitions,
    sourceHub,
    targetHub,
    dependencies.getVisualizationUrl
  );
  const contentTypeService = new ContentTypeService();
  const alignmentPlan = contentTypeService.buildSyncPlan(
    transformedDefinitions,
    targetDefinitions,
    repositoryMode
  );
  const isDryRun = await dependencies.promptDryRun();
  const hasPropertySyncCandidates =
    copySchemas ||
    alignmentPlan.items.some(item =>
      item.actions.some(action => ['CREATE', 'UPDATE_SETTINGS', 'UNARCHIVE'].includes(action))
    );
  const syncProperties = hasPropertySyncCandidates
    ? await dependencies.promptPropertySync()
    : false;

  if (
    !(await dependencies.confirmPlan(alignmentPlan, {
      sourceHubName: sourceHub.name,
      targetHubName: targetHub.name,
      copySchemas,
      syncProperties,
      isDryRun,
    }))
  ) {
    return undefined;
  }

  if (!isDryRun) {
    await dependencies.confirmProtectedEnvironment(targetHub);
  }

  return {
    sourceHub,
    targetHub,
    alignmentPlan,
    schemaIds,
    copySchemas,
    syncProperties,
    isDryRun,
  };
}

export type PrepareContentTypeSyncDependencies = {
  getHubConfigs: () => Amplience.HubConfig[];
  selectHub: (
    hubs: Amplience.HubConfig[],
    role: 'source' | 'target'
  ) => Promise<Amplience.HubConfig>;
  exportDefinitions: (
    hub: Amplience.HubConfig,
    includeArchived: boolean
  ) => Promise<Amplience.ContentTypeExportDefinition[]>;
  promptSchemaFilter: () => Promise<string>;
  selectDefinitions: (
    definitions: Amplience.ContentTypeExportDefinition[]
  ) => Promise<Amplience.ContentTypeExportDefinition[]>;
  promptCopySchemas: () => Promise<boolean>;
  getTargetSchemaIds: () => Promise<string[]>;
  getTargetRepositories: () => Promise<Amplience.ContentRepository[]>;
  promptRepositoryMode: () => Promise<Amplience.ContentTypeRepositoryMode>;
  promptRepositoryStrategy: () => Promise<'automatic' | 'manual'>;
  selectRepositories: (
    definition: Amplience.ContentTypeExportDefinition,
    repositories: Amplience.ContentRepository[]
  ) => Promise<Amplience.ContentRepository[]>;
  promptDryRun: () => Promise<boolean>;
  promptPropertySync: () => Promise<boolean>;
  confirmPlan: (
    plan: Amplience.ContentTypeAlignmentPlan,
    options: ContentTypeAlignmentDisplayOptions
  ) => Promise<boolean>;
  confirmProtectedEnvironment: (hub: Amplience.HubConfig) => Promise<void>;
  getVisualizationUrl: (envKey: string) => string;
};

export type PreparedContentTypeSync = {
  sourceHub: Amplience.HubConfig;
  targetHub: Amplience.HubConfig;
  alignmentPlan: Amplience.ContentTypeAlignmentPlan;
  schemaIds: string[];
  copySchemas: boolean;
  syncProperties: boolean;
  isDryRun: boolean;
};

export type PreparedContentTypeSyncDependencies = {
  copySchemas: (options: CopyContentTypeSchemasOptions) => Promise<CopyResult>;
  waitForSchemaIndexing?: (schemaIds: string[]) => Promise<void>;
  executeAlignment: (
    context: ExecuteContentTypeAlignmentContext
  ) => Promise<ContentTypeAlignmentResult>;
  listTargetContentTypes: () => Promise<Amplience.ContentType[]>;
  syncProperties: (options: SyncContentTypePropertiesOptions) => Promise<SyncResult>;
};

export type PreparedContentTypeSyncResult = {
  success: boolean;
  schemaCopy?: CopyResult;
  alignment?: ContentTypeAlignmentResult;
  propertySync?: SyncResult;
  propertySyncStatus: PropertySyncStatus;
};

export type PropertySyncStatus =
  | 'PLANNED'
  | 'SKIPPED_BY_USER'
  | 'NOT_APPLICABLE'
  | 'SUCCEEDED'
  | 'FAILED';

function createDefaultRuntime(): SyncContentTypesRuntime {
  let targetService: AmplienceService | undefined;

  return {
    prepare: async (): Promise<PreparedContentTypeSync | undefined> => {
      await validateContentTypeSyncCapabilities();

      return prepareContentTypeSync({
        getHubConfigs,
        selectHub: async (hubs, role) => {
          console.log(`Select the ${role.toUpperCase()} hub:`);
          const hub = await promptForHub(hubs);
          if (role === 'target') {
            targetService = new AmplienceService(hub);
          }

          return hub;
        },
        exportDefinitions: (hub, includeArchived) =>
          exportContentTypeDefinitions({ hub, includeArchived }),
        promptSchemaFilter: promptForSchemaIdFilter,
        selectDefinitions: promptForContentTypeDefinitions,
        promptCopySchemas: () =>
          promptForConfirmation(
            'Copy the selected content type schemas before aligning content types?',
            true
          ),
        getTargetSchemaIds: async () =>
          (await requireTargetService(targetService).getAllSchemas()).map(
            schema => schema.schemaId
          ),
        getTargetRepositories: () => requireTargetService(targetService).getRepositories(),
        promptRepositoryMode: promptForContentTypeRepositoryMode,
        promptRepositoryStrategy: promptForContentTypeRepositoryStrategy,
        selectRepositories: promptForContentTypeRepositories,
        promptDryRun: promptForDryRun,
        promptPropertySync: () =>
          promptForConfirmation(
            'After aligning the selected content types, synchronize them with their target schemas?',
            true
          ),
        confirmPlan: async (plan, options) => {
          displayContentTypeAlignmentPlan(plan, options);

          return promptForConfirmation(
            'Proceed with this plan? Execution will continue without further prompts.'
          );
        },
        confirmProtectedEnvironment: promptForProtectedEnvironment,
        getVisualizationUrl: getHubVisualizationUrl,
      });
    },
    execute: (prepared): Promise<PreparedContentTypeSyncResult> => {
      const service = targetService ?? new AmplienceService(prepared.targetHub);

      return executePreparedContentTypeSync(prepared, {
        copySchemas: copyContentTypeSchemas,
        waitForSchemaIndexing: async (): Promise<void> => {
          console.log('Waiting for copied schemas to be indexed...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        },
        executeAlignment: executeContentTypeAlignment,
        listTargetContentTypes: () => service.getAllContentTypes(true),
        syncProperties: syncContentTypeProperties,
      });
    },
    saveReport: async (prepared, result) =>
      saveContentTypeSyncReport(generateContentTypeSyncReport({ prepared, result })),
  };
}

function requireTargetService(service: AmplienceService | undefined): AmplienceService {
  if (!service) {
    throw new Error('Target hub service is not initialized.');
  }

  return service;
}

export async function runSyncContentTypes(
  runtime: SyncContentTypesRuntime = createDefaultRuntime()
): Promise<PreparedContentTypeSyncResult | undefined> {
  console.log('\nSync Content Types');
  console.log('Align content type settings, visualizations, and repository assignments.\n');

  const prepared = await runtime.prepare();
  if (!prepared) {
    console.log('Operation cancelled.');

    return undefined;
  }

  const result = await runtime.execute(prepared);
  displayExecutionResult(result);
  if (runtime.saveReport) {
    const reportPath = await runtime.saveReport(prepared, result);
    console.log(`Report saved to: ${reportPath}`);
  }

  return result;
}

function formatSettingValue(value: unknown): string {
  if (value === undefined) {
    return '(not set)';
  }

  return JSON.stringify(value);
}

function formatRepositoryList(repositories: string[] | undefined): string {
  if (!repositories || repositories.length === 0) {
    return 'None';
  }

  return [...repositories].sort((left, right) => left.localeCompare(right)).join(', ');
}

function displayExecutionResult(result: PreparedContentTypeSyncResult): void {
  console.log(
    `\nContent type synchronization ${result.success ? 'completed' : 'completed with errors'}.`
  );
  console.log(`Property synchronization: ${result.propertySyncStatus}`);
  if (result.alignment) {
    console.log(`Content types processed: ${result.alignment.processedContentTypes.length}`);
    console.log(`Content types failed: ${result.alignment.failedContentTypes.length}`);
  }
}

export type SyncContentTypesRuntime = {
  prepare: () => Promise<PreparedContentTypeSync | undefined>;
  execute: (prepared: PreparedContentTypeSync) => Promise<PreparedContentTypeSyncResult>;
  saveReport?: (
    prepared: PreparedContentTypeSync,
    result: PreparedContentTypeSyncResult
  ) => Promise<string>;
};

function getSuccessfulPropertySyncCandidates(
  prepared: PreparedContentTypeSync,
  alignment: ContentTypeAlignmentResult,
  schemaCopy: CopyResult | undefined
): string[] {
  const alignedUris = new Set(alignment.processedContentTypes);
  const candidates = new Set(schemaCopy?.processedSchemas ?? []);

  for (const item of prepared.alignmentPlan.items) {
    if (
      alignedUris.has(item.contentTypeUri) &&
      item.actions.some(action => ['CREATE', 'UPDATE_SETTINGS', 'UNARCHIVE'].includes(action))
    ) {
      candidates.add(item.contentTypeUri);
    }
  }

  return [...candidates].sort((left, right) => left.localeCompare(right));
}

function filterDefinitions(
  definitions: Amplience.ContentTypeExportDefinition[],
  schemaFilter: string
): Amplience.ContentTypeExportDefinition[] {
  if (!schemaFilter) {
    return definitions;
  }

  let pattern: RegExp;
  try {
    pattern = new RegExp(schemaFilter, 'i');
  } catch (error) {
    throw new Error(
      `Invalid schema filter: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return definitions.filter(definition => pattern.test(definition.contentTypeUri));
}

async function mapDefinitionRepositories(
  definitions: Amplience.ContentTypeExportDefinition[],
  targetRepositories: Amplience.ContentRepository[],
  strategy: 'automatic' | 'manual',
  selectRepositories: PrepareContentTypeSyncDependencies['selectRepositories']
): Promise<Amplience.ContentTypeExportDefinition[]> {
  if (strategy === 'manual') {
    return Promise.all(
      definitions.map(async definition => ({
        ...definition,
        repositories: (await selectRepositories(definition, targetRepositories)).map(
          repository => repository.name
        ),
      }))
    );
  }

  const targetRepositoryNames = new Set(targetRepositories.map(repository => repository.name));
  const unresolvedNames = [
    ...new Set(
      definitions
        .flatMap(definition => definition.repositories ?? [])
        .filter(repositoryName => !targetRepositoryNames.has(repositoryName))
    ),
  ].sort((left, right) => left.localeCompare(right));

  if (unresolvedNames.length > 0) {
    throw new Error(`No target repository mapping found for: ${unresolvedNames.join(', ')}`);
  }

  return definitions.map(definition => ({
    ...definition,
    repositories: [...(definition.repositories ?? [])],
  }));
}

function rewriteSelectedVisualizations(
  definitions: Amplience.ContentTypeExportDefinition[],
  sourceHub: Amplience.HubConfig,
  targetHub: Amplience.HubConfig,
  getVisualizationUrl: PrepareContentTypeSyncDependencies['getVisualizationUrl']
): Amplience.ContentTypeExportDefinition[] {
  if (!definitions.some(definition => (definition.settings?.visualizations?.length ?? 0) > 0)) {
    return definitions;
  }

  const sourceOrigin = getVisualizationUrl(sourceHub.envKey);
  const targetOrigin = getVisualizationUrl(targetHub.envKey);
  const contentTypeService = new ContentTypeService();

  return definitions.map(definition =>
    contentTypeService.rewriteVisualizationOrigins(definition, sourceOrigin, targetOrigin)
  );
}
