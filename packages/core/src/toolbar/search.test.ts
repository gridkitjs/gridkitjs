import { describe, expect, test } from "vitest";

import type { FilterState } from "../types";
import { searchTextOf, setSearchText } from "./search";

interface Order {
  Id: number;
  Region: string;
}

const regionFilter: FilterState<Order> = [
  { kind: "text", columnId: "Region", query: "%west%" },
];

describe("searchTextOf", () => {
  test("is the global text entry's query without its anchors", () => {
    expect(searchTextOf<Order>([{ kind: "text", query: "%west%" }])).toBe(
      "west",
    );
  });

  test("is empty without a global text entry", () => {
    expect(searchTextOf<Order>([])).toBe("");
    expect(searchTextOf(regionFilter)).toBe("");
    expect(searchTextOf<Order>([{ kind: "value", value: 3 }])).toBe("");
  });

  test("strips whichever anchors the query has", () => {
    expect(searchTextOf<Order>([{ kind: "text", query: "west%" }])).toBe(
      "west",
    );
    expect(searchTextOf<Order>([{ kind: "text", query: "%west" }])).toBe(
      "west",
    );
    expect(searchTextOf<Order>([{ kind: "text", query: "west" }])).toBe("west");
    expect(searchTextOf<Order>([{ kind: "text", query: "%" }])).toBe("");
  });

  test("keeps a % inside the text", () => {
    expect(searchTextOf<Order>([{ kind: "text", query: "%50% off%" }])).toBe(
      "50% off",
    );
  });
});

describe("setSearchText", () => {
  test("writes a contains query as the global text entry", () => {
    expect(setSearchText<Order>([], "west")).toEqual([
      { kind: "text", query: "%west%" },
    ]);
  });

  test("replaces the search, keeping every column entry", () => {
    const filter: FilterState<Order> = [
      ...regionFilter,
      { kind: "text", query: "%west%" },
      { kind: "value", columnId: "Id", value: 3 },
    ];

    expect(setSearchText(filter, "east")).toEqual([
      ...regionFilter,
      { kind: "text", query: "%east%" },
      { kind: "value", columnId: "Id", value: 3 },
    ]);
  });

  test("removes the search for empty text, leaving the column entries", () => {
    expect(
      setSearchText([...regionFilter, { kind: "text", query: "%west%" }], ""),
    ).toEqual(regionFilter);
  });

  test("returns the filter itself when nothing changes", () => {
    const searching: FilterState<Order> = [{ kind: "text", query: "%west%" }];

    expect(setSearchText(searching, "west")).toBe(searching);
    expect(setSearchText(regionFilter, "")).toBe(regionFilter);
  });

  test("keeps text as typed, spaces included", () => {
    expect(setSearchText<Order>([], "west ")).toEqual([
      { kind: "text", query: "%west %" },
    ]);
  });

  test("round-trips through searchTextOf, a typed % included", () => {
    for (const text of ["west", "50%", "%", "% off", "a b"]) {
      expect(searchTextOf(setSearchText(regionFilter, text))).toBe(text);
    }
  });
});
