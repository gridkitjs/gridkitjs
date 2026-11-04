import type { GridOptions } from "./options";

/**
 * Turns on the per-column filter popup in its Excel-style form — a search
 * box, a checklist of the column's values with their counts, and an operator
 * submenu — in one spread: `<DataGrid {...excelFilter} />`.
 *
 * A preset is a plain value of `GridOptions`, not a component or a hook, so
 * any renderer can take it the way it takes its other options (a Vue spread,
 * an Angular binding) and a later option overrides it: spreading it before
 * `filterMenu={{ ui: "simple" }}` brings the simple editor back. `filterMenu`
 * is replaced whole, not merged, so repeat `showCounts` if it should stay.
 */
export const excelFilter = {
  filterableColumns: true,
  filterMenu: { ui: "excel", showCounts: true },
} as const satisfies Partial<GridOptions<unknown>>;
