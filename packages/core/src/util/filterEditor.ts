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

/** What a `FilterEditorDraft` holds on either arm. */
export interface FilterEditorDraftBase<Row> {
  /** Every value the editor offers, from `columnValueOptions`. */
  readonly options: readonly ColumnValueOption[];
  /** How many rows hold a blank; the blanks entry only matters when some do. */
  readonly blanks: number;
  readonly search: string;
  /**
   * The column's filter as the editor opened on it. An action for the other
   * arm builds that arm from it, as reopening the editor would show it.
   */
  readonly openedShape: ColumnFilterShape<Row>;
  /** The column's `type`, from `ColumnValueOptions` — what values are keyed by. */
  readonly columnType?: ColumnType | undefined;
}

/** A draft on its checklist: the values `draftToFilter` writes as an `in` entry. */
export interface ValuesDraft<Row> extends FilterEditorDraftBase<Row> {
  readonly kind: "values";
  /** The checked values, keyed as an `in` filter on the column keys them. */
  readonly checked: ReadonlyMap<string, FilterScalar>;
  readonly includeBlanks: boolean;
}

/** A draft on its conditions: the operator entries `draftToFilter` writes. */
export interface ConditionsDraft<Row> extends FilterEditorDraftBase<Row> {
  readonly kind: "conditions";
  readonly conditions: readonly OperatorFilterEntry<Row>[];
  readonly combinator: "and" | "or";
}

/**
 * A checklist or condition editor's working copy of one column's filter,
 * changed by `filterEditorReducer` and turned into a filter by
 * `draftToFilter` only when the user applies it — so cancelling is just
 * dropping the draft. It is on one arm at a time, the one `draftToFilter`
 * applies: the last one changed.
 */
export type FilterEditorDraft<Row> = ValuesDraft<Row> | ConditionsDraft<Row>;

export type FilterEditorAction<Row> =
  | { readonly type: "search"; readonly search: string }
  | { readonly type: "toggleValue"; readonly value: FilterScalar }
  /** Checks every value the search shows, or unchecks them once all are. */
  | { readonly type: "toggleAll" }
  | { readonly type: "setIncludeBlanks"; readonly includeBlanks: boolean }
  | {
      readonly type: "setConditions";
      readonly conditions: readonly OperatorFilterEntry<Row>[];
      /**
       * Keeps the draft's own when omitted; a checklist draft's is the opened
       * filter's, or `"and"`.
       */
      readonly combinator?: "and" | "or";
    }
  /**
   * Back to "no filter" on the draft's own arm — every value checked, or no
   * conditions — and no search.
   */
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
  return entry.kind === "group"
    ? entry.entries.some((nested) => touchesColumn(nested, columnId))
    : entry.columnId === columnId;
}

function isOperatorOn<Row>(
  entry: FilterEntry<Row>,
  columnId: string,
): entry is OperatorFilterEntry<Row> {
  return entry.kind === "operator" && entry.columnId === columnId;
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
    entry.kind !== "group" ||
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
    touching.length === 1 && only !== undefined && only.kind === "group";
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
 * Whether `filter` filters `columnId` — whether `describeColumnFilter` reads
 * it as anything but `"none"` — for a header to show its column as
 * filtered. A global search filters every column alike, so it marks none.
 */
export function isColumnFiltered<Row>(
  filter: FilterState<Row>,
  columnId: string,
): boolean {
  return filter.some((entry) => touchesColumn(entry, columnId));
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
  const messages = resolveMessages(query.messages, locale);
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

/** The key a checklist draft's `checked` holds `value` under. */
export function keyOf<Row>(
  draft: Pick<FilterEditorDraftBase<Row>, "columnType">,
  value: FilterScalar,
): string {
  return filterValueKey(value, draft.columnType);
}

function everyOption<Row>(
  draft: Pick<FilterEditorDraftBase<Row>, "columnType" | "options">,
): ReadonlyMap<string, FilterScalar> {
  return new Map(
    draft.options.map((option) => [keyOf(draft, option.value), option.value]),
  );
}

/** What `draft` holds on either arm, without the arm's own fields. */
function baseOf<Row>(
  draft: FilterEditorDraft<Row>,
): FilterEditorDraftBase<Row> {
  const { options, blanks, search, openedShape, columnType } = draft;
  return { options, blanks, search, openedShape, columnType };
}

/**
 * The checklist `base`'s opened filter shows: a checklist's own values, kept
 * even when the other filters now hide them; anything else, every value
 * checked, the blanks too when there are any.
 */
function openedValues<Row>(base: FilterEditorDraftBase<Row>): ValuesDraft<Row> {
  const shape = base.openedShape;
  if (shape.kind !== "values") {
    return {
      kind: "values",
      ...base,
      checked: everyOption(base),
      includeBlanks: base.blanks > 0,
    };
  }
  return {
    kind: "values",
    ...base,
    checked: new Map(
      shape.values
        .filter((value) => !isEmptyCell(value))
        .map((value) => [keyOf(base, value), value]),
    ),
    includeBlanks: shape.includeBlanks,
  };
}

/** The conditions `base`'s opened filter holds, or none when it holds no conditions. */
function openedConditions<Row>(
  base: FilterEditorDraftBase<Row>,
): ConditionsDraft<Row> {
  const shape = base.openedShape;
  return shape.kind === "conditions"
    ? {
        kind: "conditions",
        ...base,
        conditions: shape.conditions,
        combinator: shape.combinator,
      }
    : { kind: "conditions", ...base, conditions: [], combinator: "and" };
}

/**
 * A draft showing `shape` over `values` — what an editor opens with. A
 * column filtered by conditions opens on them as they are. Anything else
 * opens on the checklist: with no filter, or one only a custom editor could
 * show, every value checked; a checklist with its own values checked, kept
 * even when the other filters now hide them.
 */
export function initialFilterEditorDraft<Row>(
  shape: ColumnFilterShape<Row>,
  values: ColumnValueOptions,
): FilterEditorDraft<Row> {
  const base: FilterEditorDraftBase<Row> = {
    options: values.options,
    blanks: values.blanks,
    search: "",
    openedShape: shape,
    columnType: values.columnType,
  };
  return shape.kind === "conditions"
    ? openedConditions(base)
    : openedValues(base);
}

/**
 * `draft` on its checklist: itself when it is there, otherwise the checklist
 * the filter it opened on shows, its conditions dropped. What a value action
 * starts from, and what a checklist draws over a draft on its conditions.
 */
export function toValuesDraft<Row>(
  draft: FilterEditorDraft<Row>,
): ValuesDraft<Row> {
  return draft.kind === "values" ? draft : openedValues(baseOf(draft));
}

/**
 * `draft` on its conditions: itself when it is there, otherwise the
 * conditions the filter it opened on holds (none unless it was conditions),
 * its checklist dropped. What `setConditions` starts from.
 */
export function toConditionsDraft<Row>(
  draft: FilterEditorDraft<Row>,
): ConditionsDraft<Row> {
  return draft.kind === "conditions" ? draft : openedConditions(baseOf(draft));
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
export function selectAllState<Row>(draft: ValuesDraft<Row>): SelectAllState {
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

function toggleValue<Row>(
  draft: ValuesDraft<Row>,
  value: FilterScalar,
): ValuesDraft<Row> {
  const key = keyOf(draft, value);
  const checked = new Map(draft.checked);
  if (checked.has(key)) {
    checked.delete(key);
  } else {
    checked.set(key, value);
  }
  return { ...draft, checked };
}

function toggleAll<Row>(draft: ValuesDraft<Row>): ValuesDraft<Row> {
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
    checked,
    includeBlanks: selectAllCoversBlanks(draft) ? check : draft.includeBlanks,
  };
}

/** `draft` as no filter on its own arm, with no search. */
function cleared<Row>(draft: FilterEditorDraft<Row>): FilterEditorDraft<Row> {
  switch (draft.kind) {
    case "values":
      return {
        ...draft,
        search: "",
        checked: everyOption(draft),
        includeBlanks: draft.blanks > 0,
      };
    case "conditions":
      return { ...draft, search: "", conditions: [] };
  }
}

/**
 * The next draft after `action` — a plain reducer, so a renderer can hold
 * the draft in whatever state it has (`useReducer`, a signal, a store).
 * Changing a value or the blanks puts the draft on its checklist; setting
 * conditions puts it on its conditions. An action for the arm the draft
 * is not on starts that arm as the filter the editor opened on shows it
 * (`toValuesDraft`, `toConditionsDraft`), dropping what the other arm held.
 */
export function filterEditorReducer<Row>(
  draft: FilterEditorDraft<Row>,
  action: FilterEditorAction<Row>,
): FilterEditorDraft<Row> {
  switch (action.type) {
    case "search":
      return { ...draft, search: action.search };
    case "toggleValue":
      return toggleValue(toValuesDraft(draft), action.value);
    case "toggleAll":
      return toggleAll(toValuesDraft(draft));
    case "setIncludeBlanks":
      return { ...toValuesDraft(draft), includeBlanks: action.includeBlanks };
    case "setConditions": {
      const conditions = toConditionsDraft(draft);
      return {
        ...conditions,
        conditions: action.conditions,
        combinator: action.combinator ?? conditions.combinator,
      };
    }
    case "clear":
      return cleared(draft);
  }
}

/**
 * Whether the checklist keeps every row: every offered value checked, and
 * the blanks too when there are any.
 */
function checksEverything<Row>(draft: ValuesDraft<Row>): boolean {
  return (
    draft.options.every((option) =>
      draft.checked.has(keyOf(draft, option.value)),
    ) &&
    (draft.includeBlanks || draft.blanks === 0)
  );
}

function valuesEntries<Row>(
  draft: ValuesDraft<Row>,
  columnId: string,
): FilterState<Row> {
  if (checksEverything(draft)) {
    return [];
  }
  const picked: OperatorFilterEntry<Row> = {
    kind: "operator",
    columnId,
    operator: "in",
    value: [...draft.checked.values()],
  };
  return draft.includeBlanks
    ? [
        {
          kind: "group",
          combinator: "or",
          entries: [
            picked,
            { kind: "operator", columnId, operator: "isEmpty" },
          ],
        },
      ]
    : [picked];
}

function conditionsEntries<Row>(
  draft: ConditionsDraft<Row>,
  columnId: string,
): FilterState<Row> {
  const conditions = draft.conditions.map((condition) => ({
    ...condition,
    columnId,
  }));
  return conditions.length > 1
    ? [{ kind: "group", combinator: draft.combinator, entries: conditions }]
    : conditions;
}

/** The entries `draft` stands for on `columnId` — none for "no filter". */
function draftEntries<Row>(
  draft: FilterEditorDraft<Row>,
  columnId: string,
): FilterState<Row> {
  switch (draft.kind) {
    case "values":
      return valuesEntries(draft, columnId);
    case "conditions":
      return conditionsEntries(draft, columnId);
  }
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

/** Whether two checklists check the same values and treat the blanks alike. */
function sameValues<Row>(a: ValuesDraft<Row>, b: ValuesDraft<Row>): boolean {
  return (
    a.includeBlanks === b.includeBlanks &&
    a.checked.size === b.checked.size &&
    [...a.checked.keys()].every((key) => b.checked.has(key))
  );
}

/** Whether two operands are one value, as an `in` filter on the column tells values apart. */
function sameOperand(
  a: OperatorFilterEntry<unknown>["value"],
  b: OperatorFilterEntry<unknown>["value"],
  type: ColumnType | undefined,
): boolean {
  if (isScalarList(a) || isScalarList(b)) {
    return (
      isScalarList(a) &&
      isScalarList(b) &&
      a.length === b.length &&
      a.every((scalar, index) => sameOperand(scalar, b[index], type))
    );
  }
  return filterValueKey(a, type) === filterValueKey(b, type);
}

/**
 * Whether two drafts hold the same conditions, the combinator counting only
 * between two or more. The column each condition names doesn't count:
 * `draftToFilter` writes them onto the column it is given.
 */
function sameConditions<Row>(
  a: ConditionsDraft<Row>,
  b: ConditionsDraft<Row>,
): boolean {
  return (
    a.conditions.length === b.conditions.length &&
    (a.conditions.length < 2 || a.combinator === b.combinator) &&
    a.conditions.every((condition, index) => {
      const other = b.conditions[index];
      return (
        other !== undefined &&
        condition.operator === other.operator &&
        sameOperand(condition.value, other.value, a.columnType)
      );
    })
  );
}

/**
 * Whether `draft` changes anything since the editor opened at `opened` — for
 * an Apply that changes nothing to leave the column's filter as it is,
 * rather than writing the draft over it. Compared by value, not identity, so
 * a value unchecked and checked again, or the same conditions typed again,
 * is no change; the search never is one.
 *
 * Only the arm `draft` is on counts. A checklist changes when its checked
 * values or blanks differ from those `opened` shows (`toValuesDraft`), so
 * one left as it opened over conditions or a custom filter leaves that
 * filter be. Conditions change when they differ from those `opened` holds,
 * and always when `opened` is on its checklist (it opened on a checklist,
 * no filter or a custom one): setting conditions there replaces it, none
 * removing it.
 *
 * `clear` over a custom filter leaves a draft equal to the one it opened
 * with, so this reads it as no change.
 */
export function filterDraftChanged<Row>(
  opened: FilterEditorDraft<Row>,
  draft: FilterEditorDraft<Row>,
): boolean {
  switch (draft.kind) {
    case "values":
      return !sameValues(toValuesDraft(opened), draft);
    case "conditions":
      return opened.kind !== "conditions" || !sameConditions(opened, draft);
  }
}
