import type { BuiltInCommandId } from "../commands/builtInCommands";
import type { GridCommandContext } from "../commands/types";

/** A value given outright, or worked out from the context each time the menu is resolved. */
type FromContext<Row, Value> =
  Value | ((context: GridCommandContext<Row>) => Value);

/**
 * An item written into the menu itself rather than registered as a command —
 * for an action only one menu offers.
 */
export interface MenuItemEntry<Row> {
  readonly type: "item";
  readonly id: string;
  readonly label: FromContext<Row, string>;
  readonly icon?: string | undefined;
  readonly shortcut?: string | undefined;
  readonly hidden?: FromContext<Row, boolean> | undefined;
  readonly disabled?: FromContext<Row, boolean> | undefined;
  /** Present for a checkable item, and says whether it is checked. */
  readonly checked?: FromContext<Row, boolean> | undefined;
  readonly onSelect: (context: GridCommandContext<Row>) => void;
}

/** An item that opens a menu of its own. Left out when nothing in it shows. */
export interface MenuSubmenuEntry<Row> {
  readonly type: "submenu";
  readonly id: string;
  readonly label: FromContext<Row, string>;
  readonly icon?: string | undefined;
  readonly items: readonly MenuEntry<Row>[];
}

/**
 * One entry of a menu as an app writes it: a command id — a built-in's or
 * one of its own — `"separator"`, an inline item or a submenu. The same
 * vocabulary every menu and toolbar is listed in.
 */
export type MenuEntry<Row> =
  | BuiltInCommandId
  | "separator"
  | (string & {})
  | MenuItemEntry<Row>
  | MenuSubmenuEntry<Row>;

/**
 * A menu item ready to draw: every label a string, every flag a boolean, and
 * `run` bound to the context the menu was resolved in.
 */
export interface ResolvedMenuItem {
  readonly type: "item";
  /** The command's id, or the inline item's. */
  readonly id: string;
  readonly label: string;
  readonly icon?: string | undefined;
  readonly shortcut?: string | undefined;
  /** Drawn, and focusable, but `run` does nothing. */
  readonly disabled: boolean;
  /** `undefined` for an item that is not checkable. */
  readonly checked: boolean | undefined;
  /**
   * Runs the item — a command only when it is still visible and enabled —
   * and says whether it ran, so a renderer reports only what did something.
   */
  readonly run: () => boolean;
}

export interface ResolvedMenuSubmenu {
  readonly type: "submenu";
  readonly id: string;
  readonly label: string;
  readonly icon?: string | undefined;
  /** Never empty: a submenu with nothing to show is left out. */
  readonly items: readonly ResolvedMenuEntry[];
}

export interface ResolvedMenuSeparator {
  readonly type: "separator";
  /**
   * The separator's place among the entries it was resolved from, which
   * stays put however the items around it come and go — a key for a
   * renderer that needs one, unique among its menu's separators.
   */
  readonly key: string;
}

/** One entry of a menu as `resolveMenu` hands it to a renderer to draw. */
export type ResolvedMenuEntry =
  ResolvedMenuItem | ResolvedMenuSubmenu | ResolvedMenuSeparator;
