// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition, GroupExpansionState } from "@gridkitjs/core";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";
import RowIdentifiedGrid from "./support/RowIdentifiedGrid";

interface Row {
  id: string;
  region: string;
  status: string;
  amount: number;
}

/** East: r2, r4. West: r1, r3, r5. */
function buildRows(): Row[] {
  return [
    { id: "r1", region: "West", status: "Open", amount: 10 },
    { id: "r2", region: "East", status: "Open", amount: 20 },
    { id: "r3", region: "West", status: "Closed", amount: 30 },
    { id: "r4", region: "East", status: "Closed", amount: 40 },
    { id: "r5", region: "West", status: "Open", amount: 50 },
  ];
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "region", width: 100 },
  { field: "status", width: 100 },
  { field: "amount", width: 100, type: "number" },
];

function groupHeaders(root: MountResult) {
  return root.locator("tr[data-gridkit-group]");
}

function dataRows(root: MountResult) {
  return root.locator("tbody tr:not([data-gridkit-group])");
}

/** `{isGroup, level, id}` per rendered `<tr>`, in DOM order — the shape both grouping tests check the row sequence against. */
async function rowStructure(root: MountResult) {
  return root.locator("tbody tr").evaluateAll((rows) =>
    rows.map((row) => ({
      isGroup: row.hasAttribute("data-gridkit-group"),
      level: row.getAttribute("aria-level"),
      id:
        row.querySelector('td[data-gridkit-column="id"]')?.textContent ?? null,
    })),
  );
}

interface Status {
  groupExpansion: GroupExpansionState;
  displayRowCount: number;
}

async function readStatus(root: MountResult): Promise<Status> {
  const text = await root.getByTestId("imperative-status").textContent();
  return JSON.parse(text ?? "{}") as Status;
}

test("groups rows by a single column, in group order, with each group's rows nested beneath it", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Single-level grouping"
      defaultGroupBy={[{ columnId: "region" }]}
    />,
  );

  const groups = groupHeaders(root);
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0)).toContainText("East");
  await expect(groups.nth(0)).toContainText("(2)");
  await expect(groups.nth(1)).toContainText("West");
  await expect(groups.nth(1)).toContainText("(3)");
  await expect(dataRows(root)).toHaveCount(5);

  expect(await rowStructure(root)).toEqual([
    { isGroup: true, level: "1", id: null },
    { isGroup: false, level: null, id: "r2" },
    { isGroup: false, level: null, id: "r4" },
    { isGroup: true, level: "1", id: null },
    { isGroup: false, level: null, id: "r1" },
    { isGroup: false, level: null, id: "r3" },
    { isGroup: false, level: null, id: "r5" },
  ]);
});

test("nests a second group-by level inside the first, depth-first", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Nested grouping"
      defaultGroupBy={[{ columnId: "region" }, { columnId: "status" }]}
    />,
  );

  await expect(groupHeaders(root)).toHaveCount(6);
  expect(await rowStructure(root)).toEqual([
    { isGroup: true, level: "1", id: null }, // East (2)
    { isGroup: true, level: "2", id: null }, // East > Closed (1)
    { isGroup: false, level: null, id: "r4" },
    { isGroup: true, level: "2", id: null }, // East > Open (1)
    { isGroup: false, level: null, id: "r2" },
    { isGroup: true, level: "1", id: null }, // West (3)
    { isGroup: true, level: "2", id: null }, // West > Closed (1)
    { isGroup: false, level: null, id: "r3" },
    { isGroup: true, level: "2", id: null }, // West > Open (2)
    { isGroup: false, level: null, id: "r1" },
    { isGroup: false, level: null, id: "r5" },
  ]);
});

test("collapsing a group hides its descendants but keeps its own header's count", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Collapse"
      defaultGroupBy={[{ columnId: "region" }]}
    />,
  );

  const east = groupHeaders(root).filter({ hasText: "East" });
  await expect(dataRows(root)).toHaveCount(5);

  await east.click();

  await expect(east).toHaveAttribute("aria-expanded", "false");
  // Still reports its full leaf count (2) while collapsed.
  await expect(east).toContainText("(2)");
  await expect(groupHeaders(root)).toHaveCount(2);
  await expect(dataRows(root)).toHaveCount(3);

  await east.click();
  await expect(east).toHaveAttribute("aria-expanded", "true");
  await expect(dataRows(root)).toHaveCount(5);
});

test("Space and Enter on a focused group header toggle it, the same as a click", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Keyboard toggle"
      defaultGroupBy={[{ columnId: "region" }]}
      groupByBarVisibility="never"
    />,
  );
  const active = root.locator('[tabindex="0"]');
  const east = groupHeaders(root).first();

  await active.press("ArrowDown"); // header row -> the East group row
  await expect(east.locator("td")).toHaveAttribute("tabindex", "0");

  await active.press("Enter");
  await expect(east).toHaveAttribute("aria-expanded", "false");
  await expect(dataRows(root)).toHaveCount(3);

  await active.press(" ");
  await expect(east).toHaveAttribute("aria-expanded", "true");
  await expect(dataRows(root)).toHaveCount(5);
});

test("ArrowLeft/ArrowRight on a focused group header are a no-op — it has only one cell", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="No lateral move"
      defaultGroupBy={[{ columnId: "region" }]}
      groupByBarVisibility="never"
    />,
  );
  const active = root.locator('[tabindex="0"]');
  const eastCell = groupHeaders(root).first().locator("td");

  await active.press("ArrowDown");
  await expect(eastCell).toHaveAttribute("tabindex", "0");

  await active.press("ArrowRight");
  await expect(eastCell).toHaveAttribute("tabindex", "0");
  await active.press("ArrowLeft");
  await expect(eastCell).toHaveAttribute("tabindex", "0");
});

test("a range select spanning a collapsed group includes only the rows currently visible, not the ones hidden beneath it", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Range across a collapsed group"
      defaultGroupBy={[{ columnId: "region" }]}
      selectable={{ rows: "multiple" }}
    />,
  );

  // Collapse East (r2, r4) first, so only West's three rows (r1, r3, r5)
  // remain addressable — West's own header sits between East's header and
  // them.
  await groupHeaders(root).filter({ hasText: "East" }).click();
  const visible = dataRows(root);
  await expect(visible).toHaveCount(3);

  await visible.first().locator("td").first().click();
  await visible
    .last()
    .locator("td")
    .first()
    .click({ modifiers: ["Shift"] });

  await expect(visible.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(visible.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(visible.nth(2)).toHaveAttribute("aria-selected", "true");

  // Re-expanding East does not retroactively select r2/r4: the range was
  // drawn only over what was visible at the time.
  await groupHeaders(root).filter({ hasText: "East" }).click();
  await expect(dataRows(root).filter({ hasText: "r2" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
  await expect(dataRows(root).filter({ hasText: "r4" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
});

test("expandAllGroups/collapseAllGroups drive the whole tree at once", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows()}
      label="Expand/collapse all"
      defaultGroupBy={[{ columnId: "region" }, { columnId: "status" }]}
    />,
  );

  await root.getByRole("button", { name: "report" }).click();
  let status = await readStatus(root);
  // 6 group headers + 5 data rows, fully expanded.
  expect(status.displayRowCount).toBe(11);

  await root.getByRole("button", { name: "collapse-all-groups" }).click();
  await root.getByRole("button", { name: "report" }).click();
  status = await readStatus(root);
  // Collapsing the two top-level groups hides their nested Status headers
  // too, so only the two top-level headers stay addressable.
  expect(status.displayRowCount).toBe(2);

  await root.getByRole("button", { name: "expand-all-groups" }).click();
  await root.getByRole("button", { name: "report" }).click();
  status = await readStatus(root);
  expect(status.groupExpansion).toHaveLength(0);
  expect(status.displayRowCount).toBe(11);
});

test("a column's group toggle adds and removes it from the group-by stack, and the group-by bar reflects it", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Group toggle"
      groupableColumns
    />,
  );

  await expect(root.locator(".gridkit-group-by-bar")).toHaveCount(0);
  await expect(groupHeaders(root)).toHaveCount(0);

  const regionHeader = root.locator("thead th").filter({ hasText: "region" });
  await regionHeader.focus();
  await regionHeader.press("Alt+ArrowDown");

  await expect(groupHeaders(root)).toHaveCount(2);
  const chip = root.locator(".group-by-chip");
  await expect(chip).toHaveCount(1);
  await expect(chip).toContainText("region");

  await chip.locator(".group-by-chip-remove").click();
  await expect(groupHeaders(root)).toHaveCount(0);
  await expect(root.locator(".gridkit-group-by-bar")).toHaveCount(0);
});

test("groupToggleIcon: false hides only that column's icon, without disabling its group toggle", async ({
  mount,
}) => {
  const mixedColumns: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 80 },
    { field: "region", width: 100, groupToggleIcon: false },
    { field: "status", width: 100 },
    { field: "amount", width: 100, type: "number" },
  ];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={mixedColumns}
      dataSource={buildRows()}
      label="Icon visibility"
      groupableColumns
    />,
  );
  const headerLocators = root.locator("thead th");
  const regionHeader = headerLocators.filter({ hasText: "region" });
  await expect(regionHeader.locator(".header-group-toggle")).toHaveCount(0);
  await expect(
    headerLocators
      .filter({ hasText: "status" })
      .locator(".header-group-toggle"),
  ).toHaveCount(1);

  // Alt+ArrowDown still groups the icon-less column.
  await regionHeader.focus();
  await regionHeader.press("Alt+ArrowDown");
  await expect(groupHeaders(root)).toHaveCount(2);
});

test("groupToggleIconColumns={false} hides every column's icon grid-wide, without disabling groupable", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="No icons"
      groupableColumns
      groupToggleIconColumns={false}
    />,
  );
  await expect(root.locator(".header-group-toggle")).toHaveCount(0);

  const regionHeader = root.locator("thead th").filter({ hasText: "region" });
  await regionHeader.focus();
  await regionHeader.press("Alt+ArrowDown");
  await expect(groupHeaders(root)).toHaveCount(2);
});

test('groupByBarVisibility="always" renders the bar even with an empty groupBy', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Always visible bar"
      groupByBarVisibility="always"
    />,
  );
  await expect(root.locator(".gridkit-group-by-bar")).toHaveCount(1);
  await expect(root.locator(".group-by-chip")).toHaveCount(0);
});

test('groupByBarVisibility="never" hides the bar even with a non-empty defaultGroupBy', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Never visible bar"
      defaultGroupBy={[{ columnId: "region" }]}
      groupByBarVisibility="never"
    />,
  );
  await expect(root.locator(".gridkit-group-by-bar")).toHaveCount(0);
  // Grouping itself still applies — only the bar's visibility is off.
  await expect(groupHeaders(root)).toHaveCount(2);
});
