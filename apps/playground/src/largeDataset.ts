export interface LargeRow {
  Id: number;
  Name: string;
  Region: string;
  Status: string;
  Amount: number;
  Notes: string;
}

const regions = ["North", "South", "East", "West", "Central"];
const statuses = ["Open", "Pending", "Closed", "Escalated"];

/**
 * A few thousand synthetic rows — the smallest number that actually forces a
 * consumer to reach for `virtualized` rather than notice nothing. Every
 * existing playground demo tops out around a dozen hand-written rows, none
 * of which exercises windowing at all.
 *
 * `Notes` varies in length on purpose, and wraps (`wrap: { cells: true }` on
 * that column in the demo below) for roughly one row in five — the concrete
 * case dynamic, measured row heights exist for: a fixed-height virtualizer
 * would either clip that wrapped text or have to disallow it.
 */
export const largeRows: readonly LargeRow[] = Array.from(
  { length: 5000 },
  (_unused, index) => {
    const wraps = index % 5 === 0;
    return {
      Id: index + 1,
      Name: `Item ${String(index + 1)}`,
      Region: regions[index % regions.length] ?? "North",
      Status: statuses[index % statuses.length] ?? "Open",
      Amount: 10 + ((index * 47) % 4990),
      Notes: wraps
        ? `Row ${String(index + 1)} carries a longer note that wraps across more than one line once its column opts into wrapping, so this row measures taller than a single-line one around it.`
        : `Note ${String(index + 1)}`,
    };
  },
);
