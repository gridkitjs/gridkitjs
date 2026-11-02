import { DataGrid, type DataGridProps } from "@gridkitjs/react";

interface RowWithId {
  readonly id: string;
}

/**
 * `getRowId` is called synchronously during render (inside a `useMemo`), and
 * Playwright CT's function-prop bridge only supports fire-and-forget event
 * handlers — a `getRowId` closure passed from a test silently receives a
 * pending-promise placeholder instead of the real string, corrupting every
 * row id. Defining it here instead means it never crosses that bridge: it's
 * ordinary browser-side code bundled alongside the component itself.
 *
 * Use this in place of `DataGrid` for any test whose point is row
 * identity that outlives a position change — everything else should mount
 * `DataGrid` directly and let rows fall back to their position.
 */
export default function RowIdentifiedGrid<Row extends RowWithId>(
  props: Omit<DataGridProps<Row>, "getRowId">,
) {
  return <DataGrid {...props} getRowId={(row) => row.id} />;
}
