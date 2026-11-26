import {
  toFieldMessages,
  type FieldMessage,
  type FieldMessageInput,
} from "../messages/fieldMessage";
import type { FormsMessages } from "../messages/formsMessages";
import { countCharacters } from "../text";

/** What a validator knows beside the value. */
export interface ValidatorContext {
  /** The text the field shows. */
  readonly text: string;
  readonly locale: Intl.LocalesArgument;
  readonly messages: FormsMessages;
}

/** What a validator returns: one message or several, `null` or nothing when the value is fine. */
export type ValidationResult =
  FieldMessageInput | readonly FieldMessageInput[] | null | undefined;

/**
 * Checks a value. Called with every value, `null` included, after each
 * change, so it must be synchronous and cheap: anything slow or remote
 * belongs in `onBeforeCommit`. A string it returns is an error; a message
 * with another severity is shown and never blocks.
 */
export type Validator<V> = (
  value: V | null,
  context: ValidatorContext,
) => ValidationResult;

/** `null`, or a string of only whitespace, is `messages.required`. */
export function requiredRule<V>(): Validator<V> {
  return (value, { messages }) =>
    value === null || (typeof value === "string" && value.trim() === "")
      ? { text: messages.required, code: "required" }
      : null;
}

/** Fewer than `min` code points is `messages.tooShort`. `null` passes. */
export function minLengthRule(min: number): Validator<string> {
  return (value, { messages }) =>
    value !== null && countCharacters(value) < min
      ? { text: messages.tooShort(min), code: "tooShort" }
      : null;
}

/** More than `max` code points is `messages.tooLong`. `null` passes. */
export function maxLengthRule(max: number): Validator<string> {
  return (value, { messages }) =>
    value !== null && countCharacters(value) > max
      ? { text: messages.tooLong(max), code: "tooLong" }
      : null;
}

/**
 * The whole value must match `pattern`, as the HTML `pattern` attribute
 * reads it; `message` replaces `messages.patternMismatch`. `null` passes.
 */
export function patternRule(
  pattern: RegExp,
  message?: string,
): Validator<string> {
  // `g` and `y` make `test` remember where it stopped, so they are dropped.
  const whole = new RegExp(
    `^(?:${pattern.source})$`,
    pattern.flags.replace(/[gy]/g, ""),
  );
  return (value, { messages }) =>
    value !== null && !whole.test(value)
      ? { text: message ?? messages.patternMismatch, code: "pattern" }
      : null;
}

/**
 * Anything but `true` is the message `message` picks from the catalogue:
 * a required checkbox (`requiredChecked`) or switch (`requiredOn`).
 */
export function checkedRule(
  message: (messages: FormsMessages) => string,
): Validator<boolean> {
  return (value, context) =>
    value === true
      ? null
      : { text: message(context.messages), code: "required" };
}

/** Every message `validators` return for `value`, in their order. */
export function runValidators<V>(
  validators: readonly Validator<V>[],
  value: V | null,
  context: ValidatorContext,
): FieldMessage[] {
  return validators.flatMap((validator) =>
    toFieldMessages(validator(value, context), "validate"),
  );
}
