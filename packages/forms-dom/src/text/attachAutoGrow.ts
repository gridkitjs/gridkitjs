/** How many lines of text a growing `<textarea>` shows. */
export interface AutoGrowOptions {
  /** The lines it shows when empty. */
  readonly minRows: number;
  /** The lines it grows to, before it scrolls. */
  readonly maxRows: number;
}

export interface AttachedAutoGrow {
  /**
   * Sets the height for the text there is now. The renderer calls it after
   * it writes text from code, which fires no `input`.
   */
  readonly update: () => void;
  /** Replaces the row range, and sets the height for it. */
  readonly setOptions: (options: AutoGrowOptions) => void;
  /** Stops listening, and leaves the height as it is. */
  readonly detach: () => void;
}

function pixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** `normal` line height, as browsers draw it for most fonts. */
const NORMAL_LINE_HEIGHT = 1.2;

/**
 * Grows a `<textarea>` with its text, from `minRows` lines to `maxRows`,
 * then lets it scroll. The height follows every `input` and every change
 * of the textarea's width, which rewraps the text (a `ResizeObserver`),
 * and is worked out from `scrollHeight`, the computed line height,
 * padding and borders. CSS `field-sizing: content` would do this, but not
 * every browser the forms support has it.
 */
export function attachAutoGrow(
  textarea: HTMLTextAreaElement,
  initialOptions: AutoGrowOptions,
): AttachedAutoGrow {
  let options = initialOptions;
  let width = -1;
  let detached = false;
  const listeners = new AbortController();

  function update(): void {
    if (detached) {
      return;
    }
    const style = getComputedStyle(textarea);
    const lineHeight =
      style.lineHeight === "normal"
        ? pixels(style.fontSize) * NORMAL_LINE_HEIGHT
        : pixels(style.lineHeight);
    const padding = pixels(style.paddingTop) + pixels(style.paddingBottom);
    const border =
      pixels(style.borderTopWidth) + pixels(style.borderBottomWidth);
    const min = Math.max(1, options.minRows) * lineHeight;
    const max = Math.max(options.minRows, options.maxRows) * lineHeight;

    // With no height of its own the textarea's scroll height is its text's.
    textarea.style.height = "0px";
    const content = textarea.scrollHeight - padding;
    const inner = Math.min(Math.max(content, min), max);
    const outer =
      style.boxSizing === "border-box" ? inner + padding + border : inner;
    textarea.style.height = `${String(outer)}px`;
    textarea.style.overflowY = content > max + 1 ? "auto" : "hidden";
  }

  const resizes = new ResizeObserver(([entry]) => {
    // Only a new width rewraps the text; the height is this behaviour's own.
    const next = entry?.contentRect.width ?? width;
    if (next !== width) {
      width = next;
      update();
    }
  });
  resizes.observe(textarea);
  textarea.addEventListener("input", update, { signal: listeners.signal });
  update();

  return {
    update,
    setOptions: (next) => {
      options = next;
      update();
    },
    detach: () => {
      detached = true;
      listeners.abort();
      resizes.disconnect();
    },
  };
}
