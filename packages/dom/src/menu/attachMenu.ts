import { nextMenuIndex, typeaheadIndex, type MenuMove } from "@gridkitjs/core";

/**
 * Where focus goes when a submenu opens: its first item, or nowhere — it
 * stays on the item that opened it, as when the pointer opened it.
 */
export type MenuSubmenuFocus = "first" | "none";

/** Why a menu asked for every menu to close. */
export type MenuCloseReason = "tab";

export interface MenuOptions {
  /**
   * An enabled item that opens no submenu was chosen — Enter, Space or a
   * click. The caller runs it, and closes every menu.
   */
  readonly onActivate: (id: string) => void;
  /**
   * An enabled submenu item asks for its submenu: Enter, Space or ArrowRight
   * on it want its first item focused (`"first"`), a click or the pointer
   * resting on it want focus left where it is (`"none"`). It may come for a
   * submenu already open — ArrowRight on one the pointer opened — when a
   * `"first"` asks for focus to move into it (`focusItem(0)` on its menu).
   * Opening it closes any other submenu open from this menu.
   */
  readonly onOpenSubmenu?:
    | ((id: string, options: { readonly focus: MenuSubmenuFocus }) => void)
    | undefined;
  /**
   * The pointer came to rest on an item that opens no submenu, or a disabled
   * one: close whatever submenu is open from this menu, if any. Moving on to
   * another item is how a pointer user leaves a submenu they did not want.
   */
  readonly onCollapseSubmenu?: (() => void) | undefined;
  /**
   * ArrowLeft was pressed in this menu, which is a submenu: close it, and
   * focus goes back to the item that opened it. Passed only for a submenu —
   * in a menu without it, ArrowLeft does nothing.
   */
  readonly onCloseSubmenu?: (() => void) | undefined;
  /**
   * Tab or Shift+Tab was pressed: close every menu, so focus returns to where
   * the first one was opened from rather than moving on past it.
   */
  readonly onClose: (reason: MenuCloseReason) => void;
}

export interface AttachedMenu {
  /**
   * Focuses an item, by its `data-gridkit-menu-item` id or its place among
   * the items. Does nothing for an item the menu does not have.
   */
  readonly focusItem: (item: string | number) => void;
  /** Removes every listener. The items keep the `tabindex` they had. */
  readonly detach: () => void;
}

/** Every element `attachMenu` treats as an item. Separators are not. */
const ITEM = [
  '[role="menuitem"][data-gridkit-menu-item]',
  '[role="menuitemcheckbox"][data-gridkit-menu-item]',
  '[role="menuitemradio"][data-gridkit-menu-item]',
].join(", ");

/** How long the pointer rests on a submenu item before it opens. */
const HOVER_DELAY = 150;

/** How long after the last key typed the typeahead starts afresh. */
const TYPEAHEAD_TIMEOUT = 500;

/** Each item, as `nextMenuIndex` reads it: the separators are not among them. */
const AS_ENTRY = { type: "item" } as const;

/** The keys that move focus, and where to. */
const MOVES: Readonly<Record<string, MenuMove>> = {
  ArrowDown: "next",
  ArrowUp: "previous",
  Home: "first",
  End: "last",
};

function idOf(item: HTMLElement): string {
  return item.getAttribute("data-gridkit-menu-item") ?? "";
}

function isDisabled(item: HTMLElement): boolean {
  return item.getAttribute("aria-disabled") === "true";
}

function opensSubmenu(item: HTMLElement): boolean {
  const popup = item.getAttribute("aria-haspopup");
  return popup === "menu" || popup === "true";
}

/** What typeahead matches against: the item's `aria-label`, else its text. */
function labelOf(item: HTMLElement): string {
  return (item.getAttribute("aria-label") ?? item.textContent).trim();
}

/** A printable character, typed without a modifier that makes it a shortcut. */
function isTypeahead(event: KeyboardEvent): boolean {
  return (
    /^\S$/u.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey
  );
}

/**
 * Makes `panel` — a `role="menu"` element the renderer drew — behave as a
 * menu: the arrow keys, Home, End and typeahead move focus among its items,
 * Enter, Space and a click choose one, ArrowRight and ArrowLeft open and
 * close submenus, and the pointer moves focus to the item under it. It
 * decides; the caller is told through the callbacks and draws the outcome —
 * runs the item, opens or closes a submenu.
 *
 * Items are the panel's descendants with a menu item role (`menuitem`,
 * `menuitemcheckbox`, `menuitemradio`) and a `data-gridkit-menu-item` id,
 * read afresh on every key so items drawn since attaching count. A submenu
 * item says so with `aria-haspopup="menu"`; an item with
 * `aria-disabled="true"` takes focus, so a screen reader finds it, but is
 * never chosen. One item at a time has `tabindex="0"` — the focused one, or
 * the first — and the rest `-1`: every item can take focus, and the first is
 * what an overlay's initial focus finds when the menu is attached before it.
 *
 * Escape is not handled: a menu is shown with `attachOverlay`, whose stack
 * gives Escape to the topmost overlay. A submenu is a menu of its own, in an
 * overlay of its own anchored to its item, attached when it opens.
 */
export function attachMenu(
  panel: HTMLElement,
  options: MenuOptions,
): AttachedMenu {
  let typed = "";
  let typeaheadTimer: number | undefined;
  /** The item the pointer is over, and since when, through `hoverTimer`. */
  let hovered: HTMLElement | null = null;
  let hoverTimer: number | undefined;

  function items(): HTMLElement[] {
    return Array.from(panel.querySelectorAll<HTMLElement>(ITEM));
  }

  function itemOf(target: EventTarget | null): HTMLElement | null {
    const item =
      target instanceof Element ? target.closest<HTMLElement>(ITEM) : null;
    return item !== null && panel.contains(item) ? item : null;
  }

  function setTabStop(stop: HTMLElement | undefined): void {
    for (const item of items()) {
      item.tabIndex = item === stop ? 0 : -1;
    }
  }

  function focus(item: HTMLElement): void {
    setTabStop(item);
    item.focus();
  }

  function openSubmenu(item: HTMLElement, focusTo: MenuSubmenuFocus): void {
    if (!isDisabled(item)) {
      options.onOpenSubmenu?.(idOf(item), { focus: focusTo });
    }
  }

  function choose(item: HTMLElement, focusTo: MenuSubmenuFocus): void {
    if (opensSubmenu(item)) {
      openSubmenu(item, focusTo);
    } else if (!isDisabled(item)) {
      options.onActivate(idOf(item));
    }
  }

  function typeahead(key: string, all: HTMLElement[], from: number): void {
    typed += key;
    window.clearTimeout(typeaheadTimer);
    typeaheadTimer = window.setTimeout(() => {
      typed = "";
    }, TYPEAHEAD_TIMEOUT);
    const match = all[typeaheadIndex(all.map(labelOf), from, typed)];
    if (match !== undefined) {
      focus(match);
    }
  }

  // Every key it acts on is taken, the arrows included where they do
  // nothing: a menu has no caret for them to move, and the page scrolling
  // under it would dismiss its overlay.
  function onKeyDown(event: KeyboardEvent): void {
    if (event.isComposing) {
      return;
    }
    const all = items();
    const item = itemOf(event.target);
    const from = item === null ? -1 : all.indexOf(item);
    const move = MOVES[event.key];
    if (move !== undefined) {
      const next =
        all[
          nextMenuIndex(
            all.map(() => AS_ENTRY),
            from,
            move,
          )
        ];
      if (next !== undefined) {
        focus(next);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      if (item !== null) {
        choose(item, "first");
      }
    } else if (event.key === "ArrowRight") {
      if (item !== null && opensSubmenu(item)) {
        openSubmenu(item, "first");
      }
    } else if (event.key === "ArrowLeft") {
      options.onCloseSubmenu?.();
    } else if (event.key === "Tab") {
      options.onClose("tab");
    } else if (isTypeahead(event)) {
      typeahead(event.key, all, from);
    } else {
      return;
    }
    event.preventDefault();
  }

  // However focus arrived — the overlay's initial focus, a click, a script —
  // the tab stop follows it.
  function onFocusIn(event: FocusEvent): void {
    const item = itemOf(event.target);
    if (item !== null) {
      setTabStop(item);
    }
  }

  function onClick(event: MouseEvent): void {
    const item = itemOf(event.target);
    if (item !== null) {
      choose(item, "none");
    }
  }

  // A pointer moving over the menu moves focus with it at once, but what the
  // item under it opens or closes waits until it rests there: a pointer
  // crossing a sibling on its way into an open submenu leaves the submenu
  // open. Touch has no hover, so only its taps count, as clicks.
  function onPointerMove(event: PointerEvent): void {
    if (event.pointerType === "touch") {
      return;
    }
    const item = itemOf(event.target);
    if (item !== null && document.activeElement !== item) {
      focus(item);
    }
    if (item === hovered) {
      return;
    }
    hovered = item;
    window.clearTimeout(hoverTimer);
    if (item !== null) {
      hoverTimer = window.setTimeout(() => {
        if (opensSubmenu(item) && !isDisabled(item)) {
          openSubmenu(item, "none");
        } else {
          options.onCollapseSubmenu?.();
        }
      }, HOVER_DELAY);
    }
  }

  // Leaving the panel — into the submenu, usually — is not resting anywhere.
  function onPointerLeave(): void {
    hovered = null;
    window.clearTimeout(hoverTimer);
  }

  const focused = itemOf(document.activeElement);
  setTabStop(focused ?? items()[0]);

  panel.addEventListener("keydown", onKeyDown);
  panel.addEventListener("focusin", onFocusIn);
  panel.addEventListener("click", onClick);
  panel.addEventListener("pointermove", onPointerMove);
  panel.addEventListener("pointerleave", onPointerLeave);

  return {
    focusItem(which) {
      const all = items();
      const item =
        typeof which === "number"
          ? all[which]
          : all.find((candidate) => idOf(candidate) === which);
      if (item !== undefined) {
        focus(item);
      }
    },
    detach() {
      window.clearTimeout(typeaheadTimer);
      window.clearTimeout(hoverTimer);
      panel.removeEventListener("keydown", onKeyDown);
      panel.removeEventListener("focusin", onFocusIn);
      panel.removeEventListener("click", onClick);
      panel.removeEventListener("pointermove", onPointerMove);
      panel.removeEventListener("pointerleave", onPointerLeave);
    },
  };
}
