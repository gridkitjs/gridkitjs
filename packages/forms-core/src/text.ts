import { parsed, type ParseContext, type ParseResult } from "./parse";

/** How a text input reads its text. */
export interface TextParseOptions {
  /** Drops leading and trailing whitespace from the value. */
  readonly trim?: boolean | undefined;
  /** Upper-cases the value in the context's locale. */
  readonly uppercase?: boolean | undefined;
}

/**
 * A text input's own reading: the text as it is, trimmed or upper-cased
 * when asked, and `null` when that leaves it empty. Whitespace is kept
 * unless `trim` is set, so `requiredRule` is what refuses a blank value.
 * Text always reads, so it never returns `unreadable`.
 */
export function textParser(
  options: TextParseOptions = {},
): (text: string, context: ParseContext<string>) => ParseResult<string> {
  const { trim = false, uppercase = false } = options;
  return (text, { locale }) => {
    const trimmed = trim ? text.trim() : text;
    const value = uppercase ? trimmed.toLocaleUpperCase(locale) : trimmed;
    return parsed(value === "" ? null : value);
  };
}

/** A text input's own formatting: the value as it is, `""` for `null`. */
export function formatText(value: string | null): string {
  return value ?? "";
}
