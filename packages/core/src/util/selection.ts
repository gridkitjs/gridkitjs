import type {
  CellSelectionMode,
  CellSelectionState,
  SelectedCellRef,
  SelectIntent,
  SelectionDiff,
  SelectionMode,
  SelectionState,
} from "../types";

/** Nothing changed, so nothing to report — shared to save an allocation. */
const NO_CHANGE: SelectionDiff = { added: [], removed: [] };

/**
 * Whether two selections hold the same ids in the same order.
 *
 * Order counts because the selection's own order is what makes `at(-1)` the
 * most recently selected; a comparison that ignored it would have a transform
 * return the old reference after a reordering that a consumer can observe.
 */
function sameSelection(a: SelectionState, b: SelectionState): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * The selection with `id` added if absent and removed if present — a
 * Ctrl-click, or Space on the focused member.
 *
 * The mode is enforced here rather than by each caller, so `"single"` cannot
 * accumulate no matter which interaction reaches it. Returns `selection`
 * itself when `mode` is `false`, keeping the unchanged-reference contract
 * `moveColumnBefore` set: a caller treats an unchanged reference as "nothing
 * happened" and neither renders nor reports.
 */
export function toggleSelection(
  selection: SelectionState,
  id: string,
  mode: SelectionMode,
): SelectionState {
  if (mode === false) {
    return selection;
  }
  if (selection.includes(id)) {
    return selection.filter((selectedId) => selectedId !== id);
  }
  return mode === "single" ? [id] : [...selection, id];
}

/**
 * The selection reduced to `id` alone — a plain click, which discards what
 * came before rather than adding to it.
 *
 * Never deselects, so clicking the one selected row leaves it selected.
 * Letting go of it is Ctrl-click's job, and `toggleSelection`'s.
 */
export function selectOnly(
  selection: SelectionState,
  id: string,
  mode: SelectionMode,
): SelectionState {
  if (mode === false) {
    return selection;
  }
  return selection.length === 1 && selection[0] === id ? selection : [id];
}

/**
 * The selection replaced by every id from `anchorId` to `focusId` inclusive — a
 * Shift-click. The two may be given in either order.
 *
 * Spans `orderedIds`, the order as displayed, rather than the selection's own:
 * the range a user drew across the screen is the range they mean, whatever
 * order they clicked its ends in. Degrades to `selectOnly` under `"single"`,
 * where a range has nowhere to go.
 */
export function selectRange(
  selection: SelectionState,
  orderedIds: readonly string[],
  anchorId: string,
  focusId: string,
  mode: SelectionMode,
): SelectionState {
  if (mode !== "multiple") {
    return selectOnly(selection, focusId, mode);
  }

  const anchor = orderedIds.indexOf(anchorId);
  const focus = orderedIds.indexOf(focusId);
  if (anchor === -1 || focus === -1) {
    return selection;
  }

  const next = orderedIds.slice(
    Math.min(anchor, focus),
    Math.max(anchor, focus) + 1,
  );
  return sameSelection(selection, next) ? selection : next;
}

/**
 * Every id in `orderedIds`, or `selection` untouched under any mode but
 * `"multiple"` — there is no selecting all of one thing.
 */
export function selectAll(
  selection: SelectionState,
  orderedIds: readonly string[],
  mode: SelectionMode,
): SelectionState {
  if (mode !== "multiple") {
    return selection;
  }
  return sameSelection(selection, orderedIds) ? selection : orderedIds;
}

export function clearSelection(selection: SelectionState): SelectionState {
  return selection.length === 0 ? selection : [];
}

/**
 * What one transition added and what it removed.
 *
 * Defined here rather than in an adapter so that every callback reporting a
 * selection change reads one answer, and a select and a deselect fired for the
 * same interaction cannot disagree about which it was.
 */
export function diffSelection(
  previous: SelectionState,
  next: SelectionState,
): SelectionDiff {
  if (previous === next) {
    return NO_CHANGE;
  }

  const before = new Set(previous);
  const after = new Set(next);
  return {
    added: next.filter((id) => !before.has(id)),
    removed: previous.filter((id) => !after.has(id)),
  };
}

export function isSameCell(
  a: CellSelectionState,
  b: CellSelectionState,
): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return a.rowId === b.rowId && a.columnId === b.columnId;
}

/**
 * The cell selection moved to `cell` — a plain click. Idempotent: clicking the
 * selected cell again leaves it selected, matching `selectOnly`.
 */
export function selectCell(
  selection: CellSelectionState,
  cell: SelectedCellRef,
  mode: CellSelectionMode,
): CellSelectionState {
  if (mode === false || isSameCell(selection, cell)) {
    return selection;
  }
  return cell;
}

/**
 * The cell selection moved to `cell`, or cleared when it is already there — a
 * Ctrl-click, matching `toggleSelection`.
 */
export function toggleCellSelection(
  selection: CellSelectionState,
  cell: SelectedCellRef,
  mode: CellSelectionMode,
): CellSelectionState {
  if (mode === false) {
    return selection;
  }
  return isSameCell(selection, cell) ? null : cell;
}

/**
 * The intent a click or key press carries, by the modifiers held with it.
 *
 * `toggleOnClick` makes the unmodified press a toggle — the
 * `selectable.toggleOnClick` checklist behaviour — leaving Shift and Ctrl
 * to mean what they always do.
 */
export function intentOf(
  event: {
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  },
  options?: { toggleOnClick?: boolean | undefined },
): SelectIntent {
  if (event.shiftKey) {
    return "range";
  }
  // Cmd on a Mac is Ctrl everywhere else, and both mean the same thing here.
  if (event.ctrlKey || event.metaKey) {
    return "toggle";
  }
  return options?.toggleOnClick === true ? "toggle" : "replace";
}

/**
 * The transform an intent asks for. A function rather than a branch inside
 * each caller, so a row and a column cannot come to mean different things by
 * the same click.
 */
export function applySelectionIntent(
  selection: SelectionState,
  orderedIds: readonly string[],
  anchorId: string | null,
  id: string,
  intent: SelectIntent,
  mode: SelectionMode,
): SelectionState {
  switch (intent) {
    case "toggle":
      return toggleSelection(selection, id, mode);
    // A range with no anchor yet spans from the id to itself, which is the
    // plain click a first Shift-click may as well be.
    case "range":
      return selectRange(selection, orderedIds, anchorId ?? id, id, mode);
    default:
      return selectOnly(selection, id, mode);
  }
}
