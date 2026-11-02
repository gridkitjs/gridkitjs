import type { ReactNode } from "react";
import type { ColumnDefinition, GridMessages } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

export interface LocalizedRow {
  id: string;
  /** `null` for a row with no name, which groups under `blankGroupValue`. */
  name: string | null;
  active: boolean;
}

const columns: readonly ColumnDefinition<LocalizedRow, ReactNode>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 160 },
  { field: "active", type: "boolean", width: 100 },
];

/** German for the strings a test reads, functions included. */
const messages: Partial<GridMessages> = {
  previousPage: "Zurück",
  nextPage: "Weiter",
  pageStatus: (page, pageCount) =>
    `Seite ${String(page)} von ${String(pageCount)}`,
  booleanTrue: "ja",
  booleanFalse: "nein",
  blankGroupValue: "(leer)",
};

/**
 * Messages that interpolate are functions the grid calls during render, which
 * a function passed across Playwright CT's bridge from a spec cannot answer —
 * the limitation `RowIdentifiedGrid` describes — so they are defined here.
 */
export default function LocalizedGrid(
  props: Omit<DataGridProps<LocalizedRow>, "columns" | "messages">,
) {
  return <DataGrid {...props} columns={columns} messages={messages} />;
}
