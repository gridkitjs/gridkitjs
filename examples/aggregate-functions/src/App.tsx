import { defineColumnsFromRows } from "@gridkitjs/core";
import { DataGridComponent, type ColumnDefinition } from "@gridkitjs/react";
import { deploymentRows, type DeploymentRow } from "./fixtures";

const columns: readonly ColumnDefinition<DeploymentRow>[] = [
  ...defineColumnsFromRows(deploymentRows),
];

export default function App() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">
        {'aggregates={[{ columnId: "Cost", fn: "sum" }]}'}
      </h1>
      <DataGridComponent
        columns={columns}
        dataSource={deploymentRows}
        borders="horizontal"
        groupableColumns
        defaultGroupBy={[{ columnId: "Environment.Name" }]}
        aggregates={[{ columnId: "Cost", fn: "sum" }]}
      />
    </main>
  );
}
