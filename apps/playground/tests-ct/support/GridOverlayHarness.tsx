import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ColumnDefinition } from "@gridkitjs/core";
import { attachOverlay } from "@gridkitjs/dom";
import { DataGrid } from "@gridkitjs/react";

interface Row {
  id: string;
  name: string;
}

const rows: readonly Row[] = Array.from({ length: 3 }, (_, index) => ({
  id: `row-${String(index)}`,
  name: `Row ${String(index)}`,
}));

/**
 * A button that opens a panel portalled into `document.body`. The panel sits
 * outside the grid's DOM but inside its React tree, so React carries the
 * panel's events up through the grid's handlers — as it will for a menu the
 * grid renders.
 *
 * The panel stays mounted while closed, as one that animates out does. A
 * panel that unmounted would take its React tree with it as soon as the
 * Escape that closed it was handled, and React would have nowhere left to
 * bubble that Escape from.
 */
function PanelOpener() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!open || anchor === null || panel === null) {
      return undefined;
    }
    return attachOverlay(anchor, panel, {
      onDismiss: () => {
        setOpen(false);
      },
    });
  }, [open]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        Open panel
      </button>
      {createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Panel"
          hidden={!open}
          style={{ width: 200, background: "white" }}
        >
          <input aria-label="Panel input" defaultValue="hello" />
        </div>,
        document.body,
      )}
    </>
  );
}

const columns: readonly ColumnDefinition<Row, ReactNode>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 160, headerTemplate: <PanelOpener /> },
];

/**
 * A grid with multiple row selection whose header holds a portalled overlay,
 * for checking that keys pressed in the overlay are not taken as the grid's
 * own. Defined here because `headerTemplate` and `getRowId` are read during
 * render, which a value passed from a spec cannot be.
 */
export default function GridOverlayHarness() {
  return (
    <DataGrid
      columns={columns}
      dataSource={rows}
      label="Grid with an overlay"
      selectable={{ rows: "multiple" }}
      getRowId={(row) => row.id}
    />
  );
}
