import type { ReactNode } from "react";
import type {
  GridCommandTarget,
  GridMessages,
  GridPanelKind,
} from "@gridkitjs/core";
import ColumnChooser from "../columnChooser/ColumnChooser";
import Overlay, { ANCHOR_GAP } from "../overlay/Overlay";
import type { DataGridController } from "../useGridController";
import type { GridPanelsApi } from "./useGridPanels";

/** What every panel is drawn with. */
export interface GridPanelProps<Row> {
  /** Where it was asked for — a header's names the column a panel acts on. */
  readonly target: GridCommandTarget;
  /** Read for the grid's state as each render draws it, and acted on. */
  readonly controller: DataGridController<Row>;
  readonly messages: GridMessages;
}

/**
 * The component drawing each kind of panel. Keyed by `GridPanelKind`, so a
 * kind added there — the filter editor's — fails to compile until it has its
 * component here, and needs nothing else.
 */
const panelComponents: {
  readonly [Kind in GridPanelKind]: <Row>(
    props: GridPanelProps<Row>,
  ) => ReactNode;
} = {
  columnChooser: ColumnChooser,
  filter: () => null,
};

interface GridPanelsProps<Row> {
  panels: GridPanelsApi;
  controller: DataGridController<Row>;
  messages: GridMessages;
}

/**
 * The open panel, if any, beside where it was asked for. Rendered after the
 * grid's tables, as every grid overlay is, so the keys pressed in it reach
 * no header or body handler on their way up React's tree.
 */
export default function GridPanels<Row>({
  panels,
  controller,
  messages,
}: GridPanelsProps<Row>) {
  const { panel, close } = panels;
  if (panel === null) {
    return null;
  }
  const Panel = panelComponents[panel.kind];
  return (
    <Overlay
      key={panel.key}
      anchor={panel.anchor}
      placement={panel.placement}
      gap={panel.anchor instanceof Element ? ANCHOR_GAP : 0}
      returnFocusTo={panel.returnFocusTo}
      // A column the chooser hides can scroll the grid back under it.
      ignoreScrollAfterInput
      themeClassName={panel.themeClassName}
      onDismiss={close}
    >
      <Panel<Row>
        target={panel.target}
        controller={controller}
        messages={messages}
      />
    </Overlay>
  );
}
