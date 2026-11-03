import type { GridCommandTarget } from "../commands/types";
import type {
  MenuEntry,
  ResolvedMenuEntry,
  ResolvedMenuSeparator,
} from "../menu/types";

/** Where a toolbar item's command runs: the toolbar item it was asked from. */
export type GridToolbarTarget = Extract<
  GridCommandTarget,
  { readonly area: "toolbar" }
>;

/**
 * A place in the toolbar the renderer fills with content of the app's own —
 * React's `renderToolbarItem(id)` — for anything the entries cannot say.
 */
export interface ToolbarCustomEntry {
  readonly type: "custom";
  readonly id: string;
}

/**
 * One entry of a toolbar as an app writes it: anything a menu lists — a
 * command id, `"separator"`, an inline item, or a submenu, which the toolbar
 * draws as a dropdown button — plus the entries only a toolbar has:
 * `"search"`, the box searching every column; `"spacer"`, which takes up the
 * free space and so pushes what follows it to the far end; and a custom
 * entry.
 */
export type ToolbarEntry<Row> =
  MenuEntry<Row> | "search" | "spacer" | ToolbarCustomEntry;

/**
 * A toolbar button ready to draw — a command, or an inline item — with
 * every label a string, every flag a boolean, and `run` bound to the
 * context of its place in the toolbar.
 */
export interface ResolvedToolbarButton {
  readonly type: "button";
  /** The command's id, or the inline item's. */
  readonly id: string;
  /** The same as `id`. */
  readonly key: string;
  readonly label: string;
  readonly icon?: string | undefined;
  readonly shortcut?: string | undefined;
  /** Drawn, and focusable, but `run` does nothing. */
  readonly disabled: boolean;
  /**
   * Whether a toggle button is pressed — `undefined` for a button that is
   * not one: a checkable command or item draws as a toggle.
   */
  readonly pressed: boolean | undefined;
  /** Runs the button, and says whether it ran — see `ResolvedMenuItem.run`. */
  readonly run: () => boolean;
}

/** A dropdown button, opening the menu its submenu entry lists. */
export interface ResolvedToolbarMenu {
  readonly type: "menu";
  readonly id: string;
  /** The same as `id`. */
  readonly key: string;
  readonly label: string;
  readonly icon?: string | undefined;
  /** Never empty: a dropdown with nothing to show is left out. */
  readonly items: readonly ResolvedMenuEntry[];
}

/** The search box, over the grid's global text filter. */
export interface ResolvedToolbarSearch {
  readonly type: "search";
  /** Always `"search"`. */
  readonly key: string;
}

/** The free space between the entries either side of it. */
export interface ResolvedToolbarSpacer {
  readonly type: "spacer";
  /** `spacer-<index>`, from its place among the entries it was resolved from. */
  readonly key: string;
}

/** A custom entry's place, for the renderer to fill. */
export interface ResolvedToolbarCustom {
  readonly type: "custom";
  readonly id: string;
  /** The same as `id`. */
  readonly key: string;
}

/**
 * One entry of a toolbar as `resolveToolbar` hands it to a renderer to draw.
 * Each has a `key` — an item's id, `"search"`, or a separator's or spacer's
 * place among the entries — unique among the toolbar's entries, which the
 * renderer writes into the entry's `data-gridkit-toolbar-item`.
 */
export type ResolvedToolbarItem =
  | ResolvedToolbarButton
  | ResolvedToolbarMenu
  | ResolvedToolbarSearch
  | ResolvedToolbarSpacer
  | ResolvedMenuSeparator
  | ResolvedToolbarCustom;
