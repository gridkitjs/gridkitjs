// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition, ColumnResizeEvent } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import ControlledStateGrid from "./support/ControlledStateGrid";
import PointerGestureHarness from "./support/PointerGestureHarness";
import { mountGrid, updateGrid } from "./support/mountGrid";
import { trackWindowKeydownListeners } from "./support/windowKeydownListeners";

interface Row {
  id: string;
  name: string;
  description: string;
}

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
    description: "short",
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 120, minWidth: 60, maxWidth: 200 },
  { field: "description", width: 100 },
];

function headerHandle(root: MountResult, index: number) {
  return root.locator("thead th").nth(index).locator(".header-resize-handle");
}

async function colWidth(root: MountResult, index: number): Promise<number> {
  return root
    .locator("colgroup col")
    .nth(index)
    .evaluate((element) => parseFloat((element as HTMLElement).style.width));
}

/** The `pointerId` Chromium gives the mouse that `page.mouse` drives. */
const MOUSE_POINTER_ID = 1;

/** Presses the pointer down on `handle`'s center, without releasing it. */
async function pointerDragStart(
  page: Page,
  handle: ReturnType<typeof headerHandle>,
): Promise<{ x: number; y: number }> {
  const box = await handle.boundingBox();
  if (box === null) {
    throw new Error("resize handle is not visible");
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  return { x, y };
}

test("dragging a resize handle updates width continuously, with no minimum-distance threshold", async ({
  mount,
  page,
}) => {
  const events: ColumnResizeEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Resize"
      resizableColumns
      resizeMode="fixed"
      onColumnResize={(event) => {
        events.push(event);
      }}
    />,
  );
  const start = await pointerDragStart(page, headerHandle(root, 0));
  await page.mouse.move(start.x + 20, start.y);
  // The events cross the CT bridge after `mouse.move()` has resolved.
  await expect.poll(() => events.length).toBeGreaterThan(0);
  expect(events.every((event) => event.phase === "move")).toBe(true);
  await page.mouse.up();
});

test('releasing the pointer fires one final onColumnResize with phase "end"', async ({
  mount,
  page,
}) => {
  const events: ColumnResizeEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Resize end"
      resizableColumns
      resizeMode="fixed"
      onColumnResize={(event) => {
        events.push(event);
      }}
    />,
  );
  const start = await pointerDragStart(page, headerHandle(root, 0));
  await page.mouse.move(start.x + 30, start.y);
  await page.mouse.up();
  // `onColumnResize` runs in the browser and reaches this spec over the CT
  // bridge, so the "end" event can land after `mouse.up()` has resolved.
  await expect.poll(() => events.at(-1)?.phase).toBe("end");
});

test("a right-button drag on a resize handle does not resize the column", async ({
  mount,
  page,
}) => {
  const events: ColumnResizeEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Resize right button"
      resizableColumns
      reorderableColumns
      resizeMode="fixed"
      onColumnResize={(event) => {
        events.push(event);
      }}
    />,
  );
  const originalWidth = await colWidth(root, 0);
  const box = await headerHandle(root, 0).boundingBox();
  if (box === null) {
    throw new Error("resize handle is not visible");
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(x + 40, y);
  await expect(root.locator("thead th").nth(0)).not.toHaveClass(/is-resizing/);
  await page.mouse.up({ button: "right" });

  expect(await colWidth(root, 0)).toBeCloseTo(originalWidth, 0);
  // A stray event from the drag would still be crossing the CT bridge, so an
  // empty array proves nothing yet. Bridged calls arrive in order: once a
  // keyboard nudge on another column has landed, anything the drag fired
  // would have landed before it.
  const sentinel = root.locator("thead th").nth(2);
  await sentinel.focus();
  await sentinel.press("Alt+ArrowRight");
  await expect.poll(() => events.at(-1)?.columnId).toBe("description");
  expect(events.slice(0, -1)).toEqual([]);
  // Nor did the press reach the header's own drag.
  await expect(root.locator("thead th").nth(0)).not.toHaveClass(/is-dragging/);
});

test("Escape mid-resize restores the width captured at drag-start", async ({
  mount,
  page,
}) => {
  const events: ColumnResizeEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Resize cancel"
      resizableColumns
      resizeMode="fixed"
      onColumnResize={(event) => {
        events.push(event);
      }}
    />,
  );
  const originalWidth = await colWidth(root, 0);
  const start = await pointerDragStart(page, headerHandle(root, 0));
  await page.mouse.move(start.x + 40, start.y);
  expect(await colWidth(root, 0)).not.toBeCloseTo(originalWidth, 0);

  await page.keyboard.press("Escape");

  expect(await colWidth(root, 0)).toBeCloseTo(originalWidth, 0);
  const last = events.at(-1);
  expect(last?.phase).toBe("end");
  expect(last?.width).toBeCloseTo(originalWidth, 0);
});

test("a second pointer neither moves nor ends a resize", async ({
  mount,
  page,
}) => {
  const events: ColumnResizeEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Resize second pointer"
      resizableColumns
      resizeMode="fixed"
      onColumnResize={(event) => {
        events.push(event);
      }}
    />,
  );
  const handle = headerHandle(root, 0);
  const start = await pointerDragStart(page, handle);
  await page.mouse.move(start.x + 20, start.y);
  await expect(root.locator("thead th").nth(0)).toHaveClass(/is-resizing/);
  const dragged = await colWidth(root, 0);

  const secondFinger = {
    pointerType: "touch",
    pointerId: 2,
    isPrimary: false,
    clientX: start.x + 80,
    clientY: start.y,
    bubbles: true,
  };
  await handle.dispatchEvent("pointermove", secondFinger);
  await handle.dispatchEvent("pointerup", secondFinger);
  expect(await colWidth(root, 0)).toBeCloseTo(dragged, 0);
  await expect(root.locator("thead th").nth(0)).toHaveClass(/is-resizing/);

  await page.mouse.move(start.x + 30, start.y);
  await page.mouse.up();
  await expect.poll(() => events.at(-1)?.phase).toBe("end");
  expect(events.filter((event) => event.phase === "end")).toHaveLength(1);
  expect(await colWidth(root, 0)).toBeCloseTo(dragged + 10, 0);
});

test("cancelling one column's drag with Escape does not clobber another column resized by keyboard mid-gesture", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Concurrent"
      resizableColumns
      resizeMode="fixed"
    />,
    { width: 800 },
  );
  const before = await colWidth(root, 1);

  // Start dragging column 0 without releasing.
  const start = await pointerDragStart(page, headerHandle(root, 0));
  await page.mouse.move(start.x + 30, start.y);

  // Nudge column 1 via keyboard while column 0's drag is still open — pointer
  // capture pins the drag to column 0's handle, but it does not hold
  // keyboard focus, so this is a real, reachable interleaving.
  const headerB = root.locator("thead th").nth(1);
  await headerB.focus();
  await headerB.press("Alt+ArrowRight");
  const nudged = await colWidth(root, 1);
  expect(nudged).not.toBeCloseTo(before, 0);

  // Cancel column 0's drag.
  await page.keyboard.press("Escape");

  // Column 1's keyboard-driven width must survive column 0's cancellation.
  expect(await colWidth(root, 1)).toBeCloseTo(nudged, 0);
  await page.mouse.up();
});

test("double-click sizes an over-wide column down to its content", async ({
  mount,
}) => {
  const wideColumns: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 300 },
    { field: "name", width: 120 },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={wideColumns}
      dataSource={buildRows(3)}
      label="Fit content down"
      resizableColumns
      resizeMode="fixed"
    />,
  );
  const before = await colWidth(root, 0);
  await headerHandle(root, 0).dblclick();
  const after = await colWidth(root, 0);
  expect(after).toBeLessThan(before);
  expect(after).toBeGreaterThan(0);
});

test("double-click sizes an under-wide column up to its content, not only down", async ({
  mount,
}) => {
  const rows: Row[] = [
    {
      id: "row-0",
      name: "Row 0",
      description:
        "A description long enough that a 40px column cannot show it in full",
    },
  ];
  const narrowColumns: readonly ColumnDefinition<Row>[] = [
    { field: "description", width: 40 },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={narrowColumns}
      dataSource={rows}
      label="Fit content up"
      resizableColumns
      resizeMode="fixed"
    />,
    { width: 900 },
  );
  const before = await colWidth(root, 0);
  expect(before).toBeCloseTo(40, 0);
  await headerHandle(root, 0).dblclick();
  expect(await colWidth(root, 0)).toBeGreaterThan(before);
});

test("double-click on a column with no rows is a no-op", async ({ mount }) => {
  const events: ColumnResizeEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={[]}
      label="Empty fit"
      resizableColumns
      resizeMode="fixed"
      onColumnResize={(event) => {
        events.push(event);
      }}
    />,
  );
  const before = await colWidth(root, 0);
  await headerHandle(root, 0).dblclick();
  expect(await colWidth(root, 0)).toBeCloseTo(before, 0);
  expect(events).toHaveLength(0);
});

test("Alt+Enter on a focused header sizes the column to its content, the keyboard equivalent of double-clicking the resize handle", async ({
  mount,
}) => {
  const wideColumns: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 300 },
    { field: "name", width: 120 },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={wideColumns}
      dataSource={buildRows(3)}
      label="Fit content via keyboard"
      resizableColumns
      resizeMode="fixed"
    />,
  );
  const before = await colWidth(root, 0);
  const header = root.locator("thead th").first();
  await header.focus();
  await header.press("Alt+Enter");
  const after = await colWidth(root, 0);
  expect(after).toBeLessThan(before);
  expect(after).toBeGreaterThan(0);
});

test("Alt+Enter does nothing on a column that is not resizable", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="No resize via keyboard"
    />,
  );
  const before = await colWidth(root, 0);
  const header = root.locator("thead th").first();
  await header.focus();
  await header.press("Alt+Enter");
  expect(await colWidth(root, 0)).toBeCloseTo(before, 0);
});

test("double-click still measures correctly when the column id needs CSS.escape", async ({
  mount,
}) => {
  const dottedColumns: readonly ColumnDefinition<Row>[] = [
    { field: "name", id: "Row.Name", width: 250 },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={dottedColumns}
      dataSource={buildRows(2)}
      label="Dotted id"
      resizableColumns
      resizeMode="fixed"
    />,
  );
  const before = await colWidth(root, 0);
  await headerHandle(root, 0).dblclick();
  expect(await colWidth(root, 0)).toBeLessThan(before);
});

test("keyboard nudge stays clamped at the column's min and max width", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Clamp"
      resizableColumns
      resizeMode="fixed"
    />,
  );
  // columns[1] ("name") starts at 120, with bounds 60..200.
  const header = root.locator("thead th").nth(1);
  await header.focus();
  for (let i = 0; i < 20; i += 1) {
    await header.press("Alt+ArrowLeft");
  }
  expect(await colWidth(root, 1)).toBeCloseTo(60, 0);

  for (let i = 0; i < 20; i += 1) {
    await header.press("Alt+ArrowRight");
  }
  expect(await colWidth(root, 1)).toBeCloseTo(200, 0);
});

test("resizableColumns={false} renders no resize handle, and Alt+Arrow does nothing at all", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(2)} label="No resize" />,
  );
  await expect(root.locator(".header-resize-handle")).toHaveCount(0);

  const header = root.locator("thead th").first();
  await header.focus();
  await header.press("Alt+ArrowRight");
  // Not even navigation claims it — the tab stop stays put.
  await expect(header).toHaveAttribute("tabindex", "0");
});

test('resizing the container under resizeMode="fit" changes widths without ever calling onColumnResize', async ({
  mount,
}) => {
  const events: ColumnResizeEvent[] = [];
  function grid() {
    return (
      <DataGrid
        columns={columns}
        dataSource={buildRows(2)}
        label="Auto-fit"
        onColumnResize={(event) => {
          events.push(event);
        }}
      />
    );
  }
  const root = await mountGrid(mount, grid(), { width: 500 });
  const before = await colWidth(root, 0);
  await updateGrid(root, grid(), { width: 900 });
  // The container's resize reaches `useElementWidth` through a
  // `ResizeObserver` callback, which fires asynchronously after layout —
  // not synchronously with the prop update — hence the poll.
  await expect.poll(() => colWidth(root, 0)).not.toBeCloseTo(before, 0);
  expect(events).toHaveLength(0);
});

test("the live region announces the new width only once the drag ends, not on every move", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Announce"
      resizableColumns
      resizeMode="fixed"
    />,
  );
  const status = root.locator('[role="status"]');
  await expect(status).toHaveText("");

  const start = await pointerDragStart(page, headerHandle(root, 0));
  await page.mouse.move(start.x + 25, start.y);
  await expect(status).toHaveText("");

  await page.mouse.up();
  await expect(status).toContainText("pixels wide");
});

test("a controlled columnSizing ignores a keyboard nudge until the parent applies the width it asked for", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ControlledStateGrid
      columns={columns}
      dataSource={buildRows(1)}
      label="Controlled sizing"
      resizableColumns
      resizeMode="fixed"
      controlled={{ columnSizing: {} }}
    />,
  );
  const before = await colWidth(root, 0);
  const header = root.locator("thead th").nth(0);

  await header.focus();
  await header.press("Alt+ArrowRight");
  await expect(root.getByTestId("controlled-status")).toContainText(
    '"requestCount":1',
  );
  expect(await colWidth(root, 0)).toBeCloseTo(before, 0);

  await root.getByRole("button", { name: "apply-requests" }).click();
  await expect.poll(async () => colWidth(root, 0)).toBeCloseTo(before + 10, 0);
});

test("aborting a resize's signal cancels it and leaves nothing listening", async ({
  mount,
  page,
}) => {
  const root = await mount(<PointerGestureHarness />);
  const handle = root.locator("#handle");
  const log = root.getByTestId("log");
  const moves = root.getByTestId("moves");
  const start = await pointerDragStart(page, handle);
  await page.mouse.move(start.x + 20, start.y, { steps: 2 });
  await expect(moves).toHaveText("2");

  // Clicked without the mouse, which is still holding the resize.
  await root.getByRole("button", { name: "Abort" }).dispatchEvent("click");
  await expect(log).toHaveText("resize started true; resize cancelled");
  expect(
    await handle.evaluate(
      (element, pointerId) => element.hasPointerCapture(pointerId),
      MOUSE_POINTER_ID,
    ),
  ).toBe(false);

  await page.keyboard.press("Escape");
  await page.mouse.move(start.x + 40, start.y, { steps: 2 });
  await page.mouse.up();
  await expect(log).toHaveText("resize started true; resize cancelled");
  await expect(moves).toHaveText("2");
});

test("a resize given an already-aborted signal does not start", async ({
  mount,
  page,
}) => {
  const root = await mount(<PointerGestureHarness abortedBeforePress />);
  const start = await pointerDragStart(page, root.locator("#handle"));
  await page.mouse.move(start.x + 20, start.y, { steps: 2 });
  await page.mouse.up();

  await expect(root.getByTestId("log")).toHaveText("resize started false");
  await expect(root.getByTestId("moves")).toHaveText("0");
});

test("hiding the column mid-resize ends the resize, and Escape clears the selection", async ({
  mount,
  page,
}) => {
  const grid = (visibility: Record<string, boolean>) => (
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Hidden mid-resize"
      resizableColumns
      resizeMode="fixed"
      selectable={{ columns: "single" }}
      columnVisibility={visibility}
    />
  );
  const root = await mountGrid(mount, grid({}));
  const header = (index: number) => root.locator("thead th").nth(index);
  await header(2).click();
  await expect(header(2)).toHaveAttribute("aria-selected", "true");

  const start = await pointerDragStart(page, headerHandle(root, 1));
  await page.mouse.move(start.x + 20, start.y);
  await expect(header(1)).toHaveClass(/is-resizing/);

  await updateGrid(root, grid({ name: false }));
  await expect(root.locator("thead th")).toHaveCount(2);
  await updateGrid(root, grid({}));
  await expect(root.locator("thead th")).toHaveCount(3);
  await expect(header(1)).not.toHaveClass(/is-resizing/);

  await header(2).focus();
  await page.keyboard.press("Escape");
  await expect(header(2)).toHaveAttribute("aria-selected", "false");
  await page.mouse.up();
});

test("unmounting the grid mid-resize cancels it, leaving nothing listening", async ({
  mount,
  page,
}) => {
  const listening = await trackWindowKeydownListeners(page);
  const events: ColumnResizeEvent[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Unmounted mid-resize"
      resizableColumns
      resizeMode="fixed"
      onColumnResize={(event) => {
        events.push(event);
      }}
    />,
  );
  const originalWidth = await colWidth(root, 0);
  const start = await pointerDragStart(page, headerHandle(root, 0));
  await page.mouse.move(start.x + 20, start.y);
  await expect.poll(() => events.length).toBeGreaterThan(0);

  await root.unmount();
  expect(await listening()).toBe(0);
  await expect.poll(() => events.at(-1)?.phase).toBe("end");
  expect(events.at(-1)?.width).toBeCloseTo(originalWidth, 0);
  const reported = events.length;
  await page.keyboard.press("Escape");
  await page.mouse.up();
  // Anything the press reported would cross the CT bridge after it resolves.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
  expect(events).toHaveLength(reported);
});
