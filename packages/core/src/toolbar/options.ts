import type { BuiltInCommandId } from "../commands/builtInCommands";
import type { ToolbarEntry, ToolbarItemAttributes } from "./types";

/**
 * A grid's toolbar: what it lists, what a screen reader calls it, and the
 * attributes of the app's own its entries' elements carry.
 */
export interface GridToolbarOptions<Row> {
  /** The toolbar's entries, in order. Left out, the defaults. */
  readonly items?: readonly ToolbarEntry<Row>[] | undefined;
  /** The toolbar's accessible name. Left out, `messages.toolbarLabel`. */
  readonly label?: string | undefined;
  /**
   * Attributes for entries' elements, by the entry's key: a command's,
   * inline item's, dropdown's or custom entry's id, `"search"` or
   * `"export"`. A key naming no entry, or a separator or spacer, is ignored.
   */
  readonly itemAttributes?:
    Readonly<Record<string, ToolbarItemAttributes>> | undefined;
}

/**
 * What a toolbar lists unless the grid says otherwise: the search box, then
 * the free space, then "Clear filters" and "Choose columns" at the far end.
 */
export const defaultToolbar: readonly (
  BuiltInCommandId | "search" | "spacer"
)[] = ["search", "spacer", "filter.clearAll", "column.choose"];

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
