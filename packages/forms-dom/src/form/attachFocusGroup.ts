export interface FocusGroupOptions {
  /**
   * Focus left the group: by Tab or Shift+Tab (`"tab"`), or any other way
   * (`"blur"`), the window losing focus included.
   */
  readonly onLeave: (by: "tab" | "blur", nativeEvent: FocusEvent) => void;
}

export interface AttachedFocusGroup {
  /** Replaces the options, from the next event on. */
  readonly setOptions: (options: FocusGroupOptions) => void;
  /** Removes every listener. */
  readonly detach: () => void;
}

/**
 * Tells focus moving between the controls inside `root` (the two ends of
 * a range) from focus leaving it, which a control's own blur cannot: a
 * `focusout` whose `relatedTarget` is outside `root`, or none, leaves the
 * group. A Tab that nothing prevented, pressed in the group just before,
 * makes it a leave by Tab.
 *
 * It holds whether the last key pressed in the group was such a Tab,
 * cleared by the next `focusout`, key or pointer press.
 */
export function attachFocusGroup(
  root: HTMLElement,
  initialOptions: FocusGroupOptions,
): AttachedFocusGroup {
  let options = initialOptions;
  let tabbing = false;
  const listeners = new AbortController();
  const { signal } = listeners;

  root.addEventListener(
    "keydown",
    (event) => {
      tabbing = event.key === "Tab" && !event.defaultPrevented;
    },
    { signal },
  );
  root.addEventListener(
    "pointerdown",
    () => {
      tabbing = false;
    },
    { signal },
  );
  root.addEventListener(
    "focusout",
    (event) => {
      const by = tabbing ? "tab" : "blur";
      tabbing = false;
      const next = event.relatedTarget;
      if (next instanceof Node && root.contains(next)) {
        return;
      }
      options.onLeave(by, event);
    },
    { signal },
  );

  return {
    setOptions: (next) => {
      options = next;
    },
    detach: () => {
      listeners.abort();
    },
  };
}
