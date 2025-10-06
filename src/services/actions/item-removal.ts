import { AmplienceService } from '../amplience-service';
import {
  archiveContentItem,
  ArchiveContentItemOptions,
  ItemCleanupResult,
} from './archive-content-item';

const DEFAULT_DELETED_FOLDER_NAME = '__deleted';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

const VERSION_CONFLICT_CODE = 'CONTENT_ITEM_VERSION_NOT_LATEST';

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

type RemovalOptions = {
  deletedFolderName?: string;
  deletedFolderId?: string;
  clearDeliveryKey?: boolean;
  unpublishIfNeeded?: boolean;
  unarchiveIfNeeded?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
};

type RemovalStepResult = {
  success: boolean;
  error?: string;
};

type RemovalPreparationResult = {
  success: boolean;
  itemId: string;
  label?: string;
  deletedFolderId?: string;
  updatedItem?: Amplience.ContentItemWithDetails;
  version?: number;
  steps: {
    ensureDeletedFolder: RemovalStepResult;
    fetchLatest: RemovalStepResult;
    unarchive: RemovalStepResult;
    moveToDeleted: RemovalStepResult;
  };
  error?: string;
};

type ItemRemovalResult = {
  itemId: string;
  label?: string;
  prepareResult: RemovalPreparationResult;
  archiveResult?: ItemCleanupResult;
  overallSuccess: boolean;
};

async function archivePreparedItem(
  service: AmplienceService,
  prepared: RemovalPreparationResult,
  options: RemovalOptions = {}
): Promise<ItemCleanupResult | undefined> {
  if (!prepared.success || !prepared.updatedItem) {
    return undefined;
  }

  const { unpublishIfNeeded = true, unarchiveIfNeeded = false } = options;

  const archiveOptions: ArchiveContentItemOptions = {
    clearDeliveryKey: false,
    unpublishIfNeeded,
    unarchiveIfNeeded,
    moveToRoot: false,
    moveToDeletedFolder: false,
  };

  return archiveContentItem(service, prepared.updatedItem, archiveOptions);
}

/**
 * Ensures the deleted folder exists within the repository, creating it when necessary.
 */
async function ensureDeletedFolder(
  service: AmplienceService,
  repositoryId: string,
  deletedFolderName: string = DEFAULT_DELETED_FOLDER_NAME
): Promise<{ success: boolean; folderId?: string; error?: string }> {
  try {
    const allFolders = await service.getAllFolders(repositoryId, () => {});
    const existingDeletedFolder = allFolders.find(folder => folder.name === deletedFolderName);

    if (existingDeletedFolder) {
      return { success: true, folderId: existingDeletedFolder.id };
    }

    const createResult = await service.createFolder(repositoryId, deletedFolderName);
    if (createResult.success && createResult.updatedItem) {
      return { success: true, folderId: createResult.updatedItem.id };
    }

    return { success: false, error: createResult.error || 'Failed to create deleted folder' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function prepareItemForRemoval(
  service: AmplienceService,
  repositoryId: string,
  itemId: string,
  options: RemovalOptions = {}
): Promise<RemovalPreparationResult> {
  const {
    deletedFolderName = DEFAULT_DELETED_FOLDER_NAME,
    deletedFolderId,
    clearDeliveryKey = true,
    unarchiveIfNeeded = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  } = options;

  const steps: RemovalPreparationResult['steps'] = {
    ensureDeletedFolder: { success: false },
    fetchLatest: { success: false },
    unarchive: { success: true },
    moveToDeleted: { success: false },
  };

  let resolvedDeletedFolderId = deletedFolderId ?? null;

  if (resolvedDeletedFolderId) {
    steps.ensureDeletedFolder = { success: true };
  } else {
    const ensureResult = await ensureDeletedFolder(service, repositoryId, deletedFolderName);
    steps.ensureDeletedFolder = ensureResult.success
      ? { success: true }
      : { success: false, error: ensureResult.error ?? 'Failed to ensure deleted folder' };

    if (!ensureResult.success || !ensureResult.folderId) {
      return {
        success: false,
        itemId,
        steps,
        error: ensureResult.error ?? 'Failed to ensure deleted folder',
      };
    }

    resolvedDeletedFolderId = ensureResult.folderId;
  }

  if (!resolvedDeletedFolderId) {
    return {
      success: false,
      itemId,
      steps,
      error: 'Failed to resolve deleted folder ID',
    };
  }

  const targetDeletedFolderId = resolvedDeletedFolderId;

  let attempt = 0;
  let lastError: string | undefined;

  while (attempt < maxRetries) {
    const latestItem = await service.getContentItemWithDetails(itemId);
    if (!latestItem) {
      steps.fetchLatest = {
        success: false,
        error: 'Failed to fetch latest item details',
      };

      return {
        success: false,
        itemId,
        deletedFolderId: targetDeletedFolderId,
        steps,
        error: 'Failed to fetch latest item details',
      };
    }

    steps.fetchLatest = { success: true };

    let currentVersion = latestItem.version;
    let workingItem = latestItem;

    if (unarchiveIfNeeded && latestItem.status === 'ARCHIVED') {
      const unarchiveResult = await service.unarchiveContentItem(itemId, currentVersion);
      steps.unarchive = {
        success: unarchiveResult.success,
        ...(unarchiveResult.error && { error: unarchiveResult.error }),
      };

      if (!unarchiveResult.success) {
        return {
          success: false,
          itemId,
          label: latestItem.label,
          deletedFolderId: targetDeletedFolderId,
          steps,
          error: unarchiveResult.error ?? 'Failed to unarchive content item',
        };
      }

      currentVersion = unarchiveResult.updatedItem?.version || currentVersion + 1;
      if (unarchiveResult.updatedItem) {
        workingItem = {
          ...latestItem,
          ...unarchiveResult.updatedItem,
        };
      } else {
        workingItem = {
          ...latestItem,
          status: 'ACTIVE' as Amplience.ContentStatus,
          version: currentVersion,
        };
      }
    } else {
      steps.unarchive = { success: true };
    }

    const sanitizedBody = JSON.parse(JSON.stringify(workingItem.body || {})) as Amplience.Body;

    if (!sanitizedBody._meta) {
      sanitizedBody._meta = {};
    }

    sanitizedBody._meta.hierarchy = null;

    if (clearDeliveryKey && sanitizedBody._meta.deliveryKey !== undefined) {
      sanitizedBody._meta.deliveryKey = null;
    }

    const updateRequest: Amplience.UpdateContentItemRequest = {
      body: sanitizedBody,
      label: workingItem.label,
      version: currentVersion,
      folderId: targetDeletedFolderId,
      hierarchy: null,
    };

    if (workingItem.locale) {
      updateRequest.locale = workingItem.locale;
    }

    const updateResult = await service.updateContentItem(itemId, updateRequest);
    steps.moveToDeleted = {
      success: updateResult.success,
      ...(updateResult.error && { error: updateResult.error }),
    };

    if (updateResult.success && updateResult.updatedItem) {
      return {
        success: true,
        itemId,
        label: updateResult.updatedItem.label,
        deletedFolderId: targetDeletedFolderId,
        updatedItem: updateResult.updatedItem,
        version: updateResult.updatedItem.version,
        steps,
      };
    }

    lastError = updateResult.error;

    if (lastError?.includes(VERSION_CONFLICT_CODE) && attempt + 1 < maxRetries) {
      await delay(retryDelayMs);
      attempt++;
      continue;
    }

    return {
      success: false,
      itemId,
      label: workingItem.label,
      deletedFolderId: targetDeletedFolderId,
      steps,
      error: lastError ?? 'Failed to move item to deleted folder',
    };
  }

  return {
    success: false,
    itemId,
    deletedFolderId: targetDeletedFolderId,
    steps,
    error: lastError ?? 'Failed to prepare item for removal',
  };
}

/**
 * Runs the full removal pipeline for a single content item, reporting detailed outcomes.
 */
async function removeContentItem(
  service: AmplienceService,
  repositoryId: string,
  itemId: string,
  options: RemovalOptions = {}
): Promise<ItemRemovalResult> {
  const prepareResult = await prepareItemForRemoval(service, repositoryId, itemId, options);

  if (!prepareResult.success) {
    return {
      itemId,
      ...(prepareResult.label && { label: prepareResult.label }),
      prepareResult,
      overallSuccess: false,
    };
  }

  const archiveResult = await archivePreparedItem(service, prepareResult, options);

  return {
    itemId,
    ...(prepareResult.label && { label: prepareResult.label }),
    prepareResult,
    ...(archiveResult && { archiveResult }),
    overallSuccess: Boolean(archiveResult?.overallSuccess),
  };
}

export { archivePreparedItem, ensureDeletedFolder, prepareItemForRemoval, removeContentItem };

export type { ItemRemovalResult, RemovalOptions, RemovalPreparationResult, RemovalStepResult };
