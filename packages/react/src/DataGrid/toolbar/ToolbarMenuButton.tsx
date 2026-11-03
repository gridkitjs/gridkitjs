import { useState } from "react";
import type { ResolvedMenuEntry } from "@gridkitjs/core";
import { ariaAttr } from "../ariaAttr";
import { classNames } from "../classNames";
import GridMenu from "../menu/GridMenu";
import { ChevronDownIcon, MenuIcon } from "../menu/menuIcons";
import Overlay, { overlayThemeClassName } from "../overlay/Overlay";

interface ToolbarMenuButtonProps {
  /** Its `data-gridkit-toolbar-item`. */
  itemKey: string;
  /** The button's label, and its menu's accessible name. */
  label: string;
  icon?: string | undefined;
  entries: readonly ResolvedMenuEntry[];
  /** The "More" button, holding the entries that do not fit, rather than a dropdown. */
  more?: boolean | undefined;
  /** Its menu closed, however it did. */
  onMenuClose: () => void;
}

/** The menu open below the button. */
interface OpenMenu {
  readonly anchor: HTMLElement;
  readonly themeClassName: string;
}

/**
 * A toolbar button opening a menu below it, following the WAI-ARIA menu
 * button pattern: a click, Enter, Space or ArrowDown opens the menu with
 * focus on its first item, and a second click closes it. Closing the menu
 * returns focus to the button. What the items do, and whether each runs,
 * is in their `run`.
 */
export default function ToolbarMenuButton({
  itemKey,
  label,
  icon,
  entries,
  more = false,
  onMenuClose,
}: ToolbarMenuButtonProps) {
  const [menu, setMenu] = useState<OpenMenu | null>(null);

  function open(button: HTMLElement): void {
    setMenu({ anchor: button, themeClassName: overlayThemeClassName(button) });
  }

  function close(): void {
    setMenu(null);
    onMenuClose();
  }

  return (
    <>
      <button
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
          if (event.key === "ArrowDown" && menu === null) {
            event.preventDefault();
            open(event.currentTarget);
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
          returnFocusTo={menu.anchor}
          themeClassName={menu.themeClassName}
          onDismiss={close}
        >
          <GridMenu
            entries={entries}
            label={label}
            themeClassName={menu.themeClassName}
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
