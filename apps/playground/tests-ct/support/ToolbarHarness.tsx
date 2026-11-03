import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { attachToolbar } from "@gridkitjs/dom";

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  boxSizing: "border-box",
  padding: "0 5px",
  overflow: "hidden",
};
/** Fixed widths, so what fits at a given toolbar width is known exactly. */
const entryStyle = (width: number): CSSProperties => ({
  flexShrink: 0,
  boxSizing: "border-box",
  width,
  margin: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
});

/**
 * `attachToolbar` on a `role="toolbar"` drawn the way a renderer would: two
 * buttons, the second `aria-disabled`; a separator; a search box wrapped in
 * its entry; a spacer; another button; and a custom entry holding a button
 * of its own. "Before" and "After" sit either side of it for Tab, and "Add
 * item" draws a new first button, as a command becoming visible would.
 */
export default function ToolbarHarness() {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [added, setAdded] = useState(false);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    return toolbar === null ? undefined : attachToolbar(toolbar);
  }, []);

  return (
    <div>
      <button type="button">Before</button>
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Actions"
        style={{ ...toolbarStyle, width: 600 }}
      >
        {added && (
          <button
            type="button"
            data-gridkit-toolbar-item="added"
            style={entryStyle(80)}
          >
            Added
          </button>
        )}
        <button
          type="button"
          data-gridkit-toolbar-item="bold"
          style={entryStyle(80)}
        >
          Bold
        </button>
        <button
          type="button"
          data-gridkit-toolbar-item="delete"
          aria-disabled="true"
          style={entryStyle(80)}
        >
          Delete
        </button>
        <div
          role="separator"
          aria-orientation="vertical"
          data-gridkit-toolbar-item="separator-2"
          style={{ ...entryStyle(1), height: 20, background: "gray" }}
        />
        <div data-gridkit-toolbar-item="search" style={entryStyle(120)}>
          <input
            type="search"
            aria-label="Search"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <div data-gridkit-toolbar-item="spacer-4" style={{ flex: 1 }} />
        <button
          type="button"
          data-gridkit-toolbar-item="export"
          style={entryStyle(80)}
        >
          Export
        </button>
        <div data-gridkit-toolbar-item="status" style={entryStyle(60)}>
          <button type="button" style={{ width: "100%" }}>
            Status
          </button>
        </div>
      </div>
      <button type="button">After</button>
      <button
        type="button"
        onClick={() => {
          setAdded(true);
        }}
      >
        Add item
      </button>
    </div>
  );
}
