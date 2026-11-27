/** No per-type flags. */
export type NoFlags = Record<never, never>;

/**
 * A stretch of values of one type. Either end may be `null` (open). `F` is
 * the type's own flags, carried in the value beside the ends (a time range
 * over midnight carries `overnight`); a flag is never named `start`,
 * `end` or `rule` (which marks a `RelativeRange`).
 * A range with both ends open is no range: an input holding one holds
 * `null`.
 */
export type Range<T, F extends object = NoFlags> = {
  readonly start: T | null;
  readonly end: T | null;
} & Readonly<F>;

/**
 * Whether `end` belongs to the range: `"[)"`, half-open (`end` is the first
 * value after it, as a date range stores the day after its last day), or
 * `"[]"`, closed.
 */
export type RangeBounds = "[)" | "[]";

/** One end of a range. */
export type RangeEnd = "start" | "end";

/** A range kept as a rule ("the last 7 days"), resolved to ends on demand. */
export interface RelativeRange<R> {
  readonly kind: "relative";
  readonly rule: R;
}

/** What a range input holds: fixed ends, or (for a type with rules) a rule. */
export type RangeValue<T, F extends object = NoFlags, R = never> = [R] extends [
  never,
]
  ? Range<T, F>
  : Range<T, F> | RelativeRange<R>;

/** How two present ends stand: in order, with the flags that makes, or reversed. */
export type RangeOrientation<F extends object> =
  | { readonly kind: "ordered"; readonly flags: F }
  | { readonly kind: "reversed" };

/**
 * Everything the range model needs to know about one value type, which the
 * type supplies. `S` is its span (a number for numbers, a duration for
 * dates); `C` the context its functions need (a time zone, whether
 * `overnight` is allowed); `R` its relative rule, `never` when it has none.
 * The model orders, checks and measures only through these functions.
 */
export interface RangeKind<
  T,
  F extends object = NoFlags,
  S = number,
  C = undefined,
  R = never,
> {
  /** Negative when `a` comes before `b`, 0 when they are one, positive after. */
  readonly compare: (a: T, b: T) => number;
  /** How `end` stands to `start`: a time range may call an earlier end "ordered, overnight". */
  readonly orient: (start: T, end: T, context: C) => RangeOrientation<F>;
  /** The flags of a range with an open end. */
  readonly openFlags: F;
  /** The length from `start` to `end`, both present, as stored. */
  readonly span: (start: T, end: T, flags: F, context: C) => S;
  readonly compareSpans: (a: S, b: S) => number;
  /**
   * The stored end of a half-open range for an end shown inclusive (a date:
   * the next day). Without it, the end shown is the end stored.
   */
  readonly toStoredEnd?: ((shown: T, context: C) => T) | undefined;
  /** The end shown inclusive for a half-open range's stored end; the inverse of `toStoredEnd`. */
  readonly toShownEnd?: ((stored: T, context: C) => T) | undefined;
  /** The ends a rule stands for, now. Required when `R` is not `never`. */
  readonly resolve?: ((rule: R, context: C) => Range<T, F>) | undefined;
}

/** How a range input reads two ends. */
export interface RangeOptions<S> {
  /** `"[)"` by default: whether the stored `end` belongs to the range. */
  readonly bounds?: RangeBounds | undefined;
  /** What an end before its start does: swapped (default) or an error. */
  readonly reversed?: "swap" | "error" | undefined;
  /** Whether a start equal to its end is allowed when that holds nothing (half-open). */
  readonly allowEmpty?: boolean | undefined;
  readonly minSpan?: S | undefined;
  readonly maxSpan?: S | undefined;
}

/**
 * Two ends as typed, made into a range: no range (both open), an ordered
 * range (`swapped` when the ends changed places), or refused with why.
 */
export type RangeReading<T, F extends object> =
  | { readonly kind: "none" }
  | {
      readonly kind: "range";
      readonly range: Range<T, F>;
      readonly swapped: boolean;
    }
  | { readonly kind: "unreadable"; readonly reason: "reversed" | "empty" };

/** A range from its parts. The one place a `Range` is built, so its flags sit beside the ends. */
function rangeOf<T, F extends object>(
  start: T | null,
  end: T | null,
  flags: F,
): Range<T, F> {
  return { ...flags, start, end };
}

/** `range`'s own flags, without its ends. */
export function rangeFlags<T, F extends object>(range: Range<T, F>): F {
  const flags: Record<string, unknown> = { ...range };
  delete flags.start;
  delete flags.end;
  // What is left of a `Range<T, F>` without its ends is its `F`.
  return flags as F;
}

/** `end` as stored, for a range with `bounds`: the kind's `toStoredEnd` for a half-open one. */
function storedEnd<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  end: T,
  bounds: RangeBounds,
  context: C,
): T {
  return bounds === "[)" && kind.toStoredEnd !== undefined
    ? kind.toStoredEnd(end, context)
    : end;
}

/**
 * Makes two ends as shown into the stored range. Both open is no range; one
 * open end keeps the kind's `openFlags`. Two present ends are oriented by
 * the kind: reversed ends are swapped (the default) or refused with
 * `"reversed"`. The end is then stored through `toStoredEnd` for a
 * half-open range, and a half-open range whose start is its stored end
 * holds nothing, so it is refused with `"empty"` unless `allowEmpty`.
 */
export function orderRange<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  start: T | null,
  end: T | null,
  options: RangeOptions<S>,
  context: C,
): RangeReading<T, F> {
  const bounds = options.bounds ?? "[)";
  if (start === null && end === null) {
    return { kind: "none" };
  }
  if (start === null || end === null) {
    return {
      kind: "range",
      range: rangeOf(
        start,
        end === null ? null : storedEnd(kind, end, bounds, context),
        kind.openFlags,
      ),
      swapped: false,
    };
  }
  let first = start;
  let last = end;
  let orientation = kind.orient(first, last, context);
  const swapped = orientation.kind === "reversed";
  if (swapped) {
    if (options.reversed === "error") {
      return { kind: "unreadable", reason: "reversed" };
    }
    [first, last] = [end, start];
    orientation = kind.orient(first, last, context);
  }
  if (orientation.kind === "reversed") {
    return { kind: "unreadable", reason: "reversed" };
  }
  const stored = storedEnd(kind, last, bounds, context);
  if (
    bounds === "[)" &&
    options.allowEmpty !== true &&
    kind.compare(first, stored) === 0
  ) {
    return { kind: "unreadable", reason: "empty" };
  }
  return {
    kind: "range",
    range: rangeOf(first, stored, orientation.flags),
    swapped,
  };
}

/** The end a stored range shows: the kind's `toShownEnd` for a half-open one. */
export function shownEnd<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  range: Range<T, F>,
  bounds: RangeBounds,
  context: C,
): T | null {
  const { end } = range;
  return end !== null && bounds === "[)" && kind.toShownEnd !== undefined
    ? kind.toShownEnd(end, context)
    : end;
}

/** From `range`'s start to its stored end, by the kind; `null` while an end is open. */
export function rangeSpan<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  range: Range<T, F>,
  context: C,
): S | null {
  const { start, end } = range;
  return start === null || end === null
    ? null
    : kind.span(start, end, rangeFlags(range), context);
}

/**
 * Whether `value` lies in `range`. An open end reaches as far as values go.
 * A range whose stored end comes before its start (a time range over
 * midnight) wraps: it holds what comes from its start on, and what comes
 * before its end.
 */
export function rangeIncludes<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  range: Range<T, F>,
  value: T,
  bounds: RangeBounds,
): boolean {
  const { start, end } = range;
  const fromStart = start === null || kind.compare(value, start) >= 0;
  const toEnd =
    end === null ||
    (bounds === "[)"
      ? kind.compare(value, end) < 0
      : kind.compare(value, end) <= 0);
  const wraps = start !== null && end !== null && kind.compare(end, start) < 0;
  return wraps ? fromStart || toEnd : fromStart && toEnd;
}

/** Whether `value` is a rule rather than fixed ends. */
export function isRelativeRange<T, F extends object, R>(
  value: Range<T, F> | RelativeRange<R>,
): value is RelativeRange<R> {
  return "rule" in value;
}

/**
 * The ends `value` stands for now: itself, or its rule resolved by the
 * kind. Throws a `TypeError` for a rule when the kind has no `resolve`.
 */
export function resolveRange<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  value: RangeValue<T, F, R>,
  context: C,
): Range<T, F> {
  // `RangeValue` is one of the two members, whatever `R` is.
  const either = value as Range<T, F> | RelativeRange<R>;
  if (!isRelativeRange(either)) {
    return either;
  }
  if (kind.resolve === undefined) {
    throw new TypeError("This range kind has no rules to resolve.");
  }
  return kind.resolve(either.rule, context);
}

/**
 * Whether two ranges are one: the same ends by the kind's `compare`, and
 * the same flags. Two rules are one only when they are the same object.
 */
export function sameRange<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  a: RangeValue<T, F, R>,
  b: RangeValue<T, F, R>,
): boolean {
  const left = a as Range<T, F> | RelativeRange<R>;
  const right = b as Range<T, F> | RelativeRange<R>;
  if (isRelativeRange(left) || isRelativeRange(right)) {
    return left === right;
  }
  const sameEnd = (x: T | null, y: T | null) =>
    x === null || y === null ? x === y : kind.compare(x, y) === 0;
  const leftFlags = rangeFlags(left) as Record<string, unknown>;
  const rightFlags = rangeFlags(right) as Record<string, unknown>;
  const keys = Object.keys(leftFlags);
  return (
    sameEnd(left.start, right.start) &&
    sameEnd(left.end, right.end) &&
    keys.length === Object.keys(rightFlags).length &&
    keys.every((key) => Object.is(leftFlags[key], rightFlags[key]))
  );
}
