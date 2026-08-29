import type { ResolvedColumn } from "../DataGrid";

interface GridColgroupProps<Row> {
  columns: readonly ResolvedColumn<Row>[];
}

/**
 * One `<colgroup>`, shared verbatim by the header, body, and footer
 * `<table>`s so all three render identical column widths from one source
 * rather than three independent copies of the same `.map()`.
 */
export default function GridColgroup<Row>({ columns }: GridColgroupProps<Row>) {
  return (
    <colgroup>
      {columns.map((entry) => (
        <col key={entry.id} style={{ width: entry.width }} />
      ))}
    </colgroup>
  );
}
