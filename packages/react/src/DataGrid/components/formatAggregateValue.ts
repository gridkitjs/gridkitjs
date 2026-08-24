/**
 * A computed aggregate result rendered as plain text — used by both
 * `GridGroupRow` (a group's inline subtotal) and `GridFooter` (the grand
 * total) as the fallback when a column defines no `footerTemplate` of its
 * own. Numbers get locale grouping since a raw `sum`/`count` easily runs
 * into the thousands in an ERP-sized dataset; everything else mirrors
 * `GridGroupRow`'s own `formatGroupValue` so a value renders consistently
 * whether it's a group's own value or one of its aggregates.
 */
export function formatAggregateValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  switch (typeof value) {
    case "string":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(value);
    case "number":
      return value.toLocaleString();
    case "function":
      return "(function)";
    default:
      return JSON.stringify(value);
  }
}
