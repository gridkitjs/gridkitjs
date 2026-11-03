import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { ResolvedToolbarItem } from "@gridkitjs/core";
import { observeToolbarOverflow, type ToolbarOverflow } from "@gridkitjs/dom";

/**
 * How many of a toolbar's items fit in it, from the start, as
 * `@gridkitjs/dom`'s `observeToolbarOverflow` measures them — every item
 * until it first reports, which it does before paint.
 *
 * Attached once, so the widths it remembers for items moved into "More"
 * survive, and told of new items only when the toolbar's layout — each
 * item's kind, key and label — changes, rather than on every render, which
 * resolves the items afresh. A label matters for an item in "More", whose
 * remembered width it makes stale.
 */
export default function useToolbarOverflow(
  toolbarRef: RefObject<HTMLElement | null>,
  items: readonly ResolvedToolbarItem[],
): number {
  const [fit, setFit] = useState(items.length);
  const overflow = useRef<ToolbarOverflow | null>(null);
  const measuredLayout = useRef("");
  const layout = JSON.stringify(
    items.map((item) => [
      item.type,
      item.key,
      "label" in item ? item.label : null,
    ]),
  );

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (toolbar === null || layout === measuredLayout.current) {
      return;
    }
    measuredLayout.current = layout;
    const options = { items, onChange: setFit };
    if (overflow.current === null) {
      overflow.current = observeToolbarOverflow(toolbar, options);
    } else {
      overflow.current.update(options);
    }
  }, [toolbarRef, layout, items]);

  useLayoutEffect(
    () => () => {
      overflow.current?.detach();
      overflow.current = null;
      measuredLayout.current = "";
    },
    [],
  );

  return fit;
}
