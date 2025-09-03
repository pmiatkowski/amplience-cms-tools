export function applyFilters(
  items: Amplience.ContentItem[],
  filters: Amplience.FilterCriteria & { rootHierarchyOnly: boolean }
): Amplience.ContentItem[] {
  return items.filter(item => {
    // Schema ID filter
    if (filters.schemaId && !item.schemaId.includes(filters.schemaId)) {
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

    // Delivery key filter
    if (
      filters.deliveryKey &&
      item.body._meta?.deliveryKey &&
      !item.body._meta.deliveryKey.includes(filters.deliveryKey)
    ) {
      return false;
    }

    // Root hierarchy only filter
    if (filters.rootHierarchyOnly && item.hierarchy && !item.hierarchy.root) {
      return false;
    }

    return true;
  });
}
