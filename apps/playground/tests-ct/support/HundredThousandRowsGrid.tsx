import { DataGrid } from "@gridkitjs/react";
import { hundredThousandRows, type LargeRow } from "../../src/largeDataset";

/**
 * The playground's 100,000 synthetic rows in a virtualized grid whose filter
 * menus are the excel editor's, with counts: `Name` holds a different value
 * in every row, `Region` one of five, each in 20,000 rows.
 */
export default function HundredThousandRowsGrid() {
  return (
    <DataGrid<LargeRow>
      label="100,000 rows"
      columns={[
        { field: "Id", width: 90, type: "number", filterable: false },
        { field: "Name", width: 160 },
        { field: "Region", width: 120 },
      ]}
      dataSource={hundredThousandRows()}
      getRowId={(row) => String(row.Id)}
      height={300}
      virtualized
      filterableColumns
      filterMenu={{ ui: "excel", showCounts: true }}
    />
  );
}
