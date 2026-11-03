import { useState } from "react";
import type { ColumnDefinition, ToolbarEntry } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

interface Row {
  id: string;
  name: string;
  score: number;
}

const rows: Row[] = [
  { id: "row-c", name: "Charlie", score: 30 },
  { id: "row-a", name: "Alice", score: 9 },
  { id: "row-b", name: "Bravo", score: 21 },
];

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", header: "Id", width: 100 },
  { field: "name", header: "Name", width: 160, groupable: true },
  { field: "score", header: "Score", width: 100, type: "number" },
];

export interface ToolbarGridProps extends Omit<
  DataGridProps<Row>,
  | "columns"
  | "dataSource"
  | "getRowId"
  | "toolbar"
  | "renderToolbarItem"
  | "onCommand"
  | "ref"
> {
  /** Entries to list after the fixture's own, which need functions a spec cannot pass. */
  readonly extraItems?: readonly ToolbarEntry<Row>[];
  /** Lists only `extraItems`, without the fixture's own. */
  readonly onlyExtra?: boolean;
}

/**
 * A grid whose toolbar holds what a spec cannot pass, being functions: the
 * search box; "Clear all sorting" and "Clear filters"; a "Compact" toggle;
 * an "Actions" dropdown of "Export" and "Refresh"; a spacer; and a custom
 * "status" entry drawn by `renderToolbarItem` as a button reading
 * "status: roomy", or "status: compact" while the toggle is on. What the
 * inline items do is written to `log`, and every command `onCommand` hears
 * to `commands`, where a spec can read them.
 */
export default function ToolbarGrid({
  extraItems = [],
  onlyExtra = false,
  ...props
}: ToolbarGridProps) {
  const [log, setLog] = useState<readonly string[]>([]);
  const [heard, setHeard] = useState<readonly string[]>([]);
  const [compact, setCompact] = useState(false);

  function note(entry: string): void {
    setLog((current) => [...current, entry]);
  }

  const items: readonly ToolbarEntry<Row>[] = [
    "search",
    "separator",
    "sort.clearAll",
    "filter.clearAll",
    {
      type: "item",
      id: "view.compact",
      label: "Compact",
      checked: compact,
      onSelect: () => {
        setCompact((current) => !current);
      },
    },
    {
      type: "submenu",
      id: "actions",
      label: "Actions",
      items: [
        {
          type: "item",
          id: "actions.export",
          label: "Export",
          onSelect: ({ view }) => {
            note(`export ${String(view.rows.length)}`);
          },
        },
        {
          type: "item",
          id: "actions.refresh",
          label: "Refresh",
          onSelect: () => {
            note("refresh");
          },
        },
      ],
    },
    "spacer",
    { type: "custom", id: "status" },
  ];

  return (
    <div>
      <DataGrid
        label="Toolbar grid"
        sortableColumns
        {...props}
        columns={columns}
        dataSource={rows}
        getRowId={(row) => row.id}
        toolbar={{ items: onlyExtra ? extraItems : [...items, ...extraItems] }}
        renderToolbarItem={(id) => (
          <button type="button">
            {id}: {compact ? "compact" : "roomy"}
          </button>
        )}
        onCommand={({ commandId, target, source }) => {
          setHeard((current) => [
            ...current,
            `${source} ${commandId} ${JSON.stringify(target)}`,
          ]);
        }}
      />
      <output data-testid="log">{log.join("; ")}</output>
      <output data-testid="commands">{heard.join("; ")}</output>
    </div>
  );
}
