/**
 * `entries` with each one's `rowIndex` and `datasetIndex` set to its
 * position in the array. Every stage ahead of pagination that reorders,
 * drops or inserts rows ends with this, so the two always agree before
 * `paginateRows` makes `rowIndex` page-relative: `datasetIndex` is then a
 * row's place in the whole displayed result, which is what `aria-rowindex`
 * is built from and why no two rows, of any kind, share one.
 *
 * An entry already at its position is kept as it is, so a stage that moved
 * nothing hands back entries reference-equal to its input's.
 */
export function renumberRows<
  Entry extends { readonly rowIndex: number; readonly datasetIndex: number },
>(entries: readonly Entry[]): Entry[] {
  return entries.map((entry, index) =>
    entry.rowIndex === index && entry.datasetIndex === index
      ? entry
      : { ...entry, rowIndex: index, datasetIndex: index },
  );
}
