import { useEffect, useRef, useState } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import {
  DataGrid,
  type DataGridApi,
  type DataGridProps,
  type PrintOptions,
} from "@gridkitjs/react";
import { recordPrints, type RecordedPrint } from "./printRecorder";

interface Row {
  id: string;
  name: string;
  region: string;
  score: number;
  code: string;
  notes: string;
  city: string;
  team: string;
  owner: string;
}

const regions = ["West", "East"];

/** `count` rows, alternating West and East: `Name 1` is West, `Name 2` East. */
function rowsOf(count: number): Row[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `r${String(index + 1)}`,
    name: `Name ${String(index + 1)}`,
    region: regions[index % regions.length] ?? "West",
    score: index + 1,
    code: `C${String(index + 1)}`,
    notes: `secret ${String(index + 1)}`,
    city: "Skopje",
    team: "Blue",
    owner: "Ana",
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "name", header: "Name", width: 120 },
  { field: "region", header: "Region", width: 100 },
  { field: "score", header: "Score", width: 80, type: "number" },
  { field: "code", header: "Code", width: 80, hidden: true },
  { field: "notes", header: "Notes", width: 80, exportable: false },
];

/** Seven shown columns: one more than a portrait page takes by default. */
const wideColumns: readonly ColumnDefinition<Row>[] = [
  { field: "name", header: "Name", width: 120 },
  { field: "region", header: "Region", width: 100 },
  { field: "score", header: "Score", width: 80, type: "number" },
  { field: "code", header: "Code", width: 80 },
  { field: "city", header: "City", width: 80 },
  { field: "team", header: "Team", width: 80 },
  { field: "owner", header: "Owner", width: 80 },
];

export interface PrintGridProps extends Omit<
  DataGridProps<Row>,
  "columns" | "dataSource" | "getRowId" | "ref"
> {
  /** How many rows the grid holds; 4 when left out. */
  readonly rowCount?: number;
  /** Seven shown columns rather than three. */
  readonly wide?: boolean;
  /** What "Print through the ref" passes to `print`. */
  readonly printOptions?: PrintOptions;
}

/**
 * A grid of `rowCount` rows — Name, Region, Score, a hidden Code and an
 * unexportable Notes column, or seven shown ones with `wide` — that writes
 * every print as its dialog opened into `prints`, as `PrintHarness` does.
 * "Print through the ref" calls `print(printOptions)`, and writes `settled`
 * once its promise resolves.
 */
export default function PrintGrid({
  rowCount = 4,
  wide = false,
  printOptions,
  ...props
}: PrintGridProps) {
  const gridRef = useRef<DataGridApi<Row>>(null);
  const [rows] = useState(() => rowsOf(rowCount));
  const [prints, setPrints] = useState<readonly RecordedPrint[]>([]);
  const [settled, setSettled] = useState(0);

  useEffect(
    () =>
      recordPrints((print) => {
        setPrints((current) => [...current, print]);
      }),
    [],
  );

  return (
    <div>
      <DataGrid
        label="Print grid"
        {...props}
        ref={gridRef}
        columns={wide ? wideColumns : columns}
        dataSource={rows}
        getRowId={(row) => row.id}
      />
      <button
        type="button"
        onClick={() => {
          void gridRef.current?.print(printOptions).then(() => {
            setSettled((current) => current + 1);
          });
        }}
      >
        Print through the ref
      </button>
      <output data-testid="prints">{JSON.stringify(prints)}</output>
      <output data-testid="settled">{settled}</output>
    </div>
  );
}
