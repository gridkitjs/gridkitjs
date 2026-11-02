// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition, ColumnSortEvent } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import RowIdentifiedGrid from "./support/RowIdentifiedGrid";

interface Row {
  id: string;
  name: string;
  score: number;
}

function buildRows(): Row[] {
  return [
    { id: "row-c", name: "Charlie", score: 30 },
    { id: "row-a", name: "Alice", score: 9 },
    { id: "row-b", name: "Bravo", score: 21 },
  ];
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 100 },
  { field: "name", width: 120 },
  { field: "score", width: 100, type: "number" },
];

function headers(root: MountResult) {
  return root.locator("thead th");
}

function toggle(header: ReturnType<typeof headers>) {
  return header.locator(".header-sort-toggle");
}

async function names(root: MountResult): Promise<string[]> {
  return root
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => row.querySelectorAll("td")[1]?.textContent ?? ""),
    );
}

test("a click cycles a column: unsorted -> ascending -> descending -> cleared", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Cycle"
      sortableColumns
    />,
  );
  const header = headers(root).nth(1);

  await toggle(header).click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  expect(await names(root)).toEqual(["Alice", "Bravo", "Charlie"]);

  await toggle(header).click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  expect(await names(root)).toEqual(["Charlie", "Bravo", "Alice"]);

  await toggle(header).click();
  await expect(header).not.toHaveAttribute("aria-sort");
  expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
});

test("a plain click on a different column replaces the sort; Shift-click stacks instead", async ({
  mount,
}) => {
  const events: ColumnSortEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Replace vs stack"
      sortableColumns
      onColumnSortChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const headerLocators = headers(root);

  await toggle(headerLocators.nth(0)).click();
  expect(events.at(-1)?.sort).toHaveLength(1);

  // A plain click on a different column drops the first entirely.
  await toggle(headerLocators.nth(1)).click();
  expect(events.at(-1)?.sort).toEqual([{ columnId: "name", direction: "asc" }]);
  await expect(headerLocators.nth(0)).not.toHaveAttribute("aria-sort");

  // A Shift-click on a third column stacks it after, without touching name.
  await toggle(headerLocators.nth(2)).click({ modifiers: ["Shift"] });
  expect(events.at(-1)?.sort).toEqual([
    { columnId: "name", direction: "asc" },
    { columnId: "score", direction: "asc" },
  ]);
  await expect(headerLocators.nth(1)).toHaveAttribute("aria-sort", "ascending");
  await expect(headerLocators.nth(2)).toHaveAttribute("aria-sort", "ascending");
});

test("Shift-click cycles a stacked column's own direction in place, and clearing it closes the gap", async ({
  mount,
}) => {
  const events: ColumnSortEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Stack cycle"
      sortableColumns
      onColumnSortChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const headerLocators = headers(root);
  await toggle(headerLocators.nth(0)).click();
  await toggle(headerLocators.nth(1)).click({ modifiers: ["Shift"] });
  expect(events.at(-1)?.sort).toEqual([
    { columnId: "id", direction: "asc" },
    { columnId: "name", direction: "asc" },
  ]);

  // Cycling the primary key in place must not move it or touch the second.
  await toggle(headerLocators.nth(0)).click({ modifiers: ["Shift"] });
  expect(events.at(-1)?.sort).toEqual([
    { columnId: "id", direction: "desc" },
    { columnId: "name", direction: "asc" },
  ]);

  // Cycling id through desc -> none removes only id, keeping name in place.
  await toggle(headerLocators.nth(0)).click({ modifiers: ["Shift"] });
  expect(events.at(-1)?.sort).toEqual([{ columnId: "name", direction: "asc" }]);
  await expect(headerLocators.nth(0)).not.toHaveAttribute("aria-sort");
});

test("a priority badge shows only once two or more columns are stacked", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Priority"
      sortableColumns
    />,
  );
  const headerLocators = headers(root);

  await toggle(headerLocators.nth(0)).click();
  await expect(
    toggle(headerLocators.nth(0)).locator(".header-sort-priority"),
  ).toHaveCount(0);

  await toggle(headerLocators.nth(1)).click({ modifiers: ["Shift"] });
  await expect(
    toggle(headerLocators.nth(1)).locator(".header-sort-priority"),
  ).toHaveText("2");
  await expect(
    toggle(headerLocators.nth(0)).locator(".header-sort-priority"),
  ).toHaveCount(0);
});

test("every toggle state renders an svg glyph", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Glyph"
      sortableColumns
    />,
  );
  const header = headers(root).nth(0);

  await expect(toggle(header).locator("svg")).toHaveCount(1);
  await toggle(header).click();
  await expect(toggle(header)).toHaveClass(/is-sorted-asc/);
  await expect(toggle(header).locator("svg")).toHaveCount(1);
  await toggle(header).click();
  await expect(toggle(header)).toHaveClass(/is-sorted-desc/);
  await expect(toggle(header).locator("svg")).toHaveCount(1);
});

test("Alt+ArrowUp toggles like a click, and Alt+Shift+ArrowUp stacks like a Shift-click", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Keyboard"
      sortableColumns
    />,
  );
  const headerLocators = headers(root);

  await headerLocators.nth(0).focus();
  await headerLocators.nth(0).press("Alt+ArrowUp");
  await expect(headerLocators.nth(0)).toHaveAttribute("aria-sort", "ascending");

  await headerLocators.nth(1).focus();
  await headerLocators.nth(1).press("Alt+Shift+ArrowUp");
  await expect(headerLocators.nth(0)).toHaveAttribute("aria-sort", "ascending");
  await expect(headerLocators.nth(1)).toHaveAttribute("aria-sort", "ascending");
  await expect(
    toggle(headerLocators.nth(1)).locator(".header-sort-priority"),
  ).toHaveText("2");
});

test("the single tab stop survives a sort and stays in bounds", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Focus survives"
      sortableColumns
    />,
  );
  const header = headers(root).nth(1);
  await header.focus();
  await header.press("Alt+ArrowUp");

  await expect(root.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(root.locator('[tabindex="0"]')).toBeVisible();
});

test("the live region announces a sort, a stack, and a clear", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Announce"
      sortableColumns
    />,
  );
  const headerLocators = headers(root);
  const status = root.locator('[role="status"]');

  await toggle(headerLocators.nth(0)).click();
  await expect(status).toContainText("sorted ascending");

  await toggle(headerLocators.nth(1)).click({ modifiers: ["Shift"] });
  await expect(status).toContainText("key 2 of 2");

  await toggle(headerLocators.nth(0)).click({ modifiers: ["Shift"] });
  await toggle(headerLocators.nth(0)).click({ modifiers: ["Shift"] });
  await expect(status).toContainText("sort cleared");
});

test("sortableColumns is off by default: no toggle renders, and Alt+ArrowUp does nothing", async ({
  mount,
}) => {
  const events: ColumnSortEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Off by default"
      onColumnSortChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const header = headers(root).nth(0);

  await expect(toggle(header)).toHaveCount(0);
  await header.focus();
  await header.press("Alt+ArrowUp");
  expect(events).toHaveLength(0);
  await expect(header).toHaveAttribute("tabindex", "0");
});

test("a column's own sortable overrides the grid-level default, in both directions", async ({
  mount,
}) => {
  const mixedColumns: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 100, sortable: false },
    { field: "name", width: 120, sortable: true },
    { field: "score", width: 100, type: "number" },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={mixedColumns}
      dataSource={buildRows()}
      label="Per-column override"
      sortableColumns={false}
    />,
  );
  const headerLocators = headers(root);

  // Off by the grid default, and this column opts out.
  await expect(toggle(headerLocators.nth(0))).toHaveCount(0);
  // Off by the grid default, but this column opts in.
  await expect(toggle(headerLocators.nth(1))).toHaveCount(1);
  // Off by the grid default and unset on the column.
  await expect(toggle(headerLocators.nth(2))).toHaveCount(0);
});

test("sorts through a dotted field path", async ({ mount }) => {
  interface NestedRow {
    id: string;
    application: { name: string };
  }
  const nestedColumns: readonly ColumnDefinition<NestedRow>[] = [
    { field: "id", width: 80 },
    { field: "application.name", width: 140 },
  ];
  const rows: NestedRow[] = [
    { id: "row-1", application: { name: "Beta" } },
    { id: "row-2", application: { name: "Alpha" } },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={nestedColumns}
      dataSource={rows}
      label="Dotted path"
      sortableColumns
    />,
  );
  const header = headers(root).nth(1);
  await toggle(header).click();

  const values = await root
    .locator("tbody tr")
    .evaluateAll((trs) =>
      trs.map((tr) => tr.querySelectorAll("td")[1]?.textContent ?? ""),
    );
  expect(values).toEqual(["Alpha", "Beta"]);
});

test("clicking the sort toggle on a grid that is also reorderableColumns sorts rather than starting a drag", async ({
  mount,
}) => {
  // A pointerdown on the toggle must not bubble to the header's own
  // reorder-drag start — that gesture calls setPointerCapture, which would
  // otherwise redirect the click that follows to the header itself instead
  // of the toggle, so the click is read as nothing rather than a sort.
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Sortable and reorderable"
      sortableColumns
      reorderableColumns
    />,
  );
  const header = headers(root).nth(1);

  await toggle(header).click();

  await expect(header).toHaveAttribute("aria-sort", "ascending");
  expect(await names(root)).toEqual(["Alice", "Bravo", "Charlie"]);
});

test("row selection is preserved by identity across a sort that moves rows to new positions", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Selection survives"
      sortableColumns
      selectable={{ rows: "multiple" }}
    />,
  );
  // Charlie starts first; select it, then sort by name so it moves last.
  const charlieRow = root.locator("tbody tr", { hasText: "Charlie" });
  await charlieRow.locator("td").first().click();
  await expect(charlieRow).toHaveAttribute("aria-selected", "true");

  await toggle(headers(root).nth(1)).click();

  expect(await names(root)).toEqual(["Alice", "Bravo", "Charlie"]);
  await expect(
    root.locator("tbody tr", { hasText: "Charlie" }),
  ).toHaveAttribute("aria-selected", "true");
});
