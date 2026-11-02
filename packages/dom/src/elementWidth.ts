/**
 * Reports `element`'s inner width now and on every change after, until the
 * returned function disconnects it — what `resizeMode: "fit"` fills.
 *
 * The first report is synchronous, so a renderer calling this before paint
 * lays its columns out at the right width from the first frame rather than
 * visibly jumping once the observer's first callback arrives.
 *
 * Reads `clientWidth` rather than the observer entry's `contentRect` so the
 * first report and every later one come from the same, already-rounded,
 * source.
 */
export function observeElementWidth(
  element: HTMLElement,
  onWidth: (width: number) => void,
): () => void {
  onWidth(element.clientWidth);

  const observer = new ResizeObserver(() => {
    onWidth(element.clientWidth);
  });
  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}
