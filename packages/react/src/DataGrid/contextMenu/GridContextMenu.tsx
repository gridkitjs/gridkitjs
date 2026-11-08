import GridMenu from "../menu/GridMenu";
import Overlay, { ANCHOR_GAP } from "../overlay/Overlay";
import type { ContextMenuApi } from "./useContextMenu";

/**
 * The open context menu, if any — beside the point it was asked for at, or
 * below its cell when asked for by a key — returning focus to that cell when
 * it closes, or, from the body's empty space, to wherever focus was before.
 * Rendered after the grid's tables, as every grid overlay is, so
 * the keys pressed in it reach no header or body handler on their way up
 * React's tree.
 */
export default function GridContextMenu({
  contextMenu,
}: {
  contextMenu: ContextMenuApi;
}) {
  const { menu, returnFocusFallback, run, close } = contextMenu;
  if (menu === null) {
    return null;
  }
  return (
    <Overlay
      key={menu.key}
      anchor={menu.anchor}
      gap={menu.anchor instanceof Element ? ANCHOR_GAP : 0}
      returnFocusTo={menu.cell ?? undefined}
      returnFocusFallback={returnFocusFallback}
      themeClassName={menu.themeClassName}
      onDismiss={close}
    >
      <GridMenu
        entries={menu.entries}
        label={menu.label}
        themeClassName={menu.themeClassName}
        onRun={run}
        onClose={close}
      />
    </Overlay>
  );
}
