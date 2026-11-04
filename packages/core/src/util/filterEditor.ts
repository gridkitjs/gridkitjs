import type { GridMessages } from "../messages";
import { resolveMessages } from "../messages";
import type {
  ColumnType,
  DataColumn,
  FilterEntry,
  FilterScalar,
  FilterState,
  OperatorFilterEntry,
} from "../types";
import { filterValueKey, isEmptyCell, isScalarList } from "./filterOperators";
import { compileFilter } from "./filtering";
import type { FormatLocale } from "./format";
import { formatCellValue } from "./format";
import { accessDotted } from "./grid";
import { compareValues } from "./sorting";

/**
 * What one column's filter looks like to an editor — which of its forms can
 * show it, or that none can.
 *
 * - `"none"`: no entry touches the column.
 * - `"values"`: a checklist — one `in` entry, optionally OR-grouped with an
 *   `isEmpty` on the same column (`includeBlanks`).
 * - `"conditions"`: one or two operator entries on the column (any but
 *   `in`), at the top level (ANDed) or alone in one group with its
 *   combinator.
 * - `"custom"`: anything else that touches the column — a text query, a
 *   predicate, a group spanning several columns. An editor shows it as
 *   such, and applying an editor's draft replaces it.
 */
export type ColumnFilterShape<Row> =
  | { readonly kind: "none" }
  | {
      readonly kind: "values";
      readonly values: readonly FilterScalar[];
      readonly includeBlanks: boolean;
    }
  | {
      readonly kind: "conditions";
      readonly conditions: readonly OperatorFilterEntry<Row>[];
      readonly combinator: "and" | "or";
    }
  | { readonly kind: "custom" };

/** One distinct value a column holds, as a checklist offers it. */
export interface ColumnValueOption {
  readonly value: Exclude<FilterScalar, null>;
  /** The value as the column prints it — what a search matches against. */
  readonly label: string;
  /** How many rows hold it, among the rows the other columns' filters keep. */
  readonly count: number;
}

/** What `columnValueOptions` narrows its list by. */
export interface ColumnValueQuery {
  /** Keeps the values whose label contains this, ignoring case. */
  readonly search?: string;
  /** Keeps at most this many values, first in sorted order. */
  readonly limit?: number;
  /** The locale labels are formatted for — the grid's own `locale`. */
  readonly locale?: FormatLocale;
  /**
   * The grid's own `messages`, over the defaults: a boolean is labelled
   * `booleanTrue`/`booleanFalse`, as its cells print it.
   */
  readonly messages?: Partial<GridMessages>;
}

export interface ColumnValueOptions {
  /** The distinct values, sorted as the column sorts, searched and cut to `limit`. */
  readonly options: readonly ColumnValueOption[];
  /** How many values matched the search, before `limit` cut them. */
  readonly total: number;
  /** Whether `limit` left values out. */
  readonly truncated: boolean;
  /** How many of the same rows hold a blank — `null`, `undefined` or `""`. */
  readonly blanks: number;
  /**
   * The column's `type`, which tells values apart the way an `in` filter
   * does — on a date column, a date string and the `Date` it names are one
   * value. `initialFilterEditorDraft` carries it into the draft.
   */
  readonly columnType?: ColumnType | undefined;
}

/**
 * A checklist or condition editor's working copy of one column's filter,
 * changed by `filterEditorReducer` and turned into a filter by
 * `draftToFilter` only when the user applies it — so cancelling is just
 * dropping the draft.
 */
export interface FilterEditorDraft<Row> {
  /** Which half of the draft `draftToFilter` applies: the last one changed. */
  readonly mode: "values" | "conditions";
  /** Every value the editor offers, from `columnValueOptions`. */
  readonly options: readonly ColumnValueOption[];
  /** How many rows hold a blank; the blanks entry only matters when some do. */
  readonly blanks: number;
  readonly search: string;
  /** The checked values, keyed as an `in` filter on the column keys them. */
  readonly checked: ReadonlyMap<string, FilterScalar>;
  readonly includeBlanks: boolean;
  readonly conditions: readonly OperatorFilterEntry<Row>[];
  readonly combinator: "and" | "or";
  /** The column's `type`, from `ColumnValueOptions` — what values are keyed by. */
  readonly columnType?: ColumnType | undefined;
}

export type FilterEditorAction<Row> =
  | { readonly type: "search"; readonly search: string }
  | { readonly type: "toggleValue"; readonly value: FilterScalar }
  /** Checks every value the search shows, or unchecks them once all are. */
  | { readonly type: "toggleAll" }
  | { readonly type: "setIncludeBlanks"; readonly includeBlanks: boolean }
  | {
      readonly type: "setConditions";
      readonly conditions: readonly OperatorFilterEntry<Row>[];
      /** Keeps the draft's own when omitted. */
      readonly combinator?: "and" | "or";
    }
  /** Back to "no filter": every value checked, no conditions, no search. */
  | { readonly type: "clear" };

/** A select-all checkbox's state over the values the search shows. */
export type SelectAllState = "checked" | "unchecked" | "mixed";

/**
 * Whether `entry` is about `columnId`: names it, or is a group with an entry
 * anywhere inside that does. An entry across every column is about none.
 */
export function touchesColumn<Row>(
  entry: FilterEntry<Row>,
  columnId: string,
): boolean {
  return "combinator" in entry
    ? entry.entries.some((nested) => touchesColumn(nested, columnId))
    : entry.columnId === columnId;
}

function isOperatorOn<Row>(
  entry: FilterEntry<Row>,
  columnId: string,
): entry is OperatorFilterEntry<Row> {
  return "operator" in entry && entry.columnId === columnId;
}

/** An operator entry on `columnId` a condition editor can show: any but `in`. */
function isConditionOn<Row>(
  entry: FilterEntry<Row>,
  columnId: string,
): entry is OperatorFilterEntry<Row> {
  return isOperatorOn(entry, columnId) && entry.operator !== "in";
}

/** `entry` as a checklist, when it is the `in` (+ `isEmpty`) one stores. */
function valuesShape<Row>(
  entry: FilterEntry<Row>,
  columnId: string,
): ColumnFilterShape<Row> | undefined {
  const values = (candidate: FilterEntry<Row> | undefined) =>
    candidate !== undefined &&
    isOperatorOn(candidate, columnId) &&
    candidate.operator === "in" &&
    isScalarList(candidate.value)
      ? candidate.value
      : undefined;
  const blanks = (candidate: FilterEntry<Row> | undefined) =>
    candidate !== undefined &&
    isOperatorOn(candidate, columnId) &&
    candidate.operator === "isEmpty";

  const alone = values(entry);
  if (alone !== undefined) {
    return { kind: "values", values: alone, includeBlanks: false };
  }
  if (
    !("combinator" in entry) ||
    entry.combinator !== "or" ||
    entry.entries.length !== 2
  ) {
    return undefined;
  }
  const [first, second] = entry.entries;
  const listed = blanks(first) ? values(second) : values(first);
  return listed !== undefined && (blanks(first) || blanks(second))
    ? { kind: "values", values: listed, includeBlanks: true }
    : undefined;
}

/** `touching` as one or two conditions, when that is all it is. */
function conditionsShape<Row>(
  touching: FilterState<Row>,
  columnId: string,
): ColumnFilterShape<Row> | undefined {
  const [only] = touching;
  const grouped =
    touching.length === 1 && only !== undefined && "combinator" in only;
  const entries = grouped ? only.entries : touching;
  const combinator = grouped ? only.combinator : "and";
  if (entries.length === 0 || entries.length > 2) {
    return undefined;
  }
  const conditions = entries.filter((entry) => isConditionOn(entry, columnId));
  return conditions.length === entries.length
    ? { kind: "conditions", conditions, combinator }
    : undefined;
}

/**
 * How `filter` filters `columnId`, as one of the forms an editor can show —
 * see `ColumnFilterShape`. Entries about other columns don't count, nor do
 * entries across every column (a global search).
 */
export function describeColumnFilter<Row>(
  filter: FilterState<Row>,
  columnId: string,
): ColumnFilterShape<Row> {
  const touching = filter.filter((entry) => touchesColumn(entry, columnId));
  const [only] = touching;
  if (only === undefined) {
    return { kind: "none" };
  }
  return (
    (touching.length === 1 ? valuesShape(only, columnId) : undefined) ??
    conditionsShape(touching, columnId) ?? { kind: "custom" }
  );
}

/**
 * A value a checklist can offer: an `in` entry can hold it. An object or an
 * array in a cell can't be, so it isn't offered.
 */
function isOfferable(value: unknown): value is Exclude<FilterScalar, null> {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  );
}

function matchesSearch(label: string, search: string): boolean {
  return label.toLowerCase().includes(search.toLowerCase());
}

interface Bucket<Row> {
  readonly value: Exclude<FilterScalar, null>;
  /** The first row holding it, for a `valueFormatter` that reads the row. */
  readonly row: Row;
  count: number;
}

/**
 * The distinct values `columnId` holds, for a checklist editor: each with
 * its label and how many rows hold it.
 *
 * Counted over the rows every *other* column's filter keeps — every entry
 * except those `describeColumnFilter` would count for this column — so a
 * column's list cascades from the other filters without its own pick
 * hiding the values the user unchecked. Values are told apart as an `in`
 * filter tells them apart — as grouping does, except that a date column's
 * date strings are the dates they name — ordered as the column sorts, and
 * labelled as its cells print, a boolean in `query.messages`' words; blanks
 * are counted apart, in `blanks`.
 *
 * Costs one pass over `rows` (tens of milliseconds at 100k rows), so compute
 * it when an editor opens rather than on every render, and hand the whole
 * list to `initialFilterEditorDraft`, whose search needs no recount.
 */
export function columnValueOptions<Row>(
  rows: readonly Row[],
  dataColumns: readonly DataColumn<Row, unknown>[],
  filter: FilterState<Row>,
  columnId: string,
  query: ColumnValueQuery = {},
): ColumnValueOptions {
  const column = dataColumns.find((entry) => entry.id === columnId)?.column;
  if (column === undefined) {
    return { options: [], total: 0, truncated: false, blanks: 0 };
  }
  const keep = compileFilter(
    filter.filter((entry) => !touchesColumn(entry, columnId)),
    dataColumns,
  );

  const buckets = new Map<string, Bucket<Row>>();
  let blanks = 0;
  for (const row of rows) {
    if (keep !== undefined && !keep(row)) {
      continue;
    }
    const value = accessDotted(row, column.field);
    if (isEmptyCell(value)) {
      blanks++;
    } else if (isOfferable(value)) {
      const key = filterValueKey(value, column.type);
      const bucket = buckets.get(key);
      if (bucket === undefined) {
        buckets.set(key, { value, row, count: 1 });
      } else {
        bucket.count++;
      }
    }
  }

  const { search = "", limit, locale } = query;
  const messages = resolveMessages(query.messages);
  const options = [...buckets.values()]
    .sort((a, b) => compareValues(a.value, b.value, column.type))
    .map(({ value, row, count }) => ({
      value,
      label: formatCellValue(value, column, locale, row, messages),
      count,
    }))
    .filter((option) => matchesSearch(option.label, search));
  const shown = limit === undefined ? options : options.slice(0, limit);
  return {
    options: shown,
    total: options.length,
    truncated: shown.length < options.length,
    blanks,
    columnType: column.type,
  };
}

/** The key `draft.checked` holds `value` under. */
export function keyOf<Row>(
  draft: Pick<FilterEditorDraft<Row>, "columnType">,
  value: FilterScalar,
): string {
  return filterValueKey(value, draft.columnType);
}

function everyOption<Row>(
  draft: Pick<FilterEditorDraft<Row>, "columnType" | "options">,
): ReadonlyMap<string, FilterScalar> {
  return new Map(
    draft.options.map((option) => [keyOf(draft, option.value), option.value]),
  );
}

/**
 * A draft showing `shape` over `values` — what an editor opens with. A
 * column with no filter, or one only a custom editor could show, opens with
 * every value checked; a checklist with its own values checked, kept even
 * when the other filters now hide them; conditions as they are.
 */
export function initialFilterEditorDraft<Row>(
  shape: ColumnFilterShape<Row>,
  values: ColumnValueOptions,
): FilterEditorDraft<Row> {
  const draft: FilterEditorDraft<Row> = {
    mode: "values",
    options: values.options,
    blanks: values.blanks,
    search: "",
    checked: everyOption(values),
    includeBlanks: values.blanks > 0,
    conditions: [],
    combinator: "and",
    columnType: values.columnType,
  };
  switch (shape.kind) {
    case "values":
      return {
        ...draft,
        checked: new Map(
          shape.values
            .filter((value) => !isEmptyCell(value))
            .map((value) => [keyOf(draft, value), value]),
        ),
        includeBlanks: shape.includeBlanks,
      };
    case "conditions":
      return {
        ...draft,
        mode: "conditions",
        conditions: shape.conditions,
        combinator: shape.combinator,
      };
    case "none":
    case "custom":
      return draft;
  }
}

/** The options the draft's search shows — those a select-all acts on. */
export function visibleFilterOptions<Row>(
  draft: FilterEditorDraft<Row>,
): readonly ColumnValueOption[] {
  return draft.search === ""
    ? draft.options
    : draft.options.filter((option) =>
        matchesSearch(option.label, draft.search),
      );
}

/** Blanks count among what select-all covers only while nothing is searched. */
export function selectAllCoversBlanks<Row>(
  draft: FilterEditorDraft<Row>,
): boolean {
  return draft.search === "" && draft.blanks > 0;
}

/**
 * The select-all checkbox's state: whether every value the search shows is
 * checked, none is, or some are — blanks included while nothing is
 * searched.
 */
export function selectAllState<Row>(
  draft: FilterEditorDraft<Row>,
): SelectAllState {
  const states = visibleFilterOptions(draft).map((option) =>
    draft.checked.has(keyOf(draft, option.value)),
  );
  if (selectAllCoversBlanks(draft)) {
    states.push(draft.includeBlanks);
  }
  if (states.length > 0 && states.every(Boolean)) {
    return "checked";
  }
  return states.some(Boolean) ? "mixed" : "unchecked";
}

function toggleAll<Row>(draft: FilterEditorDraft<Row>): FilterEditorDraft<Row> {
  const check = selectAllState(draft) !== "checked";
  const checked = new Map(draft.checked);
  for (const option of visibleFilterOptions(draft)) {
    const key = keyOf(draft, option.value);
    if (check) {
      checked.set(key, option.value);
    } else {
      checked.delete(key);
    }
  }
  return {
    ...draft,
    mode: "values",
    checked,
    includeBlanks: selectAllCoversBlanks(draft) ? check : draft.includeBlanks,
  };
}

/**
 * The next draft after `action` — a plain reducer, so a renderer can hold
 * the draft in whatever state it has (`useReducer`, a signal, a store).
 * Changing a value or the blanks switches the draft to its checklist;
 * setting conditions switches it to them.
 */
export function filterEditorReducer<Row>(
  draft: FilterEditorDraft<Row>,
  action: FilterEditorAction<Row>,
): FilterEditorDraft<Row> {
  switch (action.type) {
    case "search":
      return { ...draft, search: action.search };
    case "toggleValue": {
      const key = keyOf(draft, action.value);
      const checked = new Map(draft.checked);
      if (checked.has(key)) {
        checked.delete(key);
      } else {
        checked.set(key, action.value);
      }
      return { ...draft, mode: "values", checked };
    }
    case "toggleAll":
      return toggleAll(draft);
    case "setIncludeBlanks":
      return { ...draft, mode: "values", includeBlanks: action.includeBlanks };
    case "setConditions":
      return {
        ...draft,
        mode: "conditions",
        conditions: action.conditions,
        combinator: action.combinator ?? draft.combinator,
      };
    case "clear":
      return {
        ...draft,
        search: "",
        checked: everyOption(draft),
        includeBlanks: draft.blanks > 0,
        conditions: [],
      };
  }
}

/**
 * Whether the checklist keeps every row: every offered value checked, and
 * the blanks too when there are any.
 */
function checksEverything<Row>(draft: FilterEditorDraft<Row>): boolean {
  return (
    draft.options.every((option) =>
      draft.checked.has(keyOf(draft, option.value)),
    ) &&
    (draft.includeBlanks || draft.blanks === 0)
  );
}

/** The entries `draft` stands for on `columnId` — none for "no filter". */
function draftEntries<Row>(
  draft: FilterEditorDraft<Row>,
  columnId: string,
): FilterState<Row> {
  if (draft.mode === "conditions") {
    const conditions = draft.conditions.map((condition) => ({
      ...condition,
      columnId,
    }));
    return conditions.length > 1
      ? [{ combinator: draft.combinator, entries: conditions }]
      : conditions;
  }
  if (checksEverything(draft)) {
    return [];
  }
  const picked: OperatorFilterEntry<Row> = {
    columnId,
    operator: "in",
    value: [...draft.checked.values()],
  };
  return draft.includeBlanks
    ? [
        {
          combinator: "or",
          entries: [picked, { columnId, operator: "isEmpty" }],
        },
      ]
    : [picked];
}

/**
 * `current` with `columnId`'s filter replaced by what `draft` holds — what
 * applying an editor sets. Every entry about the column goes (custom ones
 * included); the draft's entries take the place of the first, so the rest
 * keep their order.
 *
 * A checklist with everything checked is no filter at all, and a partial
 * pick is one `in` entry, OR-grouped with an `isEmpty` when blanks are
 * kept. One condition is stored as itself, two as a group with the
 * draft's combinator. Returns `current` itself when nothing changes.
 */
export function draftToFilter<Row>(
  draft: FilterEditorDraft<Row>,
  columnId: string,
  current: FilterState<Row>,
): FilterState<Row> {
  const replacement = draftEntries(draft, columnId);
  const first = current.findIndex((entry) => touchesColumn(entry, columnId));
  if (first === -1) {
    return replacement.length === 0 ? current : [...current, ...replacement];
  }
  const kept = current.filter((entry) => !touchesColumn(entry, columnId));
  return [...kept.slice(0, first), ...replacement, ...kept.slice(first)];
}
