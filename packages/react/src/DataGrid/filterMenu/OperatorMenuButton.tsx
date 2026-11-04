import { useLayoutEffect, useRef, useState, type Ref } from "react";
import type {
  FilterOperator,
  GridMessages,
  ResolvedColumnFilterMenu,
  ResolvedMenuItem,
} from "@gridkitjs/core";
import type { AttachedMenu } from "@gridkitjs/dom";
import GridMenu from "../menu/GridMenu";
import { CheckIcon, ChevronRightIcon } from "../menu/menuIcons";
import Overlay, { ANCHOR_GAP, overlayThemeClassName } from "../overlay/Overlay";

interface OperatorMenuButtonProps {
  /** The column's filter menu: the operators listed, in its family's words. */
  readonly menu: ResolvedColumnFilterMenu;
  /**
   * The operators the column's conditions use, each checked in the menu — or
   * `undefined` while the column is not filtered by conditions, when no item
   * is checkable.
   */
  readonly active: readonly FilterOperator[] | undefined;
  readonly messages: GridMessages;
  /** An operator was chosen, and the menu has closed. */
  readonly onChoose: (operator: FilterOperator) => void;
  readonly ref: Ref<HTMLButtonElement>;
}

/** The menu open beside the button. */
interface OpenMenu {
  readonly anchor: HTMLElement;
  readonly themeClassName: string;
  /** How far from the button it opens — see `gapBeside`. */
  readonly gap: number;
  /** The item it opens on: the first, or the last when ArrowUp opened it. */
  readonly focusItem: number;
}

/**
 * How far from the button's side its menu opens: past the edge of the filter
 * menu the button sits in, by the gap an overlay keeps from what it opens
 * beside — so it opens beside the filter menu rather than over its edge.
 * The filter menu's padding is the same either side, so the gap holds when
 * the menu flips to the left.
 */
function gapBeside(button: HTMLElement): number {
  const dialog = button.closest('[role="dialog"]') ?? button;
  return (
    dialog.getBoundingClientRect().right -
    button.getBoundingClientRect().right +
    ANCHOR_GAP
  );
}

/**
 * The excel editor's "Number filters" button, opening a menu of the
 * conditions the column offers — a `GridMenu` in an overlay of its own,
 * stacked above the filter menu, so Escape closes it alone and a click in
 * it leaves the filter menu open. It follows the WAI-ARIA menu button
 * pattern: a click, Enter, Space or ArrowDown opens the menu on its first
 * item, ArrowUp on its last, and closing it returns focus to the button.
 *
 * While the column is filtered by conditions, its operators are checked in
 * the menu, and the button carries a tick, as Excel's does.
 */
export default function OperatorMenuButton({
  menu,
  active,
  messages,
  onChoose,
  ref,
}: OperatorMenuButtonProps) {
  const [open, setOpen] = useState<OpenMenu | null>(null);
  const menuBehaviourRef = useRef<AttachedMenu | null>(null);
  const label = messages.filterOperatorMenu(menu.family);

  // As the menu opens, after the overlay — a child, whose layout effect runs
  // first — has focused the first item.
  useLayoutEffect(() => {
    if (open !== null && open.focusItem > 0) {
      menuBehaviourRef.current?.focusItem(open.focusItem);
    }
  }, [open]);

  function show(button: HTMLElement, onLast = false): void {
    setOpen({
      anchor: button,
      themeClassName: overlayThemeClassName(button),
      gap: gapBeside(button),
      focusItem: onLast ? menu.operators.length - 1 : 0,
    });
  }

  function close(): void {
    setOpen(null);
  }

  const entries = menu.operators.map((operator): ResolvedMenuItem => ({
    type: "item",
    id: operator,
    label: messages.filterOperatorLabel(operator, menu.family),
    disabled: false,
    checked: active?.includes(operator),
    run: () => {
      close();
      onChoose(operator);
      return true;
    },
  }));

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="filter-menu-submenu"
        aria-haspopup="menu"
        aria-expanded={open !== null}
        onClick={(event) => {
          if (open === null) {
            show(event.currentTarget);
          } else {
            close();
          }
        }}
        onKeyDown={(event) => {
          if (
            (event.key === "ArrowDown" || event.key === "ArrowUp") &&
            open === null
          ) {
            event.preventDefault();
            show(event.currentTarget, event.key === "ArrowUp");
          }
        }}
      >
        <span className="filter-menu-submenu-icon" aria-hidden="true">
          {active !== undefined && <CheckIcon />}
        </span>
        {label}
        <span className="filter-menu-submenu-indicator" aria-hidden="true">
          <ChevronRightIcon />
        </span>
      </button>
      {open !== null && (
        <Overlay
          anchor={open.anchor}
          placement="right-start"
          gap={open.gap}
          returnFocusTo={open.anchor}
          themeClassName={open.themeClassName}
          onDismiss={close}
        >
          <GridMenu
            entries={entries}
            label={label}
            themeClassName={open.themeClassName}
            behaviourRef={menuBehaviourRef}
            onRun={(item) => {
              item.run();
            }}
            onClose={close}
          />
        </Overlay>
      )}
    </>
  );
}
