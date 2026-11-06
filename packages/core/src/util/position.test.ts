import { describe, expect, test } from "vitest";

import { renumberRows } from "./position";

describe("renumberRows", () => {
  test("sets rowIndex and datasetIndex to each entry's position", () => {
    const entries = [
      { id: "a", rowIndex: 4, datasetIndex: 4 },
      { id: "b", rowIndex: -1, datasetIndex: -1 },
      { id: "c", rowIndex: 0, datasetIndex: 7 },
    ];

    expect(renumberRows(entries)).toEqual([
      { id: "a", rowIndex: 0, datasetIndex: 0 },
      { id: "b", rowIndex: 1, datasetIndex: 1 },
      { id: "c", rowIndex: 2, datasetIndex: 2 },
    ]);
  });

  test("keeps an entry already at its position as the same object", () => {
    const first = { rowIndex: 0, datasetIndex: 0 };
    const moved = { rowIndex: 1, datasetIndex: 5 };

    const [kept, renumbered] = renumberRows([first, moved]);

    expect(kept).toBe(first);
    expect(renumbered).not.toBe(moved);
  });
});
