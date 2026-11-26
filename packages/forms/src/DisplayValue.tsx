/**
 * A value in display mode: its text, as a document shows it, or for an
 * empty value a dash that is read as `emptyText`.
 */
export function DisplayValue({
  text,
  emptyText,
}: {
  readonly text: string;
  readonly emptyText: string;
}) {
  if (text !== "") {
    return <span className="gridkit-forms-display-value">{text}</span>;
  }
  return (
    <span className="gridkit-forms-display-value gridkit-forms-display-empty">
      <span aria-hidden="true">—</span>
      <span className="gridkit-forms-sr-only">{emptyText}</span>
    </span>
  );
}
