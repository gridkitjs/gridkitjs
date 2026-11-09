import type { GridController } from "../controller/gridController";
import type { CopyContent } from "../export/copy";
import type { PrintDocument, PrintOptions } from "../export/print";
import type { ExportFile } from "../export/writer";
import type { GridMessages } from "../messages";
import type { GridOptions } from "../options";
import type { DataColumn, GridState, GridView, ResolvedRow } from "../types";

/**
 * Where a command was asked for: the part of the grid a menu was opened on,
 * the toolbar item pressed, or nowhere in particular for a call through a
 * renderer's API. A built-in reads the column, row or group it acts on from
 * here, and is hidden on a target that has none.
 */
export type GridCommandTarget =
  | { readonly area: "header"; readonly columnId: string }
  | {
      readonly area: "cell";
      readonly rowId: string;
      readonly columnId: string;
    }
  | {
      readonly area: "group";
      readonly groupId: string;
      readonly columnId: string;
    }
  /** Empty body space, or a grid with no rows. */
  | { readonly area: "body" }
  | { readonly area: "toolbar"; readonly itemId: string }
  /** A renderer's API, with no particular place. */
  | { readonly area: "grid" };

/**
 * Where a command was run from: a context menu, the toolbar, a renderer's
 * API, or a column's filter menu — its sort entries and its "Clear filter".
 */
export type GridCommandSource =
  "contextMenu" | "toolbar" | "api" | "filterMenu";

/** What `onCommand` is told of a command, or an inline menu item, that ran. */
export interface GridCommandEvent {
  /** The command's id, or the inline item's. */
  readonly commandId: string;
  /** Where it was asked for. */
  readonly target: GridCommandTarget;
  readonly source: GridCommandSource;
}

/**
 * The panels a command can ask a renderer to open: the column chooser, and
 * a column's filter menu, which opens on a header target only.
 */
export type GridPanelKind = "columnChooser" | "filter";

/**
 * What a command needs that only a renderer has: a DOM to measure, panels to
 * open, a live region to speak through. A caller with none of these — a test,
 * a script in Node — passes members that do nothing.
 */
export interface GridCommandHost {
  /** Sizes each column to fit its content, as double-clicking its resize handle does. */
  readonly autoFitColumns: (columnIds: readonly string[]) => void;
  /** Opens one of the grid's panels, anchored to where the command was asked for. */
  readonly openPanel: (kind: GridPanelKind, target: GridCommandTarget) => void;
  /** Reads `text` out through the grid's live region. */
  readonly announce: (text: string) => void;
  /**
   * Saves an export as a file — in a browser, a download. A promise is the
   * file of a writer still writing; the host waits for it, and reports a
   * rejected one rather than saving.
   *
   * Returns `false` for a file it drops without saving, as a host that saves
   * one file at a time does with one asked for while it waits on the last.
   * The export command that asked then did not run.
   */
  readonly saveFile:
    | ((file: ExportFile | Promise<ExportFile>) => void)
    | ((file: ExportFile | Promise<ExportFile>) => boolean);
  /**
   * Whether `saveFile` would save a file asked for now. An export command
   * asks first, and while it is `false` builds no file and does not run, so
   * a writer is never run for a file the host would drop. Left out, every
   * file can be saved.
   */
  readonly canSave?: (() => boolean) | undefined;
  /**
   * Puts a copy on the clipboard, as text and as HTML, and announces it —
   * `count` and `unit` say what to announce — or that the browser refused.
   */
  readonly writeClipboard: (content: CopyContent) => void;
  /**
   * Puts a print document on paper — in a browser, through the print
   * dialog. `options` are those it was built under, for what the host adds
   * itself, such as `styles` over its print stylesheet.
   */
  readonly print: (document: PrintDocument, options: PrintOptions) => void;
}

/**
 * Every action of the controller — the only way a command changes state, so
 * each change reports through its slice's callback exactly as the user's own
 * gesture would. Leaves out `setOptions`, which is the renderer's alone,
 * `subscribe`, and the getters whose results the context already carries.
 *
 * Nothing left names the renderer's node type, so a controller of any `Node`
 * is one.
 */
export type GridCommandActions<Row> = Omit<
  GridController<Row, unknown>,
  "getOptions" | "setOptions" | "subscribe" | "getState" | "getView"
>;

/**
 * Everything a command reads to decide whether it shows, whether it is
 * enabled and what it does — one snapshot of the grid, taken when a menu or
 * toolbar is resolved. Build one with `createCommandContext`.
 */
export interface GridCommandContext<Row> {
  readonly target: GridCommandTarget;
  readonly state: GridState<Row>;
  readonly view: GridView<Row, unknown>;
  readonly options: GridOptions<Row>;
  readonly messages: GridMessages;
  readonly actions: GridCommandActions<Row>;
  readonly host: GridCommandHost;
  /** The row a cell target is on; `null` for any other target, or a row the filter hides. */
  readonly row: ResolvedRow<Row> | null;
  /** The column a header, cell or group target names, hidden or not; `null` otherwise. */
  readonly column: DataColumn<Row, unknown> | null;
  /**
   * The selected rows that pass the filter, in the order they are shown,
   * across every page and collapsed group. A function, computed on first
   * call and remembered: resolving it walks every filtered row, and a toolbar
   * builds a context on every change without most commands ever asking.
   */
  readonly selectedRows: () => readonly ResolvedRow<Row>[];
}

/**
 * The one implementation behind a menu item, a toolbar button and a
 * renderer's `runCommand`. Whether it shows and whether it is enabled are
 * predicates over the context, asked each time a menu or toolbar is resolved,
 * so a command follows the grid's state without being told about it.
 */
export interface GridCommand<Row> {
  /** `"sort.ascending"` for a built-in, or any id of the app's own. Never `"separator"`, which a menu reads as one. */
  readonly id: string;
  readonly label: string | ((context: GridCommandContext<Row>) => string);
  /** A key the renderer maps to an icon of its own; a key it does not know draws nothing. */
  readonly icon?: string | undefined;
  /** A key-combination hint in `aria-keyshortcuts` syntax, such as `"Alt+ArrowUp"`. Shown, not bound. */
  readonly shortcut?: string | undefined;
  /** Whether the command shows here at all. Defaults to always. */
  readonly isVisible?:
    ((context: GridCommandContext<Row>) => boolean) | undefined;
  /** Whether it can run. A disabled command still shows, so a user can see what is not possible. Defaults to always. */
  readonly isEnabled?:
    ((context: GridCommandContext<Row>) => boolean) | undefined;
  /** Present for a checkable command — drawn as a checkbox item or a toggle button — and says whether it is checked. */
  readonly isChecked?:
    ((context: GridCommandContext<Row>) => boolean) | undefined;
  /**
   * Does what the command does. Returns `false` when it turns out to do
   * nothing after all, such as an export the host dropped, so `runCommand`
   * says it did not run and a renderer does not report it.
   */
  readonly execute:
    | ((context: GridCommandContext<Row>) => void)
    | ((context: GridCommandContext<Row>) => boolean);
}
