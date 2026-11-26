import type { FormsMessages } from "./messages/formsMessages";

/** How text reads: a value (`null` for empty), or why it cannot be read. */
export type ParseResult<V> =
  | { readonly kind: "value"; readonly value: V | null }
  | { readonly kind: "unreadable"; readonly message: string };

/** What a parser knows beside the text. */
export interface ParseContext<V> {
  /** The input's own reading, to fall back on. */
  readonly defaultParse: (text: string) => ParseResult<V>;
  readonly locale: Intl.LocalesArgument;
  readonly messages: FormsMessages;
}

/**
 * Reads typed text as a value. An app's parser receives the input's own in
 * its context, so it can change one case and leave the rest to it:
 *
 * ```ts
 * const parse: Parser<string> = (text, { defaultParse }) =>
 *   text === "n/a" ? parsed(null) : defaultParse(text);
 * ```
 */
export type Parser<V> = (
  text: string,
  context: ParseContext<V>,
) => ParseResult<V>;

/** What a formatter knows beside the value. */
export interface FormatContext<V> {
  /** The input's own formatting, to fall back on. */
  readonly defaultFormat: (value: V | null) => string;
  readonly locale: Intl.LocalesArgument;
}

/** Writes a value as the text a field shows, `null` included. */
export type Formatter<V> = (
  value: V | null,
  context: FormatContext<V>,
) => string;

/** Text that reads as `value`; `null` for empty. */
export function parsed<V>(value: V | null): ParseResult<V> {
  return { kind: "value", value };
}

/** Text that cannot be read, and why, in words the user sees. */
export function unreadable<V>(message: string): ParseResult<V> {
  return { kind: "unreadable", message };
}
