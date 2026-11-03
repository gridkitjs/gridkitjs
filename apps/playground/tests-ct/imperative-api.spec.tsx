// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type {
  ColumnDefinition,
  ColumnResizeEvent,
  ColumnSortEvent,
  ColumnSortState,
  ColumnVisibilityEvent,
  ContextMenuOpenChangeEvent,
  GridCommandEvent,
  PaginationState,
} from "@gridkitjs/core";
import { expect, test } from "./support/coverage";
import { mountGrid, updateGrid } from "./support/mountGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";

interface Row {
  id: string;
  name: string;
}

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 160 },
];

interface Status {
  hasElement: boolean;
  hasTable: boolean;
  rowCount: number;
  rowIds: string[];
  pageRowIds: string[];
  columnIds: string[];
  dataColumnIds: string[];
  columnVisibility: Record<string, boolean>;
  columnSizing: Record<string, number>;
  columnOrder: readonly string[];
  columnSort: ColumnSortState;
  rowSelection: readonly string[];
  columnSelection: readonly string[];
  cellSelection: { rowId: string; columnId: string } | null;
  focusedCell: { rowIndex: number; columnIndex: number };
  pagination: PaginationState;
  columnWidths: [string, number][];
}

async function readStatus(root: MountResult): Promise<Status> {
  const text = await root.getByTestId("imperative-status").textContent();
  return JSON.parse(text ?? "{}") as Status;
}

test("element and table are populated once mounted", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="Api"
    />,
  );
  await root.getByRole("button", { name: "report" }).click();
  const status = await readStatus(root);
  expect(status.hasElement).toBe(true);
  expect(status.hasTable).toBe(true);
});

test("getRows/getColumns reflect the grid as currently sorted", async ({
  mount,
}) => {
  const rows = [
    { id: "row-b", name: "Bravo" },
    { id: "row-a", name: "Alpha" },
    { id: "row-c", name: "Charlie" },
  ];
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={rows}
      label="Api"
      defaultColumnSort={[{ columnId: "name", direction: "asc" }]}
    />,
  );
  await root.getByRole("button", { name: "report" }).click();
  const status = await readStatus(root);
  expect(status.rowCount).toBe(3);
  expect(status.rowIds).toEqual(["row-a", "row-b", "row-c"]);
  expect(status.columnIds).toEqual(["id", "name"]);
});

test("getPageRows returns only the current page's rows", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(7)}
      label="Api"
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );
  await root.getByRole("button", { name: "next-page" }).click();
  await root.getByRole("button", { name: "report" }).click();
  const status = await readStatus(root);
  expect(status.pageRowIds).toEqual(["row-3", "row-4", "row-5"]);
  expect(status.rowCount).toBe(7);
});

test("focusCell moves the grid's DOM tab stop", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="Api"
      focusRowIndex={1}
      focusColumnIndex={1}
    />,
  );
  await root.getByRole("button", { name: "focus-cell" }).click();
  await root.getByRole("button", { name: "report" }).click();
  const status = await readStatus(root);
  expect(status.focusedCell).toEqual({ rowIndex: 1, columnIndex: 1 });
  const secondRowSecondCell = root
    .locator("tbody tr")
    .nth(1)
    .locator("td")
    .nth(1);
  await expect(secondRowSecondCell).toHaveAttribute("tabindex", "0");
});

test("selectAllRows and clearSelection drive both state and rendered classes", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="Api"
      selectable={{ rows: "multiple" }}
    />,
  );
  const rows = root.locator("tbody tr");

  await root.getByRole("button", { name: "select-all-rows" }).click();
  await root.getByRole("button", { name: "report" }).click();
  let status = await readStatus(root);
  expect(status.rowSelection).toHaveLength(3);
  for (let i = 0; i < 3; i += 1) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "true");
  }

  await root.getByRole("button", { name: "clear-selection" }).click();
  await root.getByRole("button", { name: "report" }).click();
  status = await readStatus(root);
  expect(status.rowSelection).toHaveLength(0);
  for (let i = 0; i < 3; i += 1) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
  }
});

test("scrollToRow scrolls the row into view within its scrollable ancestor", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(40)}
      label="Api"
      scrollRowId="row-39"
    />,
  );
  const scrollContainer = root.getByTestId("scroll-container");
  await expect(scrollContainer).toHaveJSProperty("scrollTop", 0);

  await root.getByRole("button", { name: "scroll-to-row" }).click();
  await expect
    .poll(async () => scrollContainer.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
});

test("scrollToColumn scrolls the column into view horizontally", async ({
  mount,
}) => {
  const wideColumns: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 300 },
    { field: "name", width: 300, id: "far-column" },
  ];
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={wideColumns}
      dataSource={buildRows(3)}
      label="Api"
      resizeMode="fixed"
      scrollColumnId="far-column"
    />,
    { width: 200 },
  );
  const viewport = root.locator(".gridkit-data-grid-viewport");
  await expect(viewport).toHaveJSProperty("scrollLeft", 0);

  await root.getByRole("button", { name: "scroll-to-column" }).click();
  await expect
    .poll(async () => viewport.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
});

test.describe("column visibility", () => {
  interface WideRow {
    id: string;
    name: string;
    region: string;
    notes: string;
  }

  const wideColumns: readonly ColumnDefinition<WideRow>[] = [
    { field: "id", width: 80 },
    { field: "name", width: 120 },
    { field: "region", width: 100 },
    { field: "notes", width: 120, hidden: true },
  ];

  const wideRows: WideRow[] = [
    { id: "row-a", name: "Alpha", region: "West", notes: "first" },
    { id: "row-b", name: "Bravo", region: "East", notes: "second" },
  ];

  function headerIds(root: MountResult) {
    return root
      .locator("thead th")
      .evaluateAll((cells) =>
        cells.map((cell) => cell.getAttribute("data-gridkit-column")),
      );
  }

  test("hideColumns drops a column and showColumns returns it to its place, one event each", async ({
    mount,
  }) => {
    const events: ColumnVisibilityEvent[] = [];
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={wideColumns}
        dataSource={wideRows}
        label="Visibility"
        visibilityColumnIds={["name"]}
        onColumnVisibilityChange={(event) => {
          events.push(event);
        }}
      />,
    );
    const grid = root.getByRole("grid");

    expect(await headerIds(root)).toEqual(["id", "name", "region"]);
    await expect(grid).toHaveAttribute("aria-colcount", "3");

    await root.getByRole("button", { name: "hide-columns" }).click();
    await expect(root.locator("thead th")).toHaveCount(2);
    await expect(grid).toHaveAttribute("aria-colcount", "2");
    await expect(root.locator("colgroup").first().locator("col")).toHaveCount(
      2,
    );
    await expect.poll(() => events.length).toBe(1);
    expect(events[0]).toEqual({
      columnIds: ["name"],
      visibility: { name: false },
    });

    await root.getByRole("button", { name: "show-columns" }).click();
    await expect(root.locator("thead th")).toHaveCount(3);
    expect(await headerIds(root)).toEqual(["id", "name", "region"]);
    await expect.poll(() => events.length).toBe(2);
    expect(events[1]?.visibility).toEqual({ name: true });

    // Showing what is already shown changes nothing and reports nothing.
    await root.getByRole("button", { name: "show-columns" }).click();
    await root.getByRole("button", { name: "report" }).click();
    expect(events).toHaveLength(2);
  });

  test("hiding or showing one column announces it", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={wideColumns}
        dataSource={wideRows}
        label="Visibility announcements"
        visibilityColumnIds={["name"]}
      />,
    );
    const status = root.locator('[role="status"]');

    await root.getByRole("button", { name: "hide-columns" }).click();
    await expect(status).toHaveText("name, column hidden");

    await root.getByRole("button", { name: "show-columns" }).click();
    await expect(status).toHaveText("name, column shown");
  });

  test("a column hidden by its definition stays a data column and can be shown", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={wideColumns}
        dataSource={wideRows}
        label="Hidden by definition"
        visibilityColumnIds={["notes"]}
      />,
    );

    await root.getByRole("button", { name: "report" }).click();
    let status = await readStatus(root);
    expect(status.columnIds).toEqual(["id", "name", "region"]);
    expect(status.dataColumnIds).toEqual(["id", "name", "region", "notes"]);
    expect(status.columnVisibility).toEqual({});

    await root.getByRole("button", { name: "show-columns" }).click();
    await root.getByRole("button", { name: "report" }).click();
    status = await readStatus(root);
    expect(status.columnIds).toEqual(["id", "name", "region", "notes"]);
    expect(status.columnVisibility).toEqual({ notes: true });
  });

  test("defaultColumnVisibility starts a column hidden, and a sort on it still applies", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={wideColumns}
        dataSource={wideRows}
        label="Default visibility"
        defaultColumnVisibility={{ region: false }}
        defaultColumnSort={[{ columnId: "region", direction: "asc" }]}
      />,
    );

    expect(await headerIds(root)).toEqual(["id", "name"]);
    await root.getByRole("button", { name: "report" }).click();
    expect((await readStatus(root)).rowIds).toEqual(["row-b", "row-a"]);
  });
  test("a controlled columnVisibility is shown as given, and hideColumns only asks", async ({
    mount,
  }) => {
    const events: ColumnVisibilityEvent[] = [];
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={wideColumns}
        dataSource={wideRows}
        label="Controlled visibility"
        columnVisibility={{ notes: true, region: false }}
        visibilityColumnIds={["name"]}
        onColumnVisibilityChange={(event) => {
          events.push(event);
        }}
      />,
    );

    expect(await headerIds(root)).toEqual(["id", "name", "notes"]);

    await root.getByRole("button", { name: "hide-columns" }).click();
    await expect.poll(() => events.length).toBe(1);
    expect(events[0]?.visibility).toEqual({
      notes: true,
      region: false,
      name: false,
    });
    expect(await headerIds(root)).toEqual(["id", "name", "notes"]);
  });
});

test("restoreState puts back a layout saved through serializeGridState and JSON", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(6)}
      label="Restore"
      paginated
      sortableColumns
      resizableColumns
      resizeMode="fixed"
      selectable={{ rows: "multiple" }}
      defaultPagination={{ pageIndex: 0, pageSize: 2 }}
      visibilityColumnIds={["name"]}
      selectRowIds={["row-5"]}
      sortToSet={[{ columnId: "id", direction: "desc" }]}
    />,
  );

  await root.getByRole("button", { name: "set-column-sort" }).click();
  await root.getByRole("button", { name: "next-page" }).click();
  await root.getByRole("button", { name: "select-rows" }).click();
  await root.getByRole("button", { name: "hide-columns" }).click();
  await root.getByRole("button", { name: "save-state" }).click();

  await root.getByRole("button", { name: "show-columns" }).click();
  await root.getByRole("button", { name: "clear-selection" }).click();
  await root.locator("thead th").first().locator(".header-sort-toggle").click();
  await expect(root.locator("thead th")).toHaveCount(2);

  await root.getByRole("button", { name: "restore-state" }).click();
  await expect(root.locator("thead th")).toHaveCount(1);
  await root.getByRole("button", { name: "report" }).click();
  const status = await readStatus(root);
  expect(status.columnSort).toEqual([{ columnId: "id", direction: "desc" }]);
  expect(status.pagination).toEqual({ pageIndex: 1, pageSize: 2 });
  expect(status.pageRowIds).toEqual(["row-3", "row-2"]);
  expect(status.rowSelection).toEqual(["row-5"]);
  expect(status.columnVisibility).toEqual({ name: false });
});

test("setColumnSort through the ref sorts the grid and reports once", async ({
  mount,
}) => {
  const events: ColumnSortEvent[] = [];
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="setColumnSort"
      sortToSet={[{ columnId: "id", direction: "desc" }]}
      onColumnSortChange={(event) => {
        events.push(event);
      }}
    />,
  );

  await root.getByRole("button", { name: "set-column-sort" }).click();
  await root.getByRole("button", { name: "set-column-sort" }).click();
  await root.getByRole("button", { name: "report" }).click();

  expect((await readStatus(root)).rowIds).toEqual(["row-2", "row-1", "row-0"]);
  expect(events).toEqual([
    { columnId: "id", sort: [{ columnId: "id", direction: "desc" }] },
  ]);
});

test("autoFitColumn sizes a column to its content and reports it as a resize", async ({
  mount,
}) => {
  const events: ColumnResizeEvent[] = [];
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={[
        { field: "id", width: 300 },
        { field: "name", width: 120 },
      ]}
      dataSource={buildRows(3)}
      label="autoFitColumn"
      resizeMode="fixed"
      autoFitColumnId="id"
      onColumnResize={(event) => {
        events.push(event);
      }}
    />,
  );

  await root.getByRole("button", { name: "auto-fit-column" }).click();
  await root.getByRole("button", { name: "report" }).click();
  const width = new Map((await readStatus(root)).columnWidths).get("id");

  expect(width).toBeLessThan(300);
  expect(width).toBeGreaterThan(0);
  await expect.poll(() => events.length).toBe(1);
  expect(events[0]).toMatchObject({ columnId: "id", phase: "end" });
});

test("autoFitColumns sizes the columns given, or every column shown", async ({
  mount,
}) => {
  const wide: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 300 },
    { field: "name", width: 300 },
  ];
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={wide}
      dataSource={buildRows(3)}
      label="autoFitColumns"
      resizeMode="fixed"
      autoFitColumnIds={["name"]}
    />,
  );
  const widths = async () => {
    await root.getByRole("button", { name: "report" }).click();
    return new Map((await readStatus(root)).columnWidths);
  };

  await root.getByRole("button", { name: "fit-columns" }).click();
  let sized = await widths();
  expect(sized.get("name")).toBeLessThan(300);
  expect(sized.get("id")).toBe(300);

  await updateGrid(
    root,
    <ImperativeApiGrid
      columns={wide}
      dataSource={buildRows(3)}
      label="autoFitColumns"
      resizeMode="fixed"
    />,
  );
  await root.getByRole("button", { name: "fit-columns" }).click();
  sized = await widths();
  expect(sized.get("id")).toBeLessThan(300);
});

test.describe("context menu", () => {
  test("openContextMenu opens a header's menu below it, and closeContextMenu closes it", async ({
    mount,
    page,
  }) => {
    const events: ContextMenuOpenChangeEvent[] = [];
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Open a menu"
        sortableColumns
        contextMenu
        contextMenuTarget={{ area: "header", columnId: "name" }}
        onContextMenuOpenChange={(event) => {
          events.push(event);
        }}
      />,
    );
    const target = { area: "header", columnId: "name" };

    await root.getByRole("button", { name: "open-context-menu" }).click();

    const menu = page.getByRole("menu", { name: "name column menu" });
    await expect(
      menu.getByRole("menuitemcheckbox", { name: "Sort ascending" }),
    ).toBeFocused();
    await expect(root.getByTestId("imperative-result")).toHaveText("true");
    await expect(page.locator(".gridkit-overlay")).toHaveAttribute(
      "data-gridkit-placement",
      "bottom-start",
    );
    await expect.poll(() => events).toEqual([{ open: true, target }]);

    // Dispatched rather than clicked: a pointer down outside the menu would
    // close it before the button's own click did.
    await root
      .getByRole("button", { name: "close-context-menu" })
      .dispatchEvent("click");

    await expect(menu).toHaveCount(0);
    await expect(
      root.getByRole("columnheader", { name: "name", exact: true }),
    ).toBeFocused();
    await expect
      .poll(() => events)
      .toEqual([
        { open: true, target },
        { open: false, target },
      ]);
  });

  test("openContextMenu on a row opens beside the point given, selecting the row", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Open a row menu"
        selectable={{ rows: "multiple" }}
        contextMenu
        contextMenuTarget={{ area: "cell", rowId: "row-1", columnId: "name" }}
        contextMenuPoint={{ x: 400, y: 300 }}
      />,
    );

    await root.getByRole("button", { name: "open-context-menu" }).click();

    const menu = page.getByRole("menu", { name: "Row menu" });
    await expect(
      menu.getByRole("menuitem", { name: "Select all rows" }),
    ).toBeFocused();
    const box = await page.locator(".gridkit-overlay").boundingBox();
    expect(box?.x).toBeCloseTo(400, 0);
    expect(box?.y).toBeCloseTo(300, 0);
    await page.keyboard.press("Escape");
    await root.getByRole("button", { name: "report" }).click();
    const status = await readStatus(root);
    expect(status.rowSelection).toEqual(["row-1"]);
    expect(status.focusedCell).toEqual({ rowIndex: 1, columnIndex: 1 });
  });

  test("openContextMenu opens nothing for a row not on screen, or without contextMenu", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="No menu"
        selectable={{ rows: "multiple" }}
        contextMenu
        contextMenuTarget={{ area: "cell", rowId: "row-9", columnId: "name" }}
      />,
    );
    const result = root.getByTestId("imperative-result");

    await root.getByRole("button", { name: "open-context-menu" }).click();
    await expect(result).toHaveText("false");

    await updateGrid(
      root,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="No menu"
        selectable={{ rows: "multiple" }}
        contextMenuTarget={{ area: "cell", rowId: "row-1", columnId: "name" }}
      />,
    );
    await root.getByRole("button", { name: "report" }).click();
    await root.getByRole("button", { name: "open-context-menu" }).click();
    await expect(result).toHaveText("false");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("openContextMenu called from an effect keeps focus in the menu", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="From an effect"
        selectable={{ rows: "multiple" }}
        contextMenu
        contextMenuTarget={{ area: "cell", rowId: "row-2", columnId: "id" }}
      />,
    );

    await root.getByRole("button", { name: "open-in-effect" }).click();

    const first = page
      .getByRole("menu", { name: "Row menu" })
      .getByRole("menuitem", { name: "Select all rows" });
    await expect(first).toBeFocused();
    // A move of the grid's focus still waiting to be drawn would take it
    // back to the cell a frame or two later.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );
    await expect(first).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      root.locator("tbody tr").nth(2).locator("td").first(),
    ).toBeFocused();
  });
});

test.describe("runCommand", () => {
  test("runs a command on its target, says so, and reports it as the API's", async ({
    mount,
  }) => {
    const events: GridCommandEvent[] = [];
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Run a command"
        sortableColumns
        commandId="sort.descending"
        commandTarget={{ area: "header", columnId: "name" }}
        onCommand={(event) => {
          events.push(event);
        }}
      />,
    );

    await root.getByRole("button", { name: "run-command" }).click();

    await expect(root.getByTestId("imperative-result")).toHaveText("true");
    await root.getByRole("button", { name: "report" }).click();
    expect((await readStatus(root)).columnSort).toEqual([
      { columnId: "name", direction: "desc" },
    ]);
    await expect
      .poll(() => events)
      .toEqual([
        {
          commandId: "sort.descending",
          target: { area: "header", columnId: "name" },
          source: "api",
        },
      ]);
  });

  test("runs nothing that is disabled, or unknown, and reports nothing", async ({
    mount,
    page,
  }) => {
    const events: GridCommandEvent[] = [];
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Run nothing"
        selectable={{ rows: "multiple" }}
        commandId="selection.clear"
        onCommand={(event) => {
          events.push(event);
        }}
      />,
    );
    const result = root.getByTestId("imperative-result");

    // Nothing is selected, so there is nothing to clear.
    await root.getByRole("button", { name: "run-command" }).click();
    await expect(result).toHaveText("false");

    await updateGrid(
      root,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Run nothing"
        commandId="orders.missing"
        onCommand={(event) => {
          events.push(event);
        }}
      />,
    );
    await root.getByRole("button", { name: "report" }).click();
    await root.getByRole("button", { name: "run-command" }).click();
    await expect(result).toHaveText("false");
    await expect
      .poll(() => errors)
      .toContain("DataGrid: there is no command `orders.missing` to run.");
    expect(events).toEqual([]);
  });

  test("runs a command for the whole grid when given no target", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Run on the grid"
        sortableColumns
        defaultColumnSort={[{ columnId: "id", direction: "desc" }]}
        commandId="sort.clearAll"
      />,
    );

    await root.getByRole("button", { name: "run-command" }).click();

    await expect(root.getByTestId("imperative-result")).toHaveText("true");
    await root.getByRole("button", { name: "report" }).click();
    expect((await readStatus(root)).columnSort).toEqual([]);
  });
});
