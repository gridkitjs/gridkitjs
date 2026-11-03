import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  attachMenu,
  attachOverlay,
  type AttachedMenu,
  type MenuSubmenuFocus,
} from "@gridkitjs/dom";

const panelStyle: CSSProperties = {
  width: 200,
  padding: "4px 0",
  background: "white",
  // An outline takes no room, so the first item sits just the padding down.
  outline: "1px solid gray",
};
const itemStyle: CSSProperties = { padding: "4px 8px" };
const separatorStyle: CSSProperties = { height: 1, background: "gray" };

/**
 * `attachMenu` wired up the way a renderer would: the anchor opens a static
 * menu in an `attachOverlay` panel, and its "Sort" item opens a submenu in a
 * second overlay placed `right-start`, attached only once it opens so it sits
 * above the menu in the overlay stack. The callbacks are functions the menu
 * calls and this component answers, which a callback passed from a spec
 * cannot do, so they live here and write what they hear where a spec can
 * read it: the last item activated and the last reason every menu closed.
 *
 * The menu holds plain items, a separator, a disabled item, a checkable item
 * that toggles when activated, and the submenu item; several labels share a
 * first letter, for typeahead. Activating an item closes every menu, as a
 * grid's menus do.
 */
export default function MenuHarness() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sortItemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const submenuBehaviour = useRef<AttachedMenu | null>(null);
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<MenuSubmenuFocus | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [activated, setActivated] = useState("none");
  const [closed, setClosed] = useState("none");

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!open || anchor === null || menu === null) {
      return undefined;
    }
    function closeAll(): void {
      setOpen(false);
      setSubmenu(null);
    }
    // The menu first, so its items have the `tabindex` the overlay's initial
    // focus looks for.
    const behaviour = attachMenu(menu, {
      onActivate: (id) => {
        if (id === "showGrid") {
          setShowGrid((current) => !current);
        }
        setActivated(id);
        closeAll();
      },
      onOpenSubmenu: (_id, { focus }) => {
        if (submenuBehaviour.current === null) {
          setSubmenu(focus);
        } else if (focus === "first") {
          submenuBehaviour.current.focusItem(0);
        }
      },
      onCollapseSubmenu: () => {
        setSubmenu(null);
      },
      onClose: (reason) => {
        setClosed(reason);
        closeAll();
      },
    });
    const detachOverlay = attachOverlay(anchor, menu, {
      onDismiss: closeAll,
    });
    return () => {
      detachOverlay();
      behaviour.detach();
    };
  }, [open]);

  useLayoutEffect(() => {
    const item = sortItemRef.current;
    const panel = submenuRef.current;
    if (submenu === null || item === null || panel === null) {
      return undefined;
    }
    const behaviour = attachMenu(panel, {
      onActivate: (id) => {
        setActivated(id);
        setOpen(false);
        setSubmenu(null);
      },
      onCloseSubmenu: () => {
        setSubmenu(null);
      },
      onClose: (reason) => {
        setClosed(reason);
        setOpen(false);
        setSubmenu(null);
      },
    });
    submenuBehaviour.current = behaviour;
    const detachOverlay = attachOverlay(item, panel, {
      placement: "right-start",
      // Lines the submenu's first item up with "Sort", past its top padding.
      offset: -4,
      initialFocus: submenu,
      onDismiss: () => {
        setSubmenu(null);
      },
    });
    return () => {
      submenuBehaviour.current = null;
      detachOverlay();
      behaviour.detach();
    };
  }, [submenu]);

  return (
    <div>
      <button
        ref={anchorRef}
        type="button"
        style={{ position: "fixed", top: 20, left: 20 }}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        Open menu
      </button>
      <div style={{ paddingLeft: 600 }}>
        <output data-testid="activated">{activated}</output>
        <output data-testid="closed">{closed}</output>
      </div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Actions"
            style={panelStyle}
          >
            <div role="menuitem" data-gridkit-menu-item="cut" style={itemStyle}>
              Cut
            </div>
            <div
              role="menuitem"
              data-gridkit-menu-item="copy"
              style={itemStyle}
            >
              Copy
            </div>
            <div
              role="menuitem"
              data-gridkit-menu-item="paste"
              style={itemStyle}
            >
              Paste
            </div>
            <div role="separator" style={separatorStyle} />
            <div
              role="menuitem"
              data-gridkit-menu-item="delete"
              aria-disabled="true"
              style={itemStyle}
            >
              Delete
            </div>
            <div
              role="menuitemcheckbox"
              data-gridkit-menu-item="showGrid"
              aria-checked={showGrid}
              style={itemStyle}
            >
              Show grid
            </div>
            <div
              ref={sortItemRef}
              role="menuitem"
              data-gridkit-menu-item="sort"
              aria-haspopup="menu"
              aria-expanded={submenu !== null}
              style={itemStyle}
            >
              Sort
            </div>
            <div
              role="menuitem"
              data-gridkit-menu-item="selectAll"
              style={itemStyle}
            >
              Select all
            </div>
          </div>,
          document.body,
        )}
      {submenu !== null &&
        createPortal(
          <div
            ref={submenuRef}
            role="menu"
            aria-label="Sort"
            style={panelStyle}
          >
            <div
              role="menuitem"
              data-gridkit-menu-item="ascending"
              style={itemStyle}
            >
              Ascending
            </div>
            <div
              role="menuitem"
              data-gridkit-menu-item="descending"
              style={itemStyle}
            >
              Descending
            </div>
            <div
              role="menuitem"
              data-gridkit-menu-item="clearSort"
              style={itemStyle}
            >
              Clear sort
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
