// Re-export types from services layer (these types are defined in the action implementation)
export type {
  BulkSyncHierarchiesOptions,
  BulkSyncResult,
  MatchedHierarchyPair,
  SourceHierarchy,
} from '~/services/actions/bulk-sync-hierarchies';

/**
 * Summary of bulk sync operation before execution
 */
export type BulkSyncSummary = {
  totalSelected: number;
  totalMatched: number;
  totalMissing: number;
  missingHierarchies: MissingHierarchy[];
};

/**
 * Missing hierarchy information for reporting
 */
export type MissingHierarchy = {
  deliveryKey: string;
  schemaId: string;
  name: string;
  contentCount: number;
};
