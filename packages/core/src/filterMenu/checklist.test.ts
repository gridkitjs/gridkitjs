import { describe, expect, test } from "vitest";

import type { DataColumn } from "../types";
import type {
  ColumnValueOptions,
  FilterEditorAction,
  FilterEditorDraft,
  ValuesDraft,
} from "../util/filterEditor";
import {
  columnValueOptions,
  filterEditorReducer,
  initialFilterEditorDraft,
  toValuesDraft,
} from "../util/filterEditor";
import type { FilterChecklistOptions } from "./checklist";
import { filterChecklist } from "./checklist";

interface SampleRow {
  Region: string | null;
}

const regionColumns: readonly DataColumn<SampleRow, unknown>[] = [
  { id: "Region", column: { field: "Region" } },
];

const regions: readonly SampleRow[] = [
  { Region: "West" },
  { Region: "East" },
  { Region: "West" },
  { Region: null },
  { Region: "" },
  { Region: "north" },
];

const options: FilterChecklistOptions = {
  valueLimit: 10_000,
  blanksLabel: "(Blanks)",
};

/** `draft`, which the test expects on its checklist. */
function onValues(draft: FilterEditorDraft<SampleRow>): ValuesDraft<SampleRow> {
  if (draft.kind !== "values") {
    throw new Error(`Expected a draft on its checklist, got ${draft.kind}.`);
  }
  return draft;
}

/** The region draft as an editor opens it with no filter, after `actions`. */
function editRegion(
  ...actions: FilterEditorAction<SampleRow>[]
): FilterEditorDraft<SampleRow> {
  return actions.reduce(
    filterEditorReducer,
    initialFilterEditorDraft<SampleRow>(
      { kind: "none" },
      columnValueOptions(regions, regionColumns, [], "Region"),
    ),
  );
}

/** The region checklist as an editor opens it with no filter, after `actions`. */
function regionDraft(
  ...actions: FilterEditorAction<SampleRow>[]
): ValuesDraft<SampleRow> {
  return onValues(editRegion(...actions));
}

/** A column holding `count` distinct values, `Value 0`… in order. */
function manyValues(count: number, blanks = 0): ColumnValueOptions {
  return {
    options: Array.from({ length: count }, (_, index) => ({
      value: index,
      label: `Value ${String(index)}`,
      count: 1,
    })),
    total: count,
    truncated: false,
    blanks,
    columnType: "number",
  };
}

function manyDraft(
  count: number,
  ...actions: FilterEditorAction<SampleRow>[]
): ValuesDraft<SampleRow> {
  return onValues(
    actions.reduce(
      filterEditorReducer,
      initialFilterEditorDraft<SampleRow>(
        { kind: "none" },
        manyValues(count, 3),
      ),
    ),
  );
}

function labels(draft: ValuesDraft<SampleRow>, valueLimit = 10_000) {
  return filterChecklist(draft, { ...options, valueLimit }).items.map(
    (item) => item.label,
  );
}

describe("filterChecklist", () => {
  test("lists every value with its label, count and check, then the blanks", () => {
    const draft = regionDraft();
    const [east, north, west, blanks] = filterChecklist(draft, options).items;

    expect(filterChecklist(draft, options)).toMatchObject({
      needsSearch: false,
      hiddenCount: 0,
      total: 3,
    });
    expect(east).toMatchObject({
      kind: "value",
      value: "East",
      label: "East",
      count: 1,
      checked: true,
    });
    expect(north).toMatchObject({ value: "north", count: 1 });
    expect(west).toMatchObject({ value: "West", count: 2 });
    expect(blanks).toMatchObject({
      kind: "blanks",
      label: "(Blanks)",
      count: 2,
      checked: true,
    });
  });

  test("keys each value as the draft does, and the blanks apart", () => {
    const draft = regionDraft();
    const items = filterChecklist(draft, options).items;
    const valueKeys = items
      .filter((item) => item.kind === "value")
      .map((item) => item.key);

    expect(valueKeys).toEqual([...draft.checked.keys()]);
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
  });

  test("checks what the draft checks", () => {
    const draft = regionDraft(
      { type: "toggleValue", value: "West" },
      { type: "setIncludeBlanks", includeBlanks: false },
    );
    expect(
      filterChecklist(draft, options).items.map((item) => item.checked),
    ).toEqual([true, true, false, false]);
  });

  test("no blanks item when no cell is blank", () => {
    const draft = onValues(
      initialFilterEditorDraft<SampleRow>({ kind: "none" }, manyValues(2)),
    );
    expect(labels(draft)).toEqual(["Value 0", "Value 1"]);
  });

  test("a draft on its conditions draws the checklist its opened filter shows", () => {
    const draft = editRegion(
      { type: "toggleValue", value: "West" },
      { type: "setConditions", conditions: [] },
    );

    expect(
      filterChecklist(toValuesDraft(draft), options).items.map(
        (item) => item.checked,
      ),
    ).toEqual([true, true, true, true]);
  });

  test("a search shows its matches and hides the blanks", () => {
    const draft = regionDraft({ type: "search", search: "ST" });
    expect(filterChecklist(draft, options)).toMatchObject({
      needsSearch: false,
      hiddenCount: 0,
      total: 2,
    });
    expect(labels(draft)).toEqual(["East", "West"]);
  });

  test("a search matching nothing lists nothing", () => {
    const draft = regionDraft({ type: "search", search: "south" });
    expect(filterChecklist(draft, options)).toEqual({
      items: [],
      needsSearch: false,
      hiddenCount: 0,
      total: 0,
    });
  });

  test("up to valueLimit values: all of them", () => {
    expect(labels(manyDraft(5), 5)).toEqual([
      "Value 0",
      "Value 1",
      "Value 2",
      "Value 3",
      "Value 4",
      "(Blanks)",
    ]);
  });

  test("more than valueLimit values: nothing until something is searched", () => {
    expect(
      filterChecklist(manyDraft(6), { ...options, valueLimit: 5 }),
    ).toEqual({ items: [], needsSearch: true, hiddenCount: 0, total: 6 });
  });

  test("a search matching more than valueLimit: the first matches, the rest counted", () => {
    const draft = manyDraft(30, { type: "search", search: "1" });
    // Value 1, Value 10 … Value 19, Value 21: twelve matches.
    expect(filterChecklist(draft, { ...options, valueLimit: 5 })).toMatchObject(
      { needsSearch: false, hiddenCount: 7, total: 12 },
    );
    expect(labels(draft, 5)).toEqual([
      "Value 1",
      "Value 10",
      "Value 11",
      "Value 12",
      "Value 13",
    ]);
  });

  test("a search narrowing to valueLimit or fewer lists them all", () => {
    const draft = manyDraft(30, { type: "search", search: "2" });
    // Value 2, Value 12, Value 20 … Value 29: twelve matches.
    expect(
      filterChecklist(draft, { ...options, valueLimit: 12 }),
    ).toMatchObject({ needsSearch: false, hiddenCount: 0, total: 12 });
  });

  test("an infinite valueLimit never asks for a search", () => {
    expect(labels(manyDraft(20_000), Infinity)).toHaveLength(20_001);
  });
});
