// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition, GroupByEvent } from "@gridkitjs/core";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import RowIdentifiedGrid from "./support/RowIdentifiedGrid";

interface Row {
  id: string;
  region: string;
  status: string;
  amount: number;
}

function buildRows(): Row[] {
  return [
    { id: "r1", region: "West", status: "Open", amount: 10 },
    { id: "r2", region: "East", status: "Open", amount: 20 },
  ];
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "region", width: 100, reorderable: true },
  { field: "status", width: 100, groupByDraggable: true },
  { field: "amount", width: 100, type: "number" },
];

function headers(root: MountResult) {
  return root.locator("thead th");
}

function bar(root: MountResult) {
  return root.locator(".gridkit-group-by-bar");
}

function chips(root: MountResult) {
  return root.locator(".group-by-chip");
}

/**
 * Presses the pointer down on an element's center, without releasing it.
 * For a chip, pass its `.group-by-chip-label` rather than the chip itself —
 * grabbing the chip's own geometric center can land on its remove button,
 * whose `stopPropagation` would swallow the `pointerdown` before the chip's
 * own handler (which starts the drag) ever sees it.
 */
async function dragStart(
  page: Page,
  element: Locator,
): Promise<{ x: number; y: number }> {
  const box = await element.boundingBox();
  if (box === null) {
    throw new Error("element is not visible");
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  return { x, y };
}

test("the bar appears once an eligible header drag crosses the threshold, even with an empty groupBy, and disappears again if the drag is cancelled", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Bar appears on drag"
    />,
  );
  await expect(bar(root)).toHaveCount(0);

  const start = await dragStart(
    page,
    headers(root).filter({ hasText: "status" }),
  );
  await page.mouse.move(start.x + 20, start.y, { steps: 3 });
  await expect(bar(root)).toBeVisible();
  await expect(bar(root)).toHaveClass(/is-drag-target/);

  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(bar(root)).toHaveCount(0);
});

test("a groupByDraggable: false column dragged toward the bar shows no drag-target state", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Not group-draggable"
      groupByBarVisibility="always"
    />,
  );
  const idHeader = headers(root).filter({ hasText: "id" });
  // `id` sets neither `groupByDraggable` nor `reorderable`, so this drag
  // opens no gesture at all — no bar highlight, no reorder.
  const start = await dragStart(page, idHeader);
  await page.mouse.move(start.x + 20, start.y, { steps: 3 });
  await expect(bar(root)).not.toHaveClass(/is-drag-target/);
  await page.mouse.up();
});

test("a reorderable-but-not-group-draggable column dropped on another header still reorders columns, not the grouping", async ({
  mount,
  page,
}) => {
  const events: GroupByEvent[] = [];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Reorder still works"
      onGroupByChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const regionHeader = headers(root).filter({ hasText: "region" });
  const statusBox = await headers(root)
    .filter({ hasText: "status" })
    .boundingBox();
  if (statusBox === null) throw new Error("status header not visible");
  await dragStart(page, regionHeader);
  await page.mouse.move(
    statusBox.x + statusBox.width * 0.75,
    statusBox.y + statusBox.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  expect(events).toHaveLength(0);
  const ids = await headers(root).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gridkit-column")),
  );
  expect(ids.indexOf("status")).toBeLessThan(ids.indexOf("region"));
});

test("dragging a header onto the bar between two existing chips inserts it at that position, not appended", async ({
  mount,
  page,
}) => {
  const events: GroupByEvent[] = [];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Insert at position"
      defaultGroupBy={[{ columnId: "id" }, { columnId: "amount" }]}
      groupByBarVisibility="always"
      onGroupByChange={(event) => {
        events.push(event);
      }}
    />,
  );
  await expect(chips(root)).toHaveCount(2);

  const statusHeader = headers(root).filter({ hasText: "status" });
  await dragStart(page, statusHeader);
  // Within the second chip's near edge, not the empty flex gap ahead of it —
  // nothing sits in the gap itself for `elementFromPoint` to hit-test.
  const amountChipBox = await chips(root).nth(1).boundingBox();
  if (amountChipBox === null) {
    throw new Error("chips not visible");
  }
  await page.mouse.move(
    amountChipBox.x + amountChipBox.width * 0.25,
    amountChipBox.y + amountChipBox.height / 2,
    { steps: 5 },
  );
  await expect(chips(root).nth(1)).toHaveClass(/is-drop-before/);
  await page.mouse.up();

  expect(events).toHaveLength(1);
  expect(events[0]?.groupBy.map((entry) => entry.columnId)).toEqual([
    "id",
    "status",
    "amount",
  ]);
  await expect(chips(root)).toHaveCount(3);
});

test("a groupByDraggable: true, reorderable: false column still opens a drag on pointerdown and drops onto the bar", async ({
  mount,
  page,
}) => {
  const events: GroupByEvent[] = [];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Group-draggable only"
      groupByBarVisibility="always"
      onGroupByChange={(event) => {
        events.push(event);
      }}
    />,
  );
  // `status` sets `groupByDraggable` without `reorderable`.
  const statusHeader = headers(root).filter({ hasText: "status" });
  const start = await dragStart(page, statusHeader);
  await page.mouse.move(start.x, start.y - 60, { steps: 5 });
  const barBox = await bar(root).boundingBox();
  if (barBox === null) throw new Error("bar not visible");
  await page.mouse.move(
    barBox.x + barBox.width / 2,
    barBox.y + barBox.height / 2,
    {
      steps: 5,
    },
  );
  await page.mouse.up();

  expect(events).toHaveLength(1);
  expect(events[0]?.groupBy.map((entry) => entry.columnId)).toEqual(["status"]);
});

test("dragging a chip reorders the stack", async ({ mount, page }) => {
  const events: GroupByEvent[] = [];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Chip reorder"
      defaultGroupBy={[
        { columnId: "id" },
        { columnId: "region" },
        { columnId: "amount" },
      ]}
      groupByBarVisibility="always"
      onGroupByChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const first = chips(root).nth(0);
  const last = chips(root).nth(2);

  const start = await dragStart(page, first.locator(".group-by-chip-label"));
  const lastBox = await last.boundingBox();
  if (lastBox === null) throw new Error("last chip not visible");
  await page.mouse.move(
    lastBox.x + lastBox.width * 0.75,
    lastBox.y + lastBox.height / 2,
    { steps: 5 },
  );
  await expect(last).toHaveClass(/is-drop-after/);
  expect(start).toBeTruthy();
  await page.mouse.up();

  expect(events).toHaveLength(1);
  expect(events[0]?.groupBy.map((entry) => entry.columnId)).toEqual([
    "region",
    "amount",
    "id",
  ]);
});

test("Escape mid-chip-drag cancels: groupBy unchanged, onGroupByChange never called", async ({
  mount,
  page,
}) => {
  const events: GroupByEvent[] = [];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Cancel chip drag"
      defaultGroupBy={[{ columnId: "id" }, { columnId: "region" }]}
      groupByBarVisibility="always"
      onGroupByChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const idsBefore = await chips(root).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gridkit-group-chip")),
  );

  await dragStart(page, chips(root).nth(0).locator(".group-by-chip-label"));
  const secondBox = await chips(root).nth(1).boundingBox();
  if (secondBox === null) throw new Error("second chip not visible");
  await page.mouse.move(
    secondBox.x + secondBox.width / 2,
    secondBox.y + secondBox.height / 2,
    { steps: 5 },
  );

  await page.keyboard.press("Escape");
  await page.mouse.up();

  const idsAfter = await chips(root).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gridkit-group-chip")),
  );
  expect(idsAfter).toEqual(idsBefore);
  expect(events).toHaveLength(0);
});

test("dropping a chip back into the gap it already occupies is a no-op", async ({
  mount,
  page,
}) => {
  const events: GroupByEvent[] = [];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Same gap"
      defaultGroupBy={[{ columnId: "id" }, { columnId: "region" }]}
      groupByBarVisibility="always"
      onGroupByChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const start = await dragStart(
    page,
    chips(root).nth(0).locator(".group-by-chip-label"),
  );
  // Stays inside the first chip's own bounds — never crosses into the second.
  await page.mouse.move(start.x + 4, start.y, { steps: 3 });
  await page.mouse.up();

  expect(events).toHaveLength(0);
});

test("Ctrl+ArrowLeft/Ctrl+ArrowRight on a focused chip reorders via keyboard; boundary chips are no-ops outward", async ({
  mount,
}) => {
  const events: GroupByEvent[] = [];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Keyboard reorder"
      defaultGroupBy={[
        { columnId: "id" },
        { columnId: "region" },
        { columnId: "amount" },
      ]}
      groupByBarVisibility="always"
      onGroupByChange={(event) => {
        events.push(event);
      }}
    />,
  );
  const middle = chips(root).nth(1);
  await middle.focus();
  await middle.press("Control+ArrowLeft");
  expect(events).toHaveLength(1);
  expect(events[0]?.groupBy.map((entry) => entry.columnId)).toEqual([
    "region",
    "id",
    "amount",
  ]);
  events.length = 0;

  await chips(root).nth(0).focus();
  await chips(root).nth(0).press("Control+ArrowLeft");
  expect(events).toHaveLength(0);

  await chips(root).nth(2).focus();
  await chips(root).nth(2).press("Control+ArrowRight");
  expect(events).toHaveLength(0);
});

test("chips and their remove buttons are independent tab stops in plain DOM order, each with its own accessible name", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Chip focus model"
      defaultGroupBy={[{ columnId: "id" }, { columnId: "region" }]}
      groupByBarVisibility="always"
    />,
  );
  const first = chips(root).nth(0);
  await expect(first).toHaveAttribute("tabindex", "0");
  await expect(first).toHaveAttribute("aria-label", "id, level 1 of 2");
  await expect(first).toHaveAttribute(
    "aria-keyshortcuts",
    "Control+ArrowLeft Control+ArrowRight",
  );

  await first.focus();
  await expect(first).toBeFocused();
  await first.press("Tab");
  await expect(first.locator(".group-by-chip-remove")).toBeFocused();
  await first.locator(".group-by-chip-remove").press("Tab");
  await expect(chips(root).nth(1)).toBeFocused();
});
