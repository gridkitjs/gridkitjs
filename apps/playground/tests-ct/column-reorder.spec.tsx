// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition, ColumnOrderEvent } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import ControlledStateGrid from "./support/ControlledStateGrid";
import PointerGestureHarness from "./support/PointerGestureHarness";
import { mountGrid, updateGrid } from "./support/mountGrid";
import { trackWindowListeners } from "./support/windowListeners";

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

/** The `pointerId` Chromium gives the mouse that `page.mouse` drives. */
const MOUSE_POINTER_ID = 1;

/**
 * Fires `type` on `target` from a second finger at `point`: a pointer the
 * gesture under way did not start from.
 */
async function secondPointer(
  target: ReturnType<typeof headers>,
  type: "pointermove" | "pointerup",
  point: { x: number; y: number },
): Promise<void> {
  await target.dispatchEvent(type, {
    pointerType: "touch",
    pointerId: 2,
    isPrimary: false,
    clientX: point.x,
    clientY: point.y,
    bubbles: true,
  });
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

test("a drag released back over its own header does not also select it", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Drag is not a click"
      reorderableColumns
      selectable={{ columns: "single" }}
    />,
    { width: 900 },
  );
  const header = headers(root).first();
  const start = await dragStart(page, header);
  await page.mouse.move(start.x + 20, start.y, { steps: 3 });
  await expect(header).toHaveClass(/is-dragging/);
  await page.mouse.move(start.x, start.y, { steps: 3 });
  await page.mouse.up();

  await expect(header).not.toHaveClass(/is-dragging/);
  await expect(header).toHaveAttribute("aria-selected", "false");
});

test("a right-button drag across another header does not reorder the columns", async ({
  mount,
  page,
}) => {
  const events: ColumnOrderEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Right button"
      reorderableColumns
      onColumnOrderChange={(event) => {
        events.push(event);
      }}
    />,
    { width: 900 },
  );
  const box = await headers(root).first().boundingBox();
  const target = await headers(root).nth(2).boundingBox();
  if (box === null || target === null) {
    throw new Error("headers are not visible");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(target.x + target.width * 0.75, target.y + 5, {
    steps: 5,
  });
  await expect(page.locator(".drag-ghost")).toHaveCount(0);
  await expect(headers(root).first()).not.toHaveClass(/is-dragging/);
  await page.mouse.up({ button: "right" });

  expect(await columnIds(root)).toEqual(["id", "name", "status"]);
  expect(events).toEqual([]);
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

/**
 * Drags the first header onto the second, cancels with Escape, and releases
 * over a body cell, so no click lands on a header to end the gesture.
 */
async function cancelDragOffHeader(
  page: Page,
  root: MountResult,
): Promise<void> {
  await dragStart(page, headers(root).first());
  const over = await headers(root).nth(1).boundingBox();
  const cell = await root.locator("tbody td").first().boundingBox();
  if (over === null || cell === null) {
    throw new Error("grid is not visible");
  }
  await page.mouse.move(over.x + over.width / 2, over.y + 5, { steps: 5 });
  await page.keyboard.press("Escape");
  await page.mouse.move(cell.x + cell.width / 2, cell.y + cell.height / 2, {
    steps: 3,
  });
  await page.mouse.up();
}

test("after a drag cancelled with Escape and released off the header, the next click on that header selects it", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Click after cancel"
      reorderableColumns
      selectable={{ columns: "single" }}
    />,
    { width: 900 },
  );
  await cancelDragOffHeader(page, root);

  await headers(root).first().click();
  await expect(headers(root).first()).toHaveAttribute("aria-selected", "true");
});

test("after a drag cancelled with Escape and released off the header, a click on a header that cannot be dragged selects it", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={[
        { field: "id", width: 80 },
        { field: "name", width: 120 },
        { field: "status", width: 100, reorderable: false },
      ]}
      dataSource={buildRows(2)}
      label="Click after cancel, fixed column"
      reorderableColumns
      selectable={{ columns: "single" }}
    />,
    { width: 900 },
  );
  await cancelDragOffHeader(page, root);

  await headers(root).nth(2).click();
  await expect(headers(root).nth(2)).toHaveAttribute("aria-selected", "true");
});

test("a second pointer neither steers nor ends a header drag", async ({
  mount,
  page,
}) => {
  const events: ColumnOrderEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Second pointer"
      reorderableColumns
      onColumnOrderChange={(event) => {
        events.push(event);
      }}
    />,
    { width: 900 },
  );
  const dragged = headers(root).first();
  const start = await dragStart(page, dragged);
  await page.mouse.move(start.x + 20, start.y, { steps: 3 });
  await expect(dragged).toHaveClass(/is-dragging/);

  const last = await headers(root).nth(2).boundingBox();
  if (last === null) throw new Error("header 2 not visible");
  const overLast = { x: last.x + last.width * 0.75, y: last.y + 5 };
  await secondPointer(dragged, "pointermove", overLast);
  await expect(headers(root).nth(2)).not.toHaveClass(/is-drop-after/);

  await secondPointer(dragged, "pointerup", overLast);
  await expect(dragged).toHaveClass(/is-dragging/);
  await expect(page.locator(".drag-ghost")).toBeVisible();

  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await columnIds(root)).toEqual(["id", "name", "status"]);
  expect(events).toEqual([]);
});

test("a cancelled pointer mid-drag ends the drag and leaves the order as it was", async ({
  mount,
  page,
}) => {
  const events: ColumnOrderEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Pointer cancel"
      reorderableColumns
      onColumnOrderChange={(event) => {
        events.push(event);
      }}
    />,
    { width: 900 },
  );
  const dragged = headers(root).first();
  await dragStart(page, dragged);
  const last = await headers(root).nth(2).boundingBox();
  if (last === null) throw new Error("header 2 not visible");
  await page.mouse.move(last.x + last.width * 0.75, last.y + 5, { steps: 5 });
  await expect(headers(root).nth(2)).toHaveClass(/is-drop-after/);

  await dragged.dispatchEvent("pointercancel", {
    pointerId: MOUSE_POINTER_ID,
    isPrimary: true,
    bubbles: true,
  });
  await expect(page.locator(".drag-ghost")).toHaveCount(0);
  await expect(dragged).not.toHaveClass(/is-dragging/);
  await expect(headers(root).nth(2)).not.toHaveClass(/is-drop-after/);

  await page.mouse.up();
  expect(await columnIds(root)).toEqual(["id", "name", "status"]);
  expect(events).toEqual([]);
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

test("aborting a drag's signal ends it and leaves nothing listening", async ({
  mount,
  page,
}) => {
  const root = await mount(<PointerGestureHarness />);
  const grab = root.locator("#grab");
  const log = root.getByTestId("log");
  const moves = root.getByTestId("moves");
  const start = await dragStart(page, grab);
  await page.mouse.move(start.x + 20, start.y, { steps: 2 });
  await expect(moves).toHaveText("2");

  // Clicked without the mouse, which is still holding the drag.
  await root.getByRole("button", { name: "Abort" }).dispatchEvent("click");
  await expect(log).toHaveText("drag started true; drag ended");
  expect(
    await grab.evaluate(
      (element, pointerId) => element.hasPointerCapture(pointerId),
      MOUSE_POINTER_ID,
    ),
  ).toBe(false);

  await page.keyboard.press("Escape");
  await page.mouse.move(start.x + 40, start.y, { steps: 2 });
  await page.mouse.up();
  await expect(log).toHaveText("drag started true; drag ended");
  await expect(moves).toHaveText("2");
});

test("a drag given an already-aborted signal does not start", async ({
  mount,
  page,
}) => {
  const root = await mount(<PointerGestureHarness abortedBeforePress />);
  const grab = root.locator("#grab");
  const start = await dragStart(page, grab);
  await page.mouse.move(start.x + 20, start.y, { steps: 2 });
  await page.mouse.up();

  await expect(root.getByTestId("log")).toHaveText("drag started false");
  await expect(root.getByTestId("moves")).toHaveText("0");
});

test("hiding the dragged column mid-drag ends the drag: no ghost, the group-by bar back to hidden, and Escape clears the selection", async ({
  mount,
  page,
}) => {
  const groupable: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 80 },
    { field: "name", width: 120, groupByDraggable: true },
    { field: "status", width: 100 },
  ];
  const grid = (visibility: Record<string, boolean>) => (
    <DataGrid
      columns={groupable}
      dataSource={buildRows(2)}
      label="Hidden mid-drag"
      reorderableColumns
      selectable={{ columns: "single" }}
      columnVisibility={visibility}
    />
  );
  const root = await mountGrid(mount, grid({}), { width: 900 });
  const bar = root.locator(".gridkit-group-by-bar");
  await headers(root).nth(2).click();
  await expect(headers(root).nth(2)).toHaveAttribute("aria-selected", "true");

  const start = await dragStart(page, headers(root).nth(1));
  await page.mouse.move(start.x + 20, start.y, { steps: 3 });
  await expect(bar).toBeVisible();

  await updateGrid(root, grid({ name: false }), { width: 900 });
  await expect(headers(root)).toHaveCount(2);
  await updateGrid(root, grid({}), { width: 900 });
  await expect(headers(root)).toHaveCount(3);

  await expect(page.locator(".drag-ghost")).toHaveCount(0);
  await expect(headers(root).nth(1)).not.toHaveClass(/is-dragging/);
  await expect(bar).toHaveCount(0);

  await headers(root).nth(2).focus();
  await page.keyboard.press("Escape");
  await expect(headers(root).nth(2)).toHaveAttribute("aria-selected", "false");
  await page.mouse.up();
});

test("unmounting the grid mid-drag leaves nothing listening on window", async ({
  mount,
  page,
}) => {
  const listening = await trackWindowListeners(page, ["keydown"]);
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Unmounted mid-drag"
      reorderableColumns
    />,
    { width: 900 },
  );
  const start = await dragStart(page, headers(root).first());
  await page.mouse.move(start.x + 20, start.y, { steps: 3 });
  await expect(page.locator(".drag-ghost")).toBeVisible();

  await root.unmount();
  expect(await listening()).toBe(0);
  await page.mouse.up();
});
