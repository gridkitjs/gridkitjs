import { describe, expect, test } from "vitest";

import type { FilterState } from "../types";
import { searchTextOf, setSearchText } from "./search";

interface Order {
  Id: number;
  Region: string;
}

const regionFilter: FilterState<Order> = [
  { columnId: "Region", query: "%west%" },
];

describe("searchTextOf", () => {
  test("is the global text entry's query without its anchors", () => {
    expect(searchTextOf<Order>([{ query: "%west%" }])).toBe("west");
  });

  test("is empty without a global text entry", () => {
    expect(searchTextOf<Order>([])).toBe("");
    expect(searchTextOf(regionFilter)).toBe("");
    expect(searchTextOf<Order>([{ value: 3 }])).toBe("");
  });

  test("strips whichever anchors the query has", () => {
    expect(searchTextOf<Order>([{ query: "west%" }])).toBe("west");
    expect(searchTextOf<Order>([{ query: "%west" }])).toBe("west");
    expect(searchTextOf<Order>([{ query: "west" }])).toBe("west");
    expect(searchTextOf<Order>([{ query: "%" }])).toBe("");
  });

  test("keeps a % inside the text", () => {
    expect(searchTextOf<Order>([{ query: "%50% off%" }])).toBe("50% off");
  });
});

describe("setSearchText", () => {
  test("writes a contains query as the global text entry", () => {
    expect(setSearchText<Order>([], "west")).toEqual([{ query: "%west%" }]);
  });

  test("replaces the search, keeping every column entry", () => {
    const filter: FilterState<Order> = [
      ...regionFilter,
      { query: "%west%" },
      { columnId: "Id", value: 3 },
    ];

    expect(setSearchText(filter, "east")).toEqual([
      ...regionFilter,
      { query: "%east%" },
      { columnId: "Id", value: 3 },
    ]);
  });

  test("removes the search for empty text, leaving the column entries", () => {
    expect(setSearchText([...regionFilter, { query: "%west%" }], "")).toEqual(
      regionFilter,
    );
  });

  test("returns the filter itself when nothing changes", () => {
    const searching: FilterState<Order> = [{ query: "%west%" }];

    expect(setSearchText(searching, "west")).toBe(searching);
    expect(setSearchText(regionFilter, "")).toBe(regionFilter);
  });

  test("keeps text as typed, spaces included", () => {
    expect(setSearchText<Order>([], "west ")).toEqual([{ query: "%west %" }]);
  });

  test("round-trips through searchTextOf, a typed % included", () => {
    for (const text of ["west", "50%", "%", "% off", "a b"]) {
      expect(searchTextOf(setSearchText(regionFilter, text))).toBe(text);
    }
  });
});
