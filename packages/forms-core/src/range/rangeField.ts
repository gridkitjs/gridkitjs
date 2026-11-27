import type {
  AssembleContext,
  PartChange,
  PartTexts,
  PartValues,
} from "../field/createCompositeController";
import { parsed, unreadable, type ParseResult } from "../parse";
import {
  orderRange,
  rangeSpan,
  shownEnd,
  type NoFlags,
  type Range,
  type RangeBounds,
  type RangeEnd,
  type RangeKind,
  type RangeOptions,
} from "./range";

/** The parts of a range input: its two ends, each a value of `T`. */
export type RangeEnds<T> = { start: T; end: T };

/** What every range input adds to its events. */
export interface RangeDetails<
  T,
  F extends object = NoFlags,
  S = number,
  R = never,
> {
  /**
   * The end this event is about: the end typed in; `"both"` for a value
   * set whole (`setValue`, a controlled value, a revert or clear); on a
   * commit, the end that differs from the last commit (`"both"` when both
   * do, `null` when neither does).
   */
  readonly changedEnd: RangeEnd | "both" | null;
  /** The ends the value stands for now: the value itself, or its rule resolved. `null` when empty. */
  readonly resolved: Range<T, F> | null;
  /** From start to end; `null` while an end is open or the field is empty. */
  readonly span: S | null;
  readonly bounds: RangeBounds;
  /** Each end's text as shown. */
  readonly startText: string;
  readonly endText: string;
  /** The rule, when the value is one. */
  readonly rule: R | null;
}

/**
 * The range two ends as shown make, for a range input's `assemble`:
 * `orderRange` with its refusals as `messages.rangeReversed` and
 * `messages.rangeEmpty`, and both ends empty as `null`.
 */
export function readRangeEnds<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  ends: PartValues<RangeEnds<T>>,
  options: RangeOptions<S>,
  context: C,
  { messages }: AssembleContext,
): ParseResult<Range<T, F>> {
  const reading = orderRange(kind, ends.start, ends.end, options, context);
  switch (reading.kind) {
    case "none":
      return parsed(null);
    case "range":
      return parsed(reading.range);
    case "unreadable":
      return unreadable(
        reading.reason === "reversed"
          ? messages.rangeReversed
          : messages.rangeEmpty,
      );
  }
}

/** The ends a range input shows for `range`, for its `split`: the end through `toShownEnd` when half-open. */
export function rangeEnds<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  range: Range<T, F> | null,
  bounds: RangeBounds,
  context: C,
): PartValues<RangeEnds<T>> {
  return range === null
    ? { start: null, end: null }
    : { start: range.start, end: shownEnd(kind, range, bounds, context) };
}

/** What a range input's events carry, from its value and its ends' texts. */
export function rangeDetails<T, F extends object, S, C, R = never>(
  kind: RangeKind<T, F, S, C, R>,
  resolved: Range<T, F> | null,
  changed: PartChange<RangeEnds<T>>,
  texts: PartTexts<RangeEnds<T>>,
  bounds: RangeBounds,
  context: C,
  rule: R | null = null,
): RangeDetails<T, F, S, R> {
  return {
    changedEnd: changed === "all" ? "both" : changed,
    resolved,
    span: resolved === null ? null : rangeSpan(kind, resolved, context),
    bounds,
    startText: texts.start,
    endText: texts.end,
    rule,
  };
}
