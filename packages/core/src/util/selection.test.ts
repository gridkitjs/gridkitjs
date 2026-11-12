import { describe, expect, test } from "vitest";

import type { SelectionState } from "../types";
import {
  applySelectionIntent,
  clearCellSelection,
  clearSelection,
  diffSelection,
  intentOf,
  isSameCell,
  selectAll,
  selectCell,
  selectOnly,
  selectRange,
  toggleCellSelection,
  toggleSelection,
} from "./selection";

const ids = ["a", "b", "c", "d"];

describe("toggleSelection", () => {
  test("adds an id the selection does not hold", () => {
    expect(toggleSelection(["a"], "b", "multiple")).toEqual(["a", "b"]);
  });

  /** Appended rather than sorted, so `at(-1)` is the most recent. */
  test("adds to the end", () => {
    expect(toggleSelection(["c", "a"], "b", "multiple")).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  test("removes an id the selection holds", () => {
    expect(toggleSelection(["a", "b", "c"], "b", "multiple")).toEqual([
      "a",
      "c",
    ]);
  });

  test("replaces rather than grows under single", () => {
    expect(toggleSelection(["a"], "b", "single")).toEqual(["b"]);
  });

  test("still removes under single", () => {
    expect(toggleSelection(["a"], "a", "single")).toEqual([]);
  });

  test("returns the same selection when the mode is false", () => {
    const selection = ["a"];

    expect(toggleSelection(selection, "b", false)).toBe(selection);
    expect(toggleSelection(selection, "a", false)).toBe(selection);
  });
});

describe("selectOnly", () => {
  test("discards everything else", () => {
    expect(selectOnly(["a", "b"], "c", "multiple")).toEqual(["c"]);
  });

  /** A plain click on the one selected row leaves it selected. */
  test("returns the same selection when it already holds only that id", () => {
    const selection = ["a"];

    expect(selectOnly(selection, "a", "multiple")).toBe(selection);
    expect(selectOnly(selection, "a", "single")).toBe(selection);
  });

  test("replaces when the id is selected alongside others", () => {
    expect(selectOnly(["a", "b"], "a", "multiple")).toEqual(["a"]);
  });

  test("returns the same selection when the mode is false", () => {
    const selection = ["a"];

    expect(selectOnly(selection, "b", false)).toBe(selection);
  });
});

describe("selectRange", () => {
  test("spans the anchor and focus inclusively", () => {
    expect(selectRange([], ids, "b", "d", "multiple")).toEqual(["b", "c", "d"]);
  });

  /** The ends may be clicked in either order; the span is the same. */
  test("spans the same range backwards", () => {
    expect(selectRange([], ids, "d", "b", "multiple")).toEqual(["b", "c", "d"]);
  });

  test("takes the displayed order, not the order the ends were given", () => {
    expect(selectRange([], ids, "c", "a", "multiple")).toEqual(["a", "b", "c"]);
  });

  test("spans one id when the ends are the same", () => {
    expect(selectRange([], ids, "b", "b", "multiple")).toEqual(["b"]);
  });

  test("discards what the range does not cover", () => {
    expect(selectRange(["a"], ids, "c", "d", "multiple")).toEqual(["c", "d"]);
  });

  test("returns the same selection when it already holds exactly the range", () => {
    const selection = ["b", "c"];

    expect(selectRange(selection, ids, "b", "c", "multiple")).toBe(selection);
  });

  test("returns the same selection for an end the order does not hold", () => {
    const selection = ["a"];

    expect(selectRange(selection, ids, "missing", "c", "multiple")).toBe(
      selection,
    );
    expect(selectRange(selection, ids, "b", "missing", "multiple")).toBe(
      selection,
    );
  });

  test("degrades to the focus alone under single", () => {
    expect(selectRange(["a"], ids, "a", "d", "single")).toEqual(["d"]);
  });

  test("returns the same selection when the mode is false", () => {
    const selection = ["a"];

    expect(selectRange(selection, ids, "a", "d", false)).toBe(selection);
  });
});

describe("selectAll", () => {
  test("takes every displayed id", () => {
    expect(selectAll(["b"], ids, "multiple")).toEqual(ids);
  });

  test("returns the same selection when it already holds them all", () => {
    const selection = [...ids];

    expect(selectAll(selection, ids, "multiple")).toBe(selection);
  });

  /** Selecting all of one thing is not a thing. */
  test("returns the same selection under any mode but multiple", () => {
    const selection = ["a"];

    expect(selectAll(selection, ids, "single")).toBe(selection);
    expect(selectAll(selection, ids, false)).toBe(selection);
  });
});

describe("clearSelection", () => {
  test("empties the selection", () => {
    expect(clearSelection(["a", "b"])).toEqual([]);
  });

  test("returns the same selection when it is already empty", () => {
    const selection: SelectionState = [];

    expect(clearSelection(selection)).toBe(selection);
  });
});

describe("diffSelection", () => {
  test("reports what was added", () => {
    expect(diffSelection(["a"], ["a", "b"])).toEqual({
      added: ["b"],
      removed: [],
    });
  });

  test("reports what was removed", () => {
    expect(diffSelection(["a", "b"], ["a"])).toEqual({
      added: [],
      removed: ["b"],
    });
  });

  test("reports both sides of a replacement", () => {
    expect(diffSelection(["a", "b"], ["c"])).toEqual({
      added: ["c"],
      removed: ["a", "b"],
    });
  });

  /** A reorder selects and deselects nothing, whatever the arrays look like. */
  test("reports nothing for the same ids in a different order", () => {
    expect(diffSelection(["a", "b"], ["b", "a"])).toEqual({
      added: [],
      removed: [],
    });
  });

  test("reports nothing for the same reference", () => {
    const selection = ["a", "b"];

    expect(diffSelection(selection, selection)).toEqual({
      added: [],
      removed: [],
    });
  });

  /**
   * The selection callbacks all read one diff, so it has to agree with plain
   * membership for every transition, not only the ones tested by hand.
   */
  test("agrees with membership over every pair of selections", () => {
    const selections: SelectionState[] = [
      [],
      ["a"],
      ["b"],
      ["a", "b"],
      ["b", "a"],
      ["a", "b", "c"],
      ["c", "a"],
    ];

    for (const previous of selections) {
      for (const next of selections) {
        const { added, removed } = diffSelection(previous, next);

        expect(added).toEqual(next.filter((id) => !previous.includes(id)));
        expect(removed).toEqual(previous.filter((id) => !next.includes(id)));
      }
    }
  });
});

describe("isSameCell", () => {
  test("is true for the same cell in two objects", () => {
    expect(
      isSameCell(
        { kind: "cell", rowId: "1", columnId: "Id" },
        { kind: "cell", rowId: "1", columnId: "Id" },
      ),
    ).toBe(true);
  });

  test("is false when either half differs", () => {
    expect(
      isSameCell(
        { kind: "cell", rowId: "1", columnId: "Id" },
        { kind: "cell", rowId: "2", columnId: "Id" },
      ),
    ).toBe(false);
    expect(
      isSameCell(
        { kind: "cell", rowId: "1", columnId: "Id" },
        { kind: "cell", rowId: "1", columnId: "Name" },
      ),
    ).toBe(false);
  });

  test("is true only when both select nothing", () => {
    const cell = { kind: "cell", rowId: "1", columnId: "Id" } as const;

    expect(isSameCell({ kind: "none" }, { kind: "none" })).toBe(true);
    expect(isSameCell({ kind: "none" }, cell)).toBe(false);
    expect(isSameCell(cell, { kind: "none" })).toBe(false);
  });
});

describe("selectCell", () => {
  const cell = { rowId: "1", columnId: "Id" };

  test("moves the selection to the cell", () => {
    expect(selectCell({ kind: "none" }, cell, "single")).toEqual({
      kind: "cell",
      rowId: "1",
      columnId: "Id",
    });
  });

  /** A plain click on the selected cell leaves it selected, as `selectOnly` does. */
  test("returns the same selection for the cell already selected", () => {
    const selection = { kind: "cell", rowId: "1", columnId: "Id" } as const;

    expect(selectCell(selection, cell, "single")).toBe(selection);
  });

  test("returns the same selection when the mode is false", () => {
    const selection = { kind: "none" } as const;

    expect(selectCell(selection, cell, false)).toBe(selection);
  });
});

describe("toggleCellSelection", () => {
  const cell = { rowId: "1", columnId: "Id" };

  test("moves the selection to the cell", () => {
    expect(toggleCellSelection({ kind: "none" }, cell, "single")).toEqual({
      kind: "cell",
      rowId: "1",
      columnId: "Id",
    });
  });

  test("clears the cell already selected", () => {
    expect(
      toggleCellSelection(
        { kind: "cell", rowId: "1", columnId: "Id" },
        cell,
        "single",
      ),
    ).toEqual({ kind: "none" });
  });

  test("returns the same selection when the mode is false", () => {
    const selection = { kind: "cell", rowId: "2", columnId: "Name" } as const;

    expect(toggleCellSelection(selection, cell, false)).toBe(selection);
  });
});

describe("clearCellSelection", () => {
  test("lets go of the selected cell", () => {
    expect(
      clearCellSelection({ kind: "cell", rowId: "1", columnId: "Id" }),
    ).toEqual({ kind: "none" });
  });

  test("returns the same selection when nothing is selected", () => {
    const selection = { kind: "none" } as const;

    expect(clearCellSelection(selection)).toBe(selection);
  });
});

describe("intentOf", () => {
  test("is replace with no modifiers", () => {
    expect(intentOf({ ctrlKey: false, metaKey: false, shiftKey: false })).toBe(
      "replace",
    );
  });

  test("is toggle for Ctrl or Cmd", () => {
    expect(intentOf({ ctrlKey: true, metaKey: false, shiftKey: false })).toBe(
      "toggle",
    );
    expect(intentOf({ ctrlKey: false, metaKey: true, shiftKey: false })).toBe(
      "toggle",
    );
  });

  test("is range for Shift, over any other modifier", () => {
    expect(intentOf({ ctrlKey: false, metaKey: false, shiftKey: true })).toBe(
      "range",
    );
    expect(intentOf({ ctrlKey: true, metaKey: false, shiftKey: true })).toBe(
      "range",
    );
  });

  describe("with toggleOnClick", () => {
    const options = { toggleOnClick: true };

    test("is toggle with no modifiers", () => {
      expect(
        intentOf({ ctrlKey: false, metaKey: false, shiftKey: false }, options),
      ).toBe("toggle");
    });

    test("still toggles for Ctrl or Cmd", () => {
      expect(
        intentOf({ ctrlKey: true, metaKey: false, shiftKey: false }, options),
      ).toBe("toggle");
      expect(
        intentOf({ ctrlKey: false, metaKey: true, shiftKey: false }, options),
      ).toBe("toggle");
    });

    test("is still range for Shift", () => {
      expect(
        intentOf({ ctrlKey: false, metaKey: false, shiftKey: true }, options),
      ).toBe("range");
    });

    test("is replace again when false", () => {
      expect(
        intentOf(
          { ctrlKey: false, metaKey: false, shiftKey: false },
          { toggleOnClick: false },
        ),
      ).toBe("replace");
    });
  });
});

describe("applySelectionIntent", () => {
  test("dispatches toggle to toggleSelection", () => {
    expect(
      applySelectionIntent(["a"], ids, null, "b", "toggle", "multiple"),
    ).toEqual(["a", "b"]);
  });

  test("dispatches range to selectRange, anchored at anchorId", () => {
    expect(
      applySelectionIntent([], ids, "b", "d", "range", "multiple"),
    ).toEqual(["b", "c", "d"]);
  });

  test("a range with no anchor spans from the id to itself", () => {
    expect(
      applySelectionIntent([], ids, null, "c", "range", "multiple"),
    ).toEqual(["c"]);
  });

  test("dispatches anything else to selectOnly", () => {
    expect(
      applySelectionIntent(["a", "b"], ids, null, "c", "replace", "multiple"),
    ).toEqual(["c"]);
  });
});
