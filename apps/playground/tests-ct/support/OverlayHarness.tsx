import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
  /**
   * The panel's `initialFocus`. An element cannot come from a spec, so
   * `"open-child"` stands for passing the panel's "Open child" button.
   */
  initialFocus?: "first" | "panel" | "none" | "open-child" | undefined;
  /** Passed as `trapFocus` to both the panel and the child above it. */
  trapFocus?: boolean | undefined;
}

/**
 * `attachOverlay` wired up the way a renderer would: the anchor toggles a
 * panel rendered into `document.body`, attached in a layout effect and
 * detached when it closes. `onDismiss` is a function the overlay calls and
 * this component answers, which a callback passed from a spec cannot do, so
 * it lives here and writes the reason where a spec can read it.
 *
 * "Elsewhere" is a control outside the overlay to click or focus, and the
 * scroller is a scrolling element outside it. "Open child" in the panel opens
 * a second overlay above the first, the way a submenu opens from a menu, and
 * "Close panel" in the child closes the panel, as a submenu item closes the
 * menu it came from. The child's open state lives here rather than in the
 * panel, so closing the panel leaves the child to the overlay stack to close.
 * A page-level Escape listener counts the Escapes that reach the page.
 * "Shrink" halves the panel's height, for its re-placement, and "Drop anchor"
 * takes the anchor out of the page while the panel stays open.
 */
export default function OverlayHarness({
  anchorStyle,
  placement,
  gap,
  point,
  initialFocus,
  trapFocus,
}: OverlayHarnessProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const childAnchorRef = useRef<HTMLButtonElement>(null);
  const childRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(120);
  const [anchorDropped, setAnchorDropped] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [dismissed, setDismissed] = useState<OverlayDismissReason | null>(null);
  const [childDismissed, setChildDismissed] =
    useState<OverlayDismissReason | null>(null);
  const [pageEscapes, setPageEscapes] = useState(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setPageEscapes((count) => count + 1);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    const childAnchor = childAnchorRef.current;
    if (!open || anchor === null || panel === null || childAnchor === null) {
      return undefined;
    }
    return attachOverlay(point ?? anchor, panel, {
      placement,
      gap,
      initialFocus: initialFocus === "open-child" ? childAnchor : initialFocus,
      trapFocus,
      onDismiss: (reason) => {
        setDismissed(reason);
        setOpen(false);
      },
    });
  }, [open, point, placement, gap, initialFocus, trapFocus]);

  useLayoutEffect(() => {
    const anchor = childAnchorRef.current;
    const child = childRef.current;
    if (!childOpen || anchor === null || child === null) {
      return undefined;
    }
    return attachOverlay(anchor, child, {
      placement: "right-start",
      trapFocus,
      onDismiss: (reason) => {
        setChildDismissed(reason);
        setChildOpen(false);
      },
    });
  }, [childOpen, trapFocus]);

  return (
    // Clear of every place the panel opens, so nothing here sits under it.
    <div style={{ paddingLeft: 400 }}>
      {!anchorDropped && (
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
      )}
      <button type="button">Elsewhere</button>
      <div data-testid="scroller" style={{ height: 40, overflow: "auto" }}>
        <div style={{ height: 400 }} />
      </div>
      <output data-testid="dismissed">{dismissed ?? "none"}</output>
      <output data-testid="child-dismissed">{childDismissed ?? "none"}</output>
      <output data-testid="page-escapes">{pageEscapes}</output>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Panel"
            style={{ width: 200, height: panelHeight, background: "white" }}
          >
            <button type="button">First</button>
            <div
              data-testid="panel-scroller"
              style={{ height: 40, overflow: "auto" }}
            >
              <div style={{ height: 400 }} />
            </div>
            <button
              ref={childAnchorRef}
              type="button"
              onClick={() => {
                setChildOpen(true);
              }}
            >
              Open child
            </button>
            <button
              type="button"
              onClick={() => {
                setPanelHeight(60);
              }}
            >
              Shrink
            </button>
            <button
              type="button"
              onClick={() => {
                setAnchorDropped(true);
              }}
            >
              Drop anchor
            </button>
          </div>,
          document.body,
        )}
      {childOpen &&
        createPortal(
          <div
            ref={childRef}
            role="dialog"
            aria-label="Child"
            style={{ width: 150, height: 60, background: "white" }}
          >
            <button type="button">Child item</button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
              }}
            >
              Close panel
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
