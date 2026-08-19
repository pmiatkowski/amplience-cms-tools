import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { ContentTypeService } from '~/services/content-type-service';
import { createDcCliCommand } from '~/utils';

export type ContentTypeAlignmentCommandRunner = (
  hub: Amplience.HubConfig,
  command: string,
  args: string[]
) => Promise<{ stdout: string; stderr: string }>;

export type ContentTypeAlignmentResult = {
  success: boolean;
  dryRun: boolean;
  commandError?: string;
  processedContentTypes: string[];
  failedContentTypes: Array<{
    contentTypeUri: string;
    error: string;
  }>;
};

export async function executeContentTypeAlignment(
  context: ExecuteContentTypeAlignmentContext
): Promise<ContentTypeAlignmentResult> {
  const changedItems = context.plan.items.filter(
    item => !item.actions.includes('NO_CHANGE') && !item.actions.includes('SKIP')
  );
  const contentTypeUris = changedItems.map(item => item.contentTypeUri);
  const result: ContentTypeAlignmentResult = {
    success: true,
    dryRun: context.isDryRun,
    processedContentTypes: context.isDryRun ? contentTypeUris : [],
    failedContentTypes: [],
  };

  if (context.isDryRun || changedItems.length === 0) {
    return result;
  }

  const operationRoot =
    context.temporaryRoot ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'sync-content-types-')));
  const importDirectory = path.join(operationRoot, 'import');
  const runCommand = context.runCommand ?? runDcCliCommand;

  try {
    await fs.mkdir(importDirectory, { recursive: true });

    await Promise.all(
      changedItems.map(async (item, index) => {
        const importRecord: Amplience.ContentTypeExportDefinition = {
          contentTypeUri: item.contentTypeUri,
          ...(item.source.settings && { settings: normalizeImportSettings(item.source.settings) }),
          repositories: item.desiredRepositories,
        };
        const filename = `${String(index + 1).padStart(4, '0')}.json`;

        await fs.writeFile(
          path.join(importDirectory, filename),
          JSON.stringify(importRecord, null, 2),
          'utf-8'
        );
      })
    );

    try {
      await runCommand(context.targetHub, 'content-type import', [`"${importDirectory}"`]);
    } catch (error) {
      result.commandError = error instanceof Error ? error.message : String(error);
    }

    const exportTargetDefinitions =
      context.exportTargetDefinitions ??
      ((): Promise<Amplience.ContentTypeExportDefinition[]> =>
        exportContentTypeDefinitions({
          hub: context.targetHub,
          includeArchived: true,
        }));
    const targetDefinitions = await exportTargetDefinitions();
    const desiredDefinitions = changedItems.map(item => ({
      contentTypeUri: item.contentTypeUri,
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
      ...(item.source.settings && { settings: item.source.settings }),
      repositories: item.desiredRepositories,
    }));
    const verificationPlan = new ContentTypeService().buildSyncPlan(
      desiredDefinitions,
      targetDefinitions,
      'exact'
    );

    for (const item of verificationPlan.items) {
      if (item.actions.length === 1 && item.actions[0] === 'NO_CHANGE') {
        result.processedContentTypes.push(item.contentTypeUri);
      } else {
        result.failedContentTypes.push({
          contentTypeUri: item.contentTypeUri,
          error: [
            `Post-import verification failed: ${item.actions.join(', ')}`,
            result.commandError ? `dc-cli import error: ${result.commandError}` : undefined,
          ]
            .filter(Boolean)
            .join('; '),
        });
      }
    }
    result.success = result.failedContentTypes.length === 0 && result.commandError === undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.success = false;
    result.failedContentTypes = contentTypeUris.map(contentTypeUri => ({
      contentTypeUri,
      error: message,
    }));
  } finally {
    await fs.rm(operationRoot, { recursive: true, force: true });
  }

  return result;
}

export type ExecuteContentTypeAlignmentContext = {
  targetHub: Amplience.HubConfig;
  plan: Amplience.ContentTypeAlignmentPlan;
  isDryRun: boolean;
  temporaryRoot?: string;
  runCommand?: ContentTypeAlignmentCommandRunner;
  exportTargetDefinitions?: () => Promise<Amplience.ContentTypeExportDefinition[]>;
};

const runDcCliCommand: ContentTypeAlignmentCommandRunner = async (hub, command, args) =>
  createDcCliCommand()
    .withHub(hub)
    .withCommand(command)
    .withArgs(...args)
    .execute();

export async function exportContentTypeDefinitions(
  context: ExportContentTypeDefinitionsContext
): Promise<Amplience.ContentTypeExportDefinition[]> {
  const operationRoot =
    context.temporaryRoot ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'export-content-types-')));
  const exportDirectory = path.join(operationRoot, 'export');
  const runCommand = context.runCommand ?? runDcCliCommand;

  try {
    await fs.mkdir(exportDirectory, { recursive: true });
    const args = [`"${exportDirectory}"`, '--force'];
    if (context.includeArchived) {
      args.push('--archived');
    }

    await runCommand(context.hub, 'content-type export', args);

    const filenames = (await fs.readdir(exportDirectory))
      .filter(filename => filename.endsWith('.json'))
      .sort((left, right) => left.localeCompare(right));
    const definitions = await Promise.all(
      filenames.map(async filename => {
        const value: unknown = JSON.parse(
          await fs.readFile(path.join(exportDirectory, filename), 'utf-8')
        );

        return validateExportDefinition(value, filename);
      })
    );
    const seenUris = new Set<string>();
    for (const definition of definitions) {
      if (seenUris.has(definition.contentTypeUri)) {
        throw new Error(`Duplicate contentTypeUri in export: ${definition.contentTypeUri}`);
      }
      seenUris.add(definition.contentTypeUri);
    }

    return definitions;
  } finally {
    await fs.rm(operationRoot, { recursive: true, force: true });
  }
}

export type ExportContentTypeDefinitionsContext = {
  hub: Amplience.HubConfig;
  includeArchived: boolean;
  temporaryRoot?: string;
  runCommand?: ContentTypeAlignmentCommandRunner;
};

function normalizeImportSettings(
  settings: Amplience.ContentTypeSettings
): Amplience.ContentTypeSettings {
  return {
    ...(settings.label !== undefined && { label: settings.label }),
    icons: settings.icons ?? [],
    visualizations: settings.visualizations ?? [],
    cards: settings.cards ?? [],
  };
}

function validateExportDefinition(
  value: unknown,
  filename: string
): Amplience.ContentTypeExportDefinition {
  if (!isRecord(value)) {
    throw new Error(`${filename}: exported content type must be an object`);
  }

  if (typeof value.contentTypeUri !== 'string' || value.contentTypeUri.trim() === '') {
    throw new Error(`${filename}: contentTypeUri must be a non-empty string`);
  }

  if (value.id !== undefined && typeof value.id !== 'string') {
    throw new Error(`${filename}: id must be a string when provided`);
  }

  if (value.status !== undefined && value.status !== 'ACTIVE' && value.status !== 'ARCHIVED') {
    throw new Error(`${filename}: status must be ACTIVE or ARCHIVED when provided`);
  }

  if (
    value.repositories !== undefined &&
    (!Array.isArray(value.repositories) ||
      !value.repositories.every(repository => typeof repository === 'string'))
  ) {
    throw new Error(`${filename}: repositories must be an array of strings when provided`);
  }

  validateSettings(value.settings, filename);

  return value as unknown as Amplience.ContentTypeExportDefinition;
}

function validateSettings(value: unknown, filename: string): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    throw new Error(`${filename}: settings must be an object when provided`);
  }

  if (value.label !== undefined && typeof value.label !== 'string') {
    throw new Error(`${filename}: settings.label must be a string when provided`);
  }

  if (
    value.icons !== undefined &&
    (!Array.isArray(value.icons) ||
      !value.icons.every(
        icon =>
          isRecord(icon) &&
          (icon.size === undefined || typeof icon.size === 'number') &&
          (icon.url === undefined || typeof icon.url === 'string')
      ))
  ) {
    throw new Error(`${filename}: settings.icons has an invalid structure`);
  }

  for (const field of ['visualizations', 'cards'] as const) {
    const views = value[field];
    if (
      views !== undefined &&
      (!Array.isArray(views) ||
        !views.every(
          view =>
            isRecord(view) &&
            (view.label === undefined || typeof view.label === 'string') &&
            (view.templatedUri === undefined || typeof view.templatedUri === 'string') &&
            (view.default === undefined || typeof view.default === 'boolean')
        ))
    ) {
      throw new Error(`${filename}: settings.${field} has an invalid structure`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
