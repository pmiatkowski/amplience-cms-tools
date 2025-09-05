import { AmplienceService } from './amplience-service';

/**
 * Service responsible for content type synchronization business logic.
 * Handles comparison between hubs, schema validation, and repository mapping.
 */
export class ContentTypeService {
  /**
   * Identifies content types that exist in the source hub but not in the target hub.
   * Compares based on contentTypeUri to determine missing content types.
   *
   * @param sourceHub - AmplienceService instance for the source hub
   * @param targetHub - AmplienceService instance for the target hub
   * @returns Array of content types present in source but missing in target
   */
  async getMissingContentTypes(
    sourceHub: AmplienceService,
    targetHub: AmplienceService
  ): Promise<Amplience.ContentType[]> {
    // Fetch all ACTIVE content types from source hub
    const sourceContentTypes = await sourceHub.getAllContentTypes();
    const activeSourceTypes = sourceContentTypes.filter(
      contentType => contentType.status === 'ACTIVE'
    );

    // Fetch all content types from target hub
    const targetContentTypes = await targetHub.getAllContentTypes();

    // Create a Set of target content type URIs for efficient lookup
    const targetUris = new Set(targetContentTypes.map(contentType => contentType.contentTypeUri));

    // Filter source types that don't exist in target
    const missingContentTypes = activeSourceTypes.filter(
      sourceType => !targetUris.has(sourceType.contentTypeUri)
    );

    return missingContentTypes;
  }

  /**
   * Validates that the required schemas exist in the target hub for the given content types
   * and that they are suitable for use as content type schemas.
   * Separates content types into those with valid schemas and those with missing/invalid schemas.
   *
   * @param targetHub - AmplienceService instance for the target hub
   * @param contentTypes - Array of content types to validate
   * @returns Object containing arrays of missing schema URIs, invalid schema URIs, and valid content types
   */
  async validateSchemas(
    targetHub: AmplienceService,
    contentTypes: Amplience.ContentType[]
  ): Promise<{
    missingSchemas: string[];
    invalidSchemas: string[];
    validContentTypes: Amplience.ContentType[];
  }> {
    // Fetch all schemas from target hub
    const targetSchemas = await targetHub.getAllSchemas();

    // Create a Map of target schema IDs to schema objects for efficient lookup
    const targetSchemaMap = new Map(targetSchemas.map(schema => [schema.schemaId, schema]));

    const missingSchemas: string[] = [];
    const invalidSchemas: string[] = [];
    const validContentTypes: Amplience.ContentType[] = [];

    // Check each content type's schema availability and validity
    for (const contentType of contentTypes) {
      const schema = targetSchemaMap.get(contentType.contentTypeUri);

      if (!schema) {
        missingSchemas.push(contentType.contentTypeUri);
        continue;
      }

      // Validate that the schema is suitable for use as a content type
      const validationResult = this.validateContentTypeSchema(schema);

      if (validationResult.isValid) {
        validContentTypes.push(contentType);
      } else {
        invalidSchemas.push(contentType.contentTypeUri);
        console.warn(
          `⚠️  Schema "${contentType.contentTypeUri}" is not suitable for content type use:`,
          validationResult.errors.join(', ')
        );
      }
    }

    return {
      missingSchemas,
      invalidSchemas,
      validContentTypes,
    };
  }

  /**
   * Validates whether a schema meets the requirements to be used as a content type.
   * Checks for required properties: title, description, type=object, and allOf extending core content type.
   *
   * @param schema - The schema to validate
   * @returns Validation result with boolean isValid and array of error messages
   */
  private validateContentTypeSchema(schema: Amplience.ContentTypeSchema): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if schema body exists and is parseable
    let schemaBody: Record<string, unknown>;
    try {
      schemaBody = typeof schema.body === 'string' ? JSON.parse(schema.body) : schema.body;
    } catch {
      errors.push('Schema body is not valid JSON');

      return { isValid: false, errors };
    }

    // Check for required title property
    if (!schemaBody.title) {
      errors.push('Schema missing required "title" property');
    }

    // Check for required description property
    if (!schemaBody.description) {
      errors.push('Schema missing required "description" property');
    }

    // Check that type is "object"
    if (schemaBody.type !== 'object') {
      errors.push('Schema "type" property must be "object"');
    }

    // Check for allOf property extending core content type
    if (!schemaBody.allOf || !Array.isArray(schemaBody.allOf)) {
      errors.push('Schema must have "allOf" property extending core content type');
    } else {
      const hasContentTypeExtension = (schemaBody.allOf as Array<Record<string, unknown>>).some(
        (item: Record<string, unknown>) =>
          item.$ref === 'http://bigcontent.io/cms/schema/v1/core#/definitions/content'
      );

      if (!hasContentTypeExtension) {
        errors.push('Schema must extend core content type via allOf reference');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generates an automatic mapping of content types to target repositories.
   * Maps based on repository names - finds target repositories with the same name
   * as the source repositories where each content type is assigned.
   *
   * @param sourceHub - AmplienceService instance for the source hub
   * @param targetHub - AmplienceService instance for the target hub
   * @param contentTypes - Array of content types to map
   * @returns Map where key is content type ID and value is array of matching target repositories
   */
  async generateAutomaticRepositoryMap(
    sourceHub: AmplienceService,
    targetHub: AmplienceService,
    contentTypes: Amplience.ContentType[]
  ): Promise<Map<string, Amplience.ContentRepository[]>> {
    // Fetch all repositories from both hubs
    const sourceRepositories = await sourceHub.getRepositories();
    const targetRepositories = await targetHub.getRepositories();

    // Create a Map of target repositories by name for efficient lookup
    const targetReposByName = new Map<string, Amplience.ContentRepository>();
    targetRepositories.forEach((repo: Amplience.ContentRepository) => {
      targetReposByName.set(repo.name, repo);
    });

    const repositoryMap = new Map<string, Amplience.ContentRepository[]>();

    // For each content type, find its source repositories and map to target equivalents
    for (const contentType of contentTypes) {
      const matchingTargetRepos: Amplience.ContentRepository[] = [];

      // Find source repositories that contain this content type
      // Check if repositories have contentTypes field (from API response)
      const sourceReposWithContentType = sourceRepositories.filter(
        (repo: Amplience.ContentRepository) => {
          // Check if repo has contentTypes array and includes our content type
          if (repo.contentTypes && Array.isArray(repo.contentTypes)) {
            return repo.contentTypes.some(
              (ct: Amplience.ContentType) =>
                ct.id === contentType.id || ct.contentTypeUri === contentType.contentTypeUri
            );
          }

          return false;
        }
      );

      console.log(
        `Debug: Content type ${contentType.settings?.label || contentType.contentTypeUri} found in ${sourceReposWithContentType.length} repositories`
      );

      // For each source repository, find target repository with same name
      for (const sourceRepo of sourceReposWithContentType) {
        const targetRepo = targetReposByName.get(sourceRepo.name);
        if (targetRepo) {
          matchingTargetRepos.push(targetRepo);
          console.log(`Debug: Mapped ${sourceRepo.name} -> ${targetRepo.name}`);
        } else {
          console.log(`Debug: No target repository found with name: ${sourceRepo.name}`);
        }
      }

      // Store the mapping for this content type
      repositoryMap.set(contentType.id, matchingTargetRepos);
    }

    return repositoryMap;
  }
}
