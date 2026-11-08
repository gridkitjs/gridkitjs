import type { ResolvedMenuEntry, ToolbarItemAttributes } from "@gridkitjs/core";
import { ariaAttr } from "../ariaAttr";
import { classNames } from "../classNames";
import GridMenu from "../menu/GridMenu";
import { ChevronDownIcon, MenuIcon } from "../menu/menuIcons";
import useMenuButton from "../menu/useMenuButton";
import Overlay from "../overlay/Overlay";

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

/**
 * A toolbar button opening a menu below it, as `useMenuButton` describes.
 * Closing the menu returns focus to the button. What the items do, and
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
  const { state, close, buttonProps, behaviourRef } = useMenuButton({
    itemCount: entries.filter((entry) => entry.type !== "separator").length,
  });

  return (
    <>
      <button
        {...attributes}
        type="button"
        className={classNames("toolbar-button", more && "toolbar-more")}
        data-gridkit-toolbar-item={itemKey}
        {...ariaAttr(more, "data-gridkit-toolbar-more", "")}
        {...buttonProps}
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
      {state.kind === "open" && (
        <Overlay
          anchor={state.anchor}
          placement="bottom-start"
          gap={state.gap}
          returnFocusTo={state.anchor}
          returnFocusFallback={returnFocusFallback}
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
              close();
            }}
            onClose={close}
          />
        </Overlay>
      )}
    </>
  );
}
