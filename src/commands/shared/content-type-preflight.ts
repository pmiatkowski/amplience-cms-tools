import type { ContentItemRecreationPreflightResult } from '~/services/actions';

export function displayContentTypePreflightResult(
  result: ContentItemRecreationPreflightResult,
  targetRepositoryName: string
): void {
  if (result.status === 'ready') {
    for (const warning of result.warnings) {
      console.warn(`⚠️  ${warning}`);
    }

    if (result.referenceSummary) {
      console.log('📊 Reference discovery summary:');
      console.log(`  - Discovered: ${result.referenceSummary.totalDiscovered}`);
      console.log(
        `  - Already matched references in target: ${result.referenceSummary.matchedReferences}`
      );
      console.log(`  - Need to create: ${result.referenceSummary.itemsToCreate}`);
      console.log(`  - External references: ${result.referenceSummary.externalReferences}`);
      console.log(`  - Circular reference groups: ${result.referenceSummary.circularGroups}`);
    }

    const requiredCount = result.validation.requiredContentTypeUris.length;
    const contentTypeLabel = requiredCount === 1 ? 'content type is' : 'content types are';
    console.log(
      `✓ Content type preflight passed: ${requiredCount} required ${contentTypeLabel} assigned to "${targetRepositoryName}".`
    );

    return;
  }

  console.error('\n❌ Content type preflight blocked the operation.');

  switch (result.reason) {
    case 'reference-discovery-failed':
      console.error(`Reference discovery failed: ${result.error}`);
      break;
    case 'reference-resolution-failed':
      console.error(`Reference ${result.phase} failed: ${result.error}`);
      break;
    case 'source-items-unavailable':
      console.error(`Could not load these source items: ${result.missingItemIds.join(', ')}`);
      break;
    case 'content-type-lookup-failed':
      console.error(
        `Could not load content types assigned to "${targetRepositoryName}": ${result.validation.error}`
      );
      break;
    case 'content-type-validation-failed':
      if (result.validation.missingContentTypes.length > 0) {
        console.error(
          `Please assign these content types to "${targetRepositoryName}" before continuing:`
        );

        for (const missingContentType of result.validation.missingContentTypes) {
          const itemLabel = missingContentType.itemCount === 1 ? 'item' : 'items';
          console.error(
            `  - ${missingContentType.contentTypeUri} (${missingContentType.itemCount} ${itemLabel})`
          );
          for (const item of missingContentType.items) {
            console.error(`    - ${item.label} (${item.id})`);
          }
        }
      }

      if (result.validation.itemsWithoutSchema.length > 0) {
        console.error('Could not determine a content type for these source items:');
        for (const item of result.validation.itemsWithoutSchema) {
          console.error(`  - ${item.label} (${item.id})`);
        }
      }
      break;
  }

  console.error('❌ No target changes were made.');
}
