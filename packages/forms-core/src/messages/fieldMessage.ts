import { severityRank, type Severity } from "./severity";

/** One message a field holds, ready to show. */
export interface FieldMessage {
  readonly severity: Severity;
  /** The text shown, already localized. */
  readonly text: string;
  /**
   * A stable id for the kind of message: `"unreadable"`, `"required"`,
   * `"tooShort"`, `"tooLong"`, `"pattern"`, `"refused"`, or the app's own;
   * `null` when it has none.
   */
  readonly code: string | null;
  /**
   * Where it came from: reading the text (`"parse"`), a validator
   * (`"validate"`), a refused commit (`"commit"`) or the app (`"app"`).
   * Growable: a later release may add a source.
   */
  readonly source: "parse" | "validate" | "commit" | "app";
}

/** A message as an app writes it: a string is an error. */
export type FieldMessageInput =
  | string
  | {
      readonly text: string;
      readonly severity?: Severity | undefined;
      readonly code?: string | undefined;
    };

/** The display order of sources, among messages of one severity. */
const SOURCE_ORDER: readonly FieldMessage["source"][] = [
  "parse",
  "commit",
  "validate",
  "app",
];

/**
 * `input` as a message from `source`; `code` stands in when the input names
 * none.
 */
export function toFieldMessage(
  input: FieldMessageInput,
  source: FieldMessage["source"],
  code: string | null = null,
): FieldMessage {
  return typeof input === "string"
    ? { severity: "error", text: input, code, source }
    : {
        severity: input.severity ?? "error",
        text: input.text,
        code: input.code ?? code,
        source,
      };
}

/**
 * Whatever an app or a validator returned, as a list of messages from
 * `source`: one input or several, `null` and `undefined` for none.
 */
export function toFieldMessages(
  input: FieldMessageInput | readonly FieldMessageInput[] | null | undefined,
  source: FieldMessage["source"],
): FieldMessage[] {
  if (input === null || input === undefined) {
    return [];
  }
  return isList(input)
    ? input.map((entry) => toFieldMessage(entry, source))
    : [toFieldMessage(input, source)];
}

// `Array.isArray` does not narrow a readonly array, hence the guard.
function isList(
  input: FieldMessageInput | readonly FieldMessageInput[],
): input is readonly FieldMessageInput[] {
  return Array.isArray(input);
}

/**
 * `messages` in the order a field shows them: the most serious first, and
 * within a severity what the text could not say (parse), then a refused
 * commit, then validators, then the app's own. Equal messages keep their
 * order.
 */
export function sortFieldMessages(
  messages: readonly FieldMessage[],
): FieldMessage[] {
  return messages.toSorted(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source),
  );
}

/** Whether any of `messages` is an error: the only severity that blocks. */
export function hasError(messages: readonly FieldMessage[]): boolean {
  return messages.some((message) => message.severity === "error");
}
