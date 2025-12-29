export class AmplienceService {
  private _accessToken: string | null = null;
  private _tokenExpiry: number = 0;
  private _hubConfig: Amplience.HubConfig;
  private readonly _maxRetries: number;
  private readonly _defaultRetryAwaitTime: number;

  public constructor(hubConfig: Amplience.HubConfig) {
    this._hubConfig = hubConfig;
    // Read retry configuration from environment variables
    const retriesCount = parseInt(process.env.RETRIES_COUNT || '3', 10);
    const retryAwaitTime = parseInt(process.env.RETRY_AWAIT_TIME || '60', 10);

    // Handle invalid values by falling back to defaults
    this._maxRetries = isNaN(retriesCount) || retriesCount < 0 ? 3 : retriesCount;
    this._defaultRetryAwaitTime =
      (isNaN(retryAwaitTime) || retryAwaitTime < 0 ? 60 : retryAwaitTime) * 1000; // Convert to milliseconds
  }

  // Private method for calculating retry delay based on response and attempt number
  private _calculateRetryDelay(response: Response, attempt: number): number {
    const retryAfterHeader = response.headers.get('Retry-After');

    if (retryAfterHeader) {
      // Check if it's a number (seconds) or a date
      const secondsToWait = parseInt(retryAfterHeader, 10);
      if (!isNaN(secondsToWait)) {
        return secondsToWait * 1000; // Convert seconds to milliseconds
      }

      // Try to parse as HTTP date
      const retryDate = new Date(retryAfterHeader);
      if (!isNaN(retryDate.getTime())) {
        return Math.max(0, retryDate.getTime() - Date.now());
      }
    }

    // Use exponential backoff if no Retry-After header
    // Formula: RETRY_AWAIT_TIME * (2 ^ attempt)
    return this._defaultRetryAwaitTime * Math.pow(2, attempt);
  }

  // Helper method to wait for specified milliseconds
  private async _wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Private method for making authenticated requests
  private async _request<T>(url: string, options: RequestInit = {}): Promise<T> {
    if (!this._accessToken || Date.now() >= this._tokenExpiry) {
      await this._getAccessToken();
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this._accessToken}`);
    // Set Content-Type for POST, PUT, PATCH requests or when body is present
    if (
      !headers.has('Content-Type') &&
      (options.body ||
        (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())))
    ) {
      headers.set('Content-Type', 'application/json');
    }

    let lastError: Error | null = null;

    // Retry loop
    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      try {
        const response = await fetch(url, { ...options, headers });

        // Handle rate limiting (429)
        if (response.status === 429) {
          if (attempt < this._maxRetries) {
            const delayMs = this._calculateRetryDelay(response, attempt + 1);
            const delaySec = Math.round(delayMs / 1000);
            console.warn(
              `Rate limit hit. Waiting ${delaySec} seconds before retry ${attempt + 1}/${this._maxRetries}...`
            );
            await this._wait(delayMs);
            continue; // Retry the request
          } else {
            // All retries exhausted
            const errorBody = await response.text();
            throw new Error(
              `API Error: 429 Too Many Requests - Failed after ${this._maxRetries} retries. ${errorBody}`
            );
          }
        }

        // Handle other non-OK responses
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        // Success - return the response
        if (response.status === 204 || response.headers.get('Content-Length') === '0') {
          return undefined as T;
        }

        return response.json() as T;
      } catch (error) {
        // If it's not a 429 error, rethrow immediately
        if (error instanceof Error && !error.message.includes('Rate limit')) {
          throw error;
        }
        lastError = error as Error;
      }
    }

    // This should not be reached, but just in case
    throw lastError || new Error('Request failed after retries');
  }

  private async _getAccessToken(): Promise<void> {
    // Check if PAT token is present in config
    const patConfig = this._hubConfig as Amplience.HubPATConfig;
    if (patConfig.patToken) {
      // Use PAT token directly
      this._accessToken = patConfig.patToken;
      // Set expiry to a very high value since PATs don't expire in normal operation
      this._tokenExpiry = Number.MAX_SAFE_INTEGER;

      return;
    }

    // Fall back to OAuth flow if PAT is not present
    const oauthConfig = this._hubConfig as Amplience.HubOAuthConfig;
    const authUrl = 'https://auth.amplience.net/oauth/token';
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
    });

    try {
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Failed to authenticate: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.access_token || !data.expires_in) {
        throw new Error('Invalid auth response from Amplience');
      }

      this._accessToken = data.access_token;
      // Set expiry to 60 seconds before the actual expiry to be safe
      this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error(
        `Could not authenticate with Hub "${this._hubConfig.name}". Please check your .env configuration.`
      );
    }
  }

  public async getRepositories(): Promise<Amplience.ContentRepository[]> {
    const url = `https://api.amplience.net/v2/content/hubs/${this._hubConfig.hubId}/content-repositories?size=100`;
    const response = await this._request<Amplience.HalContentRepositoryResponse>(url);

    return response._embedded['content-repositories'];
  }

  /**
   * Gets the list of all supported item locales in a Content Repository localization group.
   * This request can be made using the ID of any repository in the localization group.
   *
   * @param contentRepositoryId - The unique identifier of the content repository
   * @returns Promise resolving to the operation result containing the locales list
   */
  public async getContentRepositoryLocalizationGroupLocales(
    contentRepositoryId: string
  ): Promise<Amplience.OperationResult<Amplience.LocalizationGroupLocalesResponse>> {
    const url = `https://api.amplience.net/v2/content/content-repositories/${contentRepositoryId}/localization-group/locales`;

    try {
      const response = await this._request<Amplience.LocalizationGroupLocalesResponse>(url);

      return { success: true, updatedItem: response };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async getAllContentItems(
    repositoryId: string,
    onPageFetched: (fetched: number, total: number) => void,
    queryParams?: Amplience.ContentItemQueryParams
  ): Promise<Amplience.ContentItem[]> {
    let page = 0;
    let allItems: Amplience.ContentItem[] = [];
    let totalPages = 1;
    let totalElements = 0;

    // Set default values
    const defaultParams: Amplience.ContentItemQueryParams = {
      size: 50,
      sort: 'lastModifiedDate,asc',
      // excludeHierarchicalChildren: true,
      status: 'ACTIVE' as Amplience.ContentStatus,
    };

    // Merge provided params with defaults
    const params = { ...defaultParams, ...queryParams };

    do {
      // Build query string from parameters
      const searchParams = new URLSearchParams();

      // Always include page parameter
      searchParams.set('page', page.toString());

      // Add other parameters if they exist
      if (params.projection) searchParams.set('projection', params.projection);
      if (params.folderId) searchParams.set('folderId', params.folderId);
      if (params.status) {
        if (Array.isArray(params.status)) {
          // If status is an array, join with comma or add multiple parameters
          searchParams.set('status', params.status.join(','));
        } else {
          // If status is a single value, use it directly
          searchParams.set('status', params.status);
        }
      }
      if (params.excludeHierarchicalChildren !== undefined) {
        searchParams.set(
          'excludeHierarchicalChildren',
          params.excludeHierarchicalChildren.toString()
        );
      }
      if (params.size !== undefined) searchParams.set('size', params.size.toString());
      if (params.sort) searchParams.set('sort', params.sort);

      const url = `https://api.amplience.net/v2/content/content-repositories/${repositoryId}/content-items?${searchParams.toString()}`;
      const response = await this._request<Amplience.HalContentItemResponse>(url);

      if (response._embedded && response._embedded['content-items']) {
        allItems = allItems.concat(response._embedded['content-items']);
      }

      totalPages = response.page.totalPages;
      if (page === 0) {
        totalElements = response.page.totalElements;
      }
      onPageFetched(allItems.length, totalElements);
      page++;
    } while (page < totalPages);

    return allItems;
  }

  public async getAllFolders(
    repositoryId: string,
    onPageFetched: (fetched: number, total: number) => void
  ): Promise<Amplience.Folder[]> {
    let page = 0;
    let allFolders: Amplience.Folder[] = [];
    let totalPages = 1;
    let totalElements = 0;

    do {
      const url = `https://api.amplience.net/v2/content/content-repositories/${repositoryId}/folders?size=50&page=${page}&sort=name,asc`;
      const response = await this._request<Amplience.HalFoldersResponse>(url);

      if (response._embedded && response._embedded.folders) {
        allFolders = allFolders.concat(response._embedded.folders);
      }

      totalPages = response.page.totalPages;
      if (page === 0) {
        totalElements = response.page.totalElements;
      }
      onPageFetched(allFolders.length, totalElements);
      page++;
    } while (page < totalPages);

    return allFolders;
  }

  public async updateDeliveryKey(
    contentItemId: string,
    version: number,
    deliveryKey?: string | null
  ): Promise<Amplience.UpdateResult> {
    const url = `https://api.amplience.net/v2/content/content-items/${contentItemId}/delivery-key`;
    const body = {
      deliveryKey: deliveryKey || null,
      version,
    };

    try {
      const updatedItem = await this._request<Amplience.ContentItem>(url, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      return { success: true, updatedItem };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async publishContentItem(contentItemId: string): Promise<Amplience.UpdateResult> {
    const url = `https://api.amplience.net/v2/content/content-items/${contentItemId}/publish`;

    try {
      // For publish requests, we need to handle 202 Accepted as success manually
      // since the _request helper throws on non-2xx status codes, but 202 is valid for publish
      if (!this._accessToken || Date.now() >= this._tokenExpiry) {
        await this._getAccessToken();
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this._accessToken}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

      if (response.status >= 400) {
        const errorBody = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async archiveContentItem(
    contentItemId: string,
    version: number
  ): Promise<Amplience.UpdateResult> {
    const url = `https://api.amplience.net/v2/content/content-items/${contentItemId}/archive`;
    const body = {
      version,
    };

    try {
      const updatedItem = await this._request<Amplience.ContentItem>(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return { success: true, updatedItem };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async unarchiveContentItem(
    contentItemId: string,
    version: number
  ): Promise<Amplience.UpdateResult> {
    const url = `https://api.amplience.net/v2/content/content-items/${contentItemId}/unarchive`;
    const body = {
      version,
    };

    try {
      const updatedItem = await this._request<Amplience.ContentItem>(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return { success: true, updatedItem };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async unpublishContentItem(contentItemId: string): Promise<Amplience.UpdateResult> {
    const url = `https://api.amplience.net/v2/content/content-items/${contentItemId}/unpublish`;

    try {
      const updatedItem = await this._request<Amplience.ContentItem>(url, {
        method: 'POST',
        body: '{}',
      });

      return { success: true, updatedItem };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async getContentItemVersions(
    contentItemId: string
  ): Promise<Amplience.OperationResult<Amplience.HalContentItemVersionsResponse>> {
    const url = `https://api.amplience.net/v2/content/content-items/${contentItemId}/versions`;

    try {
      const updatedItem = await this._request<Amplience.HalContentItemVersionsResponse>(url, {
        method: 'POST',
        body: '{}',
      });

      return { success: true, updatedItem };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async createFolder(
    contentRepositoryId: string,
    folderName: string
  ): Promise<Amplience.OperationResult<Amplience.Folder>> {
    const url = `https://api.amplience.net/v2/content/content-repositories/${contentRepositoryId}/folders`;
    const body: Amplience.CreateFolderRequest = {
      name: folderName,
    };

    try {
      const createdFolder = await this._request<Amplience.Folder>(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return { success: true, updatedItem: createdFolder };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async createSubFolder(
    parentFolderId: string,
    folderName: string
  ): Promise<Amplience.OperationResult<Amplience.Folder>> {
    const url = `https://api.amplience.net/v2/content/folders/${parentFolderId}/folders`;
    const body: Amplience.CreateFolderRequest = {
      name: folderName,
    };

    try {
      const createdFolder = await this._request<Amplience.Folder>(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return { success: true, updatedItem: createdFolder };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async updateFolder(
    folderId: string,
    folderName: string
  ): Promise<Amplience.OperationResult<Amplience.Folder>> {
    const url = `https://api.amplience.net/v2/content/folders/${folderId}`;
    const body: Amplience.UpdateFolderRequest = {
      name: folderName,
    };

    try {
      const updatedFolder = await this._request<Amplience.Folder>(url, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      return { success: true, updatedItem: updatedFolder };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async getFolder(folderId: string): Promise<Amplience.OperationResult<Amplience.Folder>> {
    const url = `https://api.amplience.net/v2/content/folders/${folderId}`;

    try {
      const folder = await this._request<Amplience.Folder>(url);

      return { success: true, updatedItem: folder };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async listFolders(
    contentRepositoryId: string,
    page: number = 0,
    size: number = 20,
    sort?: string
  ): Promise<Amplience.OperationResult<Amplience.HalFoldersResponse>> {
    let url = `https://api.amplience.net/v2/content/content-repositories/${contentRepositoryId}/folders?page=${page}&size=${size}`;

    if (sort) {
      url += `&sort=${encodeURIComponent(sort)}`;
    }

    try {
      const response = await this._request<Amplience.HalFoldersResponse>(url);

      return { success: true, updatedItem: response };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async deleteFolder(folderId: string): Promise<Amplience.OperationResult<void>> {
    const url = `https://api.amplience.net/v2/content/folders/${folderId}`;

    try {
      await this._request<void>(url, {
        method: 'DELETE',
      });

      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async listSubFolders(
    parentFolderId: string,
    page: number = 0,
    size: number = 20,
    sort?: string
  ): Promise<Amplience.OperationResult<Amplience.HalFoldersResponse>> {
    let url = `https://api.amplience.net/v2/content/folders/${parentFolderId}/folders?page=${page}&size=${size}`;

    if (sort) {
      url += `&sort=${encodeURIComponent(sort)}`;
    }

    try {
      const response = await this._request<Amplience.HalFoldersResponse>(url);

      return { success: true, updatedItem: response };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async getAllSubFolders(
    parentFolderId: string,
    onPageFetched: (fetched: number, total: number) => void
  ): Promise<Amplience.Folder[]> {
    let page = 0;
    let allSubFolders: Amplience.Folder[] = [];
    let totalPages = 1;
    let totalElements = 0;

    do {
      const url = `https://api.amplience.net/v2/content/folders/${parentFolderId}/folders?size=50&page=${page}&sort=name,asc`;
      const response = await this._request<Amplience.HalFoldersResponse>(url);

      if (response._embedded && response._embedded.folders) {
        allSubFolders = allSubFolders.concat(response._embedded.folders);
      }

      totalPages = response.page.totalPages;
      if (page === 0) {
        totalElements = response.page.totalElements;
      }
      onPageFetched(allSubFolders.length, totalElements);
      page++;
    } while (page < totalPages);

    return allSubFolders;
  }

  public async updateMultipleContentItems(
    contentUpdates: Amplience.ContentItemUpdateRequest[]
  ): Promise<Amplience.OperationResult<Amplience.UpdateMultipleContentItemsResponse>> {
    const url = `https://api.amplience.net/v2/content/content-items`;

    try {
      const response = await this._request<Amplience.UpdateMultipleContentItemsResponse>(url, {
        method: 'PATCH',
        body: JSON.stringify(contentUpdates),
      });

      return { success: true, updatedItem: response };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async updateContentItem(
    contentItemId: string,
    updateData: Amplience.UpdateContentItemRequest
  ): Promise<Amplience.OperationResult<Amplience.ContentItemWithDetails>> {
    const url = `https://api.amplience.net/v2/content/content-items/${contentItemId}`;

    try {
      const updatedItem = await this._request<Amplience.ContentItemWithDetails>(url, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      return { success: true, updatedItem };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets linked parent content items for a specific content item ID.
   * This method returns the content item with its hierarchical parent relationships.
   *
   * @param contentItemId - The unique identifier of the content item
   * @returns Promise resolving to the operation result containing content item with parents
   */
  public async getLinkedParentContentItems(
    contentItemId: string
  ): Promise<Amplience.OperationResult<Amplience.HalContentItemWithParentsResponse>> {
    const url = `https://api.amplience.net/v2/content/content-items/search/findByIdWithParents?id=${encodeURIComponent(contentItemId)}`;

    try {
      const response = await this._request<Amplience.HalContentItemWithParentsResponse>(url);

      return { success: true, updatedItem: response };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets linked child content items for a specific content item ID.
   * This method returns the content item with its hierarchical child relationships.
   *
   * @param contentItemId - The unique identifier of the content item
   * @returns Promise resolving to the operation result containing content item with children
   */
  public async getLinkedChildContentItems(
    contentItemId: string
  ): Promise<Amplience.OperationResult<Amplience.HalContentItemWithChildrenResponse>> {
    const url = `https://api.amplience.net/v2/content/content-items/search/findByIdWithChildren?id=${encodeURIComponent(contentItemId)}`;

    try {
      const response = await this._request<Amplience.HalContentItemWithChildrenResponse>(url);

      return { success: true, updatedItem: response };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Creates a new content item in the specified content repository.
   * Note: deliveryKey can only be set when Content Delivery 2 is enabled.
   * Copying a content item will not copy the deliveryKey.
   *
   * @param contentRepositoryId - The unique identifier of the content repository
   * @param contentItemData - The content item data to create
   * @returns Promise resolving to the operation result containing the created content item
   */
  public async createContentItem(
    contentRepositoryId: string,
    contentItemData: Amplience.CreateContentItemRequest
  ): Promise<Amplience.OperationResult<Amplience.ContentItemWithDetails>> {
    const url = `https://api.amplience.net/v2/content/content-repositories/${contentRepositoryId}/content-items`;

    try {
      const createdItem = await this._request<Amplience.ContentItemWithDetails>(url, {
        method: 'POST',
        body: JSON.stringify(contentItemData),
      });

      return { success: true, updatedItem: createdItem };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get content item with full details including hierarchy information
   */
  public async getContentItemWithDetails(
    itemId: string
  ): Promise<Amplience.ContentItemWithDetails | null> {
    try {
      const url = `https://api.amplience.net/v2/content/content-items/${itemId}`;
      const response = await this._request<Amplience.ContentItemWithDetails>(url);

      return response;
    } catch (error) {
      console.error(`Error fetching content item ${itemId}:`, error);

      return null;
    }
  }

  /**
   * Assign delivery key to a content item
   */
  public async assignDeliveryKey(itemId: string, deliveryKey: string): Promise<boolean> {
    try {
      const url = `https://api.amplience.net/v2/content/content-items/${itemId}/delivery-key`;

      await this._request(url, {
        method: 'PUT',
        body: JSON.stringify({ deliveryKey }),
      });

      return true;
    } catch (error) {
      console.error(`Error assigning delivery key:`, error);

      return false;
    }
  }

  /**
   * Get content item with children in hierarchy
   */
  public async getContentItemWithChildren(
    itemId: string
  ): Promise<Amplience.ContentItemWithChildren | null> {
    try {
      const result = await this.getLinkedChildContentItems(itemId);

      if (
        result.success &&
        result.updatedItem &&
        result.updatedItem._embedded?.['content-items']?.length > 0
      ) {
        return result.updatedItem._embedded[
          'content-items'
        ][0] as Amplience.ContentItemWithChildren;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching content item with children ${itemId}:`, error);

      return null;
    }
  }

  /**
   * Get content item with parents in hierarchy
   */
  public async getContentItemWithParents(
    itemId: string
  ): Promise<Amplience.ContentItemWithParents | null> {
    try {
      const result = await this.getLinkedParentContentItems(itemId);

      if (
        result.success &&
        result.updatedItem &&
        result.updatedItem._embedded?.['content-items']?.length > 0
      ) {
        return result.updatedItem._embedded['content-items'][0] as Amplience.ContentItemWithParents;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching content item with parents ${itemId}:`, error);

      return null;
    }
  }

  /**
   * Create a hierarchy node for a content item with a parent
   * This is done by updating the child content item to reference the parent
   */
  public async createHierarchyNode(
    repositoryId: string,
    contentItemId: string,
    parentContentItemId: string
  ): Promise<boolean> {
    try {
      console.log(
        `      🔗 Creating hierarchy relationship: ${contentItemId} -> parent: ${parentContentItemId}`
      );
      console.log(`      📁 Repository: ${repositoryId}`);

      // First, get the current content item details
      const contentItem = await this.getContentItemWithDetails(contentItemId);
      if (!contentItem) {
        throw new Error(`Could not fetch content item ${contentItemId} for hierarchy update`);
      }

      // Update the content item with hierarchy information
      const updateData: Amplience.UpdateContentItemRequest = {
        body: {
          ...contentItem.body,
          _meta: {
            ...contentItem.body._meta,
            hierarchy: {
              root: false,
              parentId: parentContentItemId,
            },
          },
        },
        label: contentItem.label,
        version: contentItem.version,
        ...(contentItem.folderId && { folderId: contentItem.folderId }),
        ...(contentItem.locale && { locale: contentItem.locale }),
      };

      const result = await this.updateContentItem(contentItemId, updateData);

      if (result.success) {
        console.log(`      ✅ Successfully created hierarchy relationship`);

        return true;
      } else {
        console.error(`      ❌ Failed to create hierarchy relationship: ${result.error}`);

        return false;
      }
    } catch (error) {
      console.error(`Error creating hierarchy node:`, error);

      return false;
    }
  }

  /**
   * Get all hierarchy descendants for a specific content item by scanning all content items in repository
   * This method recursively finds all children, grandchildren, etc. based on hierarchy.parentId
   * @deprecated Use getHierarchyDescendantsByApi instead for better performance
   */
  public async getAllHierarchyDescendants(
    repositoryId: string,
    rootItemId: string,
    onPageFetched?: (fetched: number, total: number) => void
  ): Promise<Amplience.ContentItem[]> {
    try {
      console.log(
        `      🔎 Scanning repository ${repositoryId} for hierarchy descendants of ${rootItemId}`
      );

      // Get all content items from the repository
      const allItems = await this.getAllContentItems(
        repositoryId,
        onPageFetched || ((): void => {}),
        { size: 100 } // Use larger page size for efficiency
      );

      console.log(`      📋 Found ${allItems.length} total items in repository`);

      // Build a map of parentId -> children for efficient lookup
      const childrenMap = new Map<string, Amplience.ContentItem[]>();

      allItems.forEach(item => {
        if (item.hierarchy && !item.hierarchy.root && item.hierarchy.parentId) {
          const parentId = item.hierarchy.parentId;
          if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
          }
          childrenMap.get(parentId)!.push(item);
        }
      });

      console.log(`      🗂️  Built hierarchy map with ${childrenMap.size} parent entries`);

      // Recursively collect all descendants
      const descendants: Amplience.ContentItem[] = [];
      const visitedIds = new Set<string>();

      const collectDescendants = (parentId: string, depth: number = 0): void => {
        const children = childrenMap.get(parentId) || [];
        console.log(
          `      ${'  '.repeat(depth)}👶 Found ${children.length} direct children for ${parentId}`
        );

        children.forEach(child => {
          if (!visitedIds.has(child.id)) {
            visitedIds.add(child.id);
            descendants.push(child);
            console.log(
              `      ${'  '.repeat(depth + 1)}📄 Added descendant: ${child.id} (${child.label})`
            );

            // Recursively collect children of this child
            collectDescendants(child.id, depth + 1);
          }
        });
      };

      // Start collecting from the root item
      collectDescendants(rootItemId);

      console.log(`      ✅ Found ${descendants.length} total descendants for ${rootItemId}`);

      return descendants;
    } catch (error) {
      console.error(`Error fetching hierarchy descendants for ${rootItemId}:`, error);

      return [];
    }
  }

  /**
   * Get all content items that are children of a specific content item in hierarchy
   */
  public async getHierarchyChildren(itemId: string): Promise<Amplience.ContentItem[]> {
    try {
      console.log(`      🔎 Calling getLinkedChildContentItems for ${itemId}`);
      // Use the search endpoint to get the item with its children
      const result = await this.getLinkedChildContentItems(itemId);
      console.log(`      📊 API Result success: ${result.success}`);

      if (result.success && result.updatedItem && result.updatedItem._embedded?.['content-items']) {
        const allItems = result.updatedItem._embedded['content-items'];
        console.log(`      📋 Total items in response: ${allItems.length}`);

        allItems.forEach((item, index) => {
          console.log(
            `      📄 Item ${index}: ${item.id} (${item.label}) - hierarchy: ${JSON.stringify(item.hierarchy)}`
          );
        });

        // The first item is the parent itself, the rest are children
        // Filter out the parent item (it will have the same ID as itemId)
        const children = allItems.filter(item => item.id !== itemId);
        console.log(`      👶 Children after filtering: ${children.length}`);

        return children as Amplience.ContentItem[];
      }

      console.log(`      ❌ No items found in response`);

      return [];
    } catch (error) {
      console.error(`Error fetching hierarchy children for ${itemId}:`, error);

      return [];
    }
  }

  /**
   * Get all hierarchy descendants for a specific content item using the official Hierarchy API.
   * This method leverages the new API endpoint to get descendant IDs, then uses getAllContentItems
   * to fetch the full content items efficiently with existing pagination logic.
   *
   * @param repositoryId - The ID of the repository containing the content items
   * @param rootItemId - The ID of the root content item to fetch descendants for
   * @param depth - The maximum depth to fetch (defaults to 14, which is the maximum)
   * @param onPageFetched - Optional callback to track progress of content item fetching
   * @returns Promise<Amplience.ContentItem[]> - Array of all descendant content items
   */
  public async getHierarchyDescendantsByApi(
    repositoryId: string,
    rootItemId: string,
    depth: number = 14,
    onPageFetched?: (fetched: number, total: number) => void
  ): Promise<Amplience.ContentItem[]> {
    try {
      console.log(
        `🔎 Fetching hierarchy descendants for ${rootItemId} using Hierarchy API (depth: ${depth})`
      );

      // Step 1: Get all descendant IDs using the Hierarchy API
      const descendantIds: string[] = [];
      let pageCursor: string | undefined;
      let pageCount = 0;

      do {
        // Construct the API URL
        let url = `https://api.amplience.net/v2/content/hierarchies/descendants/${rootItemId}?hierarchyDepth=${depth}&maxPageSize=100`;

        // Add cursor for subsequent pages
        if (pageCursor) {
          url += `&pageCursor=${encodeURIComponent(pageCursor)}`;
        }

        console.log(
          `  📄 Fetching descendant IDs page ${pageCount + 1}${pageCursor ? ` (cursor: ${pageCursor.substring(0, 20)}...)` : ''}`
        );

        // Make the authenticated API call
        try {
          const response = await this._request<Amplience.HierarchyApiResponse>(url);

          // Extract descendant IDs from the response
          if (response.responses && response.responses.length > 0) {
            for (const item of response.responses) {
              descendantIds.push(item.content.deliveryId);
            }
            console.log(
              `  ✓ Collected ${response.responses.length} descendant IDs from page ${pageCount + 1}`
            );
          }

          // Update cursor for next iteration
          pageCursor = response.page.cursor;
          pageCount++;
        } catch (apiError) {
          // Check if this is a 404 error indicating the Hierarchy API is not available
          if (apiError instanceof Error && apiError.message.includes('404')) {
            throw new Error(
              'Hierarchy API not available (404). This may indicate that the Hierarchy API is not enabled for this hub or the content item is not part of a hierarchy.'
            );
          }
          // Re-throw other errors
          throw apiError;
        }
      } while (pageCursor);

      console.log(`✅ Found ${descendantIds.length} total descendant IDs for ${rootItemId}`);

      // Step 2: If no descendants found, return empty array
      if (descendantIds.length === 0) {
        return [];
      }

      // Step 3: Use getAllContentItems to fetch full content items efficiently
      console.log(`🔍 Fetching full content items using getAllContentItems...`);
      const allItems = await this.getAllContentItems(
        repositoryId,
        onPageFetched || ((): void => {}),
        { size: 100 } // Use larger page size for efficiency
      );

      // Step 4: Filter to only include descendants found by Hierarchy API
      const descendantSet = new Set(descendantIds);
      const descendants = allItems.filter(
        item =>
          descendantSet.has(item.id) &&
          item.status === 'ACTIVE' &&
          (item.publishingStatus === 'LATEST' || item.publishingStatus === 'EARLY')
      );

      console.log(
        `✅ Successfully fetched ${descendants.length} hierarchy descendants for ${rootItemId} using optimized approach`
      );

      return descendants;
    } catch (error) {
      // Check if this is a 404 error (Hierarchy API not available) which is expected for some hubs
      if (error instanceof Error && error.message.includes('404')) {
        console.log(
          `  ℹ️ Hierarchy API not available for ${rootItemId} - this is normal for hubs without hierarchy features enabled`
        );
      } else {
        console.error(
          `❌ Error fetching hierarchy descendants for ${rootItemId} using Hierarchy API:`,
          error
        );
      }

      return [];
    }
  }

  /**
   * Get a content item by its delivery key
   */
  public async getContentItemByDeliveryKey(
    repoId: string,
    deliveryKey: string
  ): Promise<Amplience.ContentItem | null> {
    try {
      const url = `https://api.amplience.net/v2/content/content-repositories/${repoId}/content-items`;
      const queryParams = new URLSearchParams({
        folderId: '',
        projection: 'basic',
        status: 'ACTIVE,ARCHIVED',
        size: '1',
      });

      // Use the deliveryKey as a filter - this will need to be done via search
      const response = await this._request<Amplience.HalContentItemResponse>(
        `${url}?${queryParams}`
      );

      // Filter by delivery key client-side since API doesn't support direct filtering
      const items = response._embedded['content-items'] || [];
      const matchingItem = items.find(item => item.body._meta?.deliveryKey === deliveryKey);

      return matchingItem || null;
    } catch (error) {
      console.error(`Error fetching content item by delivery key ${deliveryKey}:`, error);

      return null;
    }
  }

  /**
   * Get content items filtered by schema ID and/or label and/or delivery key
   * Optimized version that uses getAllContentItems and filters in memory
   */
  public async getContentItemsBy(
    repoId: string,
    schemaId?: string,
    label?: string,
    deliveryKey?: string
  ): Promise<{ allItems: Amplience.ContentItem[]; filteredItems: Amplience.ContentItem[] }> {
    try {
      // Use the optimized getAllContentItems method with proper query parameters
      const queryParams: Amplience.ContentItemQueryParams = {
        size: 100,
        sort: 'lastModifiedDate,asc',
        status: ['ACTIVE', 'ARCHIVED'] as Array<Amplience.ContentStatus>,
      };

      console.log(`🔍 Fetching all content items from repository ${repoId} for filtering...`);

      // Get all content items using the existing optimized method
      const allItems = await this.getAllContentItems(
        repoId,
        (fetched: number, total: number) => {
          if (total > 0) {
            console.log(
              `  📥 Fetched ${fetched}/${total} items (${((fetched / total) * 100).toFixed(1)}%)`
            );
          }
        },
        queryParams
      );

      console.log(`📋 Retrieved ${allItems.length} total items. Applying filters...`);

      // Apply filters in memory for better performance
      let filteredItems = allItems;

      // Filter by schema ID if provided
      if (schemaId) {
        const beforeCount = filteredItems.length;
        filteredItems = filteredItems.filter(
          item => item.body._meta?.schema?.includes(schemaId) || item.schemaId?.includes(schemaId)
        );
        console.log(
          `  🎯 Schema filter (${schemaId}): ${beforeCount} → ${filteredItems.length} items`
        );
      }

      // Filter by label if provided
      if (label) {
        const beforeCount = filteredItems.length;
        filteredItems = filteredItems.filter(item =>
          item.label.toLowerCase().includes(label.toLowerCase())
        );
        console.log(
          `  🏷️  Label filter (${label}): ${beforeCount} → ${filteredItems.length} items`
        );
      }

      // Filter by delivery key if provided
      if (deliveryKey) {
        const beforeCount = filteredItems.length;
        filteredItems = filteredItems.filter(item =>
          item.body?._meta?.deliveryKey?.toLowerCase().includes(deliveryKey.toLowerCase())
        );
        console.log(
          `  🔑 Delivery key filter (${deliveryKey}): ${beforeCount} → ${filteredItems.length} items`
        );
      }

      console.log(`✅ Final result: ${filteredItems.length} items match the criteria`);

      return { allItems, filteredItems };
    } catch (error) {
      console.error(`❌ Error searching content items:`, error);

      return { allItems: [], filteredItems: [] };
    }
  }

  /**
   * Get localization group locales for a repository
   */
  public async getLocalizationGroupLocales(repoId: string): Promise<string[]> {
    try {
      const url = `https://api.amplience.net/v2/content/content-repositories/${repoId}/localization-group/locales`;
      const response = await this._request<Amplience.LocalizationGroupLocalesResponse>(url);

      // Extract locale codes from the response
      return response._embedded?.locales?.map(locale => locale.locale) || [];
    } catch (error) {
      console.error(`Error fetching localization group locales:`, error);

      return [];
    }
  }

  /**
   * Get all content type schemas from the hub with optional filtering
   * @param includeArchived Whether to include archived schemas
   * @returns Promise resolving to an array of content type schemas
   */
  public async getAllSchemas(
    includeArchived: boolean = false
  ): Promise<Amplience.ContentTypeSchema[]> {
    try {
      const schemas: Amplience.ContentTypeSchema[] = [];
      let page = 0;
      const size = 100;
      let hasMore = true;

      while (hasMore) {
        const url = new URL(
          `https://api.amplience.net/v2/content/hubs/${this._hubConfig.hubId}/content-type-schemas`
        );
        url.searchParams.set('page', page.toString());
        url.searchParams.set('size', size.toString());

        if (!includeArchived) {
          url.searchParams.set('status', 'ACTIVE');
        }

        const response = await this._request<Amplience.HalContentTypeSchemaResponse>(
          url.toString()
        );

        if (response._embedded?.['content-type-schemas']) {
          schemas.push(...response._embedded['content-type-schemas']);
        }

        hasMore = response.page.number + 1 < response.page.totalPages;
        page++;
      }

      return schemas;
    } catch (error) {
      console.error(`Error fetching content type schemas:`, error);
      throw error;
    }
  }

  /**
   * Archive a content type schema
   * @param schemaId The ID of the schema to archive
   * @param version The version of the schema to archive
   * @returns Promise resolving to the operation result
   */
  public async archiveSchema(
    schemaId: string,
    version: number
  ): Promise<Amplience.OperationResult<Amplience.ContentTypeSchema>> {
    try {
      const url = `https://api.amplience.net/v2/content/content-type-schemas/${schemaId}/archive`;

      const response = await this._request<Amplience.ContentTypeSchema>(url, {
        method: 'POST',
        body: JSON.stringify({ version }),
      });

      return { success: true, updatedItem: response };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get all content types that use the specified schemas
   * @param schemaIds Array of schema IDs to find content types for
   * @returns Promise resolving to an array of content types
   */
  public async getContentTypesBySchemas(schemaIds: string[]): Promise<Amplience.ContentType[]> {
    try {
      console.log(`🔍 Fetching all content types from hub ${this._hubConfig.hubId}...`);

      // Get all content types from the hub
      const allContentTypes = await this.getAllContentTypes();

      // Filter content types that use any of the specified schemas
      const matchingTypes = allContentTypes.filter((ct: Amplience.ContentType) =>
        schemaIds.includes(ct.contentTypeUri)
      );

      console.log(`📋 Found ${matchingTypes.length} content types using the specified schemas`);

      return matchingTypes;
    } catch (error) {
      console.error(`Error fetching content types by schemas:`, error);
      throw error;
    }
  }

  /**
   * Get all content types from the hub with pagination support
   * @param includeArchived Whether to include archived content types
   * @returns Promise resolving to an array of content types
   */
  public async getAllContentTypes(
    includeArchived: boolean = false
  ): Promise<Amplience.ContentType[]> {
    try {
      const contentTypes: Amplience.ContentType[] = [];
      let page = 0;
      const size = 100;
      let hasMore = true;

      while (hasMore) {
        const url = new URL(
          `https://api.amplience.net/v2/content/hubs/${this._hubConfig.hubId}/content-types`
        );
        url.searchParams.set('page', page.toString());
        url.searchParams.set('size', size.toString());

        if (!includeArchived) {
          url.searchParams.set('status', 'ACTIVE');
        }

        const response = await this._request<{
          _embedded: { 'content-types': Amplience.ContentType[] };
          page: { number: number; totalPages: number };
        }>(url.toString());

        if (response._embedded?.['content-types']) {
          contentTypes.push(...response._embedded['content-types']);
        }

        hasMore = response.page.number + 1 < response.page.totalPages;
        page++;
      }

      return contentTypes;
    } catch (error) {
      console.error(`Error fetching content types from hub:`, error);
      throw error;
    }
  }

  /**
   * Get content types for a specific repository
   * @param repositoryId The repository ID
   * @returns Promise resolving to an array of content types
   */
  public async getContentTypes(repositoryId: string): Promise<Amplience.ContentType[]> {
    try {
      const url = `https://api.amplience.net/v2/content/content-repositories/${repositoryId}/content-types?size=100`;
      const response = await this._request<{
        _embedded: { 'content-types': Amplience.ContentType[] };
      }>(url);

      return response._embedded?.['content-types'] || [];
    } catch (error) {
      console.error(`Error fetching content types for repository ${repositoryId}:`, error);

      return [];
    }
  }

  /**
   * Get content items by content type URIs (schema IDs)
   * @param schemaIds Array of schema IDs to find content items for
   * @returns Promise resolving to an array of content items
   */
  public async getContentItemsBySchemas(schemaIds: string[]): Promise<Amplience.ContentItem[]> {
    try {
      console.log(`🔍 Optimized search for content items using ${schemaIds.length} schema(s)...`);

      const contentItems: Amplience.ContentItem[] = [];

      // Get all repositories first
      const repositories = await this.getRepositories();
      const activeRepositories = repositories.filter(repo => repo.status !== 'ARCHIVED');

      console.log(`📁 Found ${activeRepositories.length} active repositories to search`);

      // For each repository, get ALL content items once and filter
      for (const repo of activeRepositories) {
        console.log(`  📂 Searching repository: ${repo.name} (${repo.id})`);

        try {
          // Get ALL content items from this repository in one call
          const allRepoItems = await this.getAllContentItems(
            repo.id,
            (fetched: number, total: number) => {
              if (total > 0) {
                console.log(
                  `    📥 Fetched ${fetched}/${total} items (${((fetched / total) * 100).toFixed(1)}%)`
                );
              }
            },
            {
              size: 100,
              sort: 'lastModifiedDate,asc',
              status: 'ACTIVE' as Amplience.ContentStatus, // Only get active items
            }
          );

          console.log(`    📋 Retrieved ${allRepoItems.length} total active items from repository`);

          // Filter items that match any of the selected schema IDs
          const matchingItems = allRepoItems.filter(item => {
            const itemSchemaId = item.body?._meta?.schema || item.schemaId;
            if (!itemSchemaId) return false;

            // Check if this item's schema matches any of the target schemas
            return schemaIds.some(schemaId => itemSchemaId.includes(schemaId));
          });

          console.log(`    ✅ Found ${matchingItems.length} items matching target schemas`);
          contentItems.push(...matchingItems);
        } catch (repoError) {
          console.error(`    ❌ Error searching repository ${repo.name}:`, repoError);
          // Continue with other repositories even if one fails
        }
      }

      console.log(
        `🎯 Total optimization result: ${contentItems.length} content items found across all repositories`
      );

      return contentItems;
    } catch (error) {
      console.error(`❌ Error in optimized content items search:`, error);
      throw error;
    }
  }

  /**
   * Archive a content type
   * @param contentTypeId The ID of the content type to archive
   * @returns Promise resolving to the operation result
   */
  public async archiveContentType(
    contentTypeId: string
  ): Promise<Amplience.OperationResult<Amplience.ContentType>> {
    try {
      const url = `https://api.amplience.net/v2/content/content-types/${contentTypeId}/archive`;

      const response = await this._request<Amplience.ContentType>(url, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      return { success: true, updatedItem: response };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create a new content type in the specified hub
   * @param hubId The hub ID where to create the content type
   * @param body The content type creation request payload
   * @returns Promise resolving to the created content type
   */
  public async createContentType(
    hubId: string,
    body: Amplience.CreateContentTypeRequest
  ): Promise<Amplience.ContentType> {
    try {
      const url = `https://api.amplience.net/v2/content/hubs/${hubId}/content-types`;

      const response = await this._request<Amplience.ContentType>(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to create content type: ${errorMessage}`);
    }
  }

  /**
   * Assign an existing content type to a content repository
   * @param repositoryId The repository ID to assign the content type to
   * @param contentTypeId The content type ID to assign
   * @returns Promise resolving when the assignment is complete
   */
  public async assignContentTypeToRepository(
    repositoryId: string,
    contentTypeId: string
  ): Promise<void> {
    try {
      const url = `https://api.amplience.net/v2/content/content-repositories/${repositoryId}/content-types`;

      await this._request<void>(url, {
        method: 'POST',
        body: JSON.stringify({ contentTypeId }),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(
        `Failed to assign content type ${contentTypeId} to repository ${repositoryId}: ${errorMessage}`
      );
    }
  }
}
