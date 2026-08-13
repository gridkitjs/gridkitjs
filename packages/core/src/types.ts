/**
 * Values a cell shows as-is instead of being drilled into. Arrays and `Date`s
 * are cell values rather than groups of columns, and `null` cannot be
 * introspected, so all three end a path.
 */
type LeafValue =
  | bigint
  | boolean
  | number
  | string
  | symbol
  | null
  | undefined
  | Date
  | readonly unknown[]
  | ((...args: never[]) => unknown);

/** Keys of `T` holding a leaf value — the only ones a path may end on. */
type LeafKey<T> = {
  [K in keyof T & string]: NonNullable<T[K]> extends LeafValue ? K : never;
}[keyof T & string];

/**
 * Every addressable field of `Row`, one level deep: `"Id"` for a flat field,
 * `"Application.Id"` for a leaf inside a nested object. A nested object
 * contributes only its leaf children, never itself and never anything deeper.
 */
export type FieldPath<Row> = {
  [K in keyof Row & string]: NonNullable<Row[K]> extends LeafValue
    ? K
    : `${K}.${LeafKey<NonNullable<Row[K]>>}`;
}[keyof Row & string];

/**
 * The value type of a column's cells. This package is framework-agnostic so it
 * defaults to `string`;
 */
export type ColumnType =
  | "dateTime"
  | "date"
  | "time"
  | "number"
  | "string"
  | "boolean"
  | "decimal"
  | "currency"
  | "percent";

export type ColumnAlignment = "left" | "center" | "right";

/**
 * What `cellTemplate` receives. An object rather than positional arguments so
 * that a later addition — a sort state, whether the row is selected — is not a
 * breaking change to every template already written.
 */
export interface CellTemplateContext<Row> {
  /**
   * This cell's value, read off the column's field path. `unknown` because a
   * dotted path's type cannot be recovered here; a template narrows it.
   */
  value: unknown;
  /** The whole row, for a template that needs a sibling field. */
  row: Row;
  /** Position among the rows as rendered — the index within the current page once paging is on. */
  rowIndex: number;
  /** This row's absolute position in the whole filtered/sorted/grouped dataset, unaffected by which page is showing. */
  datasetIndex: number;
  /** This row's id, as `resolveRowId` settled it. */
  rowId: string;
  /** Whether this row is selected, so a template can style itself to match. */
  selected: boolean;
}

/**
 * @typeParam Node - What a header or cell renders to. This package is
 * framework-agnostic so it defaults to `string`; `@gridkitjs/react` binds it to
 * `ReactNode` so a template can return JSX.
 */
export interface ColumnDefinition<Row, Node = string> {
  /**
   * Path to this cell's value: a key of `Row`, or `"Parent.Child"` for a leaf
   * one level inside a nested object. Any string still compiles — the union
   * exists to drive autocomplete, not to lock the grid down.
   */
  field: FieldPath<Row> | (string & {});
  /**
   * Stable identity for state keyed by this column. Defaults to `field`, which
   * is unique in the common case but need not be — two columns may render the
   * same field differently.
   */
  id?: string;
  /** Header content, or a function returning it at render time. */
  headerTemplate?: Node | (() => Node) | undefined;
  /**
   * Renders this column's cells in place of the raw value at `field`. The
   * value is still resolved and handed over, so a template that only formats
   * it never repeats the field path.
   */
  cellTemplate?: ((context: CellTemplateContext<Row>) => Node) | undefined;
  /**
   * The value type of this column's cells. This package is framework-agnostic so it
   * defaults to `string`;
   */
  type?: ColumnType;
  /**
   * Alignment of this column's cells. This package is framework-agnostic so it
   * defaults to `left` (`right` for numbers);
   */
  alignment?: ColumnAlignment;
  /**
   * Width in px this column starts at. A user resize overrides it for as long
   * as that resize lives in the sizing state.
   */
  width?: number;
  /** Lower bound a resize may not drag below. */
  minWidth?: number;
  /** Upper bound a resize may not drag above. */
  maxWidth?: number;
  /** Whether this column can be resized, overriding the grid-level default. */
  resizable?: boolean;
  /**
   * Whether this column can be dragged to a new position, overriding the
   * grid-level default. A column that cannot move can still be moved past.
   */
  reorderable?: boolean;
  /** Whether this column can be sorted, overriding the grid-level default. */
  sortable?: boolean;
  /** Whether this column can be grouped by, overriding the grid-level default. */
  groupable?: boolean;
  /**
   * Whether this column's header shows its group-toggle icon, overriding
   * the grid-level default. Purely a rendering choice — it does not affect
   * whether the column can be grouped by (`groupable`) or the
   * `Alt+ArrowDown` shortcut, which keeps working with the icon hidden, the
   * same way the resize handle stays `aria-hidden` while `Alt+ArrowLeft`/
   * `ArrowRight` still resize.
   */
  groupToggleIcon?: boolean;
  /**
   * Whether this column's header may be dragged into the group-by bar to
   * add it to the active grouping, overriding the grid-level default.
   * Distinct from `groupable`: a column can be groupable via its header's
   * click/`Alt+ArrowDown` toggle, via this drag, both, or neither.
   */
  groupByDraggable?: boolean;
  /**
   * Lets this column's header and/or cell text wrap onto multiple lines
   * instead of the grid's default single line with an ellipsis. Off by
   * default: wrapping changes row height, so it stays a column's own choice
   * rather than something a minor release could turn on under an existing
   * grid.
   */
  wrap?: ColumnWrapConfig;
  /**
   * Extra class names appended to this column's `th`. An escape hatch for a
   * consumer's own CSS — nothing in this package reads them — for anything
   * `wrap` and the rest of this type don't cover.
   */
  headerClassName?: string;
  /**
   * Extra class names appended to this column's `td`, on every row. Static
   * per column: a per-row condition is already `cellTemplate`'s job (a
   * template returning its own markup with a conditional class), so this
   * stays a plain string rather than taking the row.
   */
  cellClassName?: string;
}

/** Which parts of a column opt out of the grid's default single-line text. */
export interface ColumnWrapConfig {
  header?: boolean;
  cells?: boolean;
}

/**
 * Widths the user has changed, keyed by column id. Holding only what changed —
 * rather than every width — means a `width` edited in the column definition
 * still takes effect, and resetting is discarding the state.
 */
export type ColumnSizingState = Readonly<Record<string, number>>;

/** The active page, and how many rows/units make one up. */
export interface PaginationState {
  readonly pageIndex: number; // 0-based
  readonly pageSize: number;
}

/** Reports a user page/page-size change whole — the one to persist from, mirroring ColumnSortEvent. */
export interface PaginationChangeEvent {
  readonly pagination: PaginationState;
  readonly pageCount: number;
}

/** Sizes used for a column that does not specify its own. */
export interface ColumnSizeDefaults {
  width: number;
  minWidth: number;
  maxWidth: number;
}

/** The bounds a column's width is held between, resolved once from both. */
export interface ColumnConstraints {
  minWidth: number;
  maxWidth: number;
}

/**
 * Grid-level defaults a column falls back to when it does not set its own.
 * Sizes are grouped so the rest of the grid's defaults have somewhere to go.
 */
export interface ColumnResolveOptions {
  sizes?: Partial<ColumnSizeDefaults> | undefined;
  /** Whether columns are resizable, unless a column says otherwise. */
  resizable?: boolean | undefined;
  /** Whether columns are reorderable, unless a column says otherwise. */
  reorderable?: boolean | undefined;
  /** Whether columns may be dragged into the group-by bar, unless a column says otherwise. */
  groupByDraggable?: boolean | undefined;
}

/**
 * A column paired with everything it takes to render it. Each field is a
 * decision made once here rather than in each adapter, so a second framework
 * binding renders identically without repeating the logic.
 */
export interface ResolvedColumn<Row, Node = string> {
  column: ColumnDefinition<Row, Node>;
  id: string;
  width: number;
  /**
   * Whether `width` came from the sizing state rather than the column
   * definition — that is, whether the user set it. Auto-fit leaves these
   * columns alone so that resizing one does not undo itself.
   */
  sized: boolean;
  /**
   * What the header shows: the column's own `headerTemplate`, or a label read
   * off the field path. `string` is in the union because that fallback is text
   * whatever `Node` is bound to.
   */
  label: Node | string;
  /** Whether this column can be resized, after the grid-level default. */
  resizable: boolean;
  /** Whether this column can be dragged, after the grid-level default. */
  reorderable: boolean;
  /** Whether this column's header may be dragged into the group-by bar, after the grid-level default. */
  groupByDraggable: boolean;
  /** How this column's cells align, after falling back to its type. */
  alignment: ColumnAlignment;
}

/**
 * A resize in progress. It captures its constraints up front so that applying
 * a pointer position is arithmetic on numbers alone — no column, no DOM.
 */
export interface ColumnResizeSession {
  readonly columnId: string;
  readonly startWidth: number;
  readonly startPosition: number;
  readonly constraints: ColumnConstraints;
}

/**
 * Reports a user resize. `phase` separates the two audiences: `"move"` fires
 * continuously for live feedback, `"end"` once on release — the one to persist.
 */
export interface ColumnResizeEvent {
  readonly columnId: string;
  readonly width: number;
  readonly sizing: ColumnSizingState;
  readonly phase: "move" | "end";
}

/**
 * Column ids in the order they render. It need not list every column: one
 * absent from it keeps its position among the definitions and follows those
 * that are listed.
 */
export type ColumnOrderState = readonly string[];

/**
 * Which side of a column a drop lands on, normalised away by
 * `resolveDropBefore` so it reaches no state.
 */
export type DropSide = "before" | "after";

/**
 * Reports a user reorder. Unlike a resize there is no `"move"` phase — the
 * order does not change until the drop.
 */
export interface ColumnOrderEvent {
  readonly columnId: string;
  readonly order: ColumnOrderState;
}

/** Which way a column sorts. */
export type SortDirection = "asc" | "desc";

/** One column's place in a stacked sort, and which way it sorts. */
export interface ColumnSortEntry {
  readonly columnId: string;
  readonly direction: SortDirection;
}

/**
 * The active sort, in priority order: index 0 sorts first, ties broken by
 * index 1, and so on down the stack. Empty for an unsorted grid, mirroring
 * `SelectionState`'s empty array for "nothing selected".
 */
export type ColumnSortState = readonly ColumnSortEntry[];

/**
 * Reports a user sort change whole — the stack to persist from. No `phase`:
 * unlike a resize, a sort has no in-progress state, only before and after.
 */
export interface ColumnSortEvent {
  readonly columnId: string;
  readonly sort: ColumnSortState;
}

/** One level of a stacked group-by, outer to inner. Mirrors ColumnSortEntry. */
export interface GroupByEntry {
  readonly columnId: string;
  /** Order of this level's own group values (not row order within a group). Defaults to "asc". */
  readonly direction?: SortDirection;
}

/**
 * The active grouping, outer to inner: index 0 groups first, each
 * subsequent index nests inside it. Empty for an ungrouped grid, mirroring
 * ColumnSortState's empty array for "no sort".
 */
export type GroupByState = readonly GroupByEntry[];

/**
 * Reports a user group-by change whole — the stack to persist from. Mirrors
 * ColumnSortEvent's `{columnId, sort}` shape.
 */
export interface GroupByEvent {
  readonly columnId: string;
  readonly groupBy: GroupByState;
}

/**
 * Group keys collapsed by the user — holding only the exceptions, the same
 * way ColumnSizingState holds only resized widths. A key absent from this
 * set is expanded; there is no separate "collapsed by default" concept.
 */
export type GroupExpansionState = readonly string[];

/**
 * Reports a user expansion change. `groupId` is the group toggled, or `null`
 * for expandAllGroups/collapseAllGroups, which touch every group in one call
 * rather than one at a time.
 */
export interface GroupExpansionEvent {
  readonly groupId: string | null;
  readonly expansion: GroupExpansionState;
}

/**
 * One group header in a grouped result. `path` is every ancestor value
 * down to and including this group's own, outermost first — what a header
 * template needs to render "West / Enterprise", not just "Enterprise".
 *
 * Not parameterized by `Row`: nothing here holds a `Row`-typed value today.
 * A future field that does (an aggregate) can add that parameter when it
 * exists, rather than carrying an unused one now.
 */
export interface ResolvedGroupRow {
  readonly kind: "group";
  /** Stable id for this node: this plan's join of `path`, used as the React key and the GroupExpansionState entry. Opaque — build it with `groupRowId`, never construct one by hand. */
  readonly groupId: string;
  /** Nesting depth, 0 for a top-level group. */
  readonly level: number;
  readonly columnId: string;
  /** This level's own value — the last entry of `path`. */
  readonly value: unknown;
  readonly path: readonly unknown[];
  readonly expanded: boolean;
  /** Leaf row count under this group, regardless of collapse state. */
  readonly count: number;
  /** Position among the display rows as rendered — same invariant ResolvedRow.rowIndex keeps. */
  readonly rowIndex: number;
  /** This header's absolute position in the whole filtered/sorted/grouped dataset, matching ResolvedRow.datasetIndex. */
  readonly datasetIndex: number;
}

/**
 * One entry of a grouped result: either an ordinary data row (no `kind`
 * field at all — ResolvedRow is unchanged, so every existing consumer of
 * plain ResolvedRow[] keeps compiling) or a group header. Discriminate with
 * `"kind" in entry`.
 */
export type DisplayRow<Row> = ResolvedRow<Row> | ResolvedGroupRow;

interface FilterEntryBase<Row> {
  readonly columnId?: FieldPath<Row> | (string & {});
}

/** Matches a column's stringified value against an SQL LIKE-style query. */
export interface TextFilterEntry<Row> extends FilterEntryBase<Row> {
  /**
   * A bare query is an exact match; `%text%` is contains; `text%` is
   * starts-with; `%text` is ends-with. Always case-insensitive. Only the
   * first and last characters are read as anchors — a `%` anywhere else is
   * a literal character, not a wildcard.
   */
  readonly query: string;
}

/**
 * Matches a column's actual (non-stringified) value by strict equality —
 * only when the column's resolved `type` agrees: `number`/`decimal`/
 * `currency`/`percent` for a `number` value, `boolean` for a `boolean`
 * value, `date`/`dateTime`/`time` for a `Date` value (compared via
 * `getTime()`). A `value` against a column of the wrong type never matches,
 * rather than silently stringifying and falling through to a text
 * comparison — the whole point of this variant existing separately from
 * `TextFilterEntry` is that it doesn't do that.
 */
export interface ValueFilterEntry<Row> extends FilterEntryBase<Row> {
  readonly value: number | boolean | Date;
}

export type FilterPredicate<Row> = (value: unknown, row: Row) => boolean;

/**
 * Matches via caller-supplied logic — a numeric range, a cross-field
 * combination, anything `query`/`value` can't express. Called once per row,
 * not per column: when `columnId` is given, `value` is that column's value,
 * resolved for convenience; when it's omitted, `value` is `undefined` and
 * the predicate is expected to read whatever it needs off `row` itself.
 */
export interface PredicateFilterEntry<Row> extends FilterEntryBase<Row> {
  readonly predicate: FilterPredicate<Row>;
}

/**
 * A nested group of entries, combined with `combinator` instead of the
 * implicit AND every top-level `FilterState` uses. `entries` is itself a
 * `FilterState<Row>`, so groups nest to any depth — the only entry variant
 * with no `columnId` of its own, since it isn't scoped to one column, only
 * to the entries it composes.
 */
export interface GroupFilterEntry<Row> {
  readonly combinator: "and" | "or";
  readonly entries: FilterState<Row>;
}

export type FilterEntry<Row> =
  | TextFilterEntry<Row>
  | ValueFilterEntry<Row>
  | PredicateFilterEntry<Row>
  | GroupFilterEntry<Row>;

/**
 * The active filter, every entry ANDed together at the top level — nest a
 * `GroupFilterEntry` for anything that needs OR. Empty for an unfiltered
 * grid, mirroring `ColumnSortState`'s empty array for "no sort".
 */
export type FilterState<Row> = readonly FilterEntry<Row>[];

/**
 * Ids selected, in the order they were selected — so the most recent is last,
 * and a consumer wanting only that reads `at(-1)` rather than tracking it
 * alongside.
 *
 * Ordered rather than a keyed record for that reason alone; a render layer
 * that needs lookups builds a `Set` from it. Rows and columns share the type:
 * they are both a list of ids, and the state they live in already names which.
 */
export type SelectionState = readonly string[];

/**
 * How much of a member may be selected at once. `false` rather than an absent
 * key so that turning selection off for one member reads the same as never
 * having enabled it.
 */
export type SelectionMode = false | "single" | "multiple";

/**
 * The modes a cell may take. A cell addresses one value, so it has no
 * `"multiple"` — a range of cells is a different feature, with a rectangle
 * rather than a list behind it.
 */
export type CellSelectionMode = false | "single";

/**
 * Which parts of the grid the user may select, and how many of each.
 *
 * Off by default, unlike `HoverableConfig`: selection claims the click, which
 * a grid that only displays data should not do.
 */
export interface SelectableConfig {
  rows?: SelectionMode | undefined;
  columns?: SelectionMode | undefined;
  cells?: CellSelectionMode | undefined;
}

/**
 * What an interaction means for the selection, read off its modifiers once at
 * the boundary so that nothing downstream handles a raw event.
 */
export type SelectIntent = "replace" | "toggle" | "range";

/** The address of one cell: which row, and which column within it. */
export interface SelectedCellRef {
  readonly rowId: string;
  readonly columnId: string;
}

/** The one selected cell, or `null` for none. */
export type CellSelectionState = SelectedCellRef | null;

/**
 * What changed between two selections. Ids rather than resolved members, so
 * that the transform producing it stays free of the data it selects from.
 */
export interface SelectionDiff {
  readonly added: readonly string[];
  readonly removed: readonly string[];
}

/**
 * A row paired with the identity and position it renders under — the row
 * counterpart to `ResolvedColumn`, and resolved once for the same reason: so
 * no part of the grid works out a row's id for itself.
 *
 * It is also what the selection callbacks report, so a handler reads the row
 * itself rather than an id it has to look up.
 */
export interface ResolvedRow<Row> {
  readonly rowId: string;
  readonly row: Row;
  /** Position among the rows as rendered, matching `CellTemplateContext`. */
  readonly rowIndex: number;
  /** This row's absolute position in the whole filtered/sorted/grouped dataset, matching `CellTemplateContext`. */
  readonly datasetIndex: number;
}

/**
 * A selected column. Carries the resolved column rather than the bare
 * definition, so a handler reads the width and label the user actually
 * clicked rather than what the definition asked for.
 */
export interface SelectedColumn<Row, Node = string> {
  readonly columnId: string;
  readonly column: ResolvedColumn<Row, Node>;
  /** Position among the columns as displayed, so after any reorder. */
  readonly columnIndex: number;
}

/** A selected cell, resolved down to the value it shows. */
export interface SelectedCell<Row, Node = string> {
  readonly rowId: string;
  readonly columnId: string;
  readonly row: Row;
  readonly column: ResolvedColumn<Row, Node>;
  readonly rowIndex: number;
  readonly columnIndex: number;
  /** Read off the column's field path — the value a `cellTemplate` receives. */
  readonly value: unknown;
}

/** Reports one row selected or deselected. */
export interface RowSelectEvent<Row> {
  readonly row: ResolvedRow<Row>;
  readonly selection: SelectionState;
}

/**
 * Reports every row one interaction selected or deselected. Fires once for a
 * range that `RowSelectEvent` reports one row at a time.
 */
export interface RowsSelectEvent<Row> {
  readonly rows: readonly ResolvedRow<Row>[];
  readonly selection: SelectionState;
}

/**
 * Reports a row selection change whole: what it gained, what it lost, and
 * everything it now holds. The one to persist from.
 */
export interface RowSelectionChangeEvent<Row> {
  readonly added: readonly ResolvedRow<Row>[];
  readonly removed: readonly ResolvedRow<Row>[];
  /** Every selected row, not only what this interaction changed. */
  readonly selected: readonly ResolvedRow<Row>[];
  readonly selection: SelectionState;
}

/** Reports one column selected or deselected. */
export interface ColumnSelectEvent<Row, Node = string> {
  readonly column: SelectedColumn<Row, Node>;
  readonly selection: SelectionState;
}

/** Reports every column one interaction selected or deselected. */
export interface ColumnsSelectEvent<Row, Node = string> {
  readonly columns: readonly SelectedColumn<Row, Node>[];
  readonly selection: SelectionState;
}

/** Reports a column selection change whole. The one to persist from. */
export interface ColumnSelectionChangeEvent<Row, Node = string> {
  readonly added: readonly SelectedColumn<Row, Node>[];
  readonly removed: readonly SelectedColumn<Row, Node>[];
  /** Every selected column, not only what this interaction changed. */
  readonly selected: readonly SelectedColumn<Row, Node>[];
  readonly selection: SelectionState;
}

/** Reports the cell selected or deselected. */
export interface CellSelectEvent<Row, Node = string> {
  readonly cell: SelectedCell<Row, Node>;
  readonly selection: CellSelectionState;
}

/**
 * Reports a cell selection change whole. Both fields are nullable and one
 * interaction can fill both — moving between cells deselects and selects at
 * once.
 */
export interface CellSelectionChangeEvent<Row, Node = string> {
  readonly selected: SelectedCell<Row, Node> | null;
  readonly deselected: SelectedCell<Row, Node> | null;
  readonly selection: CellSelectionState;
}
