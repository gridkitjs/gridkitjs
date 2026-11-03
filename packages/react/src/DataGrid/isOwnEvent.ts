/**
 * Whether `event` happened inside the element whose handler is running.
 * React bubbles a portal's events up the component tree rather than the DOM,
 * so a panel rendered into `document.body` from inside the grid still reaches
 * the grid's key handlers — and Escape or Ctrl+A pressed in it is the
 * panel's, not the grid's.
 */
export function isOwnEvent(event: {
  readonly currentTarget: Element;
  readonly target: EventTarget;
}): boolean {
  return (
    event.target instanceof Node && event.currentTarget.contains(event.target)
  );
}
