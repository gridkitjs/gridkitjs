import { resolveColumnFilterMenu } from "@gridkitjs/core";
import type { DataGridController } from "../useGridController";
import type { GridPanelsApi } from "./useGridPanels";

/** What `DataGridApi` carries for the grid's panels. */
export interface GridPanelApi {
  /**
   * Opens the column chooser at the grid's top-end corner, in place of any
   * panel open; it gives focus back to what had it when it closes.
   */
  openColumnChooser(): void;
  /**
   * Opens the filter menu of the column `columnId` below its header, in
   * place of any panel open, and says whether it opened: not for a column
   * with no filter menu, nor one not shown. It gives focus back to the
   * header when it closes.
   */
  openFilterMenu(columnId: string): boolean;
  /** Closes the filter menu, if one is open, leaving any other panel open. */
  closeFilterMenu(): void;
}

/** `DataGridApi`'s panel methods, over the grid as it is when called. */
export function panelApi<Row>(
  panels: GridPanelsApi,
  controller: DataGridController<Row>,
): GridPanelApi {
  return {
    openColumnChooser: () => {
      panels.open("columnChooser", { area: "grid" });
    },
    openFilterMenu: (columnId) => {
      const shown = controller
        .getView()
        .columns.find((entry) => entry.id === columnId);
      if (
        shown === undefined ||
        resolveColumnFilterMenu(controller.getOptions(), shown.column) === null
      ) {
        return false;
      }
      panels.open("filter", { area: "header", columnId });
      return true;
    },
    closeFilterMenu: () => {
      if (panels.current()?.kind === "filter") {
        panels.close();
      }
    },
  };
}
