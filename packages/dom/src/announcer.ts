/** A live region to report changes through. */
export interface LiveAnnouncer {
  /**
   * Has assistive technology read `text` out, politely — after whatever it is
   * already saying. The same text twice in a row is read twice.
   */
  readonly announce: (text: string) => void;
  /** Removes the live region. */
  readonly destroy: () => void;
}

/** Whitespace to a screen reader, but a change to the text it is watching. */
const NO_BREAK_SPACE = String.fromCodePoint(0xa0);

/**
 * Creates the one live region a grid reports through — a reorder, a resize, a
 * bulk selection, anything no visual cue can carry to a screen reader — as
 * the last child of `container`.
 *
 * Polite rather than assertive, so an announcement waits for a pause instead
 * of cutting across what the user is already hearing. The element carries
 * `gridkit-sr-only`, which the theme clips to nothing while leaving it in the
 * accessibility tree.
 *
 * A live region speaks only when its text changes, so a message identical to
 * the last would go unheard. A no-break space, added and dropped in turn,
 * makes the repeat a change without changing what is read.
 */
export function createLiveAnnouncer(
  container: HTMLElement = document.body,
): LiveAnnouncer {
  const region = document.createElement("div");
  region.className = "gridkit-sr-only";
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  container.append(region);

  let last = "";
  let padded = false;

  return {
    announce(text) {
      padded = text === last && !padded;
      last = text;
      region.textContent = padded ? text + NO_BREAK_SPACE : text;
    },
    destroy() {
      region.remove();
    },
  };
}
