import { describe, expect, test } from "vitest";

import { nextMenuIndex, typeaheadIndex } from "./navigation";
import type { ResolvedMenuEntry } from "./types";

type Entry = Pick<ResolvedMenuEntry, "type">;

const ITEM: Entry = { type: "item" };
const SUBMENU: Entry = { type: "submenu" };
const SEPARATOR: Entry = { type: "separator" };

/** item, separator, submenu, item, separator — indices 0, 2 and 3 are items. */
const entries: readonly Entry[] = [ITEM, SEPARATOR, SUBMENU, ITEM, SEPARATOR];

describe("nextMenuIndex", () => {
  test("next steps forward over separators", () => {
    expect(nextMenuIndex(entries, 0, "next")).toBe(2);
    expect(nextMenuIndex(entries, 2, "next")).toBe(3);
  });

  test("next wraps from the last item to the first", () => {
    expect(nextMenuIndex(entries, 3, "next")).toBe(0);
  });

  test("previous steps back over separators, wrapping from the first item", () => {
    expect(nextMenuIndex(entries, 2, "previous")).toBe(0);
    expect(nextMenuIndex(entries, 0, "previous")).toBe(3);
  });

  test("first and last skip separators at the ends", () => {
    const fenced = [SEPARATOR, ITEM, ITEM, SEPARATOR];

    expect(nextMenuIndex(fenced, 2, "first")).toBe(1);
    expect(nextMenuIndex(fenced, 1, "last")).toBe(2);
  });

  test("with nothing focused, next is the first item and previous the last", () => {
    expect(nextMenuIndex(entries, -1, "next")).toBe(0);
    expect(nextMenuIndex(entries, -1, "previous")).toBe(3);
  });

  test("a lone item stays where it is", () => {
    expect(nextMenuIndex([ITEM], 0, "next")).toBe(0);
    expect(nextMenuIndex([ITEM], 0, "previous")).toBe(0);
  });

  test("is -1 with no item to move to", () => {
    expect(nextMenuIndex([], -1, "next")).toBe(-1);
    expect(nextMenuIndex([SEPARATOR], -1, "first")).toBe(-1);
  });
});

describe("typeaheadIndex", () => {
  const labels = [
    "Sort ascending",
    "Sort descending",
    "Clear sort",
    "Select all rows",
  ];

  test("matches the start of a label, ignoring case, after the focused item", () => {
    expect(typeaheadIndex(labels, 0, "c")).toBe(2);
    expect(typeaheadIndex(labels, 0, "S")).toBe(1);
  });

  test("wraps round the end", () => {
    expect(typeaheadIndex(labels, 3, "s")).toBe(0);
  });

  test("a letter typed again and again steps through every item it starts", () => {
    expect(typeaheadIndex(labels, 0, "s")).toBe(1);
    expect(typeaheadIndex(labels, 1, "ss")).toBe(3);
    expect(typeaheadIndex(labels, 3, "sss")).toBe(0);
  });

  test("a longer query keeps the focused item while it still matches", () => {
    expect(typeaheadIndex(labels, 0, "so")).toBe(0);
    expect(typeaheadIndex(labels, 0, "sort d")).toBe(1);
    expect(typeaheadIndex(labels, 1, "se")).toBe(3);
  });

  test("with nothing focused, searches from the first item", () => {
    expect(typeaheadIndex(labels, -1, "s")).toBe(0);
    expect(typeaheadIndex(labels, -1, "cl")).toBe(2);
  });

  test("is -1 when nothing matches, or nothing was typed", () => {
    expect(typeaheadIndex(labels, 0, "x")).toBe(-1);
    expect(typeaheadIndex(labels, 0, "")).toBe(-1);
    expect(typeaheadIndex([], -1, "s")).toBe(-1);
  });
});
