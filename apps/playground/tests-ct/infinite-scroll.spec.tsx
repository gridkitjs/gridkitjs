// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import InfiniteScrollGrid from "./support/InfiniteScrollGrid";
import InfiniteScrollHarness from "./support/InfiniteScrollHarness";

interface Row {
  id: string;
  name: string;
}

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 160 },
];

function gridBody(root: MountResult) {
  return root.locator(".gridkit-data-grid-body");
}

function scrollToBottom(body: ReturnType<typeof gridBody>): Promise<void> {
  return body.evaluate((element: HTMLElement) => {
    element.scrollTop = element.scrollHeight;
  });
}

/**
 * Waits out two rendering steps, after which an `IntersectionObserver` has
 * reported what the last change of layout did to its target.
 */
function afterNextFrames(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve);
          });
        });
      }),
  );
}

test.describe("infinite scroll", () => {
  test("scrolling near the bottom triggers onLoadMore; it is not called again while isLoadingMore is true", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <InfiniteScrollGrid
        columns={columns}
        allRows={buildRows(60)}
        chunkSize={20}
        delay={300}
        rootMargin="0px"
        label="Infinite scroll guard"
        height={150}
      />,
    );

    const loadCount = root.getByTestId("load-count");
    await expect(loadCount).toHaveText("0");

    const body = gridBody(root);
    await scrollToBottom(body);

    // Nudged again while the first load is still in flight — if the guard
    // didn't hold, a second intersection event here would fire a duplicate
    // `onLoadMore` before the first one even resolves.
    await body.evaluate((element: HTMLElement) => {
      element.scrollTop = element.scrollHeight - 1;
    });
    await scrollToBottom(body);

    await expect(loadCount).toHaveText("0");
    await expect
      .poll(() => loadCount.textContent(), { timeout: 5000 })
      .toBe("1");
  });

  test("once a load completes, an already-visible sentinel fires the next onLoadMore on its own, until hasMore turns false", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <InfiniteScrollGrid
        columns={columns}
        allRows={buildRows(60)}
        chunkSize={20}
        delay={20}
        // Larger than the total scroll height this dataset will ever reach,
        // so the sentinel is "intersecting" from the moment it first mounts
        // — no scroll is needed to see the guard reset itself after each
        // load and immediately re-fire, right up until `hasMore` is false.
        rootMargin="5000px"
        label="Infinite scroll cascade"
        height={150}
      />,
    );

    const loadCount = root.getByTestId("load-count");
    await expect
      .poll(() => loadCount.textContent(), { timeout: 5000 })
      .toBe("2");

    // hasMore is now false (60 of 60 loaded) — the sentinel is gone, so
    // nothing further can fire even though the guard would otherwise allow
    // another attempt once loading settles.
    await expect(root.locator(".grid-sentinel-row")).toHaveCount(0);
    await page.waitForTimeout(100);
    await expect(loadCount).toHaveText("2");
  });

  test("a load that finishes before isLoadingMore ever renders true still lets the next approach load", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <InfiniteScrollGrid
        columns={columns}
        allRows={buildRows(60)}
        chunkSize={20}
        instantLoads
        rootMargin="0px"
        label="Infinite scroll instant loads"
        height={150}
      />,
    );

    const loadCount = root.getByTestId("load-count");
    const body = gridBody(root);
    await scrollToBottom(body);
    await expect(loadCount).toHaveText("1");
    await expect(root.locator("tbody tr[data-gridkit-row-index]")).toHaveCount(
      40,
    );
    // The appended rows push the sentinel out of view; the observer sees it
    // leave before the next scroll brings it back.
    await afterNextFrames(page);

    await scrollToBottom(body);
    await expect(loadCount).toHaveText("2");
  });

  test("loads that finish within one render keep coming while the sentinel stays in range", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <InfiniteScrollGrid
        columns={columns}
        allRows={buildRows(60)}
        chunkSize={20}
        instantLoads
        // Past the bottom of all 60 rows, so no load takes the sentinel out
        // of range.
        rootMargin="5000px"
        label="Infinite scroll instant cascade"
        height={150}
      />,
    );

    const loadCount = root.getByTestId("load-count");
    await expect(loadCount).toHaveText("2");
    await expect(root.locator(".grid-sentinel-row")).toHaveCount(0);
    await afterNextFrames(page);
    await expect(loadCount).toHaveText("2");
  });

  test("hasMore turning true again for a new dataset loads again while the sentinel is near", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <InfiniteScrollGrid
        columns={columns}
        allRows={buildRows(40)}
        chunkSize={20}
        instantLoads
        rootMargin="0px"
        label="Infinite scroll new dataset"
        height={150}
      />,
    );

    const loadCount = root.getByTestId("load-count");
    await scrollToBottom(gridBody(root));
    await expect(loadCount).toHaveText("1");
    await expect(root.locator(".grid-sentinel-row")).toHaveCount(0);

    // Back to 20 rows: the body's scroll clamps to its new bottom, where the
    // sentinel sits in view.
    await root.getByRole("button", { name: "Start over" }).click();
    await expect(loadCount).toHaveText("2");
  });

  test("hasMore: false renders no sentinel and makes no further onLoadMore calls", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <InfiniteScrollGrid
        columns={columns}
        allRows={buildRows(20)}
        chunkSize={20}
        rootMargin="0px"
        label="Infinite scroll exhausted"
        height={150}
      />,
    );

    await expect(root.locator(".grid-sentinel-row")).toHaveCount(0);

    const body = gridBody(root);
    await scrollToBottom(body);
    await body.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    await scrollToBottom(body);

    await expect(root.getByTestId("load-count")).toHaveText("0");
  });

  test("the sentinel and loading row are excluded from aria-rowcount and keyboard navigation's row count", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <InfiniteScrollGrid
        columns={columns}
        allRows={buildRows(10)}
        chunkSize={5}
        // The load this test triggers never finishes, so the loading row is
        // still mounted for every assertion below, however slow the run.
        holdLoads
        rootMargin="0px"
        label="Infinite scroll nav"
        height={150}
      />,
    );

    await expect(root.getByRole("grid")).toHaveAttribute("aria-rowcount", "6");

    await scrollToBottom(gridBody(root));

    // The loading row is mounted while that scroll's load is in flight...
    await expect(root.locator(".grid-loading-row")).toBeVisible();
    // ...yet aria-rowcount still reports only the five real data rows.
    await expect(root.getByRole("grid")).toHaveAttribute("aria-rowcount", "6");

    const activeCell = () => root.locator('[tabindex="0"]');
    async function focusedRowIndex(): Promise<string | null> {
      return activeCell().evaluate(
        (cell) =>
          cell.closest("tr")?.getAttribute("data-gridkit-row-index") ?? null,
      );
    }

    await activeCell().press("ArrowDown"); // header -> row 0
    for (let index = 0; index < 4; index++) {
      await activeCell().press("ArrowDown");
    }
    expect(await focusedRowIndex()).toBe("4");

    // One more ArrowDown has nowhere further to go: the sentinel and loading
    // row aren't part of `rowCount`, so focus stays exactly where it was
    // rather than landing on either of them.
    await activeCell().press("ArrowDown");
    expect(await focusedRowIndex()).toBe("4");
  });

  test("setting both paginated and infiniteScroll logs a dev-mode warning", async ({
    mount,
    page,
  }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        warnings.push(message.text());
      }
    });

    await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={buildRows(10)}
        label="Paginated plus infinite scroll"
        paginated
        infiniteScroll={{ hasMore: true, onLoadMore: () => undefined }}
      />,
    );

    await expect
      .poll(() =>
        warnings.some((warning) => warning.includes("mutually exclusive")),
      )
      .toBe(true);
  });

  test.describe("combined with virtualized", () => {
    test("scrolling to the bottom still triggers a load, positioned after the trailing spacer", async ({
      mount,
    }) => {
      const root = await mountGrid(
        mount,
        <InfiniteScrollGrid
          columns={columns}
          allRows={buildRows(300)}
          chunkSize={100}
          delay={20}
          rootMargin="0px"
          label="Infinite scroll virtualized scroll"
          height={200}
          virtualized
        />,
      );

      const loadCount = root.getByTestId("load-count");
      await expect(loadCount).toHaveText("0");

      await scrollToBottom(gridBody(root));

      await expect
        .poll(() => loadCount.textContent(), { timeout: 5000 })
        .toBe("1");
    });

    test("the cascade still runs to completion, and virtualization keeps the mounted row count small throughout", async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(
        mount,
        <InfiniteScrollGrid
          columns={columns}
          allRows={buildRows(300)}
          chunkSize={100}
          delay={20}
          rootMargin="10000px"
          label="Infinite scroll virtualized cascade"
          height={200}
          virtualized
        />,
      );

      const loadCount = root.getByTestId("load-count");
      await expect
        .poll(() => loadCount.textContent(), { timeout: 5000 })
        .toBe("2");
      await expect(root.locator(".grid-sentinel-row")).toHaveCount(0);
      await page.waitForTimeout(100);
      await expect(loadCount).toHaveText("2");

      const mountedRows = root.locator("tbody tr[data-gridkit-row-index]");
      expect(await mountedRows.count()).toBeLessThan(60);
    });
  });
});

test.describe("attachInfiniteScroll", () => {
  test("an update that turns hasMore on loads while the sentinel is in view", async ({
    mount,
  }) => {
    const root = await mount(<InfiniteScrollHarness />);
    await root.getByRole("button", { name: "Has more" }).click();

    await expect(root.getByTestId("load-count")).toHaveText("1");
  });

  test("a load answered without isLoadingMore that leaves the sentinel in view loads again", async ({
    mount,
    page,
  }) => {
    const root = await mount(<InfiniteScrollHarness appendOnLoad />);
    await root.getByRole("button", { name: "Has more" }).click();

    // Each load moves the sentinel down a row; the third takes it out of view.
    await expect(root.getByTestId("load-count")).toHaveText("3");
    await afterNextFrames(page);
    await expect(root.getByTestId("load-count")).toHaveText("3");
  });

  test("a request still unanswered is not repeated by an update that moves nothing", async ({
    mount,
    page,
  }) => {
    const root = await mount(<InfiniteScrollHarness />);
    await root.getByRole("button", { name: "Has more" }).click();
    await expect(root.getByTestId("load-count")).toHaveText("1");

    // The load's own render updates with the sentinel where it was.
    await afterNextFrames(page);
    await expect(root.getByTestId("load-count")).toHaveText("1");
  });

  test("an update after detach starts nothing", async ({ mount, page }) => {
    const root = await mount(<InfiniteScrollHarness />);
    await root.getByRole("button", { name: "Detach" }).click();
    await root.getByRole("button", { name: "Has more" }).click();

    await afterNextFrames(page);
    await expect(root.getByTestId("load-count")).toHaveText("0");
  });
});
