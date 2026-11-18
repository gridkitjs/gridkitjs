/**
 * Reports `element`'s height now and on every change after, until the
 * returned function disconnects it: what a renderer insets its scroll area
 * by for a header or footer that sticks to its top or bottom edge.
 *
 * The first report is synchronous, like `observeElementWidth`'s, so a
 * renderer calling this before paint sizes its scroll area right from the
 * first frame.
 *
 * Reads the border box from `getBoundingClientRect()`, unrounded: an inset
 * a fraction of a pixel short of a header leaves a sliver of the rows
 * scrolled under it showing.
 */
export function observeElementHeight(
  element: HTMLElement,
  onHeight: (height: number) => void,
): () => void {
  onHeight(element.getBoundingClientRect().height);

  const observer = new ResizeObserver(() => {
    onHeight(element.getBoundingClientRect().height);
  });
  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}
