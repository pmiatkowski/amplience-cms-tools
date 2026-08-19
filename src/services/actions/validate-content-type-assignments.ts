import { AmplienceService } from '../amplience-service';

export type ContentTypeAssignmentValidationResult =
  | {
      status: 'valid';
      targetRepositoryId: string;
      requiredContentTypeUris: string[];
    }
  | {
      status: 'invalid';
      targetRepositoryId: string;
      requiredContentTypeUris: string[];
      missingContentTypes: MissingContentTypeAssignment[];
      itemsWithoutSchema: ContentTypeValidationItemSummary[];
    }
  | {
      status: 'lookup-failed';
      targetRepositoryId: string;
      error: string;
    };

export type ContentTypeValidationCandidate = {
  readonly id: string;
  readonly label: string;
  readonly body: Amplience.Body;
  readonly schemaId?: string;
};

export type ContentTypeValidationItemSummary = {
  id: string;
  label: string;
};

export type MissingContentTypeAssignment = {
  contentTypeUri: string;
  itemCount: number;
  items: ContentTypeValidationItemSummary[];
};

function compareItems(
  first: ContentTypeValidationItemSummary,
  second: ContentTypeValidationItemSummary
): number {
  const labelComparison = first.label.localeCompare(second.label);

  return labelComparison || first.id.localeCompare(second.id);
}

export async function validateContentTypeAssignments({
  targetService,
  targetRepositoryId,
  items,
}: ValidateContentTypeAssignmentsOptions): Promise<ContentTypeAssignmentValidationResult> {
  if (items.length === 0) {
    return {
      status: 'valid',
      targetRepositoryId,
      requiredContentTypeUris: [],
    };
  }

  const itemsBySchema = new Map<string, Map<string, ContentTypeValidationItemSummary>>();
  const itemsWithoutSchema = new Map<string, ContentTypeValidationItemSummary>();

  for (const item of items) {
    const summary = { id: item.id, label: item.label };
    const schemaId = item.schemaId || item.body._meta?.schema;

    if (!schemaId) {
      itemsWithoutSchema.set(item.id, summary);
      continue;
    }

    const schemaItems = itemsBySchema.get(schemaId) || new Map();
    schemaItems.set(item.id, summary);
    itemsBySchema.set(schemaId, schemaItems);
  }

  const requiredContentTypeUris = [...itemsBySchema.keys()].sort((first, second) =>
    first.localeCompare(second)
  );

  let assignedContentTypes: Amplience.ContentType[];
  try {
    assignedContentTypes = await targetService.getContentTypes(targetRepositoryId);
  } catch (error) {
    return {
      status: 'lookup-failed',
      targetRepositoryId,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const assignedUris = new Set(assignedContentTypes.map(contentType => contentType.contentTypeUri));
  const missingContentTypes = requiredContentTypeUris
    .filter(contentTypeUri => !assignedUris.has(contentTypeUri))
    .map(contentTypeUri => {
      const affectedItems = [...(itemsBySchema.get(contentTypeUri)?.values() || [])].sort(
        compareItems
      );

      return {
        contentTypeUri,
        itemCount: affectedItems.length,
        items: affectedItems,
      };
    });
  const unknownSchemaItems = [...itemsWithoutSchema.values()].sort(compareItems);

  if (missingContentTypes.length > 0 || unknownSchemaItems.length > 0) {
    return {
      status: 'invalid',
      targetRepositoryId,
      requiredContentTypeUris,
      missingContentTypes,
      itemsWithoutSchema: unknownSchemaItems,
    };
  }

  return {
    status: 'valid',
    targetRepositoryId,
    requiredContentTypeUris,
  };
}

export type ValidateContentTypeAssignmentsOptions = {
  targetService: AmplienceService;
  targetRepositoryId: string;
  items: readonly ContentTypeValidationCandidate[];
};
