import { describe, expect, test } from "vitest";

import { paginationWindow } from "./paginationWindow";

describe("paginationWindow", () => {
  test("shows every page when pageCount fits in the window", () => {
    expect(paginationWindow(1, 4)).toEqual([1, 2, 3, 4]);
    expect(paginationWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("slides the sibling run inwards near the start, keeping one ellipsis on the right", () => {
    expect(paginationWindow(1, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
    expect(paginationWindow(4, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
  });

  test("slides the sibling run inwards near the end, keeping one ellipsis on the left", () => {
    expect(paginationWindow(10, 10)).toEqual([1, "ellipsis", 6, 7, 8, 9, 10]);
    expect(paginationWindow(7, 10)).toEqual([1, "ellipsis", 6, 7, 8, 9, 10]);
  });

  test("collapses both sides when the current page sits in the middle of a large range", () => {
    expect(paginationWindow(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
  });

  test("returns an empty window for a pageCount of 0", () => {
    expect(paginationWindow(1, 0)).toEqual([]);
  });

  test("returns just the one page for a pageCount of 1", () => {
    expect(paginationWindow(1, 1)).toEqual([1]);
  });

  test("clamps a current page outside 1..pageCount", () => {
    expect(paginationWindow(0, 10)).toEqual(paginationWindow(1, 10));
    expect(paginationWindow(99, 10)).toEqual(paginationWindow(10, 10));
  });

  test("respects a custom boundaryCount/siblingCount", () => {
    expect(
      paginationWindow(10, 20, { boundaryCount: 2, siblingCount: 2 }),
    ).toEqual([1, 2, "ellipsis", 8, 9, 10, 11, 12, "ellipsis", 19, 20]);
    expect(
      paginationWindow(1, 20, { boundaryCount: 0, siblingCount: 1 }),
    ).toEqual([1, 2, 3, 4, "ellipsis"]);
    expect(
      paginationWindow(10, 20, { boundaryCount: 0, siblingCount: 0 }),
    ).toEqual(["ellipsis", 10, "ellipsis"]);
  });

  test("keeps the same number of entries on every page once pageCount exceeds the window", () => {
    const cases = [
      { boundaryCount: 1, siblingCount: 1 },
      { boundaryCount: 2, siblingCount: 1 },
      { boundaryCount: 1, siblingCount: 2 },
      { boundaryCount: 0, siblingCount: 1 },
      { boundaryCount: 0, siblingCount: 0 },
      { boundaryCount: 3, siblingCount: 0 },
    ];
    for (const options of cases) {
      const slotCount =
        2 * options.boundaryCount + 2 * options.siblingCount + 3;
      for (let pageCount = 1; pageCount <= 40; pageCount++) {
        const expected = Math.min(pageCount, slotCount);
        for (let current = 1; current <= pageCount; current++) {
          const entries = paginationWindow(current, pageCount, options);
          expect(entries).toHaveLength(expected);
          expect(entries).toContain(current);
        }
      }
    }
  });

  test("lists pages in order, never two adjacent ellipses, and an ellipsis only over two or more pages", () => {
    for (let pageCount = 1; pageCount <= 30; pageCount++) {
      for (let current = 1; current <= pageCount; current++) {
        const entries = paginationWindow(current, pageCount);
        const pages = entries.filter((entry) => entry !== "ellipsis");
        expect(pages).toEqual([...pages].sort((a, b) => a - b));
        expect(pages[0]).toBe(1);
        expect(pages.at(-1)).toBe(pageCount);
        entries.forEach((entry, index) => {
          if (entry !== "ellipsis") {
            return;
          }
          const before = entries[index - 1];
          const after = entries[index + 1];
          expect(typeof before).toBe("number");
          expect(typeof after).toBe("number");
          if (typeof before === "number" && typeof after === "number") {
            expect(after - before).toBeGreaterThan(2);
          }
        });
      }
    }
  });
});
