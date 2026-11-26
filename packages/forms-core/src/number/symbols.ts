import { localeKey } from "../localeKey";

/** How a locale writes numbers, read from `Intl.NumberFormat#formatToParts`. */
export interface NumberSymbols {
  /** The numbering system the field writes in: `"latn"`, `"arab"`, `"deva"`, ... */
  readonly numberingSystem: string;
  /** Its ten digits, zero first. */
  readonly digits: string;
  readonly decimal: string;
  /** `""` when the field writes no grouping. */
  readonly group: string;
  /** Digits in the last group, then in every group before it: `[3, 3]`, or `[3, 2]` for lakh grouping. */
  readonly groupSizes: readonly [primary: number, secondary: number];
  /** 2 where a four-digit number is written ungrouped ("1234" in `es-ES`), else 1. */
  readonly minimumGroupingDigits: 1 | 2;
  /** Without the direction marks Intl puts around it. */
  readonly minus: string;
  readonly percent: string;
  /** Whether the locale writes numbers left to right inside right-to-left text. */
  readonly numbersLeftToRight: boolean;
}

/** What a field may set over its locale's symbols. */
export interface NumberSymbolOverrides {
  /** Replaces the locale's decimal separator; it must differ from the group separator. */
  readonly decimalSeparator?: string | undefined;
  /** Replaces the locale's group separator; `""` writes no grouping. */
  readonly groupSeparator?: string | undefined;
  readonly groupSizes?:
    readonly [primary: number, secondary: number] | undefined;
  /** The digits the field writes: `"latn"` keeps Latin digits in `ar-EG`. */
  readonly numberingSystem?: string | undefined;
}

/** Marks Intl puts around a sign to keep it in place in right-to-left text. */
export const DIRECTION_MARKS = /[‎‏؜‪-‮⁦-⁩]/g;

const RIGHT_TO_LEFT_MARK = /[؜‏]/;

/**
 * Symbols already read, one per locale and overrides: building an
 * `Intl.NumberFormat` costs far more than using one, and a page has few.
 */
const cache = new Map<string, NumberSymbols>();

/** The symbols `locale` writes with, in `numberingSystem` when given. */
function localeSymbols(
  locale: Intl.LocalesArgument,
  numberingSystem: string | undefined,
): NumberSymbols {
  const options = numberingSystem === undefined ? {} : { numberingSystem };
  const format = new Intl.NumberFormat(locale, options);
  const parts = format.formatToParts(-1234567.891);
  const part = (type: Intl.NumberFormatPartTypes) =>
    parts.find((found) => found.type === type)?.value;
  const groups = parts
    .filter((found) => found.type === "integer")
    .map((found) => found.value.length);
  const primary = groups.at(-1) ?? 3;
  const secondary = groups.length > 2 ? (groups.at(-2) ?? primary) : primary;
  const group = part("group") ?? "";
  const percent = new Intl.NumberFormat(locale, {
    ...options,
    style: "percent",
  })
    .formatToParts(0.5)
    .find((found) => found.type === "percentSign")?.value;
  return {
    numberingSystem: format.resolvedOptions().numberingSystem,
    digits: Array.from({ length: 10 }, (_, digit) => format.format(digit)).join(
      "",
    ),
    decimal: part("decimal") ?? ".",
    group,
    groupSizes: [primary, secondary],
    minimumGroupingDigits:
      group !== "" &&
      !format.formatToParts(1234).some((found) => found.type === "group")
        ? 2
        : 1,
    minus: (part("minusSign") ?? "-").replace(DIRECTION_MARKS, ""),
    percent: percent ?? "%",
    numbersLeftToRight: !RIGHT_TO_LEFT_MARK.test(format.format(-1)),
  };
}

function isGroupSize(size: number): boolean {
  return Number.isInteger(size) && size > 0;
}

/**
 * How `locale` writes numbers: its separators, group sizes, digits, minus
 * and percent signs, read from Intl at run time (they differ between ICU
 * versions), with the field's overrides laid over them. Separators that
 * would clash (an empty decimal separator, or both the same) and group
 * sizes that are not positive whole numbers are ignored, leaving the
 * locale's own. Cached per locale and overrides.
 */
export function numberSymbols(
  locale: Intl.LocalesArgument,
  overrides: NumberSymbolOverrides = {},
): NumberSymbols {
  const { decimalSeparator, groupSeparator, groupSizes, numberingSystem } =
    overrides;
  const key = JSON.stringify([
    localeKey(locale),
    decimalSeparator,
    groupSeparator,
    groupSizes,
    numberingSystem,
  ]);
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const own = localeSymbols(locale, numberingSystem);
  const decimal = decimalSeparator ?? own.decimal;
  const group = groupSeparator ?? own.group;
  const separators =
    decimal === "" || decimal === group
      ? { decimal: own.decimal, group: own.group }
      : { decimal, group };
  const symbols: NumberSymbols = {
    ...own,
    ...separators,
    groupSizes:
      groupSizes !== undefined && groupSizes.every(isGroupSize)
        ? groupSizes
        : own.groupSizes,
  };
  cache.set(key, symbols);
  return symbols;
}
