import { describe, expect, test } from "vitest";

import { HEADER_ROW, clampFocus, nextFocusForKey } from "./navigation";

const noModifiers = {
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
};

describe("clampFocus", () => {
  test("leaves a focus already in range untouched", () => {
    expect(clampFocus({ rowIndex: 1, columnIndex: 1 }, 3, 3)).toEqual({
      rowIndex: 1,
      columnIndex: 1,
    });
  });

  test("holds rowIndex at the header for anything above it", () => {
    expect(clampFocus({ rowIndex: -5, columnIndex: 0 }, 3, 3)).toEqual({
      rowIndex: HEADER_ROW,
      columnIndex: 0,
    });
  });

  test("holds rowIndex at the last row for anything below it", () => {
    expect(clampFocus({ rowIndex: 99, columnIndex: 0 }, 3, 3)).toEqual({
      rowIndex: 2,
      columnIndex: 0,
    });
  });

  test("holds columnIndex within [0, columnCount - 1]", () => {
    expect(clampFocus({ rowIndex: 0, columnIndex: -1 }, 3, 3)).toEqual({
      rowIndex: 0,
      columnIndex: 0,
    });
    expect(clampFocus({ rowIndex: 0, columnIndex: 99 }, 3, 3)).toEqual({
      rowIndex: 0,
      columnIndex: 2,
    });
  });

  test("holds columnIndex at 0 when there are no columns", () => {
    expect(clampFocus({ rowIndex: 0, columnIndex: 5 }, 3, 0)).toEqual({
      rowIndex: 0,
      columnIndex: 0,
    });
  });
});

describe("nextFocusForKey", () => {
  const focus = { rowIndex: 2, columnIndex: 2 };

  test("moves one cell per arrow key", () => {
    expect(nextFocusForKey("ArrowLeft", noModifiers, focus, 5, 5, 2)).toEqual({
      rowIndex: 2,
      columnIndex: 1,
    });
    expect(nextFocusForKey("ArrowRight", noModifiers, focus, 5, 5, 2)).toEqual({
      rowIndex: 2,
      columnIndex: 3,
    });
    expect(nextFocusForKey("ArrowUp", noModifiers, focus, 5, 5, 2)).toEqual({
      rowIndex: 1,
      columnIndex: 2,
    });
    expect(nextFocusForKey("ArrowDown", noModifiers, focus, 5, 5, 2)).toEqual({
      rowIndex: 3,
      columnIndex: 2,
    });
  });

  test("is null for Alt on any key, resize's to claim", () => {
    expect(
      nextFocusForKey(
        "ArrowLeft",
        { ...noModifiers, altKey: true },
        focus,
        5,
        5,
        2,
      ),
    ).toBeNull();
    expect(
      nextFocusForKey("Home", { ...noModifiers, altKey: true }, focus, 5, 5, 2),
    ).toBeNull();
  });

  test("is null for Ctrl+ArrowLeft/Right, reorder's to claim", () => {
    expect(
      nextFocusForKey(
        "ArrowLeft",
        { ...noModifiers, ctrlKey: true },
        focus,
        5,
        5,
        2,
      ),
    ).toBeNull();
    expect(
      nextFocusForKey(
        "ArrowRight",
        { ...noModifiers, ctrlKey: true },
        focus,
        5,
        5,
        2,
      ),
    ).toBeNull();
  });

  test("still moves for Ctrl+ArrowUp/Down", () => {
    expect(
      nextFocusForKey(
        "ArrowUp",
        { ...noModifiers, ctrlKey: true },
        focus,
        5,
        5,
        2,
      ),
    ).toEqual({ rowIndex: 1, columnIndex: 2 });
  });

  test("Home/End are row-scoped without Ctrl", () => {
    expect(nextFocusForKey("Home", noModifiers, focus, 5, 5, 2)).toEqual({
      rowIndex: 2,
      columnIndex: 0,
    });
    expect(nextFocusForKey("End", noModifiers, focus, 5, 5, 2)).toEqual({
      rowIndex: 2,
      columnIndex: 4,
    });
  });

  test("Ctrl+Home/Ctrl+End jump to the grid's absolute ends", () => {
    expect(
      nextFocusForKey(
        "Home",
        { ...noModifiers, ctrlKey: true },
        focus,
        5,
        5,
        2,
      ),
    ).toEqual({ rowIndex: HEADER_ROW, columnIndex: 0 });
    expect(
      nextFocusForKey("End", { ...noModifiers, ctrlKey: true }, focus, 5, 5, 2),
    ).toEqual({ rowIndex: 4, columnIndex: 4 });
  });

  test("PageUp/PageDown move by the given pageSize", () => {
    expect(nextFocusForKey("PageUp", noModifiers, focus, 20, 5, 7)).toEqual({
      rowIndex: -5,
      columnIndex: 2,
    });
    expect(nextFocusForKey("PageDown", noModifiers, focus, 20, 5, 7)).toEqual({
      rowIndex: 9,
      columnIndex: 2,
    });
  });

  test("is null for a key it does not own", () => {
    expect(nextFocusForKey("Escape", noModifiers, focus, 5, 5, 2)).toBeNull();
    expect(nextFocusForKey("Tab", noModifiers, focus, 5, 5, 2)).toBeNull();
  });

  describe("isSkippableRow", () => {
    // Row 3 is skippable (a group summary row, say) among 0..4.
    const isSkippableRow = (rowIndex: number) => rowIndex === 3;

    test("ArrowDown steps past a skippable row onto the next reachable one", () => {
      const atRow2 = { rowIndex: 2, columnIndex: 0 };
      expect(
        nextFocusForKey(
          "ArrowDown",
          noModifiers,
          atRow2,
          5,
          1,
          2,
          isSkippableRow,
        ),
      ).toEqual({ rowIndex: 4, columnIndex: 0 });
    });

    test("ArrowUp steps past a skippable row the same way, in the opposite direction", () => {
      const atRow4 = { rowIndex: 4, columnIndex: 0 };
      expect(
        nextFocusForKey(
          "ArrowUp",
          noModifiers,
          atRow4,
          5,
          1,
          2,
          isSkippableRow,
        ),
      ).toEqual({ rowIndex: 2, columnIndex: 0 });
    });

    test("left/right movement never consults isSkippableRow — it is row-scoped only", () => {
      const atRow3 = { rowIndex: 3, columnIndex: 2 };
      const alwaysSkippable = () => true;
      expect(
        nextFocusForKey(
          "ArrowRight",
          noModifiers,
          atRow3,
          5,
          5,
          2,
          alwaysSkippable,
        ),
      ).toEqual({ rowIndex: 3, columnIndex: 3 });
    });

    test("stays in place rather than clamping onto the skippable bound row (which would silently undo the skip), when there is nowhere valid to move to", () => {
      const lastRowSkippable = (rowIndex: number) => rowIndex === 4;
      const atRow3 = { rowIndex: 3, columnIndex: 0 };
      expect(
        nextFocusForKey(
          "ArrowDown",
          noModifiers,
          atRow3,
          5,
          1,
          2,
          lastRowSkippable,
        ),
      ).toEqual({ rowIndex: 3, columnIndex: 0 });
    });

    test("Ctrl+End lands on the last reachable row when the true last row is skippable", () => {
      const lastRowSkippable = (rowIndex: number) => rowIndex === 4;
      expect(
        nextFocusForKey(
          "End",
          { ...noModifiers, ctrlKey: true },
          focus,
          5,
          5,
          2,
          lastRowSkippable,
        ),
      ).toEqual({ rowIndex: 3, columnIndex: 4 });
    });

    test("ArrowUp from row 0 reaches the header even when row 0 is itself skippable — the header is never a skippable concept", () => {
      const firstRowSkippable = (rowIndex: number) => rowIndex === 0;
      const atRow0 = { rowIndex: 0, columnIndex: 0 };
      expect(
        nextFocusForKey(
          "ArrowUp",
          noModifiers,
          atRow0,
          5,
          1,
          2,
          firstRowSkippable,
        ),
      ).toEqual({ rowIndex: HEADER_ROW, columnIndex: 0 });
    });

    test("stays in place, without looping forever, when every row is skippable", () => {
      const everyRowSkippable = () => true;
      const atRow2 = { rowIndex: 2, columnIndex: 0 };
      expect(
        nextFocusForKey(
          "ArrowDown",
          noModifiers,
          atRow2,
          5,
          1,
          2,
          everyRowSkippable,
        ),
      ).toEqual({ rowIndex: 2, columnIndex: 0 });
    });

    test("PageDown steps past a skippable landing row the same way ArrowDown does", () => {
      const atRow1 = { rowIndex: 1, columnIndex: 0 };
      expect(
        nextFocusForKey(
          "PageDown",
          noModifiers,
          atRow1,
          5,
          1,
          2,
          isSkippableRow,
        ),
      ).toEqual({ rowIndex: 4, columnIndex: 0 });
    });

    test("defaults to skipping nothing when omitted", () => {
      expect(nextFocusForKey("ArrowDown", noModifiers, focus, 5, 5, 2)).toEqual(
        { rowIndex: 3, columnIndex: 2 },
      );
    });
  });
});
