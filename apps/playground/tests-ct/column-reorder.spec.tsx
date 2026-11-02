// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition, ColumnOrderEvent } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import ControlledStateGrid from "./support/ControlledStateGrid";
import { mountGrid } from "./support/mountGrid";

interface Row {
  id: string;
  name: string;
  status: string;
}

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
    status: "ok",
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 120 },
  { field: "status", width: 100 },
];

function headers(root: MountResult) {
  return root.locator("thead th");
}

async function columnIds(root: MountResult): Promise<(string | null)[]> {
  return headers(root).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gridkit-column")),
  );
}

/** Presses the pointer down on a header's center, without releasing it. */
async function dragStart(
  page: Page,
  header: ReturnType<typeof headers>,
): Promise<{ x: number; y: number }> {
  const box = await header.boundingBox();
  if (box === null) {
    throw new Error("header is not visible");
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  return { x, y };
}

test("a pointer move under the 4px threshold stays a click, not a drag", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Threshold"
      reorderableColumns
      selectable={{ columns: "single" }}
    />,
    { width: 900 },
  );
  const header = headers(root).first();
  const start = await dragStart(page, header);
  await page.mouse.move(start.x + 2, start.y); // under the 4px threshold
  await page.mouse.up();
  await expect(header).toHaveAttribute("aria-selected", "true");
});

test("crossing the drag threshold shows a ghost portalled to document.body, not inside the table", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Ghost"
      reorderableColumns
    />,
    { width: 900 },
  );
  const start = await dragStart(page, headers(root).first());
  await page.mouse.move(start.x + 20, start.y, { steps: 3 });

  const ghost = page.locator(".drag-ghost");
  await expect(ghost).toBeVisible();
  expect(
    await ghost.evaluate((element) => element.closest("table") !== null),
  ).toBe(false);

  await page.keyboard.press("Escape");
  await page.mouse.up();
});

test("dragging over a column's first half marks it drop-before; the last column's second half marks drop-after", async ({
  mount,
  page,
}) => {
  // A 4th column, so dragging column 0 onto column 2 is a genuine move —
  // column 0 is already immediately before column 1, and dropping it there
  // is correctly a no-op (see the dedicated test for that), which would
  // make column 1 the wrong target to assert a drop indicator against here.
  const fourColumns: readonly ColumnDefinition<Row>[] = [
    ...columns,
    { field: "id", id: "id2", width: 80 },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={fourColumns}
      dataSource={buildRows(2)}
      label="Drop zones"
      reorderableColumns
    />,
    { width: 900 },
  );
  const headerLocators = headers(root);
  await dragStart(page, headerLocators.nth(0));

  const box2 = await headerLocators.nth(2).boundingBox();
  if (box2 === null) throw new Error("header 2 not visible");
  await page.mouse.move(box2.x + box2.width * 0.25, box2.y + box2.height / 2, {
    steps: 5,
  });
  await expect(headerLocators.nth(2)).toHaveClass(/is-drop-before/);
  await expect(headerLocators.nth(3)).not.toHaveClass(/is-drop-after/);

  const box3 = await headerLocators.nth(3).boundingBox();
  if (box3 === null) throw new Error("header 3 not visible");
  await page.mouse.move(box3.x + box3.width * 0.75, box3.y + box3.height / 2, {
    steps: 5,
  });
  await expect(headerLocators.nth(3)).toHaveClass(/is-drop-after/);
  await expect(headerLocators.nth(2)).not.toHaveClass(/is-drop-before/);

  await page.keyboard.press("Escape");
  await page.mouse.up();
});

test("Escape mid-drag cancels: order unchanged, onColumnOrderChange never called", async ({
  mount,
  page,
}) => {
  const events: ColumnOrderEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Cancel"
      reorderableColumns
      onColumnOrderChange={(event) => {
        events.push(event);
      }}
    />,
    { width: 900 },
  );
  const idsBefore = await columnIds(root);
  const start = await dragStart(page, headers(root).nth(0));
  const box1 = await headers(root).nth(1).boundingBox();
  if (box1 === null) throw new Error("header 1 not visible");
  await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, {
    steps: 5,
  });
  expect(start).toBeTruthy();

  await page.keyboard.press("Escape");
  await page.mouse.up();

  expect(await columnIds(root)).toEqual(idsBefore);
  expect(events).toHaveLength(0);
  await expect(root.locator(".drag-ghost")).toHaveCount(0);
});

test("dropping a column back into the gap it already occupies is a no-op", async ({
  mount,
  page,
}) => {
  const events: ColumnOrderEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Same gap"
      reorderableColumns
      onColumnOrderChange={(event) => {
        events.push(event);
      }}
    />,
    { width: 900 },
  );
  const idsBefore = await columnIds(root);
  const start = await dragStart(page, headers(root).nth(0));
  // Stays inside column 0's own header — never crosses into a neighbor.
  await page.mouse.move(start.x + 10, start.y, { steps: 3 });
  await page.mouse.up();

  expect(await columnIds(root)).toEqual(idsBefore);
  expect(events).toHaveLength(0);
});

test("a real drop calls onColumnOrderChange, announces the new position, and keeps the tab stop on the moved column", async ({
  mount,
  page,
}) => {
  const events: ColumnOrderEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Real drop"
      reorderableColumns
      onColumnOrderChange={(event) => {
        events.push(event);
      }}
    />,
    { width: 900 },
  );
  const headerLocators = headers(root);
  const movedId = await headerLocators
    .nth(0)
    .getAttribute("data-gridkit-column");

  await dragStart(page, headerLocators.nth(0));
  const box2 = await headerLocators.nth(2).boundingBox();
  if (box2 === null) throw new Error("header 2 not visible");
  // The trailing half of the last column: drop after everything.
  await page.mouse.move(box2.x + box2.width * 0.75, box2.y + box2.height / 2, {
    steps: 5,
  });
  await page.mouse.up();

  expect(events).toHaveLength(1);
  expect(events[0]?.columnId).toBe(movedId);

  const idsAfter = await columnIds(root);
  expect(idsAfter.at(-1)).toBe(movedId);
  expect(events[0]?.order).toEqual(idsAfter);

  await expect(root.locator('[role="status"]')).toContainText(
    `column ${String(idsAfter.length)} of ${String(idsAfter.length)}`,
  );
  // The single tab stop travelled with the moved header to its new position.
  await expect(headerLocators.last()).toHaveAttribute("tabindex", "0");
});

test("Ctrl+Arrow moves a middle column one place; the first column leftward and the last rightward are no-ops", async ({
  mount,
}) => {
  const events: ColumnOrderEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Keyboard reorder"
      reorderableColumns
      onColumnOrderChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const headerLocators = headers(root);

  await headerLocators.nth(1).focus();
  await headerLocators.nth(1).press("Control+ArrowRight");
  expect(events).toHaveLength(1);
  events.length = 0;

  await headerLocators.nth(0).focus();
  await headerLocators.nth(0).press("Control+ArrowLeft");
  expect(events).toHaveLength(0);

  await headerLocators.nth(2).focus();
  await headerLocators.nth(2).press("Control+ArrowRight");
  expect(events).toHaveLength(0);
});

test("a column with reorderable: false does nothing on Ctrl+Arrow, not even move focus, even with reorderableColumns on", async ({
  mount,
}) => {
  const mixedColumns: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 80 },
    { field: "name", width: 120, reorderable: false },
    { field: "status", width: 100 },
  ];
  const events: ColumnOrderEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={mixedColumns}
      dataSource={buildRows(2)}
      label="Locked column"
      reorderableColumns
      onColumnOrderChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const header = headers(root).nth(1);
  await header.focus();
  await header.press("Control+ArrowRight");
  expect(events).toHaveLength(0);
  await expect(header).toHaveAttribute("tabindex", "0");
});

test("Ctrl+Arrow moves past a hidden column in one press, and the hidden column keeps its slot", async ({
  mount,
}) => {
  const events: ColumnOrderEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Reorder around hidden"
      reorderableColumns
      defaultColumnVisibility={{ name: false }}
      onColumnOrderChange={(event) => {
        events.push(event);
      }}
    />,
  );

  expect(await columnIds(root)).toEqual(["id", "status"]);
  const status = headers(root).nth(1);
  await status.focus();
  await status.press("Control+ArrowLeft");

  expect(await columnIds(root)).toEqual(["status", "id"]);
  expect(events.at(-1)?.order).toEqual(["status", "id", "name"]);
  await expect(headers(root).nth(0)).toHaveAttribute("tabindex", "0");
  await expect(root.locator('[role="status"]')).toHaveText(
    "status, column 1 of 2",
  );
});

test("a controlled columnOrder ignores a keyboard move until the parent applies the order it asked for", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ControlledStateGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Controlled order"
      reorderableColumns
      controlled={{ columnOrder: [] }}
    />,
  );
  const headerLocators = headers(root);

  await headerLocators.nth(1).focus();
  await headerLocators.nth(1).press("Control+ArrowRight");
  await expect(root.getByTestId("controlled-status")).toContainText(
    '"columnOrder":["id","status","name"]',
  );
  expect(await columnIds(root)).toEqual(["id", "name", "status"]);

  await root.getByRole("button", { name: "apply-requests" }).click();
  await expect(headerLocators.nth(2)).toHaveAttribute(
    "data-gridkit-column",
    "name",
  );
  expect(await columnIds(root)).toEqual(["id", "status", "name"]);
});

test("a controlled columnOrder is shown as given", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Given order"
      columnOrder={["status", "id"]}
    />,
  );

  expect(await columnIds(root)).toEqual(["status", "id", "name"]);
});
