// Phase 3: Filtering and validation utilities
export { buildFilterRegex } from './build-filter-regex';

// Barrel export for import-extensions helper functions
export { copyAndPrepareExtensions } from './copy-and-prepare-extensions';

export { extensionMatchesPattern } from './extension-matches-pattern';

export type { ExtensionWithPath, FilterResult, InvalidFile } from './filter-extensions';
export { filterExtensions } from './filter-extensions';
export { runDcCliImport } from './run-dc-cli-import';
export { updateExtensionFields, updateHubId, updateUrlOrigins } from './update-extension-fields';
export { validateExtensionFile } from './validate-extension-file';
