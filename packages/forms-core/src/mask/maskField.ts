import type { InputFilterDecision, TextEdit } from "../field/plan";
import {
  parsed,
  unreadable,
  type FormatContext,
  type ParseContext,
  type ParseResult,
} from "../parse";
import {
  applyMaskEdit,
  formatMasked,
  readMasked,
  type MaskOptions,
  type MaskValueFormat,
} from "./applyMask";
import { compiledPattern } from "./grammar";

/** The options with the field's locale, unless they name one. */
function inLocale(
  options: MaskOptions,
  locale: Intl.LocalesArgument,
): MaskOptions {
  return options.locale === undefined ? { ...options, locale } : options;
}

/**
 * A masked field's own reading: no character typed is `null`; complete
 * text is its raw characters, or with `valueFormat: "formatted"` its
 * formatted text; incomplete text is unreadable with
 * `messages.maskIncomplete`, so the value stays the last complete one.
 * Text with characters no slot takes (after an undo) is unreadable with
 * `messages.patternMismatch`.
 */
export function maskParser(
  options: MaskOptions,
  valueFormat: MaskValueFormat = "raw",
): (text: string, context: ParseContext<string>) => ParseResult<string> {
  return (text, { locale, messages }) => {
    const read = readMasked(inLocale(options, locale), text);
    if (read.dropped) {
      return unreadable(messages.patternMismatch);
    }
    if (read.raw === "") {
      return parsed(null);
    }
    if (!read.complete) {
      return unreadable(messages.maskIncomplete);
    }
    return parsed(valueFormat === "raw" ? read.raw : read.formatted);
  };
}

/**
 * A masked field's own writing: the value laid into the mask, with the
 * prompt in empty slots while the field has focus (`purpose: "edit"`, so
 * an empty field shows the template), and the formatted text otherwise.
 */
export function maskFormatter(
  options: MaskOptions,
): (value: string | null, context: FormatContext<string>) => string {
  return (value, { locale, purpose }) =>
    formatMasked(inLocale(options, locale), value ?? "", purpose === "edit")
      .text;
}

/**
 * A masked field's judgement of an edit, its `filterInput`: the edit
 * worked out by `applyMaskEdit` on the text before it and the selection,
 * replacing the whole text and placing the caret, or refused. An edit with
 * no browser report (an app's change) and undo or redo stand as they are.
 * `options` hold the field's locale.
 */
export function filterMaskEdit<N>(
  edit: TextEdit<N>,
  before: string,
  options: MaskOptions,
): InputFilterDecision {
  const input = edit.input;
  const inputType = input?.inputType ?? null;
  if (input === null || inputType === null || inputType.startsWith("history")) {
    return { kind: "allow" };
  }
  const start = Math.min(input.selectionStart ?? before.length, before.length);
  const end = Math.min(input.selectionEnd ?? start, before.length);
  const result = applyMaskEdit(
    options,
    { text: before, selectionStart: start, selectionEnd: end },
    { inputType, data: input.data },
    true,
  );
  return result.accepted
    ? { kind: "replace", text: result.text, caret: result.caret }
    : { kind: "prevent" };
}

/** What a masked input tells the browser's keyboard. */
export interface MaskInputHints {
  /** `"numeric"` when every slot of every pattern is a built-in digit slot (`0`, `9`); a function mask is `"text"`. */
  readonly inputMode: "numeric" | "text";
  /** Whether a pattern upper-cases letters, for `autocapitalize="characters"`. A function mask is judged by its first pattern. */
  readonly upperCase: boolean;
}

/** The keyboard a mask wants. Throws on a malformed pattern, as the engine does. */
export function maskInputHints(options: MaskOptions): MaskInputHints {
  const { mask, tokens } = options;
  const patterns =
    typeof mask === "function"
      ? [mask("")]
      : typeof mask === "string"
        ? [mask]
        : mask;
  const slots = patterns.flatMap(
    (pattern) => compiledPattern(pattern, tokens).slots,
  );
  const inputs = slots.filter((slot) => slot.kind === "input");
  const digitsOnly = inputs.every(
    (slot) =>
      (slot.token === "0" || slot.token === "9") &&
      tokens?.[slot.token] === undefined,
  );
  return {
    inputMode: typeof mask !== "function" && digitsOnly ? "numeric" : "text",
    upperCase: inputs.some((slot) => slot.letterCase === "upper"),
  };
}
