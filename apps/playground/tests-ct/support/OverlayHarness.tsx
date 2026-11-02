import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  attachOverlay,
  type OverlayDismissReason,
  type OverlayPlacement,
} from "@gridkitjs/dom";

export interface OverlayHarnessProps {
  /** Where the anchor button sits; it is `position: fixed`, so this places it in the viewport. */
  anchorStyle?: CSSProperties | undefined;
  placement?: OverlayPlacement | undefined;
  gap?: number | undefined;
  /** Opens beside this point, in viewport coordinates, instead of beside the anchor. */
  point?: { x: number; y: number } | undefined;
}

/**
 * `attachOverlay` wired up the way a renderer would: the anchor toggles a
 * panel rendered into `document.body`, attached in a layout effect and
 * detached when it closes. `onDismiss` is a function the overlay calls and
 * this component answers, which a callback passed from a spec cannot do, so
 * it lives here and writes the reason where a spec can read it.
 *
 * "Elsewhere" is a control outside the overlay to click or focus, and the
 * scroller is a scrolling element outside it.
 */
export default function OverlayHarness({
  anchorStyle,
  placement,
  gap,
  point,
}: OverlayHarnessProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<OverlayDismissReason | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!open || anchor === null || panel === null) {
      return undefined;
    }
    return attachOverlay(point ?? anchor, panel, {
      placement,
      gap,
      onDismiss: (reason) => {
        setDismissed(reason);
        setOpen(false);
      },
    });
  }, [open, point, placement, gap]);

  return (
    // Clear of every place the panel opens, so nothing here sits under it.
    <div style={{ paddingLeft: 400 }}>
      <button
        ref={anchorRef}
        type="button"
        style={{ position: "fixed", top: 20, left: 20, ...anchorStyle }}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        Anchor
      </button>
      <button type="button">Elsewhere</button>
      <div data-testid="scroller" style={{ height: 40, overflow: "auto" }}>
        <div style={{ height: 400 }} />
      </div>
      <output data-testid="dismissed">{dismissed ?? "none"}</output>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Panel"
            style={{ width: 200, height: 120, background: "white" }}
          >
            <button type="button">First</button>
            <div
              data-testid="panel-scroller"
              style={{ height: 40, overflow: "auto" }}
            >
              <div style={{ height: 400 }} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
