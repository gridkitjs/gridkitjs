import {
  addDecimals,
  compareDecimals,
  decimalOf,
  snapDecimal,
  subtractDecimals,
  type DecimalString,
} from "./decimal";

export type StepDirection = "up" | "down";

/** One `step`, one `largeStep`, or all the way to the limit (`edge`). */
export type StepSize = "step" | "large" | "edge";

/** A step to take, every number an exact decimal. */
export interface StepRequest {
  /** The value to step from; `null` for an empty field. */
  readonly value: DecimalString | null;
  readonly direction: StepDirection;
  readonly size: StepSize;
  /** Above zero. */
  readonly step: DecimalString;
  readonly largeStep: DecimalString;
  readonly min: DecimalString | null;
  readonly max: DecimalString | null;
}

/** `value` within `min` and `max`. */
function clamp(
  value: DecimalString,
  min: DecimalString | null,
  max: DecimalString | null,
): DecimalString {
  if (min !== null && compareDecimals(value, min) < 0) {
    return decimalOf(min);
  }
  if (max !== null && compareDecimals(value, max) > 0) {
    return decimalOf(max);
  }
  return value;
}

/**
 * The value one step on, in normal form:
 *
 * - From empty, the starting point: 0, or `min` when it is above 0, or
 *   `max` when it is below 0.
 * - On the step grid (multiples of `step` from `min`, or from 0 without
 *   one), one step or one large step; off it, to the grid value that way
 *   first, as native number inputs do (1.37 with step 0.5: up to 1.5, down
 *   to 1).
 * - `edge`: to `max` going up and `min` going down; the value unchanged
 *   when that limit is not set.
 * - Never past `min` or `max`: a step from a limit returns that limit,
 *   which `compareDecimals` tells the caller is the value it had.
 *
 * The result can have more fraction digits than the field keeps; the
 * caller rounds it. Throws a `RangeError` for a step that is not above
 * zero.
 */
export function stepNumber(request: StepRequest): DecimalString | null {
  const { value, direction, size, step, largeStep, min, max } = request;
  if (size === "edge") {
    const edge = direction === "up" ? max : min;
    return edge === null ? value : decimalOf(edge);
  }
  if (value === null) {
    if (min !== null && compareDecimals(min, "0") > 0) {
      return decimalOf(min);
    }
    return max !== null && compareDecimals(max, "0") < 0 ? decimalOf(max) : "0";
  }
  const amount = size === "large" ? largeStep : step;
  const base = min ?? "0";
  // The farthest grid value no more than one step away, so an off-grid
  // value lands on the grid and an on-grid one moves a whole step.
  const target =
    direction === "up"
      ? snapDecimal(addDecimals(value, amount), base, step, "below")
      : snapDecimal(subtractDecimals(value, amount), base, step, "above");
  return clamp(target, min, max);
}
