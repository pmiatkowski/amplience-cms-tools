/**
 * Display a table in the console
 */
export function displayTable(rows: Record<string, unknown>[]): void {
  // Fallback to console.table if available
  if (console.table) {
    console.table(rows);
  } else {
    rows.forEach(row => console.log(row));
  }
}
