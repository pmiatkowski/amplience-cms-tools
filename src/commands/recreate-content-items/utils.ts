export function applyFilters(
  items: Amplience.ContentItem[],
  filters: Amplience.FilterCriteria & { rootHierarchyOnly: boolean }
): Amplience.ContentItem[] {
  let deliveryKeyRegex: RegExp | undefined;
  if (filters.deliveryKey) {
    try {
      deliveryKeyRegex = new RegExp(filters.deliveryKey);
    } catch {
      // Invalid regex should not crash filtering; treat as no-match filter.
      return [];
    }
  }

  return items.filter(item => {
    const schemaId = item.schemaId || item.body?._meta?.schema || '';

    // Schema ID filter
    if (filters.schemaId && !schemaId.includes(filters.schemaId)) {
      return false;
    }

    // Status filter
    if (filters.status && !filters.status.includes(item.status)) {
      return false;
    }

    // Publishing status filter
    if (filters.publishingStatus && !filters.publishingStatus.includes(item.publishingStatus)) {
      return false;
    }

    // Delivery key filter (regex pattern)
    if (deliveryKeyRegex && !deliveryKeyRegex.test(item.body._meta?.deliveryKey || '')) {
      return false;
    }

    // Root hierarchy only filter
    if (filters.rootHierarchyOnly && item.hierarchy && !item.hierarchy.root) {
      return false;
    }

    return true;
  });
}
