// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import { groupRowId, type ColumnDefinition } from "@gridkitjs/core";
import AxeBuilder from "@axe-core/playwright";
import type { MountResult } from "@playwright/experimental-ct-react";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import HeaderTextGrid from "./support/HeaderTextGrid";

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
  for (const section of await root.locator("thead, tbody, tfoot").all()) {
    await expect(section).toHaveAttribute("role", "rowgroup");
  }
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

for (const palette of ["gridkit-light", "gridkit-dark"]) {
  for (const display of ["inline", "row"] as const) {
    test(`an axe scan of a grouped grid with ${display} subtotals finds no violations under .${palette}`, async ({
      mount,
      page,
    }) => {
      await mountGrid(
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
          {groupedGrid(display)}
        </div>,
      );
      const results = await new AxeBuilder({ page })
        .include(".gridkit-data-grid-viewport")
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          targets: violation.nodes.map((node) => node.target.join(" ")),
        })),
      ).toEqual([]);
    });
  }
}
