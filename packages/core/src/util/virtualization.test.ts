import { describe, expect, test } from "vitest";
import { visibleRange, type RowHeights } from "./virtualization";

describe("visibleRange", () => {
  describe("uniform known heights", () => {
    // 10 rows, each 20px tall: row i spans [20i, 20i + 20).
    const heights: RowHeights = Array.from({ length: 10 }, () => 20);

    test("scrollTop 0 shows the rows covering the viewport, including a partially-covered last one", () => {
      const result = visibleRange(heights, 20, 0, 50, 0);
      expect(result).toEqual({
        startIndex: 0,
        endIndex: 2, // rows 0-1 fully visible, row 2 ([40, 60)) partially so
        offsetBefore: 0,
        offsetAfter: 140, // rows 3-9: 7 * 20
      });
    });

    test("scrollTop landing exactly on a row boundary starts there, not one row early", () => {
      const result = visibleRange(heights, 20, 40, 50, 0);
      expect(result.startIndex).toBe(2);
      expect(result.offsetBefore).toBe(40);
    });

    test("scrollTop at the maximum scrollable offset clamps endIndex to the last row", () => {
      // Total height 200; a 50px viewport can scroll to at most 150.
      const result = visibleRange(heights, 20, 150, 50, 0);
      expect(result.endIndex).toBe(9);
      expect(result.offsetAfter).toBe(0);
    });
  });

  describe("mixed measured and estimated rows", () => {
    // Rows 0-1 measured at 30, rows 2+ unmeasured (fall back to estimatedHeight 10).
    const heights: RowHeights = [30, 30, undefined, undefined, undefined];

    test("unmeasured rows fall back to estimatedHeight in the cumulative walk", () => {
      // Rows 0-1: [0, 60). Rows 2-4 at 10px each: [60,70), [70,80), [80,90).
      const result = visibleRange(heights, 10, 65, 10, 0);
      expect(result.startIndex).toBe(2); // [60,70) covers scrollTop 65
      expect(result.offsetBefore).toBe(60);
    });
  });

  describe("overscan", () => {
    const heights: RowHeights = Array.from({ length: 20 }, () => 10);

    test("extends the range on both sides by the overscan count", () => {
      // Viewport [100, 130) covers rows 10-12 (each 10px). Overscan 3 pads
      // to rows 7-15.
      const result = visibleRange(heights, 10, 100, 30, 3);
      expect(result.startIndex).toBe(7);
      expect(result.endIndex).toBe(15);
    });

    test("clamps overscan at the start of the array", () => {
      const result = visibleRange(heights, 10, 0, 30, 5);
      expect(result.startIndex).toBe(0);
      expect(result.offsetBefore).toBe(0);
    });

    test("clamps overscan at the end of the array", () => {
      const result = visibleRange(heights, 10, 180, 30, 5);
      expect(result.endIndex).toBe(19);
      expect(result.offsetAfter).toBe(0);
    });
  });

  describe("a single row taller than the viewport", () => {
    test("still returns that one row as the whole range", () => {
      const result = visibleRange([500], 500, 0, 50, 2);
      expect(result).toEqual({
        startIndex: 0,
        endIndex: 0,
        offsetBefore: 0,
        offsetAfter: 0,
      });
    });
  });

  describe("empty input", () => {
    test("returns an empty range rather than a negative-length one", () => {
      expect(visibleRange([], 20, 0, 500, 4)).toEqual({
        startIndex: 0,
        endIndex: -1,
        offsetBefore: 0,
        offsetAfter: 0,
      });
    });
  });
});
