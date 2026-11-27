import type { FieldMessageInput } from "../messages/fieldMessage";
import type {
  ValidationResult,
  Validator,
  ValidatorContext,
} from "../validation/validators";
import { rangeSpan, type Range, type RangeKind } from "./range";

/** Writes a span for a message: "10", "14 days". */
export type SpanFormatter<S> = (span: S, context: ValidatorContext) => string;

/**
 * A range shorter than `minSpan`, measured by the kind, is
 * `messages.rangeTooShort`, with `minSpan` written by `formatSpan`.
 * `context` gives the kind's context when the rule runs. A range with an
 * open end, and `null`, pass.
 */
export function minSpanRule<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  minSpan: S,
  context: () => C,
  formatSpan: SpanFormatter<S>,
): Validator<Range<T, F>> {
  return (range, validator) => {
    const span = range === null ? null : rangeSpan(kind, range, context());
    return span !== null && kind.compareSpans(span, minSpan) < 0
      ? {
          text: validator.messages.rangeTooShort(
            formatSpan(minSpan, validator),
          ),
          code: "rangeTooShort",
        }
      : null;
  };
}

/** A range longer than `maxSpan` is `messages.rangeTooLong`; otherwise as `minSpanRule`. */
export function maxSpanRule<T, F extends object, S, C, R>(
  kind: RangeKind<T, F, S, C, R>,
  maxSpan: S,
  context: () => C,
  formatSpan: SpanFormatter<S>,
): Validator<Range<T, F>> {
  return (range, validator) => {
    const span = range === null ? null : rangeSpan(kind, range, context());
    return span !== null && kind.compareSpans(span, maxSpan) > 0
      ? {
          text: validator.messages.rangeTooLong(formatSpan(maxSpan, validator)),
          code: "rangeTooLong",
        }
      : null;
  };
}

// `Array.isArray` does not narrow a readonly array, hence the guard.
function isList(
  result: FieldMessageInput | readonly FieldMessageInput[],
): result is readonly FieldMessageInput[] {
  return Array.isArray(result);
}

function asList(result: ValidationResult): readonly FieldMessageInput[] {
  if (result === null || result === undefined) {
    return [];
  }
  return isList(result) ? result : [result];
}

function textOf(message: FieldMessageInput): string {
  return typeof message === "string" ? message : message.text;
}

/**
 * Runs `rule`, a check of one value, on each present end of a range: a
 * number range's `min` and `max` bound both ends. A message both ends
 * earn is given once. Open ends and `null` pass.
 */
export function endsRule<T, F extends object>(
  rule: Validator<T>,
): Validator<Range<T, F>> {
  return (range, context) => {
    if (range === null) {
      return null;
    }
    const messages: FieldMessageInput[] = [];
    for (const end of [range.start, range.end]) {
      if (end === null) {
        continue;
      }
      for (const message of asList(rule(end, context))) {
        if (!messages.some((held) => textOf(held) === textOf(message))) {
          messages.push(message);
        }
      }
    }
    return messages;
  };
}
