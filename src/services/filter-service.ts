/**
 * Filter content items by schemaId, status, and deliveryKey (regex)
 * All criteria are ANDed together.
 */
export function filterContentItems(
  items: Amplience.ContentItem[],
  criteria: {
    schemaId?: string;
    status?: string[];
    deliveryKey?: string;
    publishingStatus?: Amplience.PublishingStatus[];
    generalSearch?: string; // New: search across label, deliveryId, and deliveryKey
  }
): Amplience.ContentItem[] {
  let regex: RegExp | null = null;
  if (criteria.deliveryKey) {
    try {
      regex = new RegExp(criteria.deliveryKey);
    } catch {
      throw new Error(`Invalid deliveryKey regex: ${criteria.deliveryKey}`);
    }
  }

  let generalRegex: RegExp | null = null;
  if (criteria.generalSearch) {
    try {
      generalRegex = new RegExp(criteria.generalSearch);
    } catch {
      throw new Error(`Invalid general search regex: ${criteria.generalSearch}`);
    }
  }

  return items.filter(item => {
    if (criteria.schemaId && !(item.body?._meta?.schema || '').includes(criteria.schemaId))
      return false;

    if (
      criteria.publishingStatus &&
      criteria.publishingStatus.length > 0 &&
      !criteria.publishingStatus.includes(item.publishingStatus)
    ) {
      return false;
    }

    if (criteria.status && criteria.status.length > 0 && !criteria.status.includes(item.status))
      return false;
    if (regex && !regex.test(item.body._meta?.deliveryKey || '')) return false;

    // New: general search functionality
    if (generalRegex) {
      const label = item.label || '';
      const deliveryKey = item.body._meta?.deliveryKey || '';
      const name = item.body._meta?.name || '';
      // Note: deliveryId doesn't exist in the type, using id instead
      const itemId = item.id || '';

      if (
        !generalRegex.test(label) &&
        !generalRegex.test(deliveryKey) &&
        !generalRegex.test(itemId) &&
        !generalRegex.test(name)
      ) {
        return false;
      }
    }

    return true;
  });
}
