import { DataGridComponent } from "@gridkitjs/react";

interface Row {
  Id: number;
  Region: string;
  Rep: string;
  Amount: number;
}

const regions = ["North", "South", "East", "West"];
const reps = ["Alex", "Bailey", "Casey", "Drew", "Elliot"];

const rows: Row[] = Array.from({ length: 43 }, (_unused, index) => ({
  Id: index + 1,
  Region: regions[index % regions.length] ?? "North",
  Rep: reps[index % reps.length] ?? "Alex",
  Amount: 100 + ((index * 37) % 900),
}));

/**
 * Grouped by Region and paginated at once — the combination
 * `packages/react/docs/rows/pagination.mdx` calls out explicitly, since a
 * page never splits a group: with 4 regions unevenly sized across 43 rows,
 * some pages hold noticeably more rendered rows than others despite sharing
 * one `pageSize`, because that size counts top-level groups, not leaf rows.
 */
export function PaginatedGrid() {
  return (
    <DataGridComponent
      columns={[
        { field: "Id", width: 80 },
        { field: "Region", width: 120 },
        { field: "Rep", width: 120 },
        { field: "Amount", width: 120, type: "currency" },
      ]}
      dataSource={rows}
      getRowId={(row) => String(row.Id)}
      label="Sales, grouped by region and paginated"
      borders="all"
      groupableColumns
      defaultGroupBy={[{ columnId: "Region" }]}
      sortableColumns
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 2 }}
      pager={{ sizeOptions: [2, 4, 10], variant: "numbered" }}
    />
  );
}
