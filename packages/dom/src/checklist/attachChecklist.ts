export interface ChecklistOptions {
  /**
   * The item at `index` — its place in the whole list — asks to be checked
   * or unchecked: Space on it, or a click. The caller flips it in its own
   * state and draws the new `aria-checked`.
   */
  readonly onToggle: (index: number) => void;
  /** Focus moved to the item at `index`, by a key, a click or a script. */
  readonly onFocusChange?: ((index: number) => void) | undefined;
  /**
   * Bring the item at `index` into view, mounting it if the list's window
   * does not hold it. A virtualized renderer forwards this to its
   * virtualizer's `scrollToIndex`, with `{ block: "nearest" }` so a move of
   * one item scrolls by one item.
   */
  readonly scrollToIndex: (index: number) => void;
}

export interface AttachedChecklist {
  /**
   * How many items the whole list holds, mounted or not. Starts at 0, so a
   * renderer calls this straight after attaching, and again whenever the
   * list changes — a search narrowing it, say. A focused place past the new
   * end moves back to the last item, and so does a move still waiting for
   * an item past it.
   */
  readonly setCount: (count: number) => void;
  /**
   * Focuses the item at `index`, clamped to the list, scrolling to it first.
   * An item outside the mounted window is focused once it mounts.
   */
  readonly focusItem: (index: number) => void;
  /** Removes every listener and observer. The items keep their `tabindex`. */
  readonly detach: () => void;
}

const ITEM = "[data-gridkit-checklist-item]";
const INDEX = "data-gridkit-checklist-index";

function indexOf(item: Element): number {
  return Number(item.getAttribute(INDEX));
}

/**
 * Makes `list` — a `role="listbox"` the renderer drew, usually virtualized
 * so that only a window of a long list is mounted — behave as a
 * multi-select checklist with one tab stop: the arrow keys, Home, End,
 * PageUp and PageDown move focus among its items, and Space or a click asks
 * for the focused item to be toggled. It decides; the caller is told through
 * the callbacks and draws the outcome, `aria-checked` included.
 *
 * Items are the list's descendants with `data-gridkit-checklist-item` and a
 * `data-gridkit-checklist-index`: their place in the whole list rather than
 * in the window, since an item's place is all that survives it being
 * unmounted and mounted again. The list is the element that scrolls: PageUp
 * and PageDown move by as many items as it shows whole.
 *
 * One item at a time has `tabindex="0"` — the focused one, or the first
 * mounted while the focused one is scrolled away — and the rest `-1`, kept
 * so as items mount by an observer of the list's children rather than by
 * the renderer. A move to an item outside the window asks `scrollToIndex`
 * for it and focuses it once it mounts, unless focus has gone somewhere
 * else in the meantime.
 *
 * Enter is not handled, so a form around the list hears it and applies;
 * Escape is the overlay stack's.
 */
export function attachChecklist(
  list: HTMLElement,
  options: ChecklistOptions,
): AttachedChecklist {
  let count = 0;
  /** The focused place in the whole list: the tab stop, mounted or not. */
  let active = 0;
  /** The place a move is waiting to see mounted, to focus it. */
  let pending: number | null = null;

  function items(): HTMLElement[] {
    return Array.from(list.querySelectorAll<HTMLElement>(ITEM));
  }

  function itemAt(index: number): HTMLElement | null {
    return list.querySelector<HTMLElement>(
      `${ITEM}[${INDEX}="${String(index)}"]`,
    );
  }

  function itemOf(target: EventTarget | null): HTMLElement | null {
    const item =
      target instanceof Element ? target.closest<HTMLElement>(ITEM) : null;
    return item !== null && list.contains(item) ? item : null;
  }

  function setTabStop(): void {
    const all = items();
    const stop = all.find((item) => indexOf(item) === active) ?? all[0];
    for (const item of all) {
      item.tabIndex = item === stop ? 0 : -1;
    }
  }

  function makeActive(index: number): void {
    if (index !== active) {
      active = index;
      options.onFocusChange?.(index);
    }
  }

  function moveTo(index: number): void {
    if (count === 0) {
      return;
    }
    const target = Math.max(0, Math.min(index, count - 1));
    makeActive(target);
    setTabStop();
    options.scrollToIndex(target);
    const item = itemAt(target);
    if (item === null) {
      pending = target;
    } else {
      pending = null;
      item.focus({ preventScroll: true });
    }
  }

  /** How many items the list shows whole, for PageUp and PageDown. */
  function pageSize(): number {
    const top = list.getBoundingClientRect().top + list.clientTop;
    const bottom = top + list.clientHeight;
    const whole = items().filter((item) => {
      const box = item.getBoundingClientRect();
      return box.top >= top && box.bottom <= bottom;
    }).length;
    return Math.max(1, whole);
  }

  // Every key it acts on is taken, so the list does not also scroll by
  // itself. A modified key is left for whatever shortcut it is. Moves count
  // from the focused place rather than the focused element, which lags
  // behind while a move waits for its item to mount.
  function onKeyDown(event: KeyboardEvent): void {
    const item = itemOf(event.target);
    if (
      item === null ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        moveTo(active + 1);
        break;
      case "ArrowUp":
        moveTo(active - 1);
        break;
      case "Home":
        moveTo(0);
        break;
      case "End":
        moveTo(count - 1);
        break;
      case "PageDown":
        moveTo(active + pageSize());
        break;
      case "PageUp":
        moveTo(active - pageSize());
        break;
      case " ":
        // Held down, Space toggles once, as a checkbox does.
        if (!event.repeat) {
          options.onToggle(indexOf(item));
        }
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  // However focus arrived — Tab, a click, a script — the tab stop follows it,
  // and a move still waiting for its item gives way.
  function onFocusIn(event: FocusEvent): void {
    const item = itemOf(event.target);
    if (item !== null) {
      pending = null;
      makeActive(indexOf(item));
      setTabStop();
    }
  }

  function onClick(event: MouseEvent): void {
    const item = itemOf(event.target);
    if (item !== null) {
      options.onToggle(indexOf(item));
      item.focus({ preventScroll: true });
    }
  }

  // The item a move waits for takes focus only if focus is still in the
  // list, or dropped to nothing when the item it was on unmounted.
  function focusPendingIfMounted(): void {
    const item = pending === null ? null : itemAt(pending);
    if (item === null) {
      return;
    }
    pending = null;
    const focused = document.activeElement;
    if (
      focused === null ||
      focused === document.body ||
      list.contains(focused)
    ) {
      item.focus({ preventScroll: true });
    }
  }

  // Items mount and unmount as the window moves, and a kept element can take
  // another place when the list changes under it.
  const observer = new MutationObserver(() => {
    setTabStop();
    focusPendingIfMounted();
  });
  observer.observe(list, {
    childList: true,
    subtree: true,
    attributeFilter: [INDEX],
  });

  setTabStop();
  list.addEventListener("keydown", onKeyDown);
  list.addEventListener("focusin", onFocusIn);
  list.addEventListener("click", onClick);

  return {
    setCount(next) {
      count = next;
      active = Math.max(0, Math.min(active, count - 1));
      if (pending !== null) {
        pending = count === 0 ? null : Math.min(pending, count - 1);
      }
      setTabStop();
      focusPendingIfMounted();
    },
    focusItem: moveTo,
    detach() {
      pending = null;
      observer.disconnect();
      list.removeEventListener("keydown", onKeyDown);
      list.removeEventListener("focusin", onFocusIn);
      list.removeEventListener("click", onClick);
    },
  };
}
