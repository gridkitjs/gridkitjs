// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import { groupRowId, type ColumnDefinition } from "@gridkitjs/core";
import type React from "react";
import type { Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";
import { expectNoAxeViolations, FORMS_SCOPE } from "./support/axe";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ContextMenuGrid from "./support/ContextMenuGrid";
import FieldGroupHarness from "./support/forms/FieldGroupHarness";
import FieldHarness from "./support/forms/FieldHarness";
import FormHarness from "./support/forms/FormHarness";
import LayoutHarness from "./support/forms/LayoutHarness";
import SummaryHarness from "./support/forms/SummaryHarness";
import HeaderTextGrid from "./support/HeaderTextGrid";
import RightToLeft from "./support/RightToLeft";
import ToolbarGrid from "./support/ToolbarGrid";

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

test('aria-selected is absent, not "false", when no selection mode is on — checked on header, row and cell', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="No selection"
    />,
  );
  await expect(root.locator("thead th").first()).not.toHaveAttribute(
    "aria-selected",
  );
  await expect(root.locator("tbody tr").first()).not.toHaveAttribute(
    "aria-selected",
  );
  await expect(root.locator("tbody td").first()).not.toHaveAttribute(
    "aria-selected",
  );
});

test("aria-selected is present as true/false once every mode is on, and only the clicked cell/row flip to true", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="All selection"
      selectable={{ rows: "multiple", columns: "multiple", cells: "single" }}
    />,
  );
  const header = root.locator("thead th").first();
  const row = root.locator("tbody tr").first();
  const cell = row.locator("td").first();
  await expect(header).toHaveAttribute("aria-selected", "false");
  await expect(row).toHaveAttribute("aria-selected", "false");
  await expect(cell).toHaveAttribute("aria-selected", "false");

  await cell.click();
  await expect(header).toHaveAttribute("aria-selected", "false");
  await expect(row).toHaveAttribute("aria-selected", "true");
  await expect(cell).toHaveAttribute("aria-selected", "true");
});

test('aria-multiselectable is absent under "single"', async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Single"
      selectable={{ rows: "single" }}
    />,
  );
  await expect(root.getByRole("grid")).not.toHaveAttribute(
    "aria-multiselectable",
  );
});

test('aria-multiselectable is "true" when rows is "multiple"', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Multi rows"
      selectable={{ rows: "multiple" }}
    />,
  );
  await expect(root.getByRole("grid")).toHaveAttribute(
    "aria-multiselectable",
    "true",
  );
});

test('aria-multiselectable is "true" when columns is "multiple", independent of rows', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Multi columns"
      selectable={{ columns: "multiple" }}
    />,
  );
  await expect(root.getByRole("grid")).toHaveAttribute(
    "aria-multiselectable",
    "true",
  );
});

test("aria-keyshortcuts reflects exactly the applicable reorder/resize combination, or is absent for neither", async ({
  mount,
}) => {
  const shortcutColumns: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 80, resizable: false, reorderable: false },
    { field: "name", width: 120 },
    { field: "id", id: "id2", width: 80, reorderable: true },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={shortcutColumns}
      dataSource={buildRows(2)}
      label="Shortcuts"
      resizableColumns
    />,
  );
  const headerLocators = root.locator("thead th");
  await expect(headerLocators.nth(0)).not.toHaveAttribute("aria-keyshortcuts");
  await expect(headerLocators.nth(1)).toHaveAttribute(
    "aria-keyshortcuts",
    "Alt+ArrowLeft Alt+ArrowRight Alt+Enter",
  );
  await expect(headerLocators.nth(2)).toHaveAttribute(
    "aria-keyshortcuts",
    "Control+ArrowLeft Control+ArrowRight Alt+ArrowLeft Alt+ArrowRight Alt+Enter",
  );
});

test("labelledBy takes precedence over label", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <>
      <h2 id="heading">Heading</h2>
      <DataGrid
        columns={columns}
        dataSource={buildRows(1)}
        label="Ignored"
        labelledBy="heading"
      />
    </>,
  );
  const table = root.getByRole("grid");
  await expect(table).toHaveAttribute("aria-labelledby", "heading");
  await expect(table).not.toHaveAttribute("aria-label");
});

test("neither label nor labelledBy given means neither attribute appears", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(1)} />,
  );
  const table = root.getByRole("grid");
  await expect(table).not.toHaveAttribute("aria-label");
  await expect(table).not.toHaveAttribute("aria-labelledby");
});

test('role="grid"/"row"/"columnheader"/"gridcell" are present throughout, the header role set explicitly like the body cell\'s', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(2)} label="Roles" />,
  );
  await expect(root.getByRole("grid")).toHaveCount(1);
  // The header row plus 2 body rows.
  await expect(root.getByRole("row")).toHaveCount(3);
  await expect(root.getByRole("columnheader")).toHaveCount(2);
  // 2 rows x 2 columns.
  await expect(root.getByRole("gridcell")).toHaveCount(4);
  // Explicit, not left to the `<th scope="col">` implicit mapping — the
  // same reasoning `GridRow.tsx` already applies to `role="gridcell"`.
  await expect(root.locator("thead th").first()).toHaveAttribute(
    "role",
    "columnheader",
  );
});

test("aria-keyshortcuts on body cells advertises Space/Enter when cell selection is enabled", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Body shortcuts on"
      selectable={{ cells: "single" }}
    />,
  );
  await expect(root.locator("tbody td").first()).toHaveAttribute(
    "aria-keyshortcuts",
    "Space Enter",
  );
});

test("aria-keyshortcuts is absent from body cells when cell selection is off", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Body shortcuts off"
    />,
  );
  await expect(root.locator("tbody td").first()).not.toHaveAttribute(
    "aria-keyshortcuts",
  );
});

test("a plain single-row selection leaves the live region unchanged; a multi-row Shift-click updates it with a count", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(4)}
      label="Announce"
      selectable={{ rows: "multiple" }}
    />,
  );
  const status = root.locator('[role="status"]');
  await expect(status).toHaveText("");

  const rows = root.locator("tbody tr");
  await rows.nth(0).locator("td").first().click();
  await expect(status).toHaveText("");

  await rows
    .nth(2)
    .locator("td")
    .first()
    .click({ modifiers: ["Shift"] });
  await expect(status).toHaveText("3 rows selected");
});

test("an announcement names a column by its header text, not its headerTemplate markup", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <HeaderTextGrid
      dataSource={[
        { id: "a", cost: 2 },
        { id: "b", cost: 1 },
      ]}
      label="Header text"
      sortableColumns
    />,
  );

  const costHeader = root.locator('th[data-gridkit-column="cost"]');
  await expect(costHeader).toContainText("Cost (EUR)");
  await costHeader.locator(".gridkit-header-sort-toggle").click();
  await expect(root.locator('[role="status"]')).toHaveText(
    "Cost sorted ascending",
  );
});

interface GroupedRow {
  id: string;
  name: string;
  region: string;
  amount: number;
}

const groupedRows: GroupedRow[] = [
  { id: "a", name: "Alpha", region: "North", amount: 3 },
  { id: "b", name: "Bravo", region: "South", amount: 5 },
  { id: "c", name: "Charlie", region: "North", amount: 2 },
];

const groupedColumns: readonly ColumnDefinition<GroupedRow>[] = [
  { field: "name", width: 120 },
  { field: "region", width: 120 },
  { field: "amount", width: 100 },
];

/** Called, not mounted as a component: CT mounts only imported components. */
function groupedGrid(groupAggregateDisplay: "inline" | "row" = "row") {
  return (
    <DataGrid
      columns={groupedColumns}
      dataSource={groupedRows}
      label="Grouped"
      defaultGroupBy={[{ columnId: "region" }]}
      aggregates={[{ columnId: "amount", fn: "sum" }]}
      groupAggregateDisplay={groupAggregateDisplay}
      selectable={{ rows: "multiple" }}
    />
  );
}

test("each <table> is presentational and every section, row and cell carries its ARIA role explicitly", async ({
  mount,
}) => {
  const root = await mountGrid(mount, groupedGrid());
  const tables = root.locator("table");
  // Header, body and the grand-total footer.
  await expect(tables).toHaveCount(3);
  for (const table of await tables.all()) {
    await expect(table).toHaveAttribute("role", "presentation");
  }
  await expect(root.getByRole("table")).toHaveCount(0);
  // The body's rowgroup can take focus, from script or a click, so the
  // `<tbody>` inside it is presentational.
  for (const section of await root
    .locator("thead, .gridkit-data-grid-body, tfoot")
    .all()) {
    await expect(section).toHaveAttribute("role", "rowgroup");
  }
  await expect(root.locator("tbody")).toHaveAttribute("role", "presentation");
  await expect(root.getByRole("rowgroup")).toHaveCount(3);
  for (const row of await root.locator("tr:not([aria-hidden='true'])").all()) {
    await expect(row).toHaveAttribute("role", "row");
  }
  for (const cell of await root.locator("th").all()) {
    await expect(cell).toHaveAttribute("role", "columnheader");
  }
  for (const cell of await root
    .locator("tr:not([aria-hidden='true']) td")
    .all()) {
    await expect(cell).toHaveAttribute("role", "gridcell");
  }
});

test("the treegrid owns its rows directly, with a group row's level, expansion and set position on a role=row", async ({
  mount,
}) => {
  const root = await mountGrid(mount, groupedGrid());
  const treegrid = root.getByRole("treegrid", { name: "Grouped" });
  await expect(treegrid).toMatchAriaSnapshot(`
    - treegrid "Grouped":
      - rowgroup:
        - row:
          - columnheader "name"
          - columnheader "region"
          - columnheader "amount"
      - rowgroup:
        - row /North/
        - row:
          - gridcell "Alpha"
  `);
  const group = root.getByRole("row", { name: /^region: North/ });
  await expect(group).toHaveAttribute("aria-level", "1");
  await expect(group).toHaveAttribute("aria-expanded", "true");
  await expect(group).toHaveAttribute("aria-posinset", "1");
  await expect(group).toHaveAttribute("aria-setsize", "2");
  await expect(group.getByRole("gridcell")).toHaveCount(1);
});

/** Each data row's name cell with its `aria-level`, `aria-posinset` and `aria-setsize`, `null` for one it lacks. */
async function dataRowPositions(
  root: MountResult,
): Promise<(string | null)[][]> {
  return root
    .locator("tbody tr[data-gridkit-row-id]")
    .evaluateAll((rows) =>
      rows.map((row) => [
        row.querySelector("td")?.textContent ?? null,
        row.getAttribute("aria-level"),
        row.getAttribute("aria-posinset"),
        row.getAttribute("aria-setsize"),
      ]),
    );
}

interface TeamRow extends GroupedRow {
  team: string;
}

const teamRows: TeamRow[] = [
  { id: "a", name: "Alpha", region: "North", team: "Red", amount: 3 },
  { id: "b", name: "Bravo", region: "South", team: "Red", amount: 5 },
  { id: "c", name: "Charlie", region: "North", team: "Blue", amount: 2 },
  { id: "d", name: "Delta", region: "North", team: "Red", amount: 4 },
  { id: "e", name: "Echo", region: "South", team: "Blue", amount: 1 },
];

const teamColumns: readonly ColumnDefinition<TeamRow>[] = [
  { field: "name", width: 120 },
  { field: "region", width: 120 },
  { field: "team", width: 120 },
];

test("a data row under one grouping column is level 2, placed among its group's rows", async ({
  mount,
}) => {
  const root = await mountGrid(mount, groupedGrid());
  expect(await dataRowPositions(root)).toEqual([
    ["Alpha", "2", "1", "2"],
    ["Charlie", "2", "2", "2"],
    ["Bravo", "2", "1", "1"],
  ]);
});

test("a data row under two grouping columns is level 3, placed within its innermost group beside a collapsed sibling", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={teamColumns}
      dataSource={teamRows}
      label="Two levels"
      defaultGroupBy={[{ columnId: "region" }, { columnId: "team" }]}
      defaultGroupExpansion={{
        mode: "allExpanded",
        except: [groupRowId(["North", "Blue"])],
      }}
    />,
  );
  const collapsed = root.getByRole("row", { name: /^team: Blue/ }).first();
  await expect(collapsed).toHaveAttribute("aria-expanded", "false");
  expect(await dataRowPositions(root)).toEqual([
    ["Alpha", "3", "1", "2"],
    ["Delta", "3", "2", "2"],
    ["Echo", "3", "1", "1"],
    ["Bravo", "3", "1", "1"],
  ]);
});

test("a group split by row pagination gives its rows the same set size on its second page", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={teamColumns}
      dataSource={teamRows}
      label="Split group"
      defaultGroupBy={[{ columnId: "region" }]}
      paginated
      paginationUnit="row"
      defaultPagination={{ pageIndex: 0, pageSize: 2 }}
    />,
  );
  expect(await dataRowPositions(root)).toEqual([
    ["Alpha", "2", "1", "3"],
    ["Charlie", "2", "2", "3"],
  ]);

  await root.getByRole("button", { name: "Next" }).click();
  await expect(root.getByRole("row", { name: /^region: North/ })).toBeVisible();
  await expect(
    root.locator("tbody tr[data-gridkit-row-id]").first(),
  ).toHaveText(/Delta/);
  expect(await dataRowPositions(root)).toEqual([
    ["Delta", "2", "3", "3"],
    ["Bravo", "2", "1", "2"],
  ]);
});

test("a group on a later page keeps its place among every sibling group, not just the page's", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={teamColumns}
      dataSource={teamRows}
      label="Paged groups"
      defaultGroupBy={[{ columnId: "region" }]}
      paginated
      defaultPagination={{ pageIndex: 1, pageSize: 1 }}
    />,
  );
  const south = root.getByRole("row", { name: /^region: South/ });
  await expect(south).toHaveAttribute("aria-posinset", "2");
  await expect(south).toHaveAttribute("aria-setsize", "2");
});

test("an ungrouped grid's data rows carry no level, position or set size", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(2)} label="Flat" />,
  );
  expect(await dataRowPositions(root)).toEqual([
    ["row-0", null, null, null],
    ["row-1", null, null, null],
  ]);
});

/** One state of the grid an axe scan covers. */
interface Scan {
  readonly name: string;
  /** Called, not mounted as a component: CT mounts only imported components. */
  readonly grid: () => React.JSX.Element;
  readonly width?: number;
  /** Brings the grid into the state, once mounted: opens a menu, selects a cell. */
  readonly prepare?: (root: MountResult, page: Page) => Promise<void>;
}

const scanColumns: readonly ColumnDefinition<TeamRow>[] = [
  { field: "name", header: "Name", width: 120 },
  { field: "region", header: "Region", width: 120 },
  { field: "amount", header: "Amount", width: 100, type: "number" },
];

/** A grid of `teamRows` with `scanColumns`; `props` override. */
function scanGrid(props: Partial<DataGridProps<TeamRow>> = {}) {
  return (
    <DataGrid
      columns={scanColumns}
      dataSource={teamRows}
      label="Scanned"
      {...props}
    />
  );
}

/** Clicks a header's filter button and waits for its filter menu. */
async function openFilterMenu(root: MountResult, page: Page): Promise<void> {
  await root
    .getByRole("columnheader", { name: "Name", exact: true })
    .locator(".gridkit-header-filter-toggle")
    .click();
  await expect(page.getByRole("dialog", { name: "Name filter" })).toBeVisible();
}

/**
 * Opens `ContextMenuGrid`'s header menu on Name, then its View submenu with
 * `opensKey`, the arrow pointing the way submenus open in the grid's direction.
 */
async function openViewSubmenu(
  root: MountResult,
  page: Page,
  opensKey: "ArrowLeft" | "ArrowRight",
): Promise<void> {
  await root
    .getByRole("columnheader", { name: "Name", exact: true })
    .click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Name column menu" });
  await menu.getByRole("menuitem", { name: "View" }).focus();
  await page.keyboard.press(opensKey);
  await expect(page.getByRole("menu", { name: "View" })).toBeVisible();
}

const scans: readonly Scan[] = [
  { name: "a plain grid", grid: () => scanGrid() },
  {
    name: "an empty grid, showing its message",
    grid: () => scanGrid({ dataSource: [] }),
    prepare: async (root) => {
      await expect(root.locator(".gridkit-grid-empty-row")).toBeVisible();
    },
  },
  {
    name: "an empty grouped grid, a treegrid showing its message",
    grid: () =>
      scanGrid({ dataSource: [], defaultGroupBy: [{ columnId: "region" }] }),
    prepare: async (root) => {
      await expect(root.getByRole("treegrid")).toBeVisible();
      await expect(root.locator(".gridkit-grid-empty-row")).toBeVisible();
    },
  },
  {
    name: "a loading grid, busy, its overlay over the rows",
    grid: () => scanGrid({ loading: true }),
    prepare: async (root) => {
      await expect(root.locator(".gridkit-grid-loading-overlay")).toBeVisible();
    },
  },
  {
    name: "a loading grid with no rows",
    grid: () => scanGrid({ dataSource: [], loading: true }),
    prepare: async (root) => {
      await expect(root.locator(".gridkit-grid-loading-overlay")).toBeVisible();
    },
  },
  {
    name: "a server grid on its third page",
    grid: () =>
      scanGrid({
        dataMode: "server",
        rowCount: 50,
        paginated: true,
        defaultPagination: { pageIndex: 2, pageSize: teamRows.length },
      }),
    prepare: async (root) => {
      await expect(root.locator(".gridkit-grid-pager-status")).toHaveText(
        "Page 3 of 10",
      );
    },
  },
  {
    name: "a grid with row, column and cell selection on and a cell selected",
    grid: () =>
      scanGrid({
        selectable: { rows: "multiple", columns: "multiple", cells: "single" },
      }),
    prepare: async (root) => {
      const cell = root.locator("tbody td").first();
      await cell.click();
      await expect(cell).toHaveAttribute("aria-selected", "true");
    },
  },
  {
    name: "sorted and filtered headers",
    grid: () =>
      scanGrid({
        sortableColumns: true,
        filterableColumns: true,
        defaultColumnSort: [{ columnId: "amount", direction: "desc" }],
        defaultFilter: [
          {
            kind: "operator",
            columnId: "region",
            operator: "eq",
            value: "North",
          },
        ],
      }),
    prepare: async (root) => {
      const amount = root.getByRole("columnheader", { name: "Amount" });
      await expect(amount).toHaveAttribute("aria-sort", "descending");
      const region = root.getByRole("columnheader", { name: "Region" });
      await expect(region).toHaveAttribute("aria-description", "Filtered");
    },
  },
  {
    name: "the simple filter menu, open",
    grid: () => scanGrid({ filterableColumns: true }),
    prepare: openFilterMenu,
  },
  {
    name: "the excel filter menu, open",
    grid: () =>
      scanGrid({ filterableColumns: true, filterMenu: { ui: "excel" } }),
    prepare: openFilterMenu,
  },
  {
    name: "a context menu with its submenu open",
    grid: () => <ContextMenuGrid />,
    prepare: (root, page) => openViewSubmenu(root, page, "ArrowRight"),
  },
  {
    name: "a right-to-left grid with a context menu and its submenu open",
    grid: () => (
      <RightToLeft>
        <ContextMenuGrid />
      </RightToLeft>
    ),
    prepare: (root, page) => openViewSubmenu(root, page, "ArrowLeft"),
  },
  {
    name: "the column chooser, open",
    grid: () => scanGrid({ toolbar: { items: ["column.choose"] } }),
    prepare: async (root, page) => {
      await root.getByRole("button", { name: "Choose columns" }).click();
      await expect(page.getByRole("dialog", { name: "Columns" })).toBeVisible();
    },
  },
  {
    name: "the toolbar with its overflow menu open",
    grid: () => <ToolbarGrid />,
    // Narrow enough that some of the toolbar's entries move into More.
    width: 520,
    prepare: async (root, page) => {
      await root.getByRole("button", { name: "More" }).click();
      await expect(page.getByRole("menu", { name: "More" })).toBeVisible();
    },
  },
  {
    name: "the compact pager",
    grid: () =>
      scanGrid({
        paginated: true,
        defaultPagination: { pageIndex: 1, pageSize: 2 },
      }),
  },
  {
    name: "the numbered pager",
    grid: () =>
      scanGrid({
        paginated: true,
        pager: { variant: "numbered" },
        defaultPagination: { pageIndex: 1, pageSize: 2 },
      }),
    prepare: async (root) => {
      await expect(root.locator(".gridkit-grid-pager-page")).toHaveCount(3);
    },
  },
  {
    name: "the group-by bar with chips",
    grid: () =>
      scanGrid({
        groupableColumns: true,
        defaultGroupBy: [{ columnId: "region" }, { columnId: "amount" }],
      }),
    prepare: async (root) => {
      await expect(root.locator(".gridkit-group-by-chip")).toHaveCount(2);
    },
  },
  {
    name: "a grouped grid with inline subtotals",
    grid: () => groupedGrid("inline"),
  },
  {
    name: "a grouped grid with row subtotals",
    grid: () => groupedGrid("row"),
  },
  {
    name: "a grid with columns pinned to both edges, scrolled sideways",
    grid: () =>
      scanGrid({
        height: 200,
        resizeMode: "fixed",
        defaultColumnPinning: { amount: "start", name: "end" },
      }),
    // Narrower than the columns, so the unpinned one scrolls under the others.
    width: 260,
    prepare: async (root) => {
      const area = root.locator(".gridkit-data-grid-tables");
      await area.evaluate((element) => {
        element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
      });
      await expect(area).not.toHaveJSProperty("scrollLeft", 0);
      // Pinning moves columns in the DOM; their indexes follow.
      for (const row of [
        root.locator(".gridkit-grid-header"),
        root.locator(".gridkit-grid-row").first(),
      ]) {
        expect(
          await row
            .locator("[aria-colindex]")
            .evaluateAll((cells) =>
              cells.map((cell) => cell.getAttribute("aria-colindex")),
            ),
        ).toEqual(["1", "2", "3"]);
      }
    },
  },
  { name: "a grid with no rows", grid: () => scanGrid({ dataSource: [] }) },
  {
    name: "a grid loading more rows by infinite scroll",
    grid: () =>
      scanGrid({
        infiniteScroll: {
          hasMore: true,
          isLoadingMore: true,
          onLoadMore: () => undefined,
        },
      }),
    prepare: async (root) => {
      await expect(root.locator(".gridkit-grid-loading-row")).toBeVisible();
    },
  },
];

for (const palette of ["gridkit-light", "gridkit-dark"]) {
  for (const { name, grid, width, prepare } of scans) {
    test(`an axe scan of ${name} finds no violations under .${palette}`, async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(
        mount,
        // Data rows take their text colour and background from the page, so
        // the wrapper sets both from the palette the way a page would.
        <div
          className={palette}
          style={{
            color: "var(--gridkit-fg)",
            backgroundColor: "var(--gridkit-surface)",
          }}
        >
          {grid()}
        </div>,
        width === undefined ? undefined : { width },
      );
      await prepare?.(root, page);
      await expectNoAxeViolations(page);
    });
  }
}

const fieldScans: readonly {
  readonly name: string;
  readonly field: () => React.JSX.Element;
}[] = [
  ...(["error", "warning", "info", "success"] as const).map((severity) => ({
    name: `a field with ${severity === "info" ? "an" : "a"} ${severity} message`,
    field: () => (
      <FieldHarness
        description="Your work address"
        message={{ text: `A ${severity} message`, severity }}
        required
      />
    ),
  })),
  {
    name: "a field with a floating label, at rest",
    field: () => <FieldHarness labelPosition="floating" />,
  },
  {
    name: "a field in display mode",
    field: () => (
      <FieldHarness label="Name" mode="display" defaultValue="Ada Lovelace" />
    ),
  },
];

for (const palette of ["gridkit-light", "gridkit-dark"]) {
  for (const { name, field } of fieldScans) {
    test(`an axe scan of ${name} finds no violations under .${palette}`, async ({
      mount,
      page,
    }) => {
      const root = await mount(
        <div
          className={palette}
          style={{
            color: "var(--gridkit-fg)",
            backgroundColor: "var(--gridkit-surface)",
          }}
        >
          {field()}
        </div>,
      );
      await expect(root.locator(".gridkit-forms-field")).toBeVisible();
      await expectNoAxeViolations(page, FORMS_SCOPE);
    });
  }
}

const structureScans: readonly {
  readonly name: string;
  readonly form: () => React.JSX.Element;
}[] = [
  {
    name: "a form with a fieldset and an open and a collapsed section",
    form: () => <FormHarness collapsedCity />,
  },
  {
    name: "a form with a message summary of every severity",
    form: () => (
      <SummaryHarness
        severities={["error", "warning", "info", "success"]}
        messages={{
          name: "Enter your full name",
          email: { text: "A personal address", severity: "warning" },
          phone: [
            { text: "Checked against the directory", severity: "info" },
            { text: "Matches the register", severity: "success" },
          ],
        }}
      />
    ),
  },
  {
    name: "a field group",
    form: () => <FieldGroupHarness />,
  },
  {
    name: "a three-column layout with start labels",
    form: () => (
      <LayoutHarness width="70rem" columns={3} labelPosition="start" />
    ),
  },
];

for (const palette of ["gridkit-light", "gridkit-dark"]) {
  for (const { name, form } of structureScans) {
    test(`an axe scan of ${name} finds no violations under .${palette}`, async ({
      mount,
      page,
    }) => {
      const root = await mount(
        <div
          className={palette}
          style={{
            color: "var(--gridkit-fg)",
            backgroundColor: "var(--gridkit-surface)",
          }}
        >
          {form()}
        </div>,
      );
      await expect(root.locator(".gridkit-forms-field").first()).toBeVisible();
      await expectNoAxeViolations(page, FORMS_SCOPE);
    });
  }
}
