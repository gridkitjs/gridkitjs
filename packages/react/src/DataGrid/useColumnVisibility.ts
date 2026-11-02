import type { Dispatch, SetStateAction } from "react";
import {
  setColumnVisibility,
  type ColumnVisibilityEvent,
  type ColumnVisibilityState,
} from "@gridkitjs/core";
import type { DataColumn } from "./DataGrid";
import { commitIfChanged } from "./commitIfChanged";

interface UseColumnVisibilityOptions<Row> {
  /** Every column, hidden ones included — what a show or hide is resolved against. */
  dataColumns: readonly DataColumn<Row>[];
  visibility: ColumnVisibilityState;
  setVisibility: Dispatch<SetStateAction<ColumnVisibilityState>>;
  onColumnVisibilityChange?:
    ((event: ColumnVisibilityEvent) => void) | undefined;
}

export interface ColumnVisibilityApi {
  showColumns: (columnIds: readonly string[]) => void;
  hideColumns: (columnIds: readonly string[]) => void;
}

/**
 * Shows and hides columns. The transition comes from `@gridkitjs/core`'s
 * `setColumnVisibility`; this hook supplies the state and reports the
 * result, once per call however many columns it touched, and not at all
 * for a call that changed nothing.
 */
export default function useColumnVisibility<Row>({
  dataColumns,
  visibility,
  setVisibility,
  onColumnVisibilityChange,
}: UseColumnVisibilityOptions<Row>): ColumnVisibilityApi {
  function change(columnIds: readonly string[], visible: boolean): void {
    const next = setColumnVisibility(
      dataColumns,
      visibility,
      columnIds,
      visible,
    );
    commitIfChanged(visibility, next, setVisibility, (committed) => {
      onColumnVisibilityChange?.({
        // In display order, whatever order the caller named them in.
        columnIds: dataColumns
          .filter((entry) => committed[entry.id] !== visibility[entry.id])
          .map((entry) => entry.id),
        visibility: committed,
      });
    });
  }

  // A new object each render, as the other hooks here return.
  return {
    showColumns: (columnIds) => {
      change(columnIds, true);
    },
    hideColumns: (columnIds) => {
      change(columnIds, false);
    },
  };
}
