import type { NoFlags, RangeKind } from "../range/range";
import {
  compareDecimals,
  decimalOf,
  decimalToNumber,
  subtractDecimals,
  type DecimalString,
} from "./decimal";
import type { NumberValue, NumberValueType } from "./options";

/** Orders two ends: an end before its start is reversed. */
function orient(order: number) {
  return order >= 0
    ? ({ kind: "ordered", flags: {} } as const)
    : ({ kind: "reversed" } as const);
}

/**
 * The range kind of JS numbers. The span is `end - start`, worked out
 * exactly (0.3 to 0.1 spans 0.2, never 0.19999999999999998), the same
 * whatever the bounds. Numbers show the end they store, so it has no
 * shown-versus-stored conversion.
 */
export const numberRangeKind: RangeKind<number> = {
  compare: (a, b) => compareDecimals(decimalOf(a), decimalOf(b)),
  orient: (start, end) =>
    orient(compareDecimals(decimalOf(end), decimalOf(start))),
  openFlags: {},
  span: (start, end) =>
    decimalToNumber(subtractDecimals(decimalOf(end), decimalOf(start))).number,
  compareSpans: (a, b) => compareDecimals(decimalOf(a), decimalOf(b)),
};

/** The range kind of exact decimal strings: as `numberRangeKind`, the span a decimal string too. */
export const decimalRangeKind: RangeKind<
  DecimalString,
  NoFlags,
  DecimalString
> = {
  compare: compareDecimals,
  orient: (start, end) => orient(compareDecimals(end, start)),
  openFlags: {},
  span: (start, end) => subtractDecimals(end, start),
  compareSpans: compareDecimals,
};

/** The range kind of a number field's value type: `numberRangeKind`, or `decimalRangeKind` for `"decimal"`. */
export function numberRangeKindOf<T extends NumberValueType = "number">(
  valueType: T | undefined,
): RangeKind<NumberValue<T>, NoFlags, NumberValue<T>> {
  // `NumberValue<T>` is a string exactly when `T` is "decimal".
  return (valueType === "decimal"
    ? decimalRangeKind
    : numberRangeKind) as unknown as RangeKind<
    NumberValue<T>,
    NoFlags,
    NumberValue<T>
  >;
}
