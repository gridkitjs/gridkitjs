import type { FieldMessage, FieldMessageInput } from "../messages/fieldMessage";

/**
 * Where a change came from. A minor release may add a member, so a `switch`
 * over it needs a `default`.
 *
 * - `typing`: keys, deleting and text an input method composed.
 * - `paste`, `drop`: text pasted or dropped in.
 * - `step`: arrow keys or stepper buttons (number and date inputs).
 * - `picker`: an option, a date or a row chosen in a popup.
 * - `preset`: a preset such as "Last 7 days".
 * - `clear`: the clear button, or Escape in a search box.
 * - `undo`: the browser's undo or redo.
 * - `api`: `setValue`, `reset` or a form reset.
 * - `toggle`: a checkbox or switch flipped, by key or pointer.
 * - `revert`: Escape put back the last committed value.
 * - `autofill`: the text changed while the field did not have focus.
 */
export type ChangeSource =
  | "typing"
  | "paste"
  | "drop"
  | "step"
  | "picker"
  | "preset"
  | "clear"
  | "undo"
  | "api"
  | "toggle"
  | "revert"
  | "autofill";

/**
 * What ended an edit. A minor release may add a member, so a `switch` over
 * it needs a `default`.
 */
export type CommitTrigger =
  | "enter"
  | "tab"
  | "blur"
  | "picker"
  | "preset"
  | "clear"
  | "toggle"
  | "autofill";

/** The browser's report of a text edit. */
export interface TextInputDetails {
  /**
   * The `InputEvent`'s `inputType` (`"insertText"`,
   * `"deleteContentBackward"`, `"insertFromPaste"`, `"historyUndo"`, ...);
   * `null` when no browser edit made the change.
   */
  readonly inputType: string | null;
  /** The text inserted (typed, pasted, dropped, composed); `null` for a deletion. */
  readonly data: string | null;
  readonly selectionStart: number | null;
  readonly selectionEnd: number | null;
  readonly isComposing: boolean;
}

/** No per-input details. */
export type NoDetails = Record<never, never>;

/**
 * What every forms event carries. `value` and `text` are what the field
 * holds after the change the event is about (the proposed value, in a
 * before-event); `previousValue` and `previousText` what it held before.
 * `N` is the native event type: `Event` in forms-dom and forms.
 */
export interface FieldEventBase<V, N = unknown> {
  readonly value: V | null;
  readonly previousValue: V | null;
  readonly text: string;
  readonly previousText: string;
  readonly source: ChangeSource;
  /** The browser event behind it; `null` for a change the app made. */
  readonly nativeEvent: N | null;
  /** The text edit behind it; `null` when no browser edit made the change. */
  readonly input: TextInputDetails | null;
}

/**
 * The text changed. Reading the text comes after it, so `value` and
 * `previousValue` are both the value the field held before the edit.
 * Each input adds its own details by intersection; a details key never
 * reuses a base field's name.
 */
export type FieldInputEvent<
  V,
  D extends object = NoDetails,
  N = unknown,
> = FieldEventBase<V, N> & D;

/** The value changed. */
export type FieldChangeEvent<
  V,
  D extends object = NoDetails,
  N = unknown,
> = FieldEventBase<V, N> & D;

/** The field's messages were worked out again. */
export type FieldValidateEvent<
  V,
  D extends object = NoDetails,
  N = unknown,
> = FieldEventBase<V, N> &
  D & {
    /** Every message the field holds now, shown or not yet. */
    readonly messages: readonly FieldMessage[];
    /** Whether none of them is an error. */
    readonly valid: boolean;
  };

/** The user is done: the value is committed. */
export type FieldCommitEvent<
  V,
  D extends object = NoDetails,
  N = unknown,
> = FieldEventBase<V, N> &
  D & {
    readonly trigger: CommitTrigger;
    /** Whether `value` differs from `previousValue`: the value at the last commit, or at focus. */
    readonly changed: boolean;
    /** The value when the field gained focus. */
    readonly initialValue: V | null;
  };

/**
 * A text edit is about to happen. `text` is the proposed text; reading it
 * comes later, so `value` and `previousValue` are the value held now.
 */
export type FieldBeforeInputEvent<
  V,
  D extends object = NoDetails,
  N = unknown,
> = FieldEventBase<V, N> &
  D & {
    /** False while an input method is composing: it owns the text, so the two calls below do nothing. */
    readonly cancelable: boolean;
    readonly defaultPrevented: boolean;
    /** The edit does not happen. */
    preventDefault(): void;
    /** Inserts `data` in place of what was typed, pasted or dropped. */
    setData(data: string): void;
  };

/** The value is about to change to `value`. */
export type FieldBeforeChangeEvent<
  V,
  D extends object = NoDetails,
  N = unknown,
> = FieldEventBase<V, N> &
  D & {
    readonly defaultPrevented: boolean;
    /** The value does not change; typed text is put back as it was before this edit. */
    preventDefault(): void;
    /** Changes to `value` instead; typed text becomes `format(value)` unless it already reads as it. */
    setValue(value: V | null): void;
  };

/**
 * The value is about to be committed. The handler may return a promise:
 * the commit waits for it, and so does the `onBlur` of a field being left.
 */
export type FieldBeforeCommitEvent<
  V,
  D extends object = NoDetails,
  N = unknown,
> = FieldCommitEvent<V, D, N> & {
  readonly defaultPrevented: boolean;
  /**
   * Refuses the commit; `message` (default `messages.checkFailed`) shows as
   * an error. Called after a returned promise settles, it does nothing.
   */
  preventDefault(message?: FieldMessageInput): void;
};

/** The field gained or lost focus. */
export interface FieldFocusEvent<V, N = unknown> {
  readonly value: V | null;
  readonly text: string;
  readonly nativeEvent: N | null;
}

/** Every handler a field calls, each optional, in the order they fire. */
export interface FieldHandlers<V, D extends object = NoDetails, N = unknown> {
  readonly onFocus?: ((event: FieldFocusEvent<V, N>) => void) | undefined;
  readonly onBeforeInput?:
    ((event: FieldBeforeInputEvent<V, D, N>) => void) | undefined;
  readonly onInput?: ((event: FieldInputEvent<V, D, N>) => void) | undefined;
  readonly onBeforeChange?:
    ((event: FieldBeforeChangeEvent<V, D, N>) => void) | undefined;
  readonly onChange?: ((event: FieldChangeEvent<V, D, N>) => void) | undefined;
  readonly onValidate?:
    ((event: FieldValidateEvent<V, D, N>) => void) | undefined;
  readonly onBeforeCommit?:
    | ((event: FieldBeforeCommitEvent<V, D, N>) => void | Promise<void>)
    | undefined;
  readonly onCommit?: ((event: FieldCommitEvent<V, D, N>) => void) | undefined;
  readonly onBlur?: ((event: FieldFocusEvent<V, N>) => void) | undefined;
}
