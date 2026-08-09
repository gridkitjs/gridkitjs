import type { ColumnAlignment, ColumnDefinition, ColumnType } from "../types";

/**
 * Narrows to a value worth drilling into. Mirrors the `LeafValue` union in
 * `../types`: arrays and `Date`s are cell values rather than groups of
 * columns, and `null` cannot be introspected. Keep the two in sync.
 */
function isNested(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function getType(value: unknown): ColumnType {
  if (value instanceof Date) return "dateTime";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "bigint") return "number";
  if (typeof value === "symbol") return "string";
  return "string";
}

/**
 * How a column of `type` aligns by default. Numeric types align right so that
 * their digits line up by place value; everything else reads from the left.
 */
export function alignmentForType(type: ColumnType): ColumnAlignment {
  switch (type) {
    case "number":
    case "decimal":
    case "currency":
    case "percent":
      return "right";
    default:
      return "left";
  }
}

function getAlignment(value: unknown): ColumnAlignment {
  return alignmentForType(getType(value));
}

/**
 * Derives one column per field across `rows`, in the order each field is first
 * seen — so a key that only appears in a later row still gets a column,
 * appended at the end. Nested objects contribute their non-object properties
 * as `"Parent.Child"`; anything deeper is skipped, as is the nested object
 * itself.
 *
 * Order follows `Object.entries`, which lists integer-like keys first
 * regardless of the order they were written in.
 */
export function defineColumnsFromRows<Row>(
  rows: readonly Row[],
): readonly ColumnDefinition<Row>[] {
  const columns: ColumnDefinition<Row>[] = [];
  const seen = new Set<string>();

  function add(field: string, value: unknown): void {
    if (seen.has(field)) {
      return;
    }
    seen.add(field);
    columns.push({
      field,
      type: getType(value),
      alignment: getAlignment(value),
    });
  }

  for (const row of rows) {
    if (!isNested(row)) {
      continue;
    }
    for (const [key, value] of Object.entries(row)) {
      if (!isNested(value)) {
        add(key, value);
        continue;
      }
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (!isNested(nestedValue)) {
          add(`${key}.${nestedKey}`, nestedValue);
        }
      }
    }
  }

  return columns;
}

/**
 * The key state about a column is stored under, and the key it renders with.
 * Every such lookup goes through here so the two can never disagree.
 */
export function getColumnId<Row>(
  column: ColumnDefinition<Row, unknown>,
): string {
  return column.id ?? column.field;
}

/**
 * The key state about a row is stored under, and the key it renders with — the
 * row's counterpart to `getColumnId`, and for the same reason: every such
 * lookup goes through here so no two can disagree.
 *
 * Falls back to the position so a grid given no `getRowId` still works. That
 * fallback ties a selection to where a row sits rather than to the row, so
 * anything that sorts, filters or pages its data has to supply one — otherwise
 * a re-sort leaves the same positions selected under different rows.
 */
export function resolveRowId<Row>(
  row: Row,
  index: number,
  getRowId?: (row: Row, index: number) => string,
): string {
  return getRowId?.(row, index) ?? String(index);
}

/**
 * What a column's header shows: its own `headerTemplate`, called first if it is
 * a function, or else a label read off the field path — `"Application.Id"`
 * reading as `"Application Id"`.
 */
export function resolveColumnLabel<Row, Node>(
  column: ColumnDefinition<Row, Node>,
): Node | string {
  const { headerTemplate } = column;
  if (headerTemplate === undefined) {
    return column.field.split(".").join(" ");
  }
  // `Node` is open, so it could itself be a function type and the `typeof`
  // check cannot narrow on its own. A header that is callable is the lazy
  // form by definition — no adapter binds `Node` to a function.
  return typeof headerTemplate === "function"
    ? (headerTemplate as () => Node)()
    : headerTemplate;
}

/** Which of a column header's keyboard interactions to announce. */
export interface KeyShortcutCapabilities {
  reorderable: boolean;
  resizable: boolean;
  sortable: boolean;
  groupable: boolean;
}

/**
 * The `aria-keyshortcuts` string for a column header, naming only the keys
 * that column actually responds to — so the keys are discoverable, since
 * none of them is a convention a user would try unprompted.
 */
export function buildKeyShortcuts(
  capabilities: KeyShortcutCapabilities,
): string {
  return [
    capabilities.reorderable ? "Control+ArrowLeft Control+ArrowRight" : "",
    // Alt+Enter is the keyboard equivalent of double-clicking the resize
    // handle to size the column to its content — same gate as the nudge
    // shortcuts, since both are resize actions.
    capabilities.resizable ? "Alt+ArrowLeft Alt+ArrowRight Alt+Enter" : "",
    capabilities.sortable ? "Alt+ArrowUp" : "",
    // Down rather than reusing Up: it reads as "drill into groups", and Up is
    // already sort's own mnemonic on the same header.
    capabilities.groupable ? "Alt+ArrowDown" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Accesses a value at a dotted path, e.g. `foo.bar.baz`.
 *
 * @param obj The object to access
 * @param path Path to the value, e.g. `"foo.bar"`
 * @returns The value at `path`, or `undefined` if it doesn't exist
 */
export function accessDotted(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce((value, key) => (isNested(value) ? value[key] : undefined), obj);
}
