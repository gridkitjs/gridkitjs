import type { RoundingMode } from "./decimal";
import type { NumberSymbolOverrides } from "./symbols";

export type NumberStyle = "decimal" | "percent" | "currency" | "unit";

/** How a negative number is written: `-12`, `(12)` or `12-`. Each is read in every field. */
export type NegativeStyle = "minus" | "parentheses" | "trailingMinus";

/** Whether 12 % is stored as 0.12 (`"fraction"`, Intl's reading) or as 12 (`"percent"`). */
export type PercentScale = "fraction" | "percent";

/** What a number field holds: a JS `number`, or an exact decimal string. */
export type NumberValueType = "number" | "decimal";

/** The value type `T` names. */
export type NumberValue<T extends NumberValueType> = T extends "decimal"
  ? string
  : number;

/**
 * How numbers read and write. Every name `Intl.NumberFormatOptions` also
 * has means what it means there, so a grid column's `format` can be passed
 * on. As in Intl, `currency` and `unit` take effect with their `style`, and
 * an unknown currency code or unit throws Intl's `RangeError`.
 */
export interface NumberOptions extends NumberSymbolOverrides {
  readonly locale?: Intl.LocalesArgument;
  /** `"decimal"` by default. */
  readonly style?: NumberStyle | undefined;
  /** ISO 4217 code; with `style: "currency"`. */
  readonly currency?: string | undefined;
  /** `"symbol"` by default. */
  readonly currencyDisplay?:
    "symbol" | "narrowSymbol" | "code" | "name" | undefined;
  /** An Intl unit identifier (`"kilogram"`, `"kilometer-per-hour"`); with `style: "unit"`. */
  readonly unit?: string | undefined;
  /** `"short"` by default. */
  readonly unitDisplay?: "short" | "narrow" | "long" | undefined;
  /** 0 by default; a currency's minor units. For a percent, of the number shown. */
  readonly minimumFractionDigits?: number | undefined;
  /** Unset: no rounding, every digit typed is kept (a currency: its minor units). */
  readonly maximumFractionDigits?: number | undefined;
  /** `"halfExpand"` (ties away from zero) by default. */
  readonly roundingMode?: RoundingMode | undefined;
  /** Group the integer digits when the value is shown formatted. On by default. */
  readonly useGrouping?: boolean | undefined;
  /** `"minus"` by default. */
  readonly negative?: NegativeStyle | undefined;
  /** `"fraction"` by default. */
  readonly percentScale?: PercentScale | undefined;
}

/** The fraction digits a field writes, and rounds its value to. */
export interface FractionDigits {
  readonly minimum: number;
  /** `null`: no rounding, every digit is kept. */
  readonly maximum: number | null;
}

/** Minor units per currency code, read from Intl once. */
const currencyDigits = new Map<string, number>();

/** The digits ISO 4217 gives `currency`: 2 for EUR, 0 for JPY, 3 for KWD. */
function minorUnits(currency: string): number {
  let digits = currencyDigits.get(currency);
  if (digits === undefined) {
    digits =
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    currencyDigits.set(currency, digits);
  }
  return digits;
}

/**
 * The fraction digits `options` ask for: the minimum written and the
 * maximum kept. A currency defaults both to its minor units; otherwise the
 * minimum is 0 and there is no maximum. A maximum below the minimum is
 * raised to it. A field has fixed decimals when the two are equal.
 */
export function numberFractionDigits(
  options: NumberOptions = {},
): FractionDigits {
  const own =
    options.style === "currency" && options.currency !== undefined
      ? minorUnits(options.currency)
      : null;
  const maximum = options.maximumFractionDigits ?? own;
  const minimum =
    options.minimumFractionDigits ??
    (own === null ? 0 : Math.min(own, maximum ?? own));
  return {
    minimum,
    maximum: maximum === null ? null : Math.max(maximum, minimum),
  };
}
