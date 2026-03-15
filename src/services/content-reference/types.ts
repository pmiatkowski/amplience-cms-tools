/**
 * Types and interfaces for content reference handling
 *
 * This module provides the foundational types for discovering, mapping, and resolving
 * content references (content-reference and content-link) across Amplience hubs.
 */

/**
 * Options for body transformation
 */
export type BodyTransformOptions = {
  /** Phase of transformation (1 = nullify refs, 2 = resolve refs) */
  phase: 1 | 2;
  /** Map of source ID to target ID */
  sourceToTargetIdMap: Map<string, string>;
  /** Whether to preserve unmapped references as-is or nullify them */
  preserveUnmapped: boolean;
};

/**
 * Schema URIs that identify content reference types in Amplience
 */
export const CONTENT_REFERENCE_SCHEMAS = {
  CONTENT_REFERENCE: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
  CONTENT_LINK: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link',
} as const;

/**
 * Type representing valid content reference schema types
 */
export type ContentReferenceSchemaType =
  (typeof CONTENT_REFERENCE_SCHEMAS)[keyof typeof CONTENT_REFERENCE_SCHEMAS];

/**
 * A detected content reference found within a content item body
 */
export type DetectedReference = {
  /** UUID of the referenced content item in the source hub */
  sourceId: string;
  /** Schema URI of the referenced content item */
  contentType: string;
  /** JSON path within the body where this reference was found (e.g., "body.component[0].image") */
  path: string;
  /** Whether this reference is inside an array */
  isArrayElement: boolean;
  /** The original schema type (content-reference or content-link) */
  referenceSchemaType: ReferenceSchemaTypeLiteral;
};

/**
 * Extracts the reference type literal from a schema URI
 */
export function getReferenceSchemaType(schema: string): ReferenceSchemaTypeLiteral | null {
  if (schema === CONTENT_REFERENCE_SCHEMAS.CONTENT_REFERENCE) {
    return 'content-reference';
  }
  if (schema === CONTENT_REFERENCE_SCHEMAS.CONTENT_LINK) {
    return 'content-link';
  }

  return null;
}

/**
 * Type guard to check if a schema URI is a content reference schema
 */
export function isContentReferenceSchema(schema: string): boolean {
  return (
    schema === CONTENT_REFERENCE_SCHEMAS.CONTENT_REFERENCE ||
    schema === CONTENT_REFERENCE_SCHEMAS.CONTENT_LINK
  );
}

/**
 * Options for reference discovery
 */
export type ReferenceDiscoveryOptions = {
  /** Limit discovery to this repository (items outside are marked as external) */
  sourceRepositoryId: string;
  /** Maximum depth for recursive discovery (0 = no limit) */
  maxDepth?: number;
  /** Whether to include items with delivery keys only */
  includeDeliveryKeyItemsOnly?: boolean;
};

/**
 * The complete reference registry tracking all discovered items and their relationships
 */
export type ReferenceRegistry = {
  /** Map of source item ID to registry entry */
  entries: Map<string, ReferenceRegistryEntry>;
  /** Map of source ID to target ID (for created items) */
  sourceToTargetIdMap: Map<string, string>;
  /** Item IDs that could not be matched in target hub */
  unresolvedIds: Set<string>;
  /** Item IDs that exist outside the source repository (external references) */
  externalReferenceIds: Set<string>;
};

/**
 * Registry entry for a discovered content item and its references
 */
export type ReferenceRegistryEntry = {
  /** Source content item */
  sourceItem: Amplience.ContentItemWithDetails;
  /** References found in this item */
  references: DetectedReference[];
  /** IDs of items this item references */
  referencesTo: string[];
  /** IDs of items that reference this item (reverse mapping) */
  referencedBy: string[];
  /** Whether this item has been processed for creation */
  processed: boolean;
  /** Target ID after creation (if applicable) */
  targetId?: string;
};

/**
 * Result of the full reference resolution process
 */
export type ReferenceResolutionResult = {
  /** Total items discovered */
  totalDiscovered: number;
  /** Items successfully matched to target */
  matchedCount: number;
  /** Items needing creation */
  toCreateCount: number;
  /** Items that could not be resolved */
  unresolvedCount: number;
  /** External references (outside repository) */
  externalCount: number;
  /** Circular reference groups detected */
  circularGroups: string[][];
  /** The populated registry */
  registry: ReferenceRegistry;
  /** Creation order (topologically sorted) */
  creationOrder: string[];
};

/**
 * Result of scanning a single content item for references
 */
export type ReferenceScanResult = {
  /** The source item ID that was scanned */
  sourceItemId: string;
  /** All references discovered in this item */
  references: DetectedReference[];
  /** Item IDs that this item references (deduplicated) */
  referencedItemIds: string[];
};

/**
 * Reference schema type literal for use in interfaces
 */
export type ReferenceSchemaTypeLiteral = 'content-reference' | 'content-link';

/**
 * Result of matching a source item to target hub
 */
export type TargetMatchResult = {
  /** Source item ID */
  sourceId: string;
  /** Match status */
  status: 'matched' | 'no_match' | 'multiple_matches' | 'external';
  /** Target item if matched */
  targetItem?: Amplience.ContentItem;
  /** Confidence level of the match */
  confidence: 'delivery_key' | 'schema_label' | 'none';
  /** Alternative matches if multiple found */
  alternatives?: Amplience.ContentItem[];
};
