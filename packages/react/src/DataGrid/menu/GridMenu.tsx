import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type {
  ResolvedMenuEntry,
  ResolvedMenuItem,
  ResolvedMenuSubmenu,
} from "@gridkitjs/core";
import {
  attachMenu,
  type AttachedMenu,
  type MenuSubmenuFocus,
} from "@gridkitjs/dom";
import { ariaAttr } from "../ariaAttr";
import Overlay from "../overlay/Overlay";
import { CheckIcon, ChevronRightIcon, MenuIcon } from "./menuIcons";

interface GridMenuProps {
  entries: readonly ResolvedMenuEntry[];
  /** The menu's accessible name. */
  label: string;
  /** The palette its submenus take — the one its own overlay took. */
  themeClassName: string;
  /** An enabled item was chosen: run it, and close every menu. */
  onRun: (item: ResolvedMenuItem) => void;
  /** Tab or Shift+Tab: close every menu. */
  onClose: () => void;
  /**
   * ArrowLeft: close this menu, which is a submenu, so focus goes back to
   * the item that opened it. Given only to a submenu; a menu without it has
   * nowhere to go back to.
   */
  onCloseSubmenu?: (() => void) | undefined;
  /**
   * Holds this menu's behaviour while it is attached, for the menu that
   * opened it to move focus in.
   */
  behaviourRef?: RefObject<AttachedMenu | null> | undefined;
}

/** The submenu open from a menu. */
interface OpenSubmenu {
  readonly id: string;
  /** The item it opened from, which it opens beside. */
  readonly anchor: HTMLElement;
  readonly focus: MenuSubmenuFocus;
  /** Lines its first item up with `anchor`. */
  readonly offset: number;
}

/** The item of `menu` whose id is `id`, read off the markup this drew. */
function itemElement(menu: HTMLElement, id: string): HTMLElement | null {
  return (
    Array.from(
      menu.querySelectorAll<HTMLElement>("[data-gridkit-menu-item]"),
    ).find((item) => item.getAttribute("data-gridkit-menu-item") === id) ?? null
  );
}

/**
 * How far below a menu's top edge its first item starts: its top border and
 * padding. A submenu is styled the same, so opening it this far up lines its
 * first item up with the item that opened it, whatever the theme makes them.
 */
function topInset(menu: HTMLElement): number {
  const style = getComputedStyle(menu);
  return parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
}

function MenuItem({
  entry,
  expanded,
}: {
  entry: ResolvedMenuItem | ResolvedMenuSubmenu;
  /** For a submenu item: whether its submenu is open. */
  expanded: boolean;
}) {
  const isItem = entry.type === "item";
  const checked = isItem ? entry.checked : undefined;
  const shortcut = isItem ? entry.shortcut : undefined;
  return (
    <div
      role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
      data-gridkit-menu-item={entry.id}
      className="menu-item"
      {...ariaAttr(isItem && entry.disabled, "aria-disabled", true)}
      {...ariaAttr(checked !== undefined, "aria-checked", checked)}
      {...ariaAttr(shortcut !== undefined, "aria-keyshortcuts", shortcut)}
      {...ariaAttr<"aria-haspopup", "menu">(!isItem, "aria-haspopup", "menu")}
      {...ariaAttr(!isItem, "aria-expanded", expanded)}
    >
      <span className="menu-item-icon" aria-hidden="true">
        {checked === true ? <CheckIcon /> : <MenuIcon name={entry.icon} />}
      </span>
      <span className="menu-item-label">{entry.label}</span>
      {/* Read out through `aria-keyshortcuts`, not as part of the name. */}
      {shortcut !== undefined && (
        <span className="menu-item-shortcut" aria-hidden="true">
          {shortcut}
        </span>
      )}
      {!isItem && (
        <span className="menu-submenu-indicator" aria-hidden="true">
          <ChevronRightIcon />
        </span>
      )}
    </div>
  );
}

/**
 * A menu resolved by `@gridkitjs/core`'s `resolveMenu`, drawn as
 * `role="menu"` and made to behave as one by `@gridkitjs/dom`'s
 * `attachMenu`, which decides what every key and hover does; this draws the
 * items and which submenu is open. Shown inside an `Overlay` — which attaches
 * after this, so its initial focus lands on the item `attachMenu` made the
 * tab stop.
 *
 * A submenu is a `GridMenu` of its own, in an `Overlay` of its own anchored
 * to the item that opened it.
 */
export default function GridMenu({
  entries,
  label,
  themeClassName,
  onRun,
  onClose,
  onCloseSubmenu,
  behaviourRef,
}: GridMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuBehaviourRef = useRef<AttachedMenu | null>(null);
  const [submenu, setSubmenu] = useState<OpenSubmenu | null>(null);
  const isSubmenu = onCloseSubmenu !== undefined;

  /**
   * What the behaviour's callbacks read. They are handed over once, when it
   * attaches, so they read the props and state of the latest render here.
   */
  const latest = useRef({ entries, submenu, onRun, onClose, onCloseSubmenu });
  useLayoutEffect(() => {
    latest.current = { entries, submenu, onRun, onClose, onCloseSubmenu };
  });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (menu === null) {
      return undefined;
    }
    const behaviour = attachMenu(menu, {
      onActivate: (id) => {
        const item = latest.current.entries.find(
          (entry): entry is ResolvedMenuItem =>
            entry.type === "item" && entry.id === id,
        );
        if (item !== undefined) {
          latest.current.onRun(item);
        }
      },
      onOpenSubmenu: (id, { focus }) => {
        // Already open — the pointer opened it — so the keyboard only asks
        // for focus to move into it.
        if (latest.current.submenu?.id === id) {
          if (focus === "first") {
            submenuBehaviourRef.current?.focusItem(0);
          }
          return;
        }
        const anchor = itemElement(menu, id);
        if (anchor !== null) {
          setSubmenu({ id, anchor, focus, offset: -topInset(menu) });
        }
      },
      onCollapseSubmenu: () => {
        setSubmenu(null);
      },
      onCloseSubmenu: isSubmenu
        ? () => {
            latest.current.onCloseSubmenu?.();
          }
        : undefined,
      onClose: () => {
        latest.current.onClose();
      },
    });
    if (behaviourRef !== undefined) {
      behaviourRef.current = behaviour;
    }
    return () => {
      if (behaviourRef !== undefined) {
        behaviourRef.current = null;
      }
      behaviour.detach();
    };
  }, [isSubmenu, behaviourRef]);

  function closeSubmenu(): void {
    setSubmenu(null);
  }

  const openEntry =
    submenu === null
      ? undefined
      : entries.find(
          (entry): entry is ResolvedMenuSubmenu =>
            entry.type === "submenu" && entry.id === submenu.id,
        );

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        aria-label={label}
        className="gridkit-menu"
      >
        {entries.map((entry) =>
          entry.type === "separator" ? (
            <div key={entry.key} role="separator" className="menu-separator" />
          ) : (
            <MenuItem
              key={entry.id}
              entry={entry}
              expanded={entry.id === submenu?.id}
            />
          ),
        )}
      </div>
      {submenu !== null && openEntry !== undefined && (
        <Overlay
          key={submenu.id}
          anchor={submenu.anchor}
          placement="right-start"
          offset={submenu.offset}
          initialFocus={submenu.focus}
          themeClassName={themeClassName}
          onDismiss={closeSubmenu}
        >
          <GridMenu
            entries={openEntry.items}
            label={openEntry.label}
            themeClassName={themeClassName}
            onRun={onRun}
            onClose={onClose}
            onCloseSubmenu={closeSubmenu}
            behaviourRef={submenuBehaviourRef}
          />
        </Overlay>
      )}
    </>
  );
}
