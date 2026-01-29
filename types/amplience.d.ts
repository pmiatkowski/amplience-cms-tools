// Type definitions for Amplience CMS entities

declare global {
  namespace Amplience {
    // Enums
    enum ContentStatus {
      ACTIVE = 'ACTIVE',
      ARCHIVED = 'ARCHIVED',
      DELETED = 'DELETED',
    }

    enum PublishingStatus {
      NONE = 'NONE',
      EARLY = 'EARLY',
      LATEST = 'LATEST',
      UNPUBLISHED = 'UNPUBLISHED',
    }

    enum RepositoryStatus {
      ACTIVE = 'ACTIVE',
      ARCHIVED = 'ARCHIVED',
    }

    enum ContentTypeStatus {
      ACTIVE = 'ACTIVE',
      ARCHIVED = 'ARCHIVED',
    }

    enum OperationStatus {
      SUCCESS = 'SUCCESS',
      FAILED = 'FAILED',
    }

    // Interfaces
    interface ContentItem {
      id: string;
      label: string;
      locale?: string;
      schemaId: string;
      status: ContentStatus;
      publishingStatus: PublishingStatus;
      createdDate: string;
      lastModifiedDate: string;
      hierarchy?: Hierarchy;
      version: number;
      deliveryId: string;
      validationState: string;
      body: Body;
    }

    type Body = Record<string, unknown> & MetaObj;

    type Hierarchy =
      | {
          root: false;
          parentId: string | null;
        }
      | { root: true; parentId: null };

    interface MetaObj {
      _meta?: {
        name?: string;
        deliveryKey?: string | null;
        schema?: string;
        hierarchy?: Hierarchy | null;
      };
    }

    interface Hub {
      id: string;
      name: string;
      label: string;
      description?: string;
    }

    interface ContentRepository {
      id: string;
      name: string;
      label: string;
      status: RepositoryStatus;
      contentTypes: ContentType[];
    }

    interface ContentType {
      id: string;
      hubContentTypeId: string;
      /** schema id */
      contentTypeUri: string;
      status: ContentTypeStatus;
      settings?: {
        label?: string;
        icons?: Array<{
          size: number;
          url: string;
        }>;
        visualizations?: Array<{
          label: string;
          templatedUri: string;
          default?: boolean;
        }>;
      };
      _links?: {
        self?: { href: string };
        archive?: { href: string };
        unarchive?: { href: string };
        'content-type'?: { href: string };
        'effective-content-type'?: { href: string };
        'content-type-schema'?: { href: string };
      };
    }

    interface ContentTypeSchema {
      id: string;
      schemaId: string;
      body: Record<string, unknown>;
      status: ContentTypeStatus;
      version: number;
      createdDate: string;
      lastModifiedDate: string;
      createdBy: string;
      lastModifiedBy: string;
      _links?: {
        self?: { href: string };
        archive?: { href: string };
        'content-types'?: { href: string };
      };
    }

    interface AuthToken {
      access_token: string;
      token_type: string;
      expires_in: number;
      scope: string;
      obtained_at: number;
    }

    interface HubCredentials {
      clientId: string;
      clientSecret: string;
      hubId: string;
    }

    interface FilterCriteria {
      schemaId?: string;
      status?: ContentStatus[];
      publishingStatus?: PublishingStatus[];
      deliveryKey?: string;
    }

    interface ContentItemQueryParams {
      projection?: 'basic' | string;
      page?: number;
      folderId?: string;
      status?: ContentStatus[] | ContentStatus;
      excludeHierarchicalChildren?: boolean;
      size?: number;
      sort?: string;
    }

    interface UpdateOperation {
      id: string;
      oldDeliveryKey?: string;
      newDeliveryKey: string;
      status: OperationStatus;
      error?: string;
    }

    interface OperationReport {
      timestamp: string;
      hubName: string;
      repositoryName: string;
      filters: FilterCriteria;
      totalItems: number;
      successCount: number;
      failureCount: number;
      duration: number;
      operations: UpdateOperation[];
    }

    interface Extension {
      id?: string; // System-generated, present when fetched from hub via API
      hubId?: string; // Hub ID, present in exported files
      name: string; // Required identifier for the extension
      label?: string;
      description?: string;
      url?: string;
      height?: number;
      enabledForAllContentTypes?: boolean;
      category?: string;
      parameters?: string; // JSON string with extension parameters
      snippets?: Array<{
        label: string;
        body: string;
      }>;
      settings?: string; // JSON string with extension settings
      status?: string;
      createdBy?: string;
      createdDate?: string;
      lastModifiedBy?: string;
      lastModifiedDate?: string;
      snippet?: string; // Deprecated, use snippets array
      _links?: {
        self?: { href: string };
      };
    }

    interface HalExtensionsResponse extends HalPage {
      _embedded: {
        extensions: Extension[];
      };
    }

    type HubConfigCommon = {
      name: string;
      envKey: string;
      hubId: string;
      extUrl?: string;
    };

    /**
     * Represents the structure of a Hub configuration loaded from .env.
     */
    type HubOAuthConfig = HubConfigCommon & {
      clientId: string;
      clientSecret: string;
      patToken?: undefined;
    };

    type HubPATConfig = HubConfigCommon & {
      patToken: string;
      clientId?: undefined;
      clientSecret?: undefined;
    };

    /**
     * Represents a hub configuration that supports either OAuth credentials or a PAT token.
     *
     * If patToken is present, clientId/clientSecret are not required and are ignored.
     * If patToken is absent, clientId/clientSecret are required.
     */
    type HubConfig = HubOAuthConfig | HubPATConfig;

    /**
     * Represents the result of a PATCH operation to update a delivery key.
     */
    interface UpdateResult {
      success: boolean;
      error?: string;
      updatedItem?: ContentItem;
    }

    /**
     * Represents a generic result for operations that may return different item types.
     */
    interface OperationResult<T = ContentItem> {
      success: boolean;
      error?: string;
      updatedItem?: T;
    }

    /**
     * Represents the paginated response structure from the Amplience API.
     */
    interface HalPage {
      page: {
        size: number;
        totalElements: number;
        totalPages: number;
        number: number;
      };
    }

    /**
     * Represents the HAL response for a list of content repositories.
     */
    interface HalContentRepositoryResponse extends HalPage {
      _embedded: {
        'content-repositories': ContentRepository[];
      };
    }

    /**
     * Represents the HAL response for a list of content items.
     */
    interface HalContentItemResponse extends HalPage {
      _embedded: {
        'content-items': ContentItem[];
      };
    }

    /**
     * Represents the HAL response for a list of content type schemas.
     */
    interface HalContentTypeSchemaResponse extends HalPage {
      _embedded: {
        'content-type-schemas': ContentTypeSchema[];
      };
    }

    /**
     * Represents a content item version with additional version-specific metadata.
     */
    interface ContentItemVersion extends ContentItem {
      contentRepositoryId: string;
      folderId?: string;
      body: Body; // The actual content body
      heading?: string;
      link?: string;
      createdBy: string;
      lastModifiedBy: string;
      assignees?: string[];
      assignedDate?: string;
      _links?: {
        planned?: { href: string; templated?: boolean };
        self?: { href: string };
        'content-item-version-history'?: { href: string; templated?: boolean };
        'content-item'?: { href: string; templated?: boolean };
        'content-item-version'?: { href: string; templated?: boolean };
        'content-item-versions'?: { href: string; templated?: boolean };
        'content-repository'?: { href: string };
        'content-item-with-children'?: { href: string };
        'content-item-with-parents'?: { href: string };
      };
    }

    /**
     * Represents the HAL response for a list of content item versions.
     */
    interface HalContentItemVersionsResponse extends HalPage {
      _embedded: {
        'content-items': ContentItemVersion[];
      };
    }

    /**
     * Represents the HAL response for a list of folders.
     */
    interface HalFoldersResponse extends HalPage {
      _embedded: {
        folders: Folder[];
      };
    }

    /**
     * Represents the response for content repository localization group locales.
     */
    interface LocalizationGroupLocalesResponse {
      locales: string[];
      _links: {
        self: { href: string };
      };
    }

    /**
     * Represents a content repository folder.
     */
    interface Folder {
      id: string;
      name: string;
      _links?: {
        self?: { href: string };
        folder?: { href: string };
        'content-repository'?: { href: string };
        'content-items'?: { href: string; templated?: boolean };
        'create-folder'?: { href: string };
        'delete-folder'?: { href: string };
        'update-folder'?: { href: string };
      };
    }

    /**
     * Represents the request payload for creating a folder.
     */
    interface CreateFolderRequest {
      name: string;
    }

    /**
     * Represents the request payload for updating a folder.
     */
    interface UpdateFolderRequest {
      name: string;
    }

    /**
     * Represents a single content item update request for batch operations.
     */
    interface ContentItemUpdateRequest {
      id: string;
      body: Body;
      label: string;
      version: number;
      folderId?: string;
      assignees?: string;
    }

    /**
     * Represents the result of a single content item update in a batch operation.
     */
    interface ContentItemUpdateResult {
      id: string;
      status: number;
      code: string;
      level: string;
      message?: string;
    }

    /**
     * Represents the response from updating multiple content items.
     */
    interface UpdateMultipleContentItemsResponse {
      results: ContentItemUpdateResult[];
    }

    /**
     * Represents the request payload for updating a single content item.
     */
    interface UpdateContentItemRequest {
      body: Body;
      label: string;
      version: number;
      folderId?: string;
      assignees?: string[];
      locale?: string;
      hierarchy?: Hierarchy | null;
    }

    /**
     * Represents the request payload for creating a new content item.
     */
    interface CreateContentItemRequest {
      body: Body;
      label: string;
      folderId?: string;
      locale?: string;
      assignees?: string[];
      workflow?: {
        state?: string;
      };
    }

    /**
     * Represents a content item with full details including workflow and links.
     */
    interface ContentItemWithDetails extends ContentItem {
      contentRepositoryId: string;
      folderId?: string;
      assignees?: string[];
      assignedDate?: string;
      locale?: string;
      createdBy: string;
      lastModifiedBy: string;
      lastPublishedDate?: string;
      lastPublishedVersion?: number;
      lastUnpublishedDate?: string;
      lastUnpublishedVersion?: number;
      hierarchy?: Hierarchy;
      heading?: string;
      link?: string;
      workflow?: {
        state: string;
      };
      _links?: {
        self?: { href: string };
        'content-item'?: { href: string; templated?: boolean };
        planned?: { href: string; templated?: boolean };
        publish?: { href: string };
        unpublish?: { href: string };
        'linked-content'?: { href: string; templated?: boolean };
        'content-item-with-children'?: { href: string };
        'content-item-with-parents'?: { href: string };
        update?: { href: string; templated?: boolean };
        'restore-version'?: { href: string };
        'content-repository'?: { href: string };
        'content-item-version'?: { href: string; templated?: boolean };
        'content-item-versions'?: { href: string; templated?: boolean };
        'content-item-history'?: { href: string; templated?: boolean };
        copy?: { href: string; templated?: boolean };
        unarchive?: { href: string };
        archive?: { href: string };
        'set-delivery-key'?: { href: string };
        'set-locale'?: { href: string };
        'create-localizations'?: { href: string };
        localizations?: { href: string; templated?: boolean };
        'localization-jobs'?: { href: string; templated?: boolean };
        'edition-slot-associations'?: { href: string };
        'edit-workflow'?: { href: string };
      };
    }

    /**
     * Represents a content item with parent content items in a hierarchical relationship.
     */
    interface ContentItemWithParents extends ContentItemWithDetails {
      contentRepositoryId: string;
      folderId?: string;
      body: Body;
      version: number;
      label: string;
      status: ContentStatus;
      createdBy: string;
      createdDate: string;
      lastModifiedBy: string;
      lastModifiedDate: string;
      hierarchy?: Hierarchy;
      assignees?: string[];
      assignedDate?: string;
      deliveryId: string;
      _links?: {
        self?: { href: string };
        'content-item'?: { href: string; templated?: boolean };
        planned?: { href: string; templated?: boolean };
        publish?: { href: string };
        'linked-content'?: { href: string; templated?: boolean };
        'content-item-with-children'?: { href: string };
        'content-item-with-parents'?: { href: string };
        update?: { href: string };
        'restore-version'?: { href: string };
        'content-repository'?: { href: string };
        'content-item-version'?: { href: string; templated?: boolean };
        'content-item-versions'?: { href: string; templated?: boolean };
        'content-item-history'?: { href: string; templated?: boolean };
        copy?: { href: string; templated?: boolean };
        unarchive?: { href: string };
        archive?: { href: string };
        'set-locale'?: { href: string };
        'create-localizations'?: { href: string };
        localizations?: { href: string; templated?: boolean };
        'localization-jobs'?: { href: string; templated?: boolean };
        'edition-slot-associations'?: { href: string };
        'edit-workflow'?: { href: string };
      };
    }

    /**
     * Represents the HAL response for content item with parents search.
     */
    interface HalContentItemWithParentsResponse {
      _embedded: {
        'content-items': ContentItemWithParents[];
      };
      _links?: {
        self?: { href: string };
        'content-item'?: { href: string; templated?: boolean };
      };
    }

    /**
     * Represents a content item with child content items in a hierarchical relationship.
     */
    interface ContentItemWithChildren extends ContentItemWithDetails {
      contentRepositoryId: string;
      folderId?: string;
      body: Record<string, unknown>;
      version: number;
      label: string;
      status: ContentStatus;
      createdBy: string;
      createdDate: string;
      lastModifiedBy: string;
      lastModifiedDate: string;
      hierarchy?: Hierarchy;
      assignees?: string[];
      assignedDate?: string;
      deliveryId: string;
      _links?: {
        self?: { href: string };
        'content-item'?: { href: string; templated?: boolean };
        planned?: { href: string; templated?: boolean };
        publish?: { href: string };
        'linked-content'?: { href: string; templated?: boolean };
        'content-item-with-children'?: { href: string };
        'content-item-with-parents'?: { href: string };
        update?: { href: string };
        'restore-version'?: { href: string };
        'content-repository'?: { href: string };
        'content-item-version'?: { href: string; templated?: boolean };
        'content-item-versions'?: { href: string; templated?: boolean };
        'content-item-history'?: { href: string; templated?: boolean };
        copy?: { href: string; templated?: boolean };
        unarchive?: { href: string };
        archive?: { href: string };
        'set-locale'?: { href: string };
        'create-localizations'?: { href: string };
        localizations?: { href: string; templated?: boolean };
        'localization-jobs'?: { href: string; templated?: boolean };
        'edition-slot-associations'?: { href: string };
        'edit-workflow'?: { href: string };
      };
    }

    /**
     * Represents the HAL response for content item with children search.
     */
    interface HalContentItemWithChildrenResponse {
      _embedded: {
        'content-items': ContentItemWithChildren[];
      };
      _links?: {
        self?: { href: string };
        'content-item'?: { href: string; templated?: boolean };
      };
    }

    /**
     * Represents the structure of a Hierarchy API response.
     * Used for efficiently getting descendant IDs before fetching full content items.
     */
    interface HierarchyApiResponse {
      responses: HierarchyApiItem[];
      page: HierarchyApiPage;
    }

    /**
     * Represents an item within the Hierarchy API responses array.
     * Contains minimal content data needed for ID extraction.
     */
    interface HierarchyApiItem {
      content: {
        deliveryId: string;
        [key: string]: unknown;
      };
    }

    /**
     * Represents the page object in Hierarchy API response.
     */
    interface HierarchyApiPage {
      responseCount: number;
      cursor?: string;
    }

    /**
     * Represents a node in the internal hierarchy tree structure.
     */
    interface HierarchyNode {
      item: ContentItem;
      children: HierarchyNode[];
    }

    /**
     * Defines an action to be taken for a single item during synchronization.
     */
    interface SyncItem {
      action: 'CREATE' | 'UPDATE' | 'REMOVE';
      sourceItem: ContentItem;
      targetParentId?: string; // Present for CREATE
      targetItem?: ContentItem; // Present for UPDATE and REMOVE
    }

    /**
     * Represents the complete plan of actions for a hierarchy synchronization.
     */
    interface SyncPlan {
      itemsToCreate: SyncItem[];
      itemsToRemove: SyncItem[];
    }

    /**
     * Represents a locale in the localization group.
     */
    interface Locale {
      locale: string;
      name: string;
    }

    /**
     * Represents the response for content repository localization group locales.
     */
    interface LocalizationGroupLocalesResponse extends HalPage {
      _embedded: {
        locales: Locale[];
      };
    }

    /**
     * Represents the request payload for creating a new content type.
     * Based on the source content type, but only essential fields are needed.
     */
    interface CreateContentTypeRequest {
      contentTypeUri: string;
      settings?: {
        label?: string;
        icons?: Array<{
          size: number;
          url: string;
        }>;
        visualizations?: Array<{
          label: string;
          templatedUri: string;
          default?: boolean;
        }>;
      };
    }

    /**
     * Represents the request payload for assigning a content type to a repository.
     */
    interface AssignContentTypeRequest {
      contentTypeId: string;
    }

    /**
     * Represents a node in the content type synchronization plan.
     */
    interface ContentTypeSyncItem {
      sourceContentType: Amplience.ContentType;
      targetRepositories: Amplience.ContentRepository[];
    }

    /**
     * Represents the complete plan for content type synchronization.
     */
    interface ContentTypeSyncPlan {
      hub: Amplience.Hub;
      items: ContentTypeSyncItem[];
    }

    /**
     * Represents an invalid extension file with error details
     */
    interface InvalidExtensionFile {
      filePath: string;
      error: string;
    }

    /**
     * Result summary from import extensions operation with comprehensive counts
     */
    interface ImportExtensionsResult {
      sourceDir: string;
      totalFilesFound: number;
      matchedCount: number;
      filteredOutCount: number;
      invalidCount: number;
      importedCount: number;
      invalidFiles: InvalidExtensionFile[];
    }

    /**
     * Preview result for extensions before import (read-only)
     */
    interface PreviewExtensionsResult {
      sourceDir: string;
      totalFilesFound: number;
      matchedCount: number;
      filteredOutCount: number;
      invalidCount: number;
      kept: Array<{
        extension: Extension;
        filePath: string;
      }>;
      invalidFiles: InvalidExtensionFile[];
    }

    // ===== User Command Sets Types =====

    /**
     * Represents a single command entry within a command set.
     * Commands can be run interactively (no parameters) or with pre-configured parameters.
     *
     * @example
     * // Interactive command - prompts user for all inputs
     * { command: 'sync-hierarchy' }
     *
     * @example
     * // Pre-configured command - uses specified parameters
     * {
     *   command: 'sync-hierarchy',
     *   description: 'Sync prod to dev',
     *   parameters: { sourceHub: 'prod', targetHub: 'dev' }
     * }
     */
    interface CommandSetEntry {
      /** The CLI command name to execute (must match a valid command) */
      command: string;
      /** Optional description shown in the UI when listing commands */
      description?: string;
      /** Optional pre-configured parameters for non-interactive execution */
      parameters?: Record<string, unknown>;
    }

    /**
     * Represents a named collection of commands that can be executed together.
     *
     * @example
     * {
     *   name: 'Daily Sync',
     *   description: 'Synchronize content between prod and dev',
     *   commands: [
     *     { command: 'sync-hierarchy', parameters: { sourceHub: 'prod' } },
     *     { command: 'copy-content-types' }
     *   ]
     * }
     */
    interface CommandSet {
      /** Unique name for this command set, displayed in the menu */
      name: string;
      /** Optional description explaining what this set does */
      description?: string;
      /** Array of commands to execute as part of this set */
      commands: CommandSetEntry[];
    }

    /**
     * Root configuration structure for user command sets.
     * Loaded from command-sets.json (or path specified by COMMAND_SETS_PATH env var).
     *
     * @example
     * {
     *   version: '1.0',
     *   commandSets: [
     *     {
     *       name: 'Daily Sync',
     *       description: 'Run daily sync operations',
     *       commands: [{ command: 'sync-hierarchy' }]
     *     }
     *   ]
     * }
     */
    interface CommandSetConfig {
      /** Configuration format version for future compatibility */
      version: string;
      /** Array of command sets available to the user */
      commandSets: CommandSet[];
    }

    /**
     * Result of validating a command set configuration structure.
     *
     * @example
     * const result = validateCommandSetConfig(config);
     * if (!result.isValid) {
     *   console.error('Validation errors:', result.errors);
     * }
     */
    interface CommandSetValidationResult {
      /** Whether the configuration passed all validation checks */
      isValid: boolean;
      /** Array of error messages if validation failed */
      errors: string[];
    }

    /**
     * Result of validating command references against known commands.
     *
     * @example
     * const result = validateCommandReferences(config, knownCommands);
     * if (!result.isValid) {
     *   console.error('Unknown commands:', result.invalidCommands);
     * }
     */
    interface CommandReferenceValidationResult {
      /** Whether all command references are valid */
      isValid: boolean;
      /** Array of command names that don't match known commands */
      invalidCommands: string[];
    }

    /**
     * Execution mode for a command set entry.
     * - 'interactive': User provides parameters via prompts during execution
     * - 'pre-configured': Parameters are provided in the config file
     */
    type ParameterMode = 'interactive' | 'pre-configured';

    /**
     * Result of validating command parameters.
     *
     * @example
     * const result = validateCommandParameters(entry);
     * if (!result.isValid) {
     *   console.error('Missing params:', result.missingParams);
     * }
     */
    interface ParameterValidationResult {
      /** Whether all required parameters are valid */
      isValid: boolean;
      /** Array of missing required parameter names */
      missingParams: string[];
      /** Array of invalid parameter names (null, empty string, etc.) */
      invalidParams: string[];
    }

    /**
     * Result of executing a single command.
     *
     * @example
     * const result = await executeCommand(entry, executor);
     * if (!result.success) {
     *   console.error(`Command ${result.command} failed: ${result.error}`);
     * }
     */
    interface CommandExecutionResult {
      /** The command name that was executed */
      command: string;
      /** Whether the command executed successfully */
      success: boolean;
      /** Error message if the command failed */
      error?: string;
      /** Duration of execution in milliseconds */
      durationMs: number;
    }

    /**
     * Aggregated summary of executing multiple commands.
     *
     * @example
     * const summary = aggregateResults(results);
     * console.log(`Completed ${summary.succeeded}/${summary.total} commands`);
     */
    interface ExecutionSummary {
      /** Total number of commands attempted */
      total: number;
      /** Number of commands that succeeded */
      succeeded: number;
      /** Number of commands that failed */
      failed: number;
      /** Total duration of all commands in milliseconds */
      totalDurationMs: number;
      /** Array of individual command results */
      results: CommandExecutionResult[];
      /** Array of failed command names for quick reference */
      failedCommands: string[];
    }

    /**
     * Result of executing an empty command set.
     *
     * @example
     * if (commandSet.commands.length === 0) {
     *   return executeEmptyCommandSet(commandSet);
     * }
     */
    interface EmptyCommandSetResult {
      /** Always 0 for empty sets */
      total: number;
      /** Always 0 for empty sets */
      succeeded: number;
      /** Always 0 for empty sets */
      failed: number;
      /** User-friendly message about the empty set */
      message: string;
    }

    /**
     * Function type for executing a command with parameters.
     * Used for dependency injection in executeCommand.
     */
    type CommandExecutor = (
      commandName: string,
      parameters?: Record<string, unknown>
    ) => Promise<{ success: boolean }>;

    /**
     * Execution mode for running a command set.
     * - 'run-all': Execute all commands sequentially without pausing
     * - 'step-by-step': Pause after each command for user confirmation
     */
    type ExecutionMode = 'run-all' | 'step-by-step';

    /**
     * User choice when an error occurs during command set execution.
     * - 'continue': Skip the failed command and continue with the next one
     * - 'stop': Stop execution immediately
     * - 'retry': Retry the failed command
     */
    type ErrorHandlingChoice = 'continue' | 'stop' | 'retry';

    /**
     * User choice when prompted to continue to the next command in step-by-step mode.
     * - 'continue': Proceed with the next command
     * - 'stop': Stop execution
     */
    type StepByStepChoice = 'continue' | 'stop';
  }
}

export {};
