import { sortFieldMessages, type FieldMessage } from "../messages/fieldMessage";
import type { FormatPurpose, ParseResult } from "../parse";
import type { CommitTrigger } from "./events";

/**
 * The reading of a draft's text: `pending` while it has not been read yet
 * (an input method is composing, or a change delay is running), else the
 * parse result. A minor release may add a member.
 */
export type TextReading<V> = { readonly kind: "pending" } | ParseResult<V>;

/**
 * What a field shows. `current` is its value, formatted, and follows the
 * value when the value changes (an untouched field follows a controlled
 * value); `text` is text the user typed, with how it reads. A minor release
 * may add a member.
 */
export type FieldDraft<V> =
  | { readonly kind: "current" }
  | {
      readonly kind: "text";
      readonly text: string;
      readonly reading: TextReading<V>;
    };

/**
 * Where the field is in an edit. A minor release may add a member, so a
 * `switch` over `kind` needs a `default`.
 *
 * - `idle`: not being edited.
 * - `editing`: focused. `initialValue` is the value when it gained focus;
 *   `committedValue` the value at its last commit since then (or at focus).
 * - `checking`: an asynchronous `onBeforeCommit` is deciding. `attempt`
 *   identifies it, so a superseded check's answer is ignored; `leaving` is
 *   true once focus has gone (its `onBlur` waits for the answer).
 * - `leaving`: Tab committed and focus is about to move; the blur that
 *   follows commits nothing more.
 */
export type FieldPhase<V> =
  | { readonly kind: "idle" }
  | {
      readonly kind: "editing";
      readonly initialValue: V | null;
      readonly committedValue: V | null;
    }
  | {
      readonly kind: "checking";
      readonly initialValue: V | null;
      readonly committedValue: V | null;
      readonly trigger: CommitTrigger;
      readonly attempt: number;
      readonly leaving: boolean;
    }
  | {
      readonly kind: "leaving";
      readonly initialValue: V | null;
      readonly committedValue: V | null;
    };

/** One field, whole. */
export interface FieldState<V> {
  /** The last valid value; `null` is empty. */
  readonly value: V | null;
  readonly draft: FieldDraft<V>;
  /** What the validators said about `value`. */
  readonly validation: readonly FieldMessage[];
  /** Why the last commit was refused, until the text or value changes again. */
  readonly refusal: FieldMessage | null;
  /** Whether messages are shown yet: false until the first commit attempt or `reveal`. */
  readonly revealed: boolean;
  readonly phase: FieldPhase<V>;
}

export const CURRENT_DRAFT: FieldDraft<never> = { kind: "current" };
export const IDLE_PHASE: FieldPhase<never> = { kind: "idle" };

/** A field holding `value`, untouched, with what its validators said. */
export function createFieldState<V>(
  value: V | null,
  validation: readonly FieldMessage[],
): FieldState<V> {
  return {
    value,
    draft: CURRENT_DRAFT,
    validation,
    refusal: null,
    revealed: false,
    phase: IDLE_PHASE,
  };
}

/** The text on screen: `format(value)` for a `current` draft, else the typed text. */
export function fieldText<V>(
  state: FieldState<V>,
  format: (value: V | null) => string,
): string {
  return state.draft.kind === "current"
    ? format(state.value)
    : state.draft.text;
}

/**
 * What the field's text is written for in `phase`: `edit` while the field
 * has focus (editing, leaving after Tab, or checking before focus went),
 * else `display`.
 */
export function formatPurpose<V>(phase: FieldPhase<V>): FormatPurpose {
  switch (phase.kind) {
    case "idle":
      return "display";
    case "checking":
      return phase.leaving ? "display" : "edit";
    case "editing":
    case "leaving":
      return "edit";
  }
}

/** Why `draft`'s text cannot be read, or `null` when it can (or has not been read yet). */
export function unreadableMessage<V>(draft: FieldDraft<V>): string | null {
  return draft.kind === "text" && draft.reading.kind === "unreadable"
    ? draft.reading.message
    : null;
}

/**
 * Every message the field holds, in display order, shown or not yet. Text
 * that cannot be read shows only why (and a refusal), not what the
 * validators said about the value it no longer shows.
 */
export function fieldMessages<V>(state: FieldState<V>): FieldMessage[] {
  const refusal = state.refusal === null ? [] : [state.refusal];
  const unreadable = unreadableMessage(state.draft);
  if (unreadable !== null) {
    return sortFieldMessages([
      {
        severity: "error",
        text: unreadable,
        code: "unreadable",
        source: "parse",
      },
      ...refusal,
    ]);
  }
  return sortFieldMessages([...refusal, ...state.validation]);
}

/** The messages the field shows now: all of them once `revealed`, else none. */
export function shownMessages<V>(state: FieldState<V>): FieldMessage[] {
  return state.revealed ? fieldMessages(state) : [];
}
