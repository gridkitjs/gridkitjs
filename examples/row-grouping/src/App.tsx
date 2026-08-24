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
      <h1 className="text-xl font-semibold">groupableColumns</h1>
      <DataGridComponent
        columns={columns}
        dataSource={deploymentRows}
        borders="horizontal"
        groupableColumns
        groupByDraggableColumns
        defaultGroupBy={[{ columnId: "Environment.Name" }]}
        onGroupByChange={({ groupBy }) => {
          record(
            `onGroupByChange — ${
              groupBy.length === 0
                ? "cleared"
                : groupBy.map((level) => level.columnId).join(" → ")
            }`,
          );
        }}
      />
      <EventLog entries={entries} />
    </main>
  );
}
