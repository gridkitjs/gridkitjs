/** The data cell an event happened in. */
export interface BodyCellTarget {
  /** The row's place among every body row, from its `data-gridkit-row-index`. */
  readonly rowIndex: number;
  /** The cell's place in its row, off the table's own indices. */
  readonly columnIndex: number;
  readonly columnId: string;
}

/** The group-header row an event happened in. */
export interface GroupRowTarget {
  readonly rowIndex: number;
  readonly groupId: string;
}

/** The body row an event happened in — a data row, or a group's header or summary. */
export interface BodyRowTarget {
  readonly rowIndex: number;
  /** The column of the cell it happened in, `null` when it was in none. */
  readonly columnId: string | null;
}

/**
 * A row's place among every body row, off the `data-gridkit-row-index` each
 * row carries — not its DOM position, which under virtualization is off by
 * the rows not mounted. `null` without the attribute: a spacer row, or no row
 * at all.
 */
function rowIndexOf(row: Element): number | null {
  const attribute = row.getAttribute("data-gridkit-row-index");
  return attribute === null ? null : Number(attribute);
}

/**
 * The data cell `target` is in — what a renderer delegating its body's
 * events to one listener asks of each event. `closest` is what makes the
 * whole cell the target: a click on a template's own markup resolves to the
 * cell holding it.
 *
 * Never matches inside a group-header row: that row's single `<td>` carries
 * no `data-gridkit-column` (it spans every column at once, so no one column
 * id applies), which keeps this to data rows without a check of its own.
 */
export function bodyCellFrom(
  target: EventTarget | null,
): BodyCellTarget | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const cell = target.closest("td[data-gridkit-column]");
  const row = cell?.parentElement;
  const columnId = cell?.getAttribute("data-gridkit-column");
  const rowIndex = row === null || row === undefined ? null : rowIndexOf(row);
  if (
    !(cell instanceof HTMLTableCellElement) ||
    !(row instanceof HTMLTableRowElement) ||
    columnId === null ||
    columnId === undefined ||
    rowIndex === null
  ) {
    return null;
  }
  return { rowIndex, columnIndex: cell.cellIndex, columnId };
}

/** The group-header row (`tr[data-gridkit-group]`) `target` is in. */
export function groupRowFrom(
  target: EventTarget | null,
): GroupRowTarget | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const row = target.closest("tr[data-gridkit-group]");
  const groupId = row?.getAttribute("data-gridkit-group");
  const rowIndex = row === null ? null : rowIndexOf(row);
  if (
    !(row instanceof HTMLTableRowElement) ||
    groupId === null ||
    groupId === undefined ||
    rowIndex === null
  ) {
    return null;
  }
  return { rowIndex, groupId };
}

/**
 * The row `target` is in, cell or not — all a row click needs. The column is
 * read only off a cell of that very row, so a table inside a cell template
 * cannot lend it one of its own.
 */
export function bodyRowFrom(target: EventTarget | null): BodyRowTarget | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const row = target.closest("tr[data-gridkit-row-index]");
  const rowIndex = row === null ? null : rowIndexOf(row);
  if (rowIndex === null) {
    return null;
  }
  const cell = target.closest("td[data-gridkit-column]");
  return {
    rowIndex,
    columnId:
      cell?.parentElement === row
        ? cell.getAttribute("data-gridkit-column")
        : null,
  };
}
