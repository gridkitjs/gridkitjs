import { useState } from "react";
import { DataGrid, type ResizeMode } from "@gridkitjs/react";
import { columns, rows } from "./applicationCosts";

const modes: readonly { value: ResizeMode; description: string }[] = [
  { value: "fit", description: "columns fill the grid" },
  { value: "fixed", description: "columns keep their own width" },
];

export function ResizableSelectableGrid() {
  const [resizeMode, setResizeMode] = useState<ResizeMode>("fit");
  /** The last thing each selection callback reported, newest first. */
  const [log, setLog] = useState<readonly string[]>([]);

  function record(entry: string): void {
    setLog((entries) => [entry, ...entries].slice(0, 8));
  }

  return (
    <div>
      <fieldset className="flex gap-4 text-sm">
        <legend className="sr-only">Resize mode</legend>
        {modes.map((mode) => (
          <label key={mode.value} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="resize-mode"
              value={mode.value}
              checked={resizeMode === mode.value}
              onChange={() => {
                setResizeMode(mode.value);
              }}
            />
            <code>{mode.value}</code>
            <span className="text-gray-600">{mode.description}</span>
          </label>
        ))}
      </fieldset>
      <div className="mt-4">
        <DataGrid
          columns={columns}
          dataSource={rows}
          getRowId={(row) => String(row.Id)}
          label="Application costs"
          borders="all"
          resizableColumns
          reorderableColumns
          sortableColumns
          resizeMode={resizeMode}
          selectable={{
            rows: "multiple",
            columns: "multiple",
            cells: "single",
          }}
          onRowSelect={({ row }) => {
            record(`onRowSelect — ${row.row.Application.Name}`);
          }}
          onRowsSelect={({ rows: selected }) => {
            record(`onRowsSelect — ${String(selected.length)} row(s)`);
          }}
          onRowDeselect={({ row }) => {
            record(`onRowDeselect — ${row.row.Application.Name}`);
          }}
          onRowSelectionChange={({ added, removed, selected }) => {
            record(
              `onRowSelectionChange — +${String(added.length)} -${String(removed.length)}, ${String(selected.length)} selected`,
            );
          }}
          onColumnSelect={({ column }) => {
            record(`onColumnSelect — ${column.column.column.field}`);
          }}
          onCellSelect={({ cell }) => {
            record(
              `onCellSelect — ${cell.columnId} of row ${cell.rowId} = ${String(cell.value)}`,
            );
          }}
          onColumnSortChange={({ sort }) => {
            const summary =
              sort.length === 0
                ? "cleared"
                : sort
                    .map((entry) => `${entry.columnId}:${entry.direction}`)
                    .join(", ");
            record(`onColumnSortChange — ${summary}`);
          }}
        />
      </div>
      <h2 className="mt-8 text-lg font-bold">Selection & sort callbacks</h2>
      <ol className="mt-2 min-h-24 rounded border border-gray-300 p-2 text-xs">
        {log.length === 0 ? (
          <li className="text-gray-500">
            Click, Ctrl+Click or Shift+Click a row, a header or a cell — or
            click a header's sort toggle.
          </li>
        ) : (
          log.map((entry, index) => (
            <li key={`${entry}-${String(index)}`}>
              <code>{entry}</code>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
