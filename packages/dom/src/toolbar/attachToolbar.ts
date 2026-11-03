import { nextMenuIndex, type MenuMove } from "@gridkitjs/core";

/** Every element a toolbar is made of. Those with no control in them — separators, spacers — are passed over. */
const ENTRY = "[data-gridkit-toolbar-item]";

/** What can take focus: an entry's control is the entry itself, or the first of these in it. */
const FOCUSABLE = [
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "a[href]",
  "[tabindex]",
].join(", ");

/** The keys that move focus, and where to. */
const MOVES: Readonly<Record<string, MenuMove>> = {
  ArrowRight: "next",
  ArrowLeft: "previous",
  Home: "first",
  End: "last",
};

/** Each control, as `nextMenuIndex` reads it: no separators are among them. */
const AS_ENTRY = { type: "item" } as const;

/** Input types with no caret, whose arrow keys the toolbar may take. */
const CARETLESS_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

interface Control {
  /** The `data-gridkit-toolbar-item` element. */
  readonly entry: HTMLElement;
  /** What takes focus for it. */
  readonly target: HTMLElement;
}

function targetOf(entry: HTMLElement): HTMLElement | null {
  return entry.matches(FOCUSABLE)
    ? entry
    : entry.querySelector<HTMLElement>(FOCUSABLE);
}

/** A field typed in, whose caret the arrow keys move. */
function textFieldOf(
  target: EventTarget | null,
): HTMLInputElement | HTMLTextAreaElement | null {
  return target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && !CARETLESS_INPUTS.has(target.type))
    ? target
    : null;
}

/**
 * Whether a key belongs to the text field it was pressed in rather than to
 * the toolbar: Home and End always do, and an arrow does unless the caret
 * sits at the end it points past — so the arrows still lead out of a field,
 * which would otherwise trap focus in it, the toolbar's one tab stop.
 */
function belongsToField(target: EventTarget | null, move: MenuMove): boolean {
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }
  const field = textFieldOf(target);
  if (field === null) {
    return false;
  }
  const { selectionStart, selectionEnd, value } = field;
  // A type that keeps its caret to itself — `email`, `number` — reports
  // none, so every key is left to it rather than taken from under a caret.
  if (
    move === "first" ||
    move === "last" ||
    selectionStart === null ||
    selectionStart !== selectionEnd
  ) {
    return true;
  }
  return move === "previous"
    ? selectionStart > 0
    : selectionStart < value.length;
}

/**
 * Makes `toolbar` — a `role="toolbar"` element the renderer drew — one tab
 * stop that the arrow keys move within, following the WAI-ARIA toolbar
 * pattern: ArrowRight and ArrowLeft move focus to the next and previous
 * control, wrapping round the ends, and Home and End to the first and last.
 * Returns the function that stops it.
 *
 * The toolbar's entries are its descendants with a `data-gridkit-toolbar-item`,
 * and each entry's control is the entry itself when it can take focus, else
 * the first element in it that can; an entry with none — a separator, a
 * spacer — is passed over. They are read afresh on every key. One control at
 * a time has `tabindex="0"` — the focused one, or the first — and the rest
 * `-1`, kept so as entries come and go; a control with
 * `aria-disabled="true"` stays one of them, so a screen reader finds it.
 *
 * A text field keeps the keys it needs: Home and End, and an arrow while
 * the caret has text to move through in that direction. At the start or end
 * of its text, the arrow moves on to the next control.
 */
export function attachToolbar(toolbar: HTMLElement): () => void {
  /** The control with `tabindex="0"`. */
  let stop: HTMLElement | undefined;

  function controls(): Control[] {
    return Array.from(toolbar.querySelectorAll<HTMLElement>(ENTRY)).flatMap(
      (entry) => {
        const target = targetOf(entry);
        return target === null ? [] : [{ entry, target }];
      },
    );
  }

  function indexOf(all: readonly Control[], node: EventTarget | null): number {
    return node instanceof Node
      ? all.findIndex((control) => control.entry.contains(node))
      : -1;
  }

  function setTabStop(next: HTMLElement | undefined): void {
    stop = next;
    for (const { target } of controls()) {
      target.tabIndex = target === next ? 0 : -1;
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    const move = MOVES[event.key];
    if (
      move === undefined ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      belongsToField(event.target, move)
    ) {
      return;
    }
    const all = controls();
    const from = indexOf(all, event.target);
    if (from === -1) {
      return;
    }
    const next =
      all[
        nextMenuIndex(
          all.map(() => AS_ENTRY),
          from,
          move,
        )
      ];
    if (next !== undefined) {
      event.preventDefault();
      setTabStop(next.target);
      next.target.focus();
    }
  }

  // However focus arrived — a click, Tab, a script — the tab stop follows it.
  function onFocusIn(event: FocusEvent): void {
    const all = controls();
    const control = all[indexOf(all, event.target)];
    if (control !== undefined) {
      setTabStop(control.target);
    }
  }

  // A control drawn since — a button whose command became visible — would
  // otherwise come with the browser's own tab stop, and make two. The stop
  // stays where it was while its control is still drawn.
  const observer = new MutationObserver(() => {
    const all = controls();
    setTabStop(
      all.find(({ target }) => target === stop)?.target ?? all[0]?.target,
    );
  });

  const all = controls();
  setTabStop(
    all[indexOf(all, document.activeElement)]?.target ?? all[0]?.target,
  );
  toolbar.addEventListener("keydown", onKeyDown);
  toolbar.addEventListener("focusin", onFocusIn);
  observer.observe(toolbar, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    toolbar.removeEventListener("keydown", onKeyDown);
    toolbar.removeEventListener("focusin", onFocusIn);
  };
}
