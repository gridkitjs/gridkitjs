import { describe, expect, test } from "vitest";

import { orderRange, rangeSpan } from "../range/range";
import {
  decimalRangeKind,
  numberRangeKind,
  numberRangeKindOf,
} from "./numberRange";

describe("number range kinds", () => {
  test("measure the span exactly, in either value type", () => {
    expect(
      rangeSpan(numberRangeKind, { start: 0.1, end: 0.3 }, undefined),
    ).toBe(0.2);
    expect(
      rangeSpan(
        decimalRangeKind,
        { start: "0.10", end: "12345678901234567890.3" },
        undefined,
      ),
    ).toBe("12345678901234567890.2");
  });

  test("order by value, not by text", () => {
    expect(orderRange(decimalRangeKind, "10", "9.5", {}, undefined)).toEqual({
      kind: "range",
      range: { start: "9.5", end: "10" },
      swapped: true,
    });
    expect(
      orderRange(decimalRangeKind, "1.0", "1", { bounds: "[]" }, undefined),
    ).toMatchObject({ kind: "range", swapped: false });
  });

  test("numberRangeKindOf picks the kind of the value type", () => {
    expect(numberRangeKindOf("decimal")).toBe(decimalRangeKind);
    expect(numberRangeKindOf("number")).toBe(numberRangeKind);
    expect(numberRangeKindOf(undefined)).toBe(numberRangeKind);
  });
});
