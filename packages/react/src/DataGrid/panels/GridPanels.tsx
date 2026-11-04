import { useRef, type ReactNode, type RefCallback } from "react";
import type {
  FilterState,
  GridCommandTarget,
  GridMessages,
  GridPanelKind,
} from "@gridkitjs/core";
import ColumnChooser from "../columnChooser/ColumnChooser";
import type { GridCommandsApi } from "../commands/useGridCommands";
import FilterMenu from "../filterMenu/FilterMenu";
import useApplyFilter from "../filterMenu/useApplyFilter";
import Overlay, { ANCHOR_GAP } from "../overlay/Overlay";
import type { DataGridController } from "../useGridController";
import type { GridPanelsApi } from "./useGridPanels";

/** What every panel is drawn with. */
export interface GridPanelProps<Row> {
  /** Where it was asked for — a header's names the column a panel acts on. */
  readonly target: GridCommandTarget;
  /** Read for the grid's state as each render draws it, and acted on. */
  readonly controller: DataGridController<Row>;
  /** The grid's commands, for a panel running one so `onCommand` hears it. */
  readonly commands: GridCommandsApi<Row>;
  readonly messages: GridMessages;
  /** Closes the panel, giving focus back to where it was opened from. */
  readonly close: () => void;
  /**
   * The `ref` of the control focus starts on as the panel opens — a filter
   * editor's value box. A panel giving it to none starts on its first
   * control.
   */
  readonly initialFocusRef: RefCallback<HTMLElement>;
  /**
   * Sets the grid's filter as a filter menu applies one, announcing the rows
   * it keeps once they are drawn — even when the menu has closed by then.
   */
  readonly applyFilter: (filter: FilterState<Row>) => void;
}

/** How one kind of panel is drawn. */
interface PanelKind {
  readonly component: <Row>(props: GridPanelProps<Row>) => ReactNode;
  /**
   * Whether Tab stays inside the panel, as in a dialog. A panel holding a
   * draft keeps it, since tabbing out would close it and drop the draft; one
   * applying every change at once lets Tab leave.
   */
  readonly trapFocus: boolean;
}

/**
 * Each kind of panel. Keyed by `GridPanelKind`, so a kind added there fails
 * to compile until it has its entry here, and needs nothing else.
 */
const panelKinds: { readonly [Kind in GridPanelKind]: PanelKind } = {
  columnChooser: { component: ColumnChooser, trapFocus: false },
  filter: { component: FilterMenu, trapFocus: true },
};

interface GridPanelsProps<Row> {
  panels: GridPanelsApi;
  controller: DataGridController<Row>;
  commands: GridCommandsApi<Row>;
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
  commands,
  messages,
}: GridPanelsProps<Row>) {
  const initialFocus = useRef<HTMLElement>(null);
  const applyFilter = useApplyFilter(
    controller,
    messages,
    commands.host.announce,
  );
  const { panel, close } = panels;
  if (panel === null) {
    return null;
  }
  const { component: Panel, trapFocus } = panelKinds[panel.kind];
  return (
    <Overlay
      key={panel.key}
      anchor={panel.anchor}
      placement={panel.placement}
      gap={panel.anchor instanceof Element ? ANCHOR_GAP : 0}
      initialFocus={initialFocus}
      returnFocusTo={panel.returnFocusTo}
      // A column the chooser hides can scroll the grid back under it.
      ignoreScrollAfterInput
      trapFocus={trapFocus}
      themeClassName={panel.themeClassName}
      onDismiss={close}
    >
      <Panel<Row>
        target={panel.target}
        controller={controller}
        commands={commands}
        messages={messages}
        close={close}
        initialFocusRef={(element) => {
          initialFocus.current = element;
        }}
        applyFilter={applyFilter}
      />
    </Overlay>
  );
}
