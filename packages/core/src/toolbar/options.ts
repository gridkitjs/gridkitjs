import type { BuiltInCommandId } from "../commands/builtInCommands";
import type { ToolbarEntry } from "./types";

/** A grid's toolbar: what it lists, and what a screen reader calls it. */
export interface GridToolbarOptions<Row> {
  /** The toolbar's entries, in order. Left out, the defaults. */
  readonly items?: readonly ToolbarEntry<Row>[] | undefined;
  /** The toolbar's accessible name. Left out, `messages.toolbarLabel`. */
  readonly label?: string | undefined;
}

/**
 * What a toolbar lists unless the grid says otherwise: the search box, then
 * the free space, then "Clear filters" at the far end.
 */
export const defaultToolbar: readonly (
  BuiltInCommandId | "search" | "spacer"
)[] = ["search", "spacer", "filter.clearAll"];

/**
 * The entries a grid's `toolbar` option lists, to resolve with
 * `resolveToolbar`: none while it is off — left out or `false` — the
 * defaults under `true` or an object without `items`, else its `items`.
 * No entries means no toolbar.
 */
export function toolbarEntries<Row>(
  toolbar: boolean | GridToolbarOptions<Row> | undefined,
): readonly ToolbarEntry<Row>[] {
  if (toolbar === undefined || toolbar === false) {
    return [];
  }
  return (toolbar === true ? undefined : toolbar.items) ?? defaultToolbar;
}
