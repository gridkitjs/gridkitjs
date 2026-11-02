import { useState } from "react";
import type { GridState } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

interface RowWithId {
  readonly id: string;
}

/** The slices this harness can hold as a parent would. */
export type ControlledSlices<Row> = Partial<
  Pick<
    GridState<Row>,
    | "columnSort"
    | "groupBy"
    | "groupExpansion"
    | "pagination"
    | "rowSelection"
    | "columnSelection"
    | "cellSelection"
  >
>;

export interface ControlledStateGridProps<Row extends RowWithId> extends Omit<
  DataGridProps<Row>,
  "getRowId" | keyof ControlledSlices<Row>
> {
  /**
   * The slices to control, with their starting values. A slice left out
   * stays uncontrolled — the grid keeps it, as it would with no parent.
   */
  controlled: ControlledSlices<Row>;
}

/**
 * A parent holding grid state the way a real one controlling it would — in
 * its own `useState`, fed back through the controlled props — but applying a
 * requested change only when the "apply-requests" button is pressed, so a
 * spec can see the grid hold still until then. Every `on*Change` request is
 * counted and the latest kept in a JSON status element.
 *
 * Browser-side because the change callbacks have to return into this
 * component's own state, which a function passed across Playwright CT's
 * bridge from a spec never does — the limitation `RowIdentifiedGrid`
 * describes.
 */
export default function ControlledStateGrid<Row extends RowWithId>({
  controlled,
  ...props
}: ControlledStateGridProps<Row>) {
  const [values, setValues] = useState(controlled);
  const [requested, setRequested] = useState<ControlledSlices<Row>>({});
  const [requestCount, setRequestCount] = useState(0);

  /** Counts every request, and keeps those for a slice this parent controls. */
  function request<Slice extends keyof ControlledSlices<Row>>(
    slice: Slice,
    value: ControlledSlices<Row>[Slice],
  ): void {
    setRequestCount((count) => count + 1);
    if (slice in controlled) {
      setRequested((current) => ({ ...current, [slice]: value }));
    }
  }

  return (
    <div>
      <DataGrid
        {...props}
        {...values}
        getRowId={(row) => row.id}
        onColumnSortChange={(event) => {
          request("columnSort", event.sort);
        }}
        onGroupByChange={(event) => {
          request("groupBy", event.groupBy);
        }}
        onGroupExpansionChange={(event) => {
          request("groupExpansion", event.expansion);
        }}
        onPaginationChange={(event) => {
          request("pagination", event.pagination);
        }}
        onRowSelectionChange={(event) => {
          request("rowSelection", event.selection);
        }}
        onColumnSelectionChange={(event) => {
          request("columnSelection", event.selection);
        }}
        onCellSelectionChange={(event) => {
          request("cellSelection", event.selection);
        }}
      />
      <button
        type="button"
        onClick={() => {
          setValues((current) => ({ ...current, ...requested }));
          setRequested({});
        }}
      >
        apply-requests
      </button>
      <pre data-testid="controlled-status">
        {JSON.stringify({ requestCount, requested })}
      </pre>
    </div>
  );
}
