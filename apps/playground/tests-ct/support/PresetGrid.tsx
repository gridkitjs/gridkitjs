import { excelFilter } from "@gridkitjs/react";
import FilterMenuGrid from "./FilterMenuGrid";

export interface PresetGridProps {
  /** Writes `filterMenu={{ ui: "simple" }}` after the preset's spread. */
  simpleAfter?: boolean;
}

/**
 * `FilterMenuGrid` with the `excelFilter` preset spread into it, and — given
 * `simpleAfter` — a `filterMenu` written after the spread, which has to win.
 * The preset is imported here because a spec cannot take a value from the
 * package beside a component it mounts.
 */
export default function PresetGrid({ simpleAfter = false }: PresetGridProps) {
  return simpleAfter ? (
    <FilterMenuGrid {...excelFilter} filterMenu={{ ui: "simple" }} />
  ) : (
    <FilterMenuGrid {...excelFilter} />
  );
}
