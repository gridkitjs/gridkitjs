import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  resolveToolbar,
  toolbarEntries,
  type GridMessages,
  type GridOptions,
  type GridToolbarOptions,
  type ResolvedMenuEntry,
  type ResolvedToolbarItem,
  type ToolbarEntry,
} from "@gridkitjs/core";
import { splitToolbarItems } from "@gridkitjs/core/renderer";
import { attachToolbar } from "@gridkitjs/dom";
import { ariaAttr } from "../ariaAttr";
import type { GridCommandsApi } from "../commands/useGridCommands";
import { MenuIcon } from "../menu/menuIcons";
import type { DataGridController } from "../useGridController";
import ToolbarMenuButton from "./ToolbarMenuButton";
import ToolbarSearch from "./ToolbarSearch";
import useToolbarOverflow from "./useToolbarOverflow";

interface GridToolbarProps<Row> {
  toolbar: GridOptions<Row>["toolbar"];
  /** Fills a custom entry, by its id. */
  renderItem: ((id: string) => ReactNode) | undefined;
  /** The id of the grid element the toolbar acts on. */
  gridId: string;
  controller: DataGridController<Row>;
  commands: GridCommandsApi<Row>;
  messages: GridMessages;
  announce: (text: string) => void;
}

/** `run`, also telling `onCommand` through `report` whenever it runs. */
function reporting(run: () => boolean, report: () => void): () => boolean {
  return () => {
    const ran = run();
    if (ran) {
      report();
    }
    return ran;
  };
}

/** A menu's entries, each item reporting through `report` with its id when it runs. */
function reportingEntries(
  entries: readonly ResolvedMenuEntry[],
  report: (commandId: string) => void,
): readonly ResolvedMenuEntry[] {
  return entries.map((entry) => {
    switch (entry.type) {
      case "item":
        return {
          ...entry,
          run: reporting(entry.run, () => {
            report(entry.id);
          }),
        };
      case "submenu":
        return { ...entry, items: reportingEntries(entry.items, report) };
      default:
        return entry;
    }
  });
}

/**
 * A toolbar item whose `run` — or, for a dropdown, whose items' `run` —
 * also reports to `onCommand` as asked from that item, wherever it ends up
 * drawn: as itself, or in "More".
 */
function reportingItem(
  item: ResolvedToolbarItem,
  report: (commandId: string, itemId: string) => void,
): ResolvedToolbarItem {
  switch (item.type) {
    case "button":
      return {
        ...item,
        run: reporting(item.run, () => {
          report(item.id, item.id);
        }),
      };
    case "menu":
      return {
        ...item,
        items: reportingEntries(item.items, (commandId) => {
          report(commandId, item.id);
        }),
      };
    default:
      return item;
  }
}

/**
 * The grid's toolbar, when its `toolbar` option lists anything: the entries
 * resolved by `@gridkitjs/core`'s `resolveToolbar` and drawn as a
 * `role="toolbar"`, which `@gridkitjs/dom`'s `attachToolbar` makes one tab
 * stop the arrow keys move within. Which item shows, is enabled, pressed or
 * does what is core's; this draws them, and resolves them again on every
 * render, so they follow the grid's state.
 *
 * What does not fit moves into a "More" menu at the end, as
 * `@gridkitjs/dom`'s `observeToolbarOverflow` measures it and core's
 * `splitToolbarItems` turns it into menu entries: a toggle a checkable item,
 * a dropdown a submenu. The search box and custom entries always stay.
 */
export default function GridToolbar<Row>(props: GridToolbarProps<Row>) {
  const entries = toolbarEntries(props.toolbar);
  if (entries.length === 0) {
    return null;
  }
  const options = typeof props.toolbar === "object" ? props.toolbar : undefined;
  return (
    <Toolbar
      {...props}
      entries={entries}
      label={options?.label ?? props.messages.toolbarLabel}
      itemAttributes={options?.itemAttributes}
    />
  );
}

function Toolbar<Row>({
  entries,
  label,
  itemAttributes,
  renderItem,
  gridId,
  controller,
  commands,
  messages,
  announce,
}: GridToolbarProps<Row> & {
  entries: readonly ToolbarEntry<Row>[];
  label: string;
  itemAttributes: GridToolbarOptions<Row>["itemAttributes"];
}) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const items = resolveToolbar(entries, {
    commands: commands.commands,
    contextFor: commands.contextFor,
    itemAttributes,
  }).map((item) =>
    reportingItem(item, (commandId, itemId) => {
      commands.report(commandId, { area: "toolbar", itemId }, "toolbar");
    }),
  );
  const fit = useToolbarOverflow(toolbarRef, items);
  const { shown, overflow } = splitToolbarItems(items, fit);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    return toolbar === null ? undefined : attachToolbar(toolbar);
  }, []);

  /**
   * Where a menu's focus comes back to when its button has gone: a dropdown
   * whose items all hid, or "More" as the toolbar widens with its menu open.
   */
  function toolbarTabStop(): HTMLElement | null {
    const toolbar = toolbarRef.current;
    return (
      toolbar?.querySelector<HTMLElement>('[tabindex="0"]') ??
      toolbar?.querySelector<HTMLElement>("button, input") ??
      null
    );
  }

  function draw(item: ResolvedToolbarItem): ReactNode {
    switch (item.type) {
      case "button":
        return (
          <button
            key={item.key}
            {...item.attributes}
            type="button"
            className="toolbar-button"
            data-gridkit-toolbar-item={item.key}
            {...ariaAttr(item.disabled, "aria-disabled", true)}
            {...ariaAttr(
              item.pressed !== undefined,
              "aria-pressed",
              item.pressed,
            )}
            {...ariaAttr(
              item.shortcut !== undefined,
              "aria-keyshortcuts",
              item.shortcut,
            )}
            onClick={() => {
              item.run();
            }}
          >
            {item.icon !== undefined && (
              <span className="toolbar-button-icon" aria-hidden="true">
                <MenuIcon name={item.icon} />
              </span>
            )}
            {item.label}
          </button>
        );
      case "menu":
        return (
          <ToolbarMenuButton
            key={item.key}
            itemKey={item.key}
            attributes={item.attributes}
            label={item.label}
            icon={item.icon}
            entries={item.items}
            returnFocusFallback={toolbarTabStop}
          />
        );
      case "search":
        return (
          <ToolbarSearch<Row>
            key={item.key}
            itemKey={item.key}
            attributes={item.attributes}
            controller={controller}
            messages={messages}
            announce={announce}
          />
        );
      case "separator":
        return (
          <div
            key={item.key}
            role="separator"
            aria-orientation="vertical"
            className="toolbar-separator"
            data-gridkit-toolbar-item={item.key}
          />
        );
      case "spacer":
        return (
          <div
            key={item.key}
            className="toolbar-spacer"
            data-gridkit-toolbar-item={item.key}
          />
        );
      case "custom":
        return (
          <div
            key={item.key}
            {...item.attributes}
            className="toolbar-custom"
            data-gridkit-toolbar-item={item.key}
          >
            {renderItem?.(item.id)}
          </div>
        );
    }
  }

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={label}
      aria-controls={gridId}
      className="gridkit-toolbar"
    >
      {shown.map(draw)}
      {overflow.length > 0 && (
        <ToolbarMenuButton
          itemKey="more"
          label={messages.moreToolbarItems}
          entries={overflow}
          more
          returnFocusFallback={toolbarTabStop}
        />
      )}
    </div>
  );
}
