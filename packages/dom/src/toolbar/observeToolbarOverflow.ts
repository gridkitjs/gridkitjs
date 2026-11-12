import type { ResolvedToolbarItem } from "@gridkitjs/core";
import { fitToolbarItems, isPinnedToolbarItem } from "@gridkitjs/core/renderer";

/**
 * A toolbar entry as the overflow reads it: its kind, the key its element
 * carries and, for a button or a dropdown, its label — a change to which,
 * while the entry is in "More" and not drawn, makes the width remembered for
 * it stale.
 */
export type ToolbarOverflowItem = Pick<ResolvedToolbarItem, "type" | "key"> & {
  readonly label?: string | undefined;
};

export interface ToolbarOverflowOptions {
  /**
   * Every entry of the toolbar, in order — those drawn and those moved into
   * "More" alike — as `resolveToolbar` gave them.
   */
  readonly items: readonly ToolbarOverflowItem[];
  /**
   * How many entries fit, as `fitToolbarItems` counts them: called once
   * straight away, then whenever the count changes.
   */
  readonly onChange: (fit: number) => void;
}

export interface ToolbarOverflow {
  /**
   * Call whenever the items change, with the current options: measures
   * again, and reports a changed count.
   */
  readonly update: (options: ToolbarOverflowOptions) => void;
  /** Stops observing. */
  readonly detach: () => void;
}

const ENTRY_ATTRIBUTE = "data-gridkit-toolbar-item";
const MORE_ATTRIBUTE = "data-gridkit-toolbar-more";

function pixels(value: string): number {
  return Number.parseFloat(value) || 0;
}

/** The room an element takes in its row: its box and its margins. */
function outerWidth(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return (
    element.getBoundingClientRect().width +
    pixels(style.marginLeft) +
    pixels(style.marginRight)
  );
}

/**
 * Measures how many of a toolbar's entries fit in it, reporting the count
 * through `onChange` straight away — so a renderer calling this before
 * paint draws the right entries from the first frame — and again whenever a
 * resize changes it. The arithmetic is @gridkitjs/core's `fitToolbarItems`:
 * the search box and custom entries always stay, and room for "More" is kept
 * only when something does not fit.
 *
 * Entries are found by their `data-gridkit-toolbar-item`, holding each
 * item's `key`, and the "More" button by `data-gridkit-toolbar-more`. An
 * entry moved into "More" is no longer drawn, so each width is remembered
 * by key from the last time it was; one never drawn yet counts as nothing,
 * which lets it be drawn, measured, and moved back out if it does not fit —
 * as one whose label changed while it was not drawn counts again.
 * A spacer counts as nothing too: its width is only the room left over. The
 * toolbar's padding and the `column-gap` between entries are allowed for.
 *
 * It measures again whenever the toolbar or an entry resizes and whenever
 * entries are drawn or taken away — the ones the count it reported let in,
 * or the "More" button — so a renderer only has to draw what it is told,
 * and to pass new items to `update`.
 */
export function observeToolbarOverflow(
  toolbar: HTMLElement,
  options: ToolbarOverflowOptions,
): ToolbarOverflow {
  let current = options;
  const widths = new Map<string, number>();
  let moreWidth = 0;
  let reported: number | undefined;

  function drawnEntries(): HTMLElement[] {
    return Array.from(
      toolbar.querySelectorAll<HTMLElement>(`[${ENTRY_ATTRIBUTE}]`),
    );
  }

  function measure(): void {
    for (const element of drawnEntries()) {
      if (element.hasAttribute(MORE_ATTRIBUTE)) {
        moreWidth = outerWidth(element);
      } else {
        widths.set(
          element.getAttribute(ENTRY_ATTRIBUTE) ?? "",
          outerWidth(element),
        );
      }
    }
    const style = getComputedStyle(toolbar);
    // Every entry is counted with the gap after it, so the row gets one gap
    // more than it has — the one after its last entry — to share.
    const gap = pixels(style.columnGap);
    const fit = fitToolbarItems({
      widths: current.items.map(
        (item) =>
          (item.type === "spacer" ? 0 : (widths.get(item.key) ?? 0)) + gap,
      ),
      available:
        toolbar.clientWidth -
        pixels(style.paddingLeft) -
        pixels(style.paddingRight) +
        gap,
      moreWidth: moreWidth + gap,
      pinned: current.items.map(isPinnedToolbarItem),
    });
    if (fit !== reported) {
      reported = fit;
      current.onChange(fit);
    }
  }

  /** The toolbar for the room there is, and every entry drawn for a label that changed its width. */
  const resizes = new ResizeObserver(measure);

  function observeSizes(): void {
    resizes.disconnect();
    resizes.observe(toolbar);
    for (const element of drawnEntries()) {
      resizes.observe(element);
    }
  }

  const draws = new MutationObserver(() => {
    observeSizes();
    measure();
  });

  observeSizes();
  draws.observe(toolbar, { childList: true, subtree: true });
  measure();

  return {
    update(next) {
      // An entry whose label changed while it was in "More" is forgotten, so
      // it counts as never drawn: drawn, measured afresh, and moved back out
      // if it no longer fits. One drawn is measured again straight away.
      const labels = new Map(
        current.items.map((item) => [item.key, item.label]),
      );
      for (const item of next.items) {
        if (labels.has(item.key) && labels.get(item.key) !== item.label) {
          widths.delete(item.key);
        }
      }
      current = next;
      measure();
    },
    detach() {
      resizes.disconnect();
      draws.disconnect();
    },
  };
}
