import { useState } from "react";
import type {
  ColumnDefinition,
  GridCommand,
  GridContextMenuOptions,
} from "@gridkitjs/core";
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
  { field: "name", header: "Name", width: 160 },
  { field: "score", header: "Score", width: 100, type: "number" },
];

export interface ContextMenuGridProps extends Omit<
  DataGridProps<Row>,
  | "columns"
  | "dataSource"
  | "getRowId"
  | "contextMenu"
  | "commands"
  | "onCommand"
  | "ref"
> {
  /**
   * Registers the app's commands: "Flag row", listed in the cell menu after
   * "Open row", and a `column.hide` of its own, "Hide, as an admin".
   */
  readonly withCommands?: boolean;
}

/**
 * A grid whose context menus are worked out by functions and hold inline
 * items, a submenu and checkable items — none of which a spec can pass,
 * since a function from a spec never reaches the browser. What the items do
 * is written to `log`, and every command `onCommand` hears to `commands`,
 * where a spec can read them:
 *
 * - The header menu puts "Hide column" first, drops both autofits and adds a
 *   "View" submenu of checkable "Compact rows" and "Wrap text", then a
 *   checkable "Pin column" of its own.
 * - The cell menu adds "Open row" before the defaults, and gives the Id
 *   column no grid menu at all.
 * - The group row menu is off; the body's empty space has a "Refresh" item.
 */
export default function ContextMenuGrid({
  withCommands = false,
  ...props
}: ContextMenuGridProps) {
  const [log, setLog] = useState<readonly string[]>([]);
  const [heard, setHeard] = useState<readonly string[]>([]);
  const [compact, setCompact] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [pinned, setPinned] = useState<readonly string[]>([]);

  function note(entry: string): void {
    setLog((current) => [...current, entry]);
  }

  const commands: readonly GridCommand<Row>[] = [
    {
      id: "row.flag",
      label: "Flag row",
      isVisible: ({ target }) => target.area === "cell",
      execute: ({ row }) => {
        note(`flag ${row?.row.name ?? "nothing"}`);
      },
    },
    {
      id: "column.hide",
      label: "Hide, as an admin",
      isVisible: ({ target }) => target.area === "header",
      execute: ({ column, actions }) => {
        if (column !== null) {
          note(`hide ${column.id}`);
          actions.hideColumns([column.id]);
        }
      },
    },
  ];

  const contextMenu: GridContextMenuOptions<Row> = {
    header: ({ target, defaults }) => [
      "column.hide",
      "separator",
      ...defaults.filter(
        (entry) =>
          entry !== "column.hide" &&
          entry !== "column.autoFit" &&
          entry !== "column.autoFitAll",
      ),
      "separator",
      {
        type: "submenu",
        id: "view",
        label: "View",
        items: [
          {
            type: "item",
            id: "view.compact",
            label: "Compact rows",
            checked: compact,
            onSelect: () => {
              setCompact((current) => !current);
            },
          },
          {
            type: "item",
            id: "view.wrap",
            label: "Wrap text",
            checked: wrap,
            onSelect: () => {
              setWrap((current) => !current);
            },
          },
        ],
      },
      {
        type: "item",
        id: "pin",
        label: "Pin column",
        checked: pinned.includes(target.columnId),
        onSelect: () => {
          setPinned((current) =>
            current.includes(target.columnId)
              ? current.filter((id) => id !== target.columnId)
              : [...current, target.columnId],
          );
        },
      },
    ],
    cell: ({ target, defaults }) =>
      target.columnId === "id"
        ? null
        : [
            {
              type: "item",
              id: "row.open",
              label: "Open row",
              onSelect: ({ row }) => {
                note(`open ${row?.row.name ?? "nothing"}`);
              },
            },
            ...(withCommands ? ["row.flag"] : []),
            "separator",
            ...defaults,
          ],
    group: [],
    body: [
      {
        type: "item",
        id: "grid.refresh",
        label: "Refresh",
        onSelect: () => {
          note("refresh");
        },
      },
    ],
  };

  return (
    <div>
      <DataGrid
        label="Shaped menus"
        sortableColumns
        resizableColumns
        {...props}
        columns={columns}
        dataSource={rows}
        getRowId={(row) => row.id}
        contextMenu={contextMenu}
        commands={withCommands ? commands : undefined}
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
