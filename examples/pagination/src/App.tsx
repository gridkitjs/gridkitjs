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
      <h1 className="text-xl font-semibold">paginated</h1>
      <DataGridComponent
        columns={columns}
        dataSource={deploymentRows}
        borders="horizontal"
        paginated
        defaultPagination={{ pageIndex: 0, pageSize: 2 }}
        pager={{ sizeOptions: [2, 3, 5] }}
        onPaginationChange={({ pagination }) => {
          record(
            `onPaginationChange — page ${String(pagination.pageIndex + 1)}, size ${String(pagination.pageSize)}`,
          );
        }}
      />
      <EventLog entries={entries} />
    </main>
  );
}
