import { useState } from "react";
import { DataGrid, excelFilter } from "@gridkitjs/react";
import { hundredThousandRows, type LargeRow } from "../largeDataset";

type FilterUi = "simple" | "excel";

const uis: readonly FilterUi[] = ["simple", "excel"];

/**
 * The filter popup over 100,000 rows, switchable between its two editors at
 * runtime. `excelFilter` turns filtering on and picks the excel editor; the
 * `filterMenu` written after its spread replaces the preset's, which is how
 * a prop overrides a preset. Both editors write the one filter, so a filter
 * set in one shows in the other. `Name` holds a different value in every
 * row — the checklist's worst case — and `Region` one of five.
 */
export function FilterMenuGrid() {
  const [ui, setUi] = useState<FilterUi>("excel");

  return (
    <div>
      <fieldset className="flex gap-4 text-sm">
        <legend className="sr-only">Filter editor</legend>
        {uis.map((option) => (
          <label key={option} className="flex items-center gap-1">
            <input
              type="radio"
              name="filter-ui"
              checked={ui === option}
              onChange={() => {
                setUi(option);
              }}
            />
            {option}
          </label>
        ))}
      </fieldset>
      <div className="mt-2">
        <DataGrid<LargeRow>
          {...excelFilter}
          filterMenu={{ ...excelFilter.filterMenu, ui }}
          columns={[
            { field: "Id", width: 90, type: "number", filterable: false },
            { field: "Name", width: 160 },
            { field: "Region", width: 120 },
            { field: "Status", width: 120 },
            { field: "Amount", width: 130, type: "currency" },
          ]}
          dataSource={hundredThousandRows()}
          getRowId={(row) => String(row.Id)}
          label="Filter menu, 100,000 rows"
          borders="all"
          sortableColumns
          contextMenu
          height={360}
          virtualized
        />
      </div>
    </div>
  );
}
