import type {
  ColumnDefinition,
  ColumnPin,
  ColumnPinningState,
  DataColumn,
  ResolvedColumn,
} from "../types";
import { getColumnId } from "./grid";

/**
 * The edge `column` is pinned to: what the user last chose for it, if
 * anything, else what its definition says. The one place that precedence is
 * decided, so the view and an imperative "is it pinned?" cannot disagree.
 */
export function resolveColumnPin<Row>(
  column: ColumnDefinition<Row, unknown>,
  pinning: ColumnPinningState,
): ColumnPin {
  return pinning[getColumnId(column)] ?? column.pinned ?? "none";
}

/** A column list split by pin, each part in the order it was given. */
export interface PinnedColumnParts<Row, Node> {
  readonly start: readonly DataColumn<Row, Node>[];
  readonly unpinned: readonly DataColumn<Row, Node>[];
  readonly end: readonly DataColumn<Row, Node>[];
}

/**
 * `columns` split into those pinned to the start, those not pinned and those
 * pinned to the end, keeping the given order inside each part.
 */
export function partitionPinnedColumns<Row, Node>(
  columns: readonly DataColumn<Row, Node>[],
  pinning: ColumnPinningState,
): PinnedColumnParts<Row, Node> {
  const parts: Record<ColumnPin, DataColumn<Row, Node>[]> = {
    start: [],
    none: [],
    end: [],
  };
  for (const entry of columns) {
    parts[resolveColumnPin(entry.column, pinning)].push(entry);
  }
  return { start: parts.start, unpinned: parts.none, end: parts.end };
}

/**
 * `columns` with the start-pinned ones first and the end-pinned ones last,
 * each group in the order given. `columns` itself when that is already their
 * order — always, with nothing pinned — so a stage memoised on this output
 * sees nothing change.
 */
export function applyColumnPinning<Row, Node>(
  columns: readonly DataColumn<Row, Node>[],
  pinning: ColumnPinningState,
): readonly DataColumn<Row, Node>[] {
  const { start, unpinned, end } = partitionPinnedColumns(columns, pinning);
  const ordered = [...start, ...unpinned, ...end];
  return ordered.every((entry, index) => entry === columns[index])
    ? columns
    : ordered;
}

/**
 * `pinning` with `columnId` pinned to `pin`, `"none"` to unpin it. The entry
 * is written only when the column's pin actually changes, and an id naming
 * no column is ignored, so asking for the pin a column already has hands back
 * `pinning` itself — the same reference, for a caller deciding whether
 * anything happened.
 */
export function setColumnPin<Row>(
  columns: readonly DataColumn<Row, unknown>[],
  pinning: ColumnPinningState,
  columnId: string,
  pin: ColumnPin,
): ColumnPinningState {
  const entry = columns.find((candidate) => candidate.id === columnId);
  if (entry === undefined || resolveColumnPin(entry.column, pinning) === pin) {
    return pinning;
  }
  return { ...pinning, [columnId]: pin };
}

/**
 * `columns`, in pinned order and sized, with each one's `pinOffset` and
 * `pinEdge` worked out from the widths it carries. Run again whenever the
 * widths change, so the offsets never lag behind them.
 */
export function placePinnedColumns<Row, Node>(
  columns: readonly ResolvedColumn<Row, Node>[],
): readonly ResolvedColumn<Row, Node>[] {
  const lastStart = columns.findLastIndex((entry) => entry.pinned === "start");
  const firstEnd = columns.findIndex((entry) => entry.pinned === "end");
  const startOffsets = widthsBefore(columns, "start");
  const endOffsets = widthsBefore(columns.toReversed(), "end").toReversed();
  return columns.map((entry, index) => {
    switch (entry.pinned) {
      case "start":
        return {
          ...entry,
          pinOffset: startOffsets[index] ?? 0,
          pinEdge: index === lastStart,
        };
      case "end":
        return {
          ...entry,
          pinOffset: endOffsets[index] ?? 0,
          pinEdge: index === firstEnd,
        };
      case "none":
        return { ...entry, pinOffset: 0, pinEdge: false };
    }
  });
}

/** For each column, the summed widths of the columns pinned to `pin` before it. */
function widthsBefore<Row, Node>(
  columns: readonly ResolvedColumn<Row, Node>[],
  pin: ColumnPin,
): readonly number[] {
  let sum = 0;
  return columns.map((entry) => {
    const before = sum;
    if (entry.pinned === pin) {
      sum += entry.width;
    }
    return before;
  });
}

/**
 * The summed widths of the columns pinned to each edge — how much of the
 * grid's width each side's pinned columns cover, which a renderer keeps
 * scrolled content clear of.
 */
export function pinnedWidths<Row, Node>(
  columns: readonly ResolvedColumn<Row, Node>[],
): { readonly start: number; readonly end: number } {
  let start = 0;
  let end = 0;
  for (const entry of columns) {
    if (entry.pinned === "start") {
      start += entry.width;
    } else if (entry.pinned === "end") {
      end += entry.width;
    }
  }
  return { start, end };
}
