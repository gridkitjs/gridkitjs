import {
  compileMask,
  fieldText,
  filterMaskEdit,
  formatMasked,
  formatText,
  maskDetails,
  maskFormatter,
  maskInputHints,
  maskParser,
  textParser,
  type FieldState,
  type MaskCompileResult,
  type MaskDetails,
  type MaskOptions,
  type MaskPreset,
  type MaskSource,
  type MaskTokens,
  type MaskValueFormat,
  type Validator,
} from "@gridkitjs/forms-core";
import { warnOnce } from "../dev";
import type { FieldInputKind } from "../useFieldInput";

/** Whether the `mask` prop is a preset rather than a pattern, several, or a function. */
function isPreset(mask: MaskSource | MaskPreset): mask is MaskPreset {
  return typeof mask === "object" && "options" in mask;
}

/** What a masked input works from: its mask, or `null` when the mask is malformed and it takes plain text. */
export interface ResolvedMask {
  readonly options: MaskOptions | null;
  /** A preset's own check. */
  readonly validate: Validator<string> | undefined;
  readonly valueFormat: MaskValueFormat;
  readonly inputMode: "numeric" | "decimal" | "text" | undefined;
  readonly autoComplete: string | undefined;
  /** The mask upper-cases letters. */
  readonly upperCase: boolean;
}

/** The first malformed pattern of `options`, checked as the engine would compile it. */
function compileError(options: MaskOptions): {
  readonly pattern: string;
  readonly error: Extract<MaskCompileResult, { kind: "error" }>;
} | null {
  const { mask, tokens } = options;
  const patterns =
    typeof mask === "function"
      ? [mask("")]
      : typeof mask === "string"
        ? [mask]
        : mask;
  for (const pattern of patterns) {
    const compiled = compileMask(pattern, tokens);
    if (compiled.kind === "error") {
      return { pattern, error: compiled };
    }
  }
  return null;
}

/**
 * The mask a masked input works from: a preset's options or the given
 * pattern, with the input's own tokens laid over a preset's, its prompt,
 * and the field's locale unless the preset names one. A malformed pattern
 * warns once in development and leaves the input taking plain text.
 */
export function resolveMask(
  mask: MaskSource | MaskPreset,
  overrides: {
    readonly tokens: MaskTokens | undefined;
    readonly promptCharacter: string | undefined;
    readonly valueFormat: MaskValueFormat | undefined;
  },
  locale: Intl.LocalesArgument,
): ResolvedMask {
  const preset = isPreset(mask) ? mask : null;
  const base: MaskOptions = isPreset(mask) ? mask.options : { mask };
  const options: MaskOptions = {
    ...base,
    tokens:
      overrides.tokens === undefined
        ? base.tokens
        : { ...base.tokens, ...overrides.tokens },
    promptCharacter: overrides.promptCharacter ?? base.promptCharacter,
    locale: base.locale ?? locale,
  };
  const valueFormat = overrides.valueFormat ?? preset?.valueFormat ?? "raw";
  const failed = compileError(options);
  if (failed !== null) {
    warnOnce(
      `mask:${failed.pattern}`,
      `MaskedInput: the mask "${failed.pattern}" is malformed at ${String(failed.error.position)} (${failed.error.message}), so the input takes plain text.`,
    );
    return {
      options: null,
      validate: preset?.validate,
      valueFormat,
      inputMode: undefined,
      autoComplete: preset?.autoComplete,
      upperCase: false,
    };
  }
  const hints = maskInputHints(options);
  return {
    options,
    validate: preset?.validate,
    valueFormat,
    inputMode: preset?.inputMode ?? hints.inputMode,
    autoComplete: preset?.autoComplete,
    upperCase: hints.upperCase,
  };
}

/** A masked field's `kind`, its details always given. */
export type MaskKind = FieldInputKind<string, MaskDetails> & {
  readonly details: (current: FieldState<string>) => MaskDetails;
};

/**
 * A masked field's `kind`: forms-core's mask parser, formatter and filter,
 * and `MaskDetails` for the text on screen. Without a mask (a malformed
 * one), plain text, whose details call it complete.
 */
export function maskKind(
  options: MaskOptions | null,
  valueFormat: MaskValueFormat,
): MaskKind {
  if (options === null) {
    return {
      defaultParse: textParser(),
      defaultFormat: formatText,
      serialize: (value) => value,
      details: (current) => {
        const text = fieldText(current, (value) => value ?? "");
        return { raw: text, formatted: text, complete: true, pattern: "" };
      },
    };
  }
  const display = (value: string | null) =>
    formatMasked(options, value ?? "", false).text;
  return {
    defaultParse: maskParser(options, valueFormat),
    defaultFormat: maskFormatter(options),
    serialize: (value) => value,
    details: (current) => maskDetails(options, fieldText(current, display)),
    filterInput: (edit, before) => filterMaskEdit(edit, before, options),
  };
}

/** Where typing goes on in `text`: the first empty slot, or the end. */
export function firstEmptySlot(options: MaskOptions, text: string): number {
  return formatMasked(options, maskDetails(options, text).raw, true).caret;
}

/**
 * Where the caret goes when a masked field's text is written into the
 * focused control: at its distance from the end, as for any text, but
 * never past the first empty slot, so focus on an empty field puts it in
 * the first slot.
 */
export function maskCaret(
  options: MaskOptions,
): (previousText: string, caret: number, nextText: string) => number {
  return (previousText, caret, nextText) =>
    Math.min(
      Math.max(0, nextText.length - (previousText.length - caret)),
      firstEmptySlot(options, nextText),
    );
}

/** The template a placeholder shows: the mask with its prompt in every slot, `_` when the prompt is none. */
export function maskTemplate(options: MaskOptions): string {
  const prompted =
    options.promptCharacter === ""
      ? { ...options, promptCharacter: "_" }
      : options;
  return formatMasked(prompted, "", true).text;
}
