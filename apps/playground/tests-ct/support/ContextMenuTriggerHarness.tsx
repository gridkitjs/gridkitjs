import { useLayoutEffect, useRef, useState } from "react";
import { attachContextMenuTrigger } from "@gridkitjs/dom";

interface ContextMenuTriggerHarnessProps {
  /** What `onRequest` answers: whether a menu of its own was opened. */
  readonly opens?: boolean;
}

/**
 * `attachContextMenuTrigger` on a root holding a focusable "Cell" and a
 * "Template" that handles `contextmenu` itself, as a cell template with a
 * menu of its own would; an "Outside" button sits beyond the root. What the
 * trigger reports, whether each `contextmenu` and key press reached the
 * window prevented, and how many clicks reached "Cell" is written where a
 * spec can read it — the callbacks are answered here, which a function
 * passed from a spec cannot do.
 */
export default function ContextMenuTriggerHarness({
  opens = true,
}: ContextMenuTriggerHarnessProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [requests, setRequests] = useState<string[]>([]);
  const [prevented, setPrevented] = useState<string[]>([]);
  const [templateMenus, setTemplateMenus] = useState(0);
  const [cellClicks, setCellClicks] = useState(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return undefined;
    }
    const detach = attachContextMenuTrigger(root, {
      onRequest: ({ target, point, source }) => {
        const where = point === null ? "no point" : "at a point";
        setRequests((current) => [
          ...current,
          `${source} on ${target.id} ${where}`,
        ]);
        return opens;
      },
    });
    // On the window, in the bubble phase: after the document's listeners.
    function record(event: Event): void {
      const name = event instanceof KeyboardEvent ? event.key : event.type;
      setPrevented((current) => [
        ...current,
        `${name} ${String(event.defaultPrevented)}`,
      ]);
    }
    window.addEventListener("contextmenu", record);
    window.addEventListener("keydown", record);
    return () => {
      detach();
      window.removeEventListener("contextmenu", record);
      window.removeEventListener("keydown", record);
    };
  }, [opens]);

  return (
    <div>
      <div ref={rootRef}>
        <button
          type="button"
          id="cell"
          onClick={() => {
            setCellClicks((count) => count + 1);
          }}
        >
          Cell
        </button>
        <span
          id="template"
          onContextMenu={(event) => {
            event.preventDefault();
            setTemplateMenus((count) => count + 1);
          }}
        >
          Template
        </span>
      </div>
      <button type="button" id="outside">
        Outside
      </button>
      <output data-testid="requests">{requests.join("; ")}</output>
      <output data-testid="prevented">{prevented.join("; ")}</output>
      <output data-testid="template-menus">{templateMenus}</output>
      <output data-testid="cell-clicks">{cellClicks}</output>
    </div>
  );
}
