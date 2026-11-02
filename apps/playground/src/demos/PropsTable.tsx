import { DataGrid, type ColumnDefinition } from "@gridkitjs/react";

interface PropRow {
  name: string;
  type: string;
  default?: string;
  description: string;
}

const propColumns: readonly ColumnDefinition<PropRow>[] = [
  {
    field: "name",
    headerTemplate: "Prop",
    cellTemplate: ({ value }) => (
      <code className="text-xs text-black">{String(value)}</code>
    ),
  },
  {
    field: "type",
    headerTemplate: "Type",
    wrap: { header: true, cells: true },
    cellTemplate: ({ value }) => (
      <code className="text-xs text-gray-600">{String(value)}</code>
    ),
  },
  {
    field: "default",
    headerTemplate: "Default",
    cellTemplate: ({ value }) => (
      <code className="text-xs text-gray-600">
        {typeof value === "string" && value !== "" ? value : "—"}
      </code>
    ),
  },
  {
    field: "description",
    headerTemplate: "Description",
    wrap: { header: true, cells: true },
    cellClassName: "text-gray-600",
  },
];

const propRows: readonly PropRow[] = [
  {
    name: "columns",
    type: "readonly ColumnDefinition<Row>[]",
    description:
      "Columns to render. Falls back to defineColumnsFromRows(dataSource) when omitted.",
  },
  {
    name: "dataSource",
    type: "readonly Row[]",
    description: "The rows to render.",
  },
  {
    name: "getRowId",
    type: "(row: Row, index: number) => string",
    default: "row position",
    description:
      "A row's stable identity, for state keyed by it. Give one for data that sorts, filters or pages.",
  },
  {
    name: "label",
    type: "string",
    description:
      "The grid's accessible name, announced when it takes focus. Use labelledBy for a heading already on the page.",
  },
  {
    name: "borders",
    type: '"horizontal" | "vertical" | "all" | "none"',
    description: "Which cell borders to draw.",
  },
  {
    name: "hoverable",
    type: "{ rows?, columns?, cells? }",
    description: "Which hover highlighting to enable.",
  },
  {
    name: "selectable",
    type: '{ rows?, columns?: false | "single" | "multiple", cells?: false | "single" }',
    default: "all off",
    description:
      "Which parts of the grid the user may select, and how many of each. Off by default: selection claims the click.",
  },
  {
    name: "onRowSelect / onRowsSelect",
    type: "(event) => void",
    description:
      "One per row selected, and one per interaction with all of them. Deselect and SelectionChange pairs alongside, and the same set for columns and cells.",
  },
  {
    name: "resizableColumns",
    type: "boolean",
    default: "false",
    description:
      "Whether columns can be dragged wider, unless a column says otherwise.",
  },
  {
    name: "reorderableColumns",
    type: "boolean",
    default: "false",
    description: "Whether columns can be dragged into a new position.",
  },
  {
    name: "resizeMode",
    type: '"fit" | "fixed"',
    default: '"fit"',
    description: "Whether columns fill the grid's width or sit at their own.",
  },
];

export function PropsTable() {
  return (
    <div className="w-full rounded-xl border border-gray-300 border-b-0">
      <DataGrid
        columns={propColumns}
        dataSource={propRows}
        getRowId={(row) => row.name}
        label="DataGrid props"
        resizeMode="fit"
        borders="horizontal"
        hoverable={{ rows: false, cells: false, columns: false }}
      />
    </div>
  );
}
