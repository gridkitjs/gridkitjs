import { describe, expect, test, vi } from "vitest";

import type { ResolvedMenuEntry } from "../menu/types";
import {
  fitToolbarItems,
  isPinnedToolbarItem,
  splitToolbarItems,
} from "./overflow";
import type { ResolvedToolbarButton, ResolvedToolbarItem } from "./types";

describe("fitToolbarItems", () => {
  const unpinned = (count: number) => Array<boolean>(count).fill(false);

  test("everything fits: every entry, and no room kept for More", () => {
    expect(
      fitToolbarItems({
        widths: [50, 50, 50],
        available: 150,
        moreWidth: 40,
        pinned: unpinned(3),
      }),
    ).toBe(3);
  });

  test("keeps room for More once something does not fit", () => {
    expect(
      fitToolbarItems({
        widths: [50, 50, 50],
        available: 149,
        moreWidth: 40,
        pinned: unpinned(3),
      }),
    ).toBe(2);
    expect(
      fitToolbarItems({
        widths: [50, 50, 50],
        available: 139,
        moreWidth: 40,
        pinned: unpinned(3),
      }),
    ).toBe(1);
  });

  test("stops at the first entry that does not fit, keeping the order", () => {
    expect(
      fitToolbarItems({
        widths: [50, 100, 10],
        available: 120,
        moreWidth: 20,
        pinned: unpinned(3),
      }),
    ).toBe(1);
  });

  test("pinned entries take their room first, wherever they are", () => {
    // 200 for the pinned search at the end, 40 for More: 59 left for the rest.
    expect(
      fitToolbarItems({
        widths: [50, 50, 200],
        available: 299,
        moreWidth: 40,
        pinned: [false, false, true],
      }),
    ).toBe(1);
  });

  test("nothing but the pinned entries fits", () => {
    expect(
      fitToolbarItems({
        widths: [200, 50, 50],
        available: 220,
        moreWidth: 40,
        pinned: [true, false, false],
      }),
    ).toBe(1);
    // Pinned entries stay even when they alone overflow.
    expect(
      fitToolbarItems({
        widths: [50, 200],
        available: 100,
        moreWidth: 40,
        pinned: [false, true],
      }),
    ).toBe(0);
  });

  test("only pinned entries: every one of them", () => {
    expect(
      fitToolbarItems({
        widths: [200, 200],
        available: 100,
        moreWidth: 40,
        pinned: [true, true],
      }),
    ).toBe(2);
  });

  test("a spacer, at no width, fits wherever the entries before it did", () => {
    // search, spacer, two buttons: the spacer stays with the search.
    expect(
      fitToolbarItems({
        widths: [100, 0, 60, 60],
        available: 200,
        moreWidth: 40,
        pinned: [true, false, false, false],
      }),
    ).toBe(3);
    expect(
      fitToolbarItems({
        widths: [100, 0, 60],
        available: 159,
        moreWidth: 40,
        pinned: [true, false, false],
      }),
    ).toBe(2);
  });

  test("no entries fit no space", () => {
    expect(
      fitToolbarItems({ widths: [], available: 0, moreWidth: 40, pinned: [] }),
    ).toBe(0);
  });
});

describe("isPinnedToolbarItem", () => {
  test("pins the search box and custom entries only", () => {
    expect(
      (
        ["button", "menu", "search", "spacer", "separator", "custom"] as const
      ).filter((type) => isPinnedToolbarItem({ type })),
    ).toEqual(["search", "custom"]);
  });
});

describe("splitToolbarItems", () => {
  function button(
    id: string,
    overrides: Partial<ResolvedToolbarButton> = {},
  ): ResolvedToolbarButton {
    return {
      type: "button",
      id,
      key: id,
      label: id,
      disabled: false,
      pressed: undefined,
      run: vi.fn(() => true),
      ...overrides,
    };
  }
  const separator = (index: number): ResolvedToolbarItem => ({
    type: "separator",
    key: `separator-${String(index)}`,
  });
  const search: ResolvedToolbarItem = { type: "search", key: "search" };
  const spacer: ResolvedToolbarItem = { type: "spacer", key: "spacer-0" };
  const custom: ResolvedToolbarItem = {
    type: "custom",
    id: "status",
    key: "status",
  };

  function keys(entries: readonly (ResolvedToolbarItem | ResolvedMenuEntry)[]) {
    return entries.map((entry) => ("id" in entry ? entry.id : entry.type));
  }

  test("everything fits: nothing for More", () => {
    const items = [search, spacer, button("a")];

    expect(splitToolbarItems(items, 3)).toEqual({ shown: items, overflow: [] });
  });

  test("keeps the first entries and every pinned one; the rest go to More", () => {
    const { shown, overflow } = splitToolbarItems(
      [button("a"), search, button("b"), custom, button("c")],
      1,
    );

    expect(keys(shown)).toEqual(["a", "search", "status"]);
    expect(keys(overflow)).toEqual(["b", "c"]);
  });

  test("a button becomes an item, checked where pressed, and runs the same", () => {
    const toggle = button("bold", {
      label: "Bold",
      icon: "bold",
      shortcut: "Control+B",
      disabled: true,
      pressed: true,
    });
    const { overflow } = splitToolbarItems([toggle], 0);

    expect(overflow).toEqual([
      {
        type: "item",
        id: "bold",
        label: "Bold",
        icon: "bold",
        shortcut: "Control+B",
        disabled: true,
        checked: true,
        run: toggle.run,
      },
    ]);
  });

  test("a dropdown becomes a submenu", () => {
    const items: ResolvedMenuEntry[] = [
      {
        type: "item",
        id: "x",
        label: "X",
        disabled: false,
        checked: undefined,
        run: () => true,
      },
    ];
    const { overflow } = splitToolbarItems(
      [{ type: "menu", id: "more", key: "more", label: "Actions", items }],
      0,
    );

    expect(overflow).toEqual([
      {
        type: "submenu",
        id: "more",
        label: "Actions",
        icon: undefined,
        items,
      },
    ]);
  });

  test("separators collapse on both sides of the split, spacers stay out of More", () => {
    const { shown, overflow } = splitToolbarItems(
      [
        button("a"),
        separator(1),
        button("b"),
        separator(3),
        spacer,
        button("c"),
        separator(6),
        button("d"),
      ],
      2,
    );

    expect(keys(shown)).toEqual(["a"]);
    expect(keys(overflow)).toEqual(["b", "separator", "c", "separator", "d"]);
  });
});
