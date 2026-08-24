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
      <h1 className="text-xl font-semibold">sortableColumns</h1>
      <DataGridComponent
        columns={columns}
        dataSource={deploymentRows}
        borders="all"
        sortableColumns
        onColumnSortChange={({ sort }) => {
          record(
            `onColumnSortChange — ${
              sort.length === 0
                ? "cleared"
                : sort
                    .map((entry) => `${entry.columnId} ${entry.direction}`)
                    .join(", then ")
            }`,
          );
        }}
      />
      <EventLog entries={entries} />
    </main>
  );
}
