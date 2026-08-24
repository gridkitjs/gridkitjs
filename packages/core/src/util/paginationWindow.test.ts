import { describe, expect, test } from "vitest";

import { paginationWindow } from "./paginationWindow";

describe("paginationWindow", () => {
  test("shows every page when pageCount is small enough to need no ellipsis", () => {
    expect(paginationWindow(1, 4)).toEqual([1, 2, 3, 4]);
    expect(paginationWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test("collapses the right side into a single ellipsis when the current page is near the start", () => {
    expect(paginationWindow(1, 10)).toEqual([1, 2, "ellipsis", 10]);
  });

  test("collapses the left side into a single ellipsis when the current page is near the end", () => {
    expect(paginationWindow(10, 10)).toEqual([1, "ellipsis", 9, 10]);
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

  test("respects a custom boundaryCount/siblingCount", () => {
    expect(
      paginationWindow(10, 20, { boundaryCount: 2, siblingCount: 2 }),
    ).toEqual([1, 2, "ellipsis", 8, 9, 10, 11, 12, "ellipsis", 19, 20]);
  });

  test("never emits two adjacent ellipsis entries when a gap fills in exactly one page", () => {
    // pageCount 7, boundaryCount 1, siblingCount 1, current 4: boundary {1,7},
    // siblings {3,4,5} — the gap between 1 and 3 is exactly one page (2),
    // which should be filled in rather than collapsed.
    expect(paginationWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
