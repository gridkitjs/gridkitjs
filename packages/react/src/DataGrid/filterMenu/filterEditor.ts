import type { ReactNode, Ref, RefCallback } from "react";
import type {
  DataColumn,
  FilterState,
  GridMessages,
  ResolvedColumnFilterMenu,
} from "@gridkitjs/core";
import type { DataGridController } from "../useGridController";

/** What a filter menu's editor lends the menu around it, whose OK applies it. */
export interface FilterEditorHandle {
  /**
   * Applies the editor's draft, or marks what keeps it from applying and
   * moves focus there. Returns whether the menu may close.
   */
  apply: () => boolean;
}

/** What every filter menu editor is drawn with. */
export interface FilterEditorProps<Row> {
  /** The column whose filter it edits. */
  readonly column: DataColumn<Row, ReactNode>;
  /** The column's filter menu, settled: its operators and their family. */
  readonly menu: ResolvedColumnFilterMenu;
  readonly controller: DataGridController<Row>;
  readonly messages: GridMessages;
  /** Sets the filter the draft stands for, announcing the rows it keeps. */
  readonly applyFilter: (filter: FilterState<Row>) => void;
  /** The `ref` of the control focus starts on as the menu opens. */
  readonly initialFocusRef: RefCallback<HTMLElement>;
  readonly ref: Ref<FilterEditorHandle>;
}
