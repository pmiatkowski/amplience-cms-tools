// Discovery functions
export {
  batchFetchItems,
  discoverAllReferences,
  getMissingReferenceIds,
  isContentReference,
  scanBodyForReferences,
  scanContentItem,
} from './content-reference-discovery';

/**
 * Content Reference Service Module
 *
 * This module provides services for discovering, mapping, and resolving
 * content references (content-reference and content-link) across Amplience hubs.
 *
 * @module content-reference
 */
export {
  type BodyTransformOptions,
  CONTENT_REFERENCE_SCHEMAS,
  type ContentReferenceSchemaType,
  type DetectedReference,
  getReferenceSchemaType,
  isContentReferenceSchema,
  type ReferenceDiscoveryOptions,
  type ReferenceRegistry,
  type ReferenceRegistryEntry,
  type ReferenceResolutionResult,
  type ReferenceScanResult,
  type ReferenceSchemaTypeLiteral,
  type TargetMatchResult,
} from './types';

// Graph functions
export {
  buildDependencyGraph,
  type DependencyGraph,
  type DependencyNode,
  detectStronglyConnectedComponents,
  getDependencyDepth,
  getPhase1Items,
  getPhase2Items,
  getTransitiveDependencies,
  kahnTopologicalSort,
  topologicalSort,
  wouldCreateCycle,
} from './content-reference-graph';

// Mapping functions
export {
  buildReverseReferences,
  createReferenceRegistry,
  detectCircularGroups,
  getItemsReferencing,
  getRegistryStats,
  getTargetId,
  getTopologicalOrder,
  isRegistered,
  markExternalReference,
  markUnresolved,
  matchAllSourcesToTargets,
  matchSourceToTarget,
  recordMapping,
  registerItem,
} from './content-reference-mapping';

// Report functions
export {
  type CircularGroupReport,
  type CreatedItemReport,
  type DiscoveredItemReport,
  displayReportSummary,
  type ExternalReferenceReport,
  formatReportAsMarkdown,
  formatRollbackGuidanceAsMarkdown,
  generateResolutionReport,
  generateRollbackGuidance,
  type MatchedItemReport,
  type ReferenceReport,
  type ReportSummary,
  type RollbackGuidance,
  type RollbackStep,
  saveReportToFile,
  saveRollbackGuidanceToFile,
  type UnresolvedItemReport,
} from './content-reference-report';

// Transform functions
export {
  deepTransform,
  nullifyReferences,
  prepareBodyForPhase1Creation,
  prepareBodyForPhase2Update,
  resolveReferences,
  transformBodyReferences,
  transformReference,
  validateResolvedReferences,
} from './content-reference-transform';

// Resolver functions
export {
  executePhase1Creation,
  executePhase2Update,
  getPreFlightSummary,
  resolveContentReferences,
  type ResolverOptions,
  type ResolverResult,
} from './content-reference-resolver';

// Publisher functions
export {
  extractPublishingStatus,
  type PublishingResult,
  type PublishingStatus,
  publishItem,
  replicatePublishingStatus,
} from './content-reference-publisher';
