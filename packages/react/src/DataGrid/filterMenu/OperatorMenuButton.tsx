import type { Ref } from "react";
import type {
  FilterOperator,
  GridMessages,
  ResolvedMenuItem,
} from "@gridkitjs/core";
import type { ResolvedColumnFilterMenu } from "@gridkitjs/core/renderer";
import GridMenu from "../menu/GridMenu";
import { CheckIcon, ChevronRightIcon } from "../menu/menuIcons";
import useMenuButton from "../menu/useMenuButton";
import Overlay, { ANCHOR_GAP } from "../overlay/Overlay";

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
 * it leaves the filter menu open. It is a menu button as `useMenuButton`
 * describes, and closing its menu returns focus to it.
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
  const { state, close, buttonProps, behaviourRef } = useMenuButton({
    itemCount: menu.operators.length,
    gap: gapBeside,
  });
  const label = messages.filterOperatorMenu(menu.family);

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
        className="gridkit-filter-menu-submenu"
        {...buttonProps}
      >
        <span className="gridkit-filter-menu-submenu-icon" aria-hidden="true">
          {active !== undefined && <CheckIcon />}
        </span>
        {label}
        <span
          className="gridkit-filter-menu-submenu-indicator"
          aria-hidden="true"
        >
          <ChevronRightIcon />
        </span>
      </button>
      {state.kind === "open" && (
        <Overlay
          anchor={state.anchor}
          placement="right-start"
          gap={state.gap}
          returnFocusTo={state.anchor}
          themeClassName={state.themeClassName}
          onDismiss={close}
        >
          <GridMenu
            entries={entries}
            label={label}
            themeClassName={state.themeClassName}
            behaviourRef={behaviourRef}
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
