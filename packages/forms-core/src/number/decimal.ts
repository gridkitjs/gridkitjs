/**
 * An exact decimal number as text: an optional `-`, digits, and a point
 * before any fraction digits, as in `"-1234.5"`. A number field holds one
 * with `valueType: "decimal"`, and every value goes through one to be
 * stepped, rounded and compared without binary rounding.
 */
export type DecimalString = string;

/** A value as a number field holds it: a JS number, or an exact decimal string. */
export type NumberLike = number | string;

/** Intl's rounding modes, with Intl's meanings. */
export type RoundingMode = NonNullable<
  Intl.NumberFormatOptions["roundingMode"]
>;

/** A decimal as `coefficient × 10^-scale`. */
interface Decimal {
  readonly coefficient: bigint;
  readonly scale: number;
}

const DECIMAL_TEXT = /^([+-]?)(?:(\d+)(?:\.(\d+))?|\.(\d+))$/;

function readDecimal(text: string): Decimal | null {
  const match = DECIMAL_TEXT.exec(text);
  if (match === null) {
    return null;
  }
  const fraction = match[3] ?? match[4] ?? "";
  const magnitude = BigInt((match[2] ?? "") + fraction);
  return {
    coefficient: match[1] === "-" ? -magnitude : magnitude,
    scale: fraction.length,
  };
}

function toDecimal(text: DecimalString): Decimal {
  const decimal = readDecimal(text);
  if (decimal === null) {
    throw new RangeError(`"${text}" is not a decimal string`);
  }
  return decimal;
}

/** `decimal` in normal form, its fraction padded to `minimumFractionDigits`. */
function writeDecimal(
  { coefficient, scale }: Decimal,
  minimumFractionDigits = 0,
): DecimalString {
  const negative = coefficient < 0n;
  const digits = (negative ? -coefficient : coefficient)
    .toString()
    .padStart(scale + 1, "0");
  const point = digits.length - scale;
  const fraction = digits
    .slice(point)
    .replace(/0+$/, "")
    .padEnd(minimumFractionDigits, "0");
  return (
    (negative ? "-" : "") +
    digits.slice(0, point) +
    (fraction === "" ? "" : `.${fraction}`)
  );
}

function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

/** The coefficients of `a` and `b` at one scale, and that scale. */
function aligned(
  a: Decimal,
  b: Decimal,
): readonly [a: bigint, b: bigint, scale: number] {
  const scale = Math.max(a.scale, b.scale);
  return [
    a.coefficient * pow10(scale - a.scale),
    b.coefficient * pow10(scale - b.scale),
    scale,
  ];
}

/** Whether `text` is a decimal string: `[+-]digits[.digits]` or `[+-].digits`. */
export function isDecimalString(text: string): boolean {
  return DECIMAL_TEXT.test(text);
}

/**
 * `text` in normal form: a `-` only when it is not zero, no leading zeros
 * (one `0` before the point), and no trailing fraction zeros beyond
 * `minimumFractionDigits`. `null` when `text` is not a decimal string.
 */
export function normalizeDecimal(
  text: string,
  minimumFractionDigits = 0,
): DecimalString | null {
  const decimal = readDecimal(text);
  return decimal === null ? null : writeDecimal(decimal, minimumFractionDigits);
}

/**
 * Orders two decimals by value: `"12.5"` and `"12.50"` are equal. Throws a
 * `RangeError` for text that is not a decimal string, as every function
 * here does.
 */
export function compareDecimals(
  a: DecimalString,
  b: DecimalString,
): -1 | 0 | 1 {
  const [x, y] = aligned(toDecimal(a), toDecimal(b));
  return x < y ? -1 : x > y ? 1 : 0;
}

/** `a + b`, exactly. */
export function addDecimals(a: DecimalString, b: DecimalString): DecimalString {
  const [x, y, scale] = aligned(toDecimal(a), toDecimal(b));
  return writeDecimal({ coefficient: x + y, scale });
}

/** `a - b`, exactly. */
export function subtractDecimals(
  a: DecimalString,
  b: DecimalString,
): DecimalString {
  const [x, y, scale] = aligned(toDecimal(a), toDecimal(b));
  return writeDecimal({ coefficient: x - y, scale });
}

/** Whether a dropped remainder takes the kept digits one further from zero. */
function roundsAway(
  mode: RoundingMode,
  negative: boolean,
  twiceRemainder: bigint,
  divisor: bigint,
  quotient: bigint,
): boolean {
  const above = twiceRemainder > divisor;
  const tie = twiceRemainder === divisor;
  switch (mode) {
    case "trunc":
      return false;
    case "expand":
      return true;
    case "ceil":
      return !negative;
    case "floor":
      return negative;
    case "halfTrunc":
      return above;
    case "halfExpand":
      return above || tie;
    case "halfCeil":
      return above || (tie && !negative);
    case "halfFloor":
      return above || (tie && negative);
    case "halfEven":
      return above || (tie && quotient % 2n !== 0n);
  }
}

/**
 * `value` rounded to `fractionDigits` digits after the point by `mode`,
 * exactly as Intl rounds the same text: `"2.345"` is `"2.35"` with
 * `halfExpand` and `"2.34"` with `halfEven`. A value that rounds to zero
 * is `"0"`, never `"-0"`.
 */
export function roundDecimal(
  value: DecimalString,
  fractionDigits: number,
  mode: RoundingMode,
): DecimalString {
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0) {
    throw new RangeError(`${String(fractionDigits)} is not a digit count`);
  }
  const { coefficient, scale } = toDecimal(value);
  if (scale <= fractionDigits) {
    return writeDecimal({ coefficient, scale });
  }
  const divisor = pow10(scale - fractionDigits);
  const quotient = coefficient / divisor;
  const remainder = coefficient % divisor;
  const negative = coefficient < 0n;
  const away =
    remainder !== 0n &&
    roundsAway(
      mode,
      negative,
      (negative ? -remainder : remainder) * 2n,
      divisor,
      quotient,
    );
  return writeDecimal({
    coefficient: away ? quotient + (negative ? -1n : 1n) : quotient,
    scale: fractionDigits,
  });
}

/** `value` times 10 to the `places`, exactly: `shiftDecimal("0.125", 2)` is `"12.5"`. */
export function shiftDecimal(
  value: DecimalString,
  places: number,
): DecimalString {
  if (!Number.isInteger(places)) {
    throw new RangeError(`${String(places)} is not a whole number of places`);
  }
  const { coefficient, scale } = toDecimal(value);
  const shifted = scale - places;
  return shifted >= 0
    ? writeDecimal({ coefficient, scale: shifted })
    : writeDecimal({ coefficient: coefficient * pow10(-shifted), scale: 0 });
}

/**
 * The multiple of `step` counted from `base` that is nearest `value` on
 * its `side`: the greatest not above it (`"below"`) or the least not below
 * it (`"above"`); `value` itself when it is one.
 */
export function snapDecimal(
  value: DecimalString,
  base: DecimalString,
  step: DecimalString,
  side: "below" | "above",
): DecimalString {
  const target = toDecimal(value);
  const origin = toDecimal(base);
  const size = toDecimal(step);
  const scale = Math.max(target.scale, origin.scale, size.scale);
  const scaled = (decimal: Decimal) =>
    decimal.coefficient * pow10(scale - decimal.scale);
  const unit = scaled(size);
  if (unit <= 0n) {
    throw new RangeError(`The step "${step}" is not above zero`);
  }
  const offset = scaled(target) - scaled(origin);
  let steps = offset / unit;
  const remainder = offset % unit;
  if (remainder < 0n && side === "below") {
    steps -= 1n;
  } else if (remainder > 0n && side === "above") {
    steps += 1n;
  }
  return writeDecimal({ coefficient: scaled(origin) + steps * unit, scale });
}

/**
 * The shortest decimal that reads back as `value`, with no exponent:
 * `1e21` is `"1000000000000000000000"`, `-0` is `"0"`. Throws a
 * `RangeError` for `NaN` and the infinities.
 */
export function numberToDecimal(value: number): DecimalString {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(
    String(Math.abs(value)),
  );
  if (match === null) {
    throw new RangeError(`${String(value)} has no decimal form`);
  }
  const integer = match[1] ?? "";
  const fraction = match[2] ?? "";
  const scale = fraction.length - Number(match[3] ?? 0);
  const magnitude = BigInt(integer + fraction);
  const coefficient = scale < 0 ? magnitude * pow10(-scale) : magnitude;
  return writeDecimal({
    coefficient: value < 0 ? -coefficient : coefficient,
    scale: Math.max(scale, 0),
  });
}

/**
 * `value` as a JS number, and whether that number writes back as exactly
 * this decimal: `"0.1"` is exact, `"9007199254740993"` is not (it becomes
 * …992), and neither is a decimal beyond the number range.
 */
export function decimalToNumber(value: DecimalString): {
  readonly number: number;
  readonly exact: boolean;
} {
  const decimal = writeDecimal(toDecimal(value));
  const number = Number(decimal);
  return {
    number,
    exact:
      Number.isFinite(number) &&
      compareDecimals(numberToDecimal(number), decimal) === 0,
  };
}

/**
 * `value` as a decimal in normal form, whichever value type it is, its
 * fraction padded to `minimumFractionDigits`.
 */
export function decimalOf(
  value: NumberLike,
  minimumFractionDigits = 0,
): DecimalString {
  return writeDecimal(
    toDecimal(typeof value === "number" ? numberToDecimal(value) : value),
    minimumFractionDigits,
  );
}

/** How many digits `value` has after the point, trailing zeros not counted. */
export function fractionDigitsOf(value: DecimalString): number {
  const normal = writeDecimal(toDecimal(value));
  const point = normal.indexOf(".");
  return point === -1 ? 0 : normal.length - point - 1;
}
