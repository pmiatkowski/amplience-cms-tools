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

    type HubConfigCommon = {
      name: string;
      hubId: string;
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
  }
}

export {};
