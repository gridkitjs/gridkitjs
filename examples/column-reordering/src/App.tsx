import { defineColumnsFromRows } from "@gridkitjs/core";
import { DataGrid, type ColumnDefinition } from "@gridkitjs/react";
import { deploymentRows, type DeploymentRow } from "./fixtures";
import { EventLog, useEventLog } from "./EventLog";

const columns: readonly ColumnDefinition<DeploymentRow>[] = [
  ...defineColumnsFromRows(deploymentRows),
];

export default function App() {
  const { entries, record } = useEventLog();

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">reorderableColumns</h1>
      <DataGrid
        columns={columns}
        dataSource={deploymentRows}
        borders="all"
        reorderableColumns
        onColumnOrderChange={({ columnId }) => {
          record(`onColumnOrderChange — ${columnId} moved`);
        }}
      />
      <EventLog entries={entries} />
    </main>
  );
}
