import { useState } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";

interface ManyValuesRow {
  id: string;
  value: string;
  parity: "Odd" | "Even";
}

/** How many labels the `Value` column's `valueFormatter` has made since the page loaded. */
let labelsMade = 0;

/**
 * `Value`'s cells draw their own text, so its `valueFormatter` labels only
 * the values its filter checklist counts — each call is one of those.
 */
const columns: readonly ColumnDefinition<ManyValuesRow>[] = [
  {
    field: "value",
    header: "Value",
    width: 160,
    valueFormatter: (value) => {
      labelsMade++;
      return String(value);
    },
    cellTemplate: ({ value }) => String(value),
  },
  { field: "parity", header: "Parity", width: 100 },
];

export interface ManyValuesGridProps {
  /** How many rows: one value each, "Value 00001" on, odd and even in turn. */
  size: number;
  /** The grid's `filterMenu.valueLimit`, left at its default when omitted. */
  valueLimit?: number;
}

/**
 * A virtualized grid whose filter menus are the excel editor's, over a
 * column with as many values as rows. "Count the labels" writes how many
 * labels `Value`'s checklist has had made so far to `labels` — counted
 * outside React, since they are made while a menu renders.
 */
export default function ManyValuesGrid({
  size,
  valueLimit,
}: ManyValuesGridProps) {
  const [rows] = useState(() =>
    Array.from({ length: size }, (_, index): ManyValuesRow => ({
      id: `row-${String(index + 1)}`,
      value: `Value ${String(index + 1).padStart(5, "0")}`,
      parity: index % 2 === 0 ? "Odd" : "Even",
    })),
  );
  const [labels, setLabels] = useState("");

  return (
    <div>
      <DataGrid
        label="Many values"
        columns={columns}
        dataSource={rows}
        getRowId={(row) => row.id}
        height={200}
        virtualized
        filterableColumns
        filterMenu={
          valueLimit === undefined
            ? { ui: "excel" }
            : { ui: "excel", valueLimit }
        }
      />
      <button
        type="button"
        onClick={() => {
          setLabels(String(labelsMade));
        }}
      >
        Count the labels
      </button>
      <output data-testid="labels">{labels}</output>
    </div>
  );
}
