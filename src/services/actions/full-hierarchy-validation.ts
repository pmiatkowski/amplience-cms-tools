import { AmplienceService } from '../amplience-service';

const CMS_METADATA_FIELDS = [
  'id',
  'version',
  'createdBy',
  'createdDate',
  'lastModifiedBy',
  'lastModifiedDate',
] as const;

/**
 * Compares two schema bodies for deep equality after normalization.
 */
export function areSchemaBodiesEqual(
  sourceBody: Record<string, unknown>,
  targetBody: Record<string, unknown>
): boolean {
  const normalizedSource = normalizeSchemaBody(sourceBody);
  const normalizedTarget = normalizeSchemaBody(targetBody);

  return JSON.stringify(normalizedSource) === JSON.stringify(normalizedTarget);
}

export type HubValidationResult = {
  errors: ValidationError[];
  schemasChecked: number;
  valid: boolean;
};

/**
 * Normalizes a schema body for comparison by sorting object keys alphabetically
 * and stripping hub-specific CMS metadata fields.
 */
export function normalizeSchemaBody(body: Record<string, unknown>): Record<string, unknown> {
  return sortAndStrip(structuredClone(body)) as Record<string, unknown>;
}

/**
 * Validates that all schemas and content types required by the items to be copied
 * exist in both source and target hubs, are not archived, and have identical schema bodies.
 *
 * @param sourceService - AmplienceService for the source hub
 * @param targetService - AmplienceService for the target hub
 * @param schemaIds - Array of unique schema IDs used by items to be copied
 * @example
 * const schemaIds = [...new Set(items.map(item => item.schemaId))];
 * const validation = await validateHubCompatibility(sourceService, targetService, schemaIds);
 * if (!validation.valid) {
 *   validation.errors.forEach(e => console.error(`[${e.type}] ${e.message}`));
 * }
 */
export async function validateHubCompatibility(
  sourceService: AmplienceService,
  targetService: AmplienceService,
  schemaIds: string[]
): Promise<HubValidationResult> {
  const errors: ValidationError[] = [];

  // Step 1: Fetch all schemas from both hubs
  const [sourceSchemas, targetSchemas] = await Promise.all([
    sourceService.getAllSchemas(),
    targetService.getAllSchemas(),
  ]);

  const sourceSchemaMap = new Map(sourceSchemas.map(s => [s.schemaId, s]));
  const targetSchemaMap = new Map(targetSchemas.map(s => [s.schemaId, s]));

  // Step 2: Fetch all content types from both hubs
  const [sourceContentTypes, targetContentTypes] = await Promise.all([
    sourceService.getAllContentTypes(),
    targetService.getAllContentTypes(),
  ]);

  const sourceContentTypeMap = new Map(sourceContentTypes.map(ct => [ct.contentTypeUri, ct]));
  const targetContentTypeMap = new Map(targetContentTypes.map(ct => [ct.contentTypeUri, ct]));

  for (const schemaId of schemaIds) {
    // Check schema exists in source
    const sourceSchema = sourceSchemaMap.get(schemaId);

    if (!sourceSchema) {
      errors.push({
        type: 'missing-schema',
        hub: 'source',
        schemaId,
        message: `Schema "${schemaId}" not found in source hub`,
      });
      continue;
    }

    if (sourceSchema.status === 'ARCHIVED') {
      errors.push({
        type: 'archived-schema',
        hub: 'source',
        schemaId,
        message: `Schema "${schemaId}" is archived in source hub`,
      });
      continue;
    }

    // Check schema exists in target
    const targetSchema = targetSchemaMap.get(schemaId);

    if (!targetSchema) {
      errors.push({
        type: 'missing-schema',
        hub: 'target',
        schemaId,
        message: `Schema "${schemaId}" not found in target hub`,
      });
      continue;
    }

    if (targetSchema.status === 'ARCHIVED') {
      errors.push({
        type: 'archived-schema',
        hub: 'target',
        schemaId,
        message: `Schema "${schemaId}" is archived in target hub`,
      });
      continue;
    }

    // Check schema bodies are identical (deep equality after normalization)
    if (!areSchemaBodiesEqual(sourceSchema.body, targetSchema.body)) {
      errors.push({
        type: 'schema-mismatch',
        hub: 'both',
        schemaId,
        message: `Schema "${schemaId}" body differs between source and target hubs`,
      });
    }

    // Check content type exists in source
    const sourceContentType = sourceContentTypeMap.get(schemaId);

    if (!sourceContentType) {
      errors.push({
        type: 'missing-content-type',
        hub: 'source',
        schemaId,
        message: `Content type for schema "${schemaId}" not found in source hub`,
      });
      continue;
    }

    if (sourceContentType.status === 'ARCHIVED') {
      errors.push({
        type: 'archived-content-type',
        hub: 'source',
        schemaId,
        message: `Content type for schema "${schemaId}" is archived in source hub`,
      });
    }

    // Check content type exists in target
    const targetContentType = targetContentTypeMap.get(schemaId);

    if (!targetContentType) {
      errors.push({
        type: 'missing-content-type',
        hub: 'target',
        schemaId,
        message: `Content type for schema "${schemaId}" not found in target hub`,
      });
      continue;
    }

    if (targetContentType.status === 'ARCHIVED') {
      errors.push({
        type: 'archived-content-type',
        hub: 'target',
        schemaId,
        message: `Content type for schema "${schemaId}" is archived in target hub`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    schemasChecked: schemaIds.length,
  };
}

export type ValidationError = {
  hub: 'source' | 'target' | 'both';
  message: string;
  schemaId: string;
  type:
    | 'missing-schema'
    | 'archived-schema'
    | 'schema-mismatch'
    | 'missing-content-type'
    | 'archived-content-type';
};

function sortAndStrip(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortAndStrip);
  }

  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};

  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    if (CMS_METADATA_FIELDS.includes(key as (typeof CMS_METADATA_FIELDS)[number])) {
      continue; // Strip CMS metadata
    }
    sorted[key] = sortAndStrip(obj[key]);
  }

  return sorted;
}
