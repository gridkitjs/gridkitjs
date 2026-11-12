import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { isPinnedToolbarItem } from "@gridkitjs/core/renderer";
import {
  attachToolbar,
  observeToolbarOverflow,
  type ToolbarOverflow,
  type ToolbarOverflowItem,
} from "@gridkitjs/dom";

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

/** The entries, as `observeToolbarOverflow` reads them. */
const ENTRIES: readonly ToolbarOverflowItem[] = [
  { type: "button", key: "bold" },
  { type: "button", key: "delete" },
  { type: "separator", key: "separator-2" },
  { type: "search", key: "search" },
  { type: "spacer", key: "spacer-4" },
  { type: "button", key: "export" },
  { type: "custom", key: "status" },
];
const ADDED: ToolbarOverflowItem = { type: "button", key: "added" };

const LABELS: Readonly<Record<string, string>> = {
  added: "Added",
  bold: "Bold",
  delete: "Delete",
  export: "Export",
};

function Entry({ item }: { readonly item: ToolbarOverflowItem }) {
  switch (item.type) {
    case "separator":
      return (
        <div
          role="separator"
          aria-orientation="vertical"
          data-gridkit-toolbar-item={item.key}
          style={{ ...entryStyle(1), height: 20, background: "gray" }}
        />
      );
    case "search":
      return (
        <div data-gridkit-toolbar-item={item.key} style={entryStyle(120)}>
          <input
            type="search"
            aria-label="Search"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>
      );
    case "spacer":
      return <div data-gridkit-toolbar-item={item.key} style={{ flex: 1 }} />;
    case "custom":
      return (
        <div data-gridkit-toolbar-item={item.key} style={entryStyle(60)}>
          <button type="button" style={{ width: "100%" }}>
            Status
          </button>
        </div>
      );
    default:
      return (
        <button
          type="button"
          data-gridkit-toolbar-item={item.key}
          aria-disabled={item.key === "delete" ? "true" : undefined}
          style={entryStyle(80)}
        >
          {LABELS[item.key]}
        </button>
      );
  }
}

/**
 * A `role="toolbar"` drawn the way a renderer would, with `attachToolbar`
 * and `observeToolbarOverflow` attached: two buttons, the second
 * `aria-disabled`; a separator; a search box wrapped in its entry; a
 * spacer; another button; and a custom entry holding a button of its own.
 * "Before" and "After" sit either side of it for Tab, and "Add item" draws a
 * new first button, as a command becoming visible would.
 *
 * It is 600px wide, room for everything; a spec narrows it by setting its
 * width directly, as a resized container would. Entries past the count
 * `onChange` gives are not drawn — the search box and the custom entry
 * always are — and a "More" button is, while anything is left out. The
 * count is written out, which a callback passed from a spec could not do.
 */
export default function ToolbarHarness() {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<ToolbarOverflow | null>(null);
  const [added, setAdded] = useState(false);
  const [fit, setFit] = useState(ENTRIES.length);
  const items = useMemo(() => (added ? [ADDED, ...ENTRIES] : ENTRIES), [added]);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    return toolbar === null ? undefined : attachToolbar(toolbar);
  }, []);

  // Attached once and told of new items, so the entries it measured stay
  // remembered while they are not drawn.
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (toolbar === null) {
      return;
    }
    const options = { items, onChange: setFit };
    if (overflowRef.current === null) {
      overflowRef.current = observeToolbarOverflow(toolbar, options);
    } else {
      overflowRef.current.update(options);
    }
  }, [items]);
  useLayoutEffect(
    () => () => {
      overflowRef.current?.detach();
      overflowRef.current = null;
    },
    [],
  );

  return (
    <div>
      <button type="button">Before</button>
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Actions"
        style={{ ...toolbarStyle, width: 600 }}
      >
        {items
          .filter((item, index) => index < fit || isPinnedToolbarItem(item))
          .map((item) => (
            <Entry key={item.key} item={item} />
          ))}
        {fit < items.length && (
          <button
            type="button"
            data-gridkit-toolbar-item="more"
            data-gridkit-toolbar-more=""
            style={entryStyle(60)}
          >
            More
          </button>
        )}
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
      <output data-testid="fit">{fit}</output>
    </div>
  );
}
