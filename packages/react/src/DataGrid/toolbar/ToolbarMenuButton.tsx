import { useLayoutEffect, useRef, useState } from "react";
import type { ResolvedMenuEntry, ToolbarItemAttributes } from "@gridkitjs/core";
import type { AttachedMenu } from "@gridkitjs/dom";
import { ariaAttr } from "../ariaAttr";
import { classNames } from "../classNames";
import GridMenu from "../menu/GridMenu";
import { ChevronDownIcon, MenuIcon } from "../menu/menuIcons";
import Overlay, { ANCHOR_GAP, overlayThemeClassName } from "../overlay/Overlay";

interface ToolbarMenuButtonProps {
  /** Its `data-gridkit-toolbar-item`. */
  itemKey: string;
  /** The app's attributes for the button, under the button's own. */
  attributes?: ToolbarItemAttributes | undefined;
  /** The button's label, and its menu's accessible name. */
  label: string;
  icon?: string | undefined;
  entries: readonly ResolvedMenuEntry[];
  /** The "More" button, holding the entries that do not fit, rather than a dropdown. */
  more?: boolean | undefined;
  /** Where focus goes when the menu closes with its button gone. */
  returnFocusFallback: () => HTMLElement | null;
}

/** The menu open below the button. */
interface OpenMenu {
  readonly anchor: HTMLElement;
  readonly themeClassName: string;
  /** The item it opens on: the first, or the last when ArrowUp opened it. */
  readonly focusItem: number;
}

/**
 * A toolbar button opening a menu below it, following the WAI-ARIA menu
 * button pattern: a click, Enter, Space or ArrowDown opens the menu with
 * focus on its first item, ArrowUp on its last, and a second click closes
 * it. Closing the menu returns focus to the button. What the items do, and
 * whether each runs, is in their `run`.
 */
export default function ToolbarMenuButton({
  itemKey,
  attributes,
  label,
  icon,
  entries,
  more = false,
  returnFocusFallback,
}: ToolbarMenuButtonProps) {
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const menuBehaviourRef = useRef<AttachedMenu | null>(null);

  // As the menu opens, after the overlay — a child, whose layout effect runs
  // first — has focused the first item.
  useLayoutEffect(() => {
    if (menu !== null && menu.focusItem > 0) {
      menuBehaviourRef.current?.focusItem(menu.focusItem);
    }
  }, [menu]);

  function open(button: HTMLElement, onLast = false): void {
    setMenu({
      anchor: button,
      themeClassName: overlayThemeClassName(button),
      focusItem: onLast
        ? entries.filter((entry) => entry.type !== "separator").length - 1
        : 0,
    });
  }

  function close(): void {
    setMenu(null);
  }

  return (
    <>
      <button
        {...attributes}
        type="button"
        className={classNames("toolbar-button", more && "toolbar-more")}
        data-gridkit-toolbar-item={itemKey}
        {...ariaAttr(more, "data-gridkit-toolbar-more", "")}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        onClick={(event) => {
          if (menu === null) {
            open(event.currentTarget);
          } else {
            close();
          }
        }}
        onKeyDown={(event) => {
          if (
            (event.key === "ArrowDown" || event.key === "ArrowUp") &&
            menu === null
          ) {
            event.preventDefault();
            open(event.currentTarget, event.key === "ArrowUp");
          }
        }}
      >
        {icon !== undefined && (
          <span className="toolbar-button-icon" aria-hidden="true">
            <MenuIcon name={icon} />
          </span>
        )}
        {label}
        <span className="toolbar-button-indicator" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>
      {menu !== null && (
        <Overlay
          anchor={menu.anchor}
          placement="bottom-start"
          gap={ANCHOR_GAP}
          returnFocusTo={menu.anchor}
          returnFocusFallback={returnFocusFallback}
          themeClassName={menu.themeClassName}
          onDismiss={close}
        >
          <GridMenu
            entries={entries}
            label={label}
            themeClassName={menu.themeClassName}
            behaviourRef={menuBehaviourRef}
            onRun={(item) => {
              item.run();
              close();
            }}
            onClose={close}
          />
        </Overlay>
      )}
    </>
  );
}
