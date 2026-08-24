import { defineColumnsFromRows } from "@gridkitjs/core";
import { DataGridComponent, type ColumnDefinition } from "@gridkitjs/react";
import { deploymentRows, type DeploymentRow } from "./fixtures";
import { EventLog, useEventLog } from "./EventLog";

const columns: readonly ColumnDefinition<DeploymentRow>[] = [
  ...defineColumnsFromRows(deploymentRows),
];

export default function App() {
  const { entries, record } = useEventLog();

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">
        {'selectable={{ cells: "single" }}'}
      </h1>
      <DataGridComponent
        columns={columns}
        dataSource={deploymentRows}
        getRowId={(row) => String(row.Id)}
        borders="all"
        selectable={{ cells: "single" }}
        onCellSelect={({ cell }) => {
          record(
            `onCellSelect — ${cell.columnId} of row ${cell.rowId} = ${String(cell.value)}`,
          );
        }}
        onCellDeselect={() => {
          record("onCellDeselect — cleared");
        }}
      />
      <EventLog entries={entries} />
    </main>
  );
}
