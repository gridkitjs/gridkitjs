import {
  hasError,
  toFieldMessage,
  type FieldMessage,
  type FieldMessageInput,
} from "../messages/fieldMessage";
import type { FormsMessages } from "../messages/formsMessages";
import { parsed, type ParseResult } from "../parse";
import type {
  ChangeSource,
  CommitTrigger,
  FieldEventBase,
  FieldHandlers,
  TextInputDetails,
} from "./events";
import type { FieldAction } from "./fieldReducer";
import {
  CURRENT_DRAFT,
  fieldMessages,
  fieldText,
  unreadableMessage,
  type FieldDraft,
  type FieldState,
} from "./state";

// The event plans: one function per kind of request, calling the app's
// handlers in the documented order and dispatching reducer actions between
// them. They touch nothing but `env`, so a test drives them with handlers
// that record their calls. Timers, the request queue and the pending check's
// promise are the controller's.

/** Where a change came from, and the browser's report of it. */
export interface ChangeCause<N> {
  readonly source: ChangeSource;
  readonly nativeEvent: N | null;
  readonly input: TextInputDetails | null;
}

/** A text edit, as forms-dom reports it. */
export interface TextEdit<N> extends ChangeCause<N> {
  /** The text after the edit; for `beforeInput`, the proposed text. */
  readonly text: string;
}

/** What forms-dom does with a text edit `onBeforeInput` saw. */
export type BeforeInputDecision =
  | { readonly kind: "allow" }
  | { readonly kind: "prevent" }
  | { readonly kind: "rewrite"; readonly data: string };

/**
 * How a commit request ended:
 *
 * - `accepted`: committed (`onCommit` has fired).
 * - `refused`: `onBeforeCommit` refused it; its message shows.
 * - `unreadable`: the text cannot be read, so nothing was committed; the
 *   message shows.
 * - `checking`: not decided yet. An asynchronous `onBeforeCommit` is
 *   deciding, or the request was made from inside a handler and runs once
 *   the current sequence ends.
 */
export type CommitOutcome =
  | { readonly kind: "accepted" }
  | { readonly kind: "refused" }
  | { readonly kind: "unreadable" }
  | { readonly kind: "checking" };

/** Everything a sequence needs: the field's state and its options, resolved. */
export interface FieldEnv<V, D extends object, N> {
  /** The state as the sequence runs, which a handler reading the field sees too. */
  readonly get: () => FieldState<V>;
  readonly dispatch: (action: FieldAction<V>) => FieldState<V>;
  readonly handlers: FieldHandlers<V, D, N>;
  readonly parse: (text: string) => ParseResult<V>;
  readonly format: (value: V | null) => string;
  /** Whether two values are one; `null` equals only itself. */
  readonly same: (a: V | null, b: V | null) => boolean;
  readonly validate: (value: V | null, text: string) => readonly FieldMessage[];
  readonly details: (current: FieldState<V>, previous: FieldState<V>) => D;
  readonly messages: FormsMessages;
  readonly commitOnLeave: boolean;
}

/** A commit as the controller asks for it. */
export interface CommitRequest<N> {
  readonly trigger: CommitTrigger;
  readonly source: ChangeSource;
  readonly nativeEvent: N | null;
  /** Identifies this commit, should `onBeforeCommit` answer later. */
  readonly attempt: number;
}

/** A commit an asynchronous `onBeforeCommit` is deciding. */
export interface PendingCheck<N> extends CommitRequest<N> {
  /** Started while the field was idle: it ends idle, with no `onBlur`. */
  readonly quiet: boolean;
  /** Settles with the refusal, or `null` when allowed. Never rejects. */
  readonly answer: Promise<FieldMessage | null>;
}

export interface CommitStep<N> {
  readonly outcome: CommitOutcome;
  /** The check to wait for, when the outcome is `checking`. */
  readonly check: PendingCheck<N> | null;
}

const ALLOW = { kind: "allow" } as const;
const PREVENT = { kind: "prevent" } as const;
export const ACCEPTED = { kind: "accepted" } as const;
const REFUSED = { kind: "refused" } as const;
const UNREADABLE = { kind: "unreadable" } as const;
export const CHECKING = { kind: "checking" } as const;

interface EventValues<V> {
  readonly value: V | null;
  readonly previousValue: V | null;
  readonly text: string;
  readonly previousText: string;
}

/**
 * An event's shared fields, with the input's details computed from the
 * state now and the state the request started from. The base fields go
 * last, so a details key can never hide one.
 */
function eventBase<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  start: FieldState<V>,
  values: EventValues<V>,
  cause: ChangeCause<N>,
): FieldEventBase<V, N> & D {
  return {
    ...env.details(env.get(), start),
    ...values,
    source: cause.source,
    nativeEvent: cause.nativeEvent,
    input: cause.input,
  };
}

/** The text `draft` shows over the field's current value. */
function draftText<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  draft: FieldDraft<V>,
): string {
  return draft.kind === "current" ? env.format(env.get().value) : draft.text;
}

function emitValidate<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  start: FieldState<V>,
  values: EventValues<V>,
  cause: ChangeCause<N>,
): void {
  const messages = fieldMessages(env.get());
  env.handlers.onValidate?.({
    ...eventBase(env, start, values, cause),
    messages,
    valid: !hasError(messages),
  });
}

function emitBlur<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  nativeEvent: N | null,
): void {
  const state = env.get();
  env.handlers.onBlur?.({
    value: state.value,
    text: fieldText(state, env.format),
    nativeEvent,
  });
}

/**
 * `onBeforeInput` for an edit about to happen, and what forms-dom should do
 * with it. Changes no state: the edit arrives through `runEdit`.
 */
export function runBeforeInput<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  edit: TextEdit<N> & { readonly cancelable: boolean },
): BeforeInputDecision {
  const handler = env.handlers.onBeforeInput;
  if (handler === undefined) {
    return ALLOW;
  }
  const state = env.get();
  const decided: { decision: BeforeInputDecision } = { decision: ALLOW };
  handler({
    ...eventBase(
      env,
      state,
      {
        value: state.value,
        previousValue: state.value,
        text: edit.text,
        previousText: fieldText(state, env.format),
      },
      edit,
    ),
    cancelable: edit.cancelable,
    get defaultPrevented() {
      return decided.decision.kind === "prevent";
    },
    preventDefault() {
      if (edit.cancelable) {
        decided.decision = PREVENT;
      }
    },
    setData(data) {
      if (edit.cancelable && decided.decision.kind !== "prevent") {
        decided.decision = { kind: "rewrite", data };
      }
    },
  });
  return decided.decision;
}

/**
 * The text changed: the draft takes it, unread, then `onInput`. False when
 * nothing happened: the text is the same, or the field is idle (autofill
 * goes through `runAutofill`).
 */
export function runEdit<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  edit: TextEdit<N>,
): boolean {
  const start = env.get();
  const previousText = fieldText(start, env.format);
  if (start.phase.kind === "idle" || edit.text === previousText) {
    return false;
  }
  env.dispatch({ type: "edit", text: edit.text });
  env.handlers.onInput?.(
    eventBase(
      env,
      start,
      {
        value: start.value,
        previousValue: start.value,
        text: edit.text,
        previousText,
      },
      edit,
    ),
  );
  return true;
}

/**
 * Reads the draft's unread text: parse, then the change chain when it reads
 * as another value, else `onValidate` when whether (or why) it cannot be
 * read changed. `before` is the draft before the edits being read, which a
 * refused change puts back.
 */
export function runRead<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  before: FieldDraft<V>,
  cause: ChangeCause<N>,
): void {
  const start = env.get();
  const { draft } = start;
  if (draft.kind !== "text" || draft.reading.kind !== "pending") {
    return;
  }
  const reading = env.parse(draft.text);
  env.dispatch({ type: "read", reading });
  if (
    reading.kind === "unreadable" ||
    runChange(env, start, reading.value, draft.text, before, cause) ===
      "unchanged"
  ) {
    validateIfReadingChanged(env, start, before, cause);
  }
}

type ChangeResult = "changed" | "unchanged" | "prevented";

/**
 * The change chain: `onBeforeChange`, the change, `onChange`, validation and
 * `onValidate`, skipped when `target` is the value held. `typedText` is text
 * that reads as `target`, kept on screen; `null` shows the value formatted.
 */
function runChange<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  start: FieldState<V>,
  target: V | null,
  typedText: string | null,
  before: FieldDraft<V>,
  cause: ChangeCause<N>,
): ChangeResult {
  const previousValue = env.get().value;
  if (env.same(target, previousValue)) {
    if (typedText === null) {
      env.dispatch({ type: "revert", draft: CURRENT_DRAFT });
    }
    return "unchanged";
  }
  const previousText = draftText(env, before);
  const decided: {
    decision:
      typeof ALLOW | typeof PREVENT | { kind: "replace"; value: V | null };
  } = { decision: ALLOW };
  env.handlers.onBeforeChange?.({
    ...eventBase(
      env,
      start,
      {
        value: target,
        previousValue,
        text: typedText ?? env.format(target),
        previousText,
      },
      cause,
    ),
    get defaultPrevented() {
      return decided.decision.kind === "prevent";
    },
    preventDefault() {
      decided.decision = PREVENT;
    },
    setValue(value) {
      if (decided.decision.kind !== "prevent") {
        decided.decision = { kind: "replace", value };
      }
    },
  });
  const { decision } = decided;
  if (decision.kind === "prevent") {
    env.dispatch({ type: "revert", draft: before });
    return "prevented";
  }
  const value = decision.kind === "replace" ? decision.value : target;
  if (env.same(value, previousValue)) {
    // `setValue` chose the value already held: only the text changes back.
    env.dispatch({ type: "revert", draft: CURRENT_DRAFT });
    return "unchanged";
  }
  const text = typedText !== null && env.same(value, target) ? typedText : null;
  const changed = env.dispatch({ type: "change", value, text });
  const values = {
    value,
    previousValue,
    text: fieldText(changed, env.format),
    previousText,
  };
  env.handlers.onChange?.(eventBase(env, start, values, cause));
  env.dispatch({
    type: "validated",
    messages: env.validate(value, values.text),
  });
  emitValidate(env, start, values, cause);
  return "changed";
}

/** `onValidate` when the value stayed but whether, or why, the text cannot be read changed. */
function validateIfReadingChanged<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  start: FieldState<V>,
  before: FieldDraft<V>,
  cause: ChangeCause<N>,
): void {
  const state = env.get();
  if (unreadableMessage(before) === unreadableMessage(state.draft)) {
    return;
  }
  emitValidate(
    env,
    start,
    {
      value: state.value,
      previousValue: state.value,
      text: fieldText(state, env.format),
      previousText: draftText(env, before),
    },
    cause,
  );
}

/**
 * Puts the text `target` formats to on screen as if typed (`onInput`), then
 * runs the change chain to `target`: Escape's revert and the clear button.
 */
function replaceText<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  target: V | null,
  cause: ChangeCause<N>,
): void {
  const start = env.get();
  const before = start.draft;
  const previousText = fieldText(start, env.format);
  const text = env.format(target);
  if (text !== previousText) {
    env.dispatch({ type: "edit", text });
    env.dispatch({ type: "read", reading: parsed(target) });
    env.handlers.onInput?.(
      eventBase(
        env,
        start,
        { value: start.value, previousValue: start.value, text, previousText },
        cause,
      ),
    );
  }
  if (runChange(env, start, target, null, before, cause) === "unchanged") {
    validateIfReadingChanged(env, start, before, cause);
  }
}

/**
 * Focuses an idle field without an `onFocus`, for a change made while it had
 * no focus (autofill, a toggle clicked in a browser that does not focus it).
 * True when it did; the commit that follows then ends the edit.
 */
function enterQuietly<V, D extends object, N>(env: FieldEnv<V, D, N>): boolean {
  if (env.get().phase.kind !== "idle") {
    return false;
  }
  env.dispatch({ type: "focus" });
  return true;
}

/** `message` as a refusal, `messages.checkFailed` when none is given. */
function refusalOf(
  message: FieldMessageInput | undefined,
  messages: FormsMessages,
): FieldMessage {
  return toFieldMessage(message ?? messages.checkFailed, "commit", "refused");
}

/** What a commit event reports, read from the state before the commit. */
interface Committing<V> {
  readonly value: V | null;
  readonly committedValue: V | null;
  readonly initialValue: V | null;
  readonly previousText: string;
}

function commitEvent<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  start: FieldState<V>,
  request: CommitRequest<N>,
  committing: Committing<V>,
) {
  return {
    ...eventBase(
      env,
      start,
      {
        value: committing.value,
        previousValue: committing.committedValue,
        text: env.format(committing.value),
        previousText: committing.previousText,
      },
      {
        source: request.source,
        nativeEvent: request.nativeEvent,
        input: null,
      },
    ),
    trigger: request.trigger,
    changed: !env.same(committing.value, committing.committedValue),
    initialValue: committing.initialValue,
  };
}

/** What `state`, in an edit, would commit. */
function committingOf<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  state: FieldState<V>,
): Committing<V> | null {
  const { phase } = state;
  return phase.kind === "editing" || phase.kind === "checking"
    ? {
        value: state.value,
        committedValue: phase.committedValue,
        initialValue: phase.initialValue,
        previousText: fieldText(state, env.format),
      }
    : null;
}

/** The commit is allowed: accept, then `onCommit`. */
function accept<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  start: FieldState<V>,
  request: CommitRequest<N>,
  committing: Committing<V>,
  next: "editing" | "leaving" | "idle",
): void {
  env.dispatch({ type: "accept", next });
  env.handlers.onCommit?.(commitEvent(env, start, request, committing));
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

/**
 * A commit: `onBeforeCommit`, then `onCommit` once allowed. Text that
 * cannot be read commits nothing and shows why. Tab leaves the field
 * `leaving`, so the blur that follows commits nothing more; a blur ends the
 * edit. A field that was idle (`quiet`) returns to idle.
 */
function commitFrom<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  request: CommitRequest<N>,
  quiet: boolean,
): CommitStep<N> {
  const start = env.get();
  if (start.phase.kind === "checking") {
    // The pending check is about this same value: any change supersedes it.
    return { outcome: CHECKING, check: null };
  }
  const committing = committingOf(env, start);
  if (committing === null) {
    // Leaving: Tab has committed already.
    return { outcome: ACCEPTED, check: null };
  }
  if (unreadableMessage(start.draft) !== null) {
    env.dispatch({ type: "reveal" });
    if (quiet) {
      env.dispatch({ type: "blur" });
    }
    return { outcome: UNREADABLE, check: null };
  }
  const ends = quiet || request.trigger === "blur";
  const decided: { open: boolean; refusal: FieldMessage | null } = {
    open: true,
    refusal: null,
  };
  const answer: unknown = env.handlers.onBeforeCommit?.({
    ...commitEvent(env, start, request, committing),
    get defaultPrevented() {
      return decided.refusal !== null;
    },
    preventDefault(message) {
      if (decided.open && decided.refusal === null) {
        decided.refusal = refusalOf(message, env.messages);
      }
    },
  });
  if (isPromiseLike(answer)) {
    env.dispatch({
      type: "check",
      trigger: request.trigger,
      attempt: request.attempt,
      leaving: ends || request.trigger === "tab",
    });
    const close = (failed: boolean): FieldMessage | null => {
      decided.open = false;
      return (
        decided.refusal ?? (failed ? refusalOf(undefined, env.messages) : null)
      );
    };
    return {
      outcome: CHECKING,
      check: {
        ...request,
        quiet,
        answer: Promise.resolve(answer).then(
          () => close(false),
          () => close(true),
        ),
      },
    };
  }
  decided.open = false;
  if (decided.refusal !== null) {
    env.dispatch({
      type: "refuse",
      message: decided.refusal,
      next: ends ? "idle" : "editing",
    });
    return { outcome: REFUSED, check: null };
  }
  const next = ends
    ? "idle"
    : request.trigger === "tab"
      ? "leaving"
      : "editing";
  accept(env, start, request, committing, next);
  return { outcome: ACCEPTED, check: null };
}

/** A commit by Enter or Tab, or one an app or input asks for. */
export function runCommit<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  request: CommitRequest<N>,
): CommitStep<N> {
  return commitFrom(env, request, enterQuietly(env));
}

/**
 * A pending check answered. Ignored unless it is still the field's check:
 * a change since then, or a newer commit, superseded it. A field focus has
 * left gets its `onBlur` now.
 */
export function runSettle<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  check: PendingCheck<N>,
  refusal: FieldMessage | null,
  blurEvent: N | null,
): void {
  const start = env.get();
  const { phase } = start;
  const committing = committingOf(env, start);
  if (
    phase.kind !== "checking" ||
    phase.attempt !== check.attempt ||
    committing === null
  ) {
    return;
  }
  const next = phase.leaving ? "idle" : "editing";
  if (refusal === null) {
    accept(env, start, check, committing, next);
  } else {
    env.dispatch({ type: "refuse", message: refusal, next });
  }
  if (phase.leaving && !check.quiet) {
    emitBlur(env, blurEvent);
  }
}

/** The field gained focus: `onFocus`, unless it never lost it. */
export function runFocus<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  nativeEvent: N | null,
): void {
  const { phase } = env.get();
  if (phase.kind === "leaving") {
    // Tab committed but focus stayed: the edit goes on, unannounced.
    env.dispatch({ type: "focus" });
    return;
  }
  if (phase.kind !== "idle") {
    return;
  }
  const state = env.dispatch({ type: "focus" });
  env.handlers.onFocus?.({
    value: state.value,
    text: fieldText(state, env.format),
    nativeEvent,
  });
}

/**
 * The field lost focus. An edit commits (`trigger: "blur"`) unless Tab
 * already did or the field commits as it changes (`commitOnLeave: false`),
 * then `onBlur`; a pending check holds `onBlur` until it answers, and the
 * check this blur starts, if any, is returned.
 */
export function runBlur<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  nativeEvent: N | null,
  attempt: number,
): PendingCheck<N> | null {
  const { phase } = env.get();
  switch (phase.kind) {
    case "idle":
      return null;
    case "checking":
      env.dispatch({ type: "blur" });
      return null;
    case "leaving":
      env.dispatch({ type: "blur" });
      emitBlur(env, nativeEvent);
      return null;
    case "editing": {
      if (env.commitOnLeave) {
        const { check } = commitFrom(
          env,
          { trigger: "blur", source: "typing", nativeEvent, attempt },
          false,
        );
        if (check !== null) {
          return check;
        }
      }
      // A commit leaves the field idle; anything else still needs to end.
      env.dispatch({ type: "blur" });
      emitBlur(env, nativeEvent);
      return null;
    }
  }
}

/**
 * Escape: the text and value go back to the last commit (`source:
 * "revert"`). False when they are already there, or the field is not
 * being edited.
 */
export function runRevert<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  nativeEvent: N | null,
): boolean {
  const state = env.get();
  const { phase } = state;
  if (phase.kind !== "editing") {
    return false;
  }
  const target = phase.committedValue;
  if (
    env.same(state.value, target) &&
    fieldText(state, env.format) === env.format(target)
  ) {
    return false;
  }
  replaceText(env, target, { source: "revert", nativeEvent, input: null });
  return true;
}

/** The clear button: empty text, the value `null`, then a commit. */
export function runClear<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  nativeEvent: N | null,
  attempt: number,
): CommitStep<N> {
  const quiet = enterQuietly(env);
  replaceText(env, null, { source: "clear", nativeEvent, input: null });
  return commitFrom(
    env,
    { trigger: "clear", source: "clear", nativeEvent, attempt },
    quiet,
  );
}

/** A value chosen whole (a toggle, an option, a preset): the change chain, then a commit. */
export function runPick<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  value: V | null,
  request: CommitRequest<N>,
): CommitStep<N> {
  const quiet = enterQuietly(env);
  const start = env.get();
  const cause = {
    source: request.source,
    nativeEvent: request.nativeEvent,
    input: null,
  };
  if (runChange(env, start, value, null, start.draft, cause) === "unchanged") {
    validateIfReadingChanged(env, start, start.draft, cause);
  }
  return commitFrom(env, request, quiet);
}

/**
 * Text that changed while the field had no focus (browser autofill): read
 * at once and committed (`trigger: "autofill"`), with no `onFocus` or
 * `onBlur`. Returns the check a slow `onBeforeCommit` starts, if any.
 */
export function runAutofill<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  edit: TextEdit<N>,
  attempt: number,
): PendingCheck<N> | null {
  if (edit.text === fieldText(env.get(), env.format)) {
    return null;
  }
  const quiet = enterQuietly(env);
  const before = env.get().draft;
  runEdit(env, edit);
  runRead(env, before, edit);
  return commitFrom(
    env,
    {
      trigger: "autofill",
      source: edit.source,
      nativeEvent: edit.nativeEvent,
      attempt,
    },
    quiet,
  ).check;
}

const API: ChangeCause<never> = {
  source: "api",
  nativeEvent: null,
  input: null,
};

/** `setValue` and `reset`: the change chain with `source: "api"`, no commit. */
export function runApiChange<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  value: V | null,
): void {
  const start = env.get();
  if (runChange(env, start, value, null, start.draft, API) === "unchanged") {
    validateIfReadingChanged(env, start, start.draft, API);
  }
}

/**
 * A controlled value arrived: adopted, silently, whenever the user is not
 * typing, and validated when it changes the value.
 */
export function runSync<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
  value: V | null,
): void {
  const start = env.get();
  const next = env.dispatch({
    type: "sync",
    value,
    equal: env.same(value, start.value),
  });
  if (next !== start) {
    env.dispatch({
      type: "validated",
      messages: env.validate(next.value, fieldText(next, env.format)),
    });
  }
}

function sameMessages(
  a: readonly FieldMessage[],
  b: readonly FieldMessage[],
): boolean {
  return (
    a.length === b.length &&
    a.every((message, index) => {
      const other = b[index];
      return (
        other !== undefined &&
        message.severity === other.severity &&
        message.text === other.text &&
        message.code === other.code &&
        message.source === other.source
      );
    })
  );
}

/** Messages show from now on, the validators asked again. */
export function runReveal<V, D extends object, N>(
  env: FieldEnv<V, D, N>,
): void {
  const state = env.dispatch({ type: "reveal" });
  const messages = env.validate(state.value, fieldText(state, env.format));
  if (!sameMessages(messages, state.validation)) {
    env.dispatch({ type: "validated", messages });
  }
}
