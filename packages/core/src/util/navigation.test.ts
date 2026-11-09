import { describe, expect, test } from "vitest";

import {
  bodyFocus,
  clampFocus,
  headerFocus,
  nextFocusForKey,
} from "./navigation";

const noModifiers = {
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
};

describe("headerFocus/bodyFocus", () => {
  test("tag the cell with its area", () => {
    expect(headerFocus(3)).toEqual({ area: "header", columnIndex: 3 });
    expect(bodyFocus(1, 3)).toEqual({
      area: "body",
      rowIndex: 1,
      columnIndex: 3,
    });
  });
});

describe("clampFocus", () => {
  test("leaves a focus already in range untouched", () => {
    expect(clampFocus(bodyFocus(1, 1), 3, 3)).toEqual(bodyFocus(1, 1));
  });

  test("moves a body row above the first to the header", () => {
    expect(clampFocus(bodyFocus(-5, 0), 3, 3)).toEqual(headerFocus(0));
  });

  test("moves a body focus to the header when there are no rows", () => {
    expect(clampFocus(bodyFocus(0, 1), 0, 3)).toEqual(headerFocus(1));
  });

  test("keeps a header focus on the header, holding only its column", () => {
    expect(clampFocus(headerFocus(99), 0, 3)).toEqual(headerFocus(2));
  });

  test("holds rowIndex at the last row for anything below it", () => {
    expect(clampFocus(bodyFocus(99, 0), 3, 3)).toEqual(bodyFocus(2, 0));
  });

  test("holds columnIndex within [0, columnCount - 1]", () => {
    expect(clampFocus(bodyFocus(0, -1), 3, 3)).toEqual(bodyFocus(0, 0));
    expect(clampFocus(bodyFocus(0, 99), 3, 3)).toEqual(bodyFocus(0, 2));
  });

  test("holds columnIndex at 0 when there are no columns", () => {
    expect(clampFocus(bodyFocus(0, 5), 3, 0)).toEqual(bodyFocus(0, 0));
  });
});

describe("nextFocusForKey", () => {
  const focus = bodyFocus(2, 2);

  test("moves one cell per arrow key", () => {
    expect(nextFocusForKey("ArrowLeft", noModifiers, focus, 5, 5, 2)).toEqual(
      bodyFocus(2, 1),
    );
    expect(nextFocusForKey("ArrowRight", noModifiers, focus, 5, 5, 2)).toEqual(
      bodyFocus(2, 3),
    );
    expect(nextFocusForKey("ArrowUp", noModifiers, focus, 5, 5, 2)).toEqual(
      bodyFocus(1, 2),
    );
    expect(nextFocusForKey("ArrowDown", noModifiers, focus, 5, 5, 2)).toEqual(
      bodyFocus(3, 2),
    );
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
    ).toEqual(bodyFocus(1, 2));
  });

  test("Home/End are row-scoped without Ctrl", () => {
    expect(nextFocusForKey("Home", noModifiers, focus, 5, 5, 2)).toEqual(
      bodyFocus(2, 0),
    );
    expect(nextFocusForKey("End", noModifiers, focus, 5, 5, 2)).toEqual(
      bodyFocus(2, 4),
    );
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
    ).toEqual(headerFocus(0));
    expect(
      nextFocusForKey("End", { ...noModifiers, ctrlKey: true }, focus, 5, 5, 2),
    ).toEqual(bodyFocus(4, 4));
  });

  test("PageUp/PageDown move by the given pageSize", () => {
    expect(nextFocusForKey("PageUp", noModifiers, focus, 20, 5, 1)).toEqual(
      bodyFocus(1, 2),
    );
    expect(nextFocusForKey("PageDown", noModifiers, focus, 20, 5, 7)).toEqual(
      bodyFocus(9, 2),
    );
  });

  test("PageUp past the first row lands on the header", () => {
    expect(nextFocusForKey("PageUp", noModifiers, focus, 20, 5, 7)).toEqual(
      headerFocus(2),
    );
  });

  describe("from the header", () => {
    const onHeader = headerFocus(2);

    test("ArrowUp stays on the header", () => {
      expect(
        nextFocusForKey("ArrowUp", noModifiers, onHeader, 5, 5, 2),
      ).toEqual(headerFocus(2));
    });

    test("ArrowDown reaches the first body row", () => {
      expect(
        nextFocusForKey("ArrowDown", noModifiers, onHeader, 5, 5, 2),
      ).toEqual(bodyFocus(0, 2));
    });

    test("PageDown counts the header as the row above the first", () => {
      expect(
        nextFocusForKey("PageDown", noModifiers, onHeader, 20, 5, 7),
      ).toEqual(bodyFocus(6, 2));
    });

    test("left, right, Home and End stay on the header", () => {
      expect(
        nextFocusForKey("ArrowLeft", noModifiers, onHeader, 5, 5, 2),
      ).toEqual(headerFocus(1));
      expect(
        nextFocusForKey("ArrowRight", noModifiers, onHeader, 5, 5, 2),
      ).toEqual(headerFocus(3));
      expect(nextFocusForKey("Home", noModifiers, onHeader, 5, 5, 2)).toEqual(
        headerFocus(0),
      );
      expect(nextFocusForKey("End", noModifiers, onHeader, 5, 5, 2)).toEqual(
        headerFocus(4),
      );
    });

    test("Ctrl+End reaches the last body cell", () => {
      expect(
        nextFocusForKey(
          "End",
          { ...noModifiers, ctrlKey: true },
          onHeader,
          5,
          5,
          2,
        ),
      ).toEqual(bodyFocus(4, 4));
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
      const atRow2 = bodyFocus(2, 0);
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
      ).toEqual(bodyFocus(4, 0));
    });

    test("ArrowUp steps past a skippable row the same way, in the opposite direction", () => {
      const atRow4 = bodyFocus(4, 0);
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
      ).toEqual(bodyFocus(2, 0));
    });

    test("left/right movement never consults isSkippableRow — it is row-scoped only", () => {
      const atRow3 = bodyFocus(3, 2);
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
      ).toEqual(bodyFocus(3, 3));
    });

    test("stays in place rather than clamping onto the skippable bound row (which would silently undo the skip), when there is nowhere valid to move to", () => {
      const lastRowSkippable = (rowIndex: number) => rowIndex === 4;
      const atRow3 = bodyFocus(3, 0);
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
      ).toEqual(bodyFocus(3, 0));
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
      ).toEqual(bodyFocus(3, 4));
    });

    test("ArrowUp from row 0 reaches the header even when row 0 is itself skippable — the header is never a skippable concept", () => {
      const firstRowSkippable = (rowIndex: number) => rowIndex === 0;
      const atRow0 = bodyFocus(0, 0);
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
      ).toEqual(headerFocus(0));
    });

    test("stays in place, without looping forever, when every row is skippable", () => {
      const everyRowSkippable = () => true;
      const atRow2 = bodyFocus(2, 0);
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
      ).toEqual(bodyFocus(2, 0));
    });

    test("PageDown steps past a skippable landing row the same way ArrowDown does", () => {
      const atRow1 = bodyFocus(1, 0);
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
      ).toEqual(bodyFocus(4, 0));
    });

    test("defaults to skipping nothing when omitted", () => {
      expect(nextFocusForKey("ArrowDown", noModifiers, focus, 5, 5, 2)).toEqual(
        bodyFocus(3, 2),
      );
    });
  });
});
