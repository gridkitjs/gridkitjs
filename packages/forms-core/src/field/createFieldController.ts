import type { FieldMessage } from "../messages/fieldMessage";
import type { FormsMessages } from "../messages/formsMessages";
import type {
  FormatContext,
  FormatPurpose,
  Formatter,
  ParseContext,
  ParseResult,
  Parser,
} from "../parse";
import type { Schedule } from "../schedule";
import { runValidators, type Validator } from "../validation/validators";
import type {
  ChangeSource,
  CommitTrigger,
  FieldHandlers,
  NoDetails,
} from "./events";
import { fieldReducer } from "./fieldReducer";
import {
  CHECKING,
  runApiChange,
  runAutofill,
  runBeforeInput,
  runBlur,
  runClear,
  runCommit,
  runEdit,
  runFocus,
  runPick,
  runRead,
  runReveal,
  runRevert,
  runSettle,
  runSync,
  type BeforeInputDecision,
  type ChangeCause,
  type CommitOutcome,
  type CommitStep,
  type FieldEnv,
  type PendingCheck,
  type TextEdit,
} from "./plan";
import {
  createFieldState,
  fieldMessages,
  fieldText,
  formatPurpose,
  type FieldDraft,
  type FieldState,
} from "./state";

/**
 * What a field is given: its value, how it reads and writes text, how it
 * validates, and the app's handlers. A renderer passes the latest on every
 * update through `setOptions`.
 */
export interface FieldOptions<
  V,
  D extends object = NoDetails,
  N = unknown,
> extends FieldHandlers<V, D, N> {
  /** Present (`null` included) means controlled: see `FieldController.sync`. */
  readonly value?: V | null | undefined;
  /** The value of an uncontrolled field at first, and what `reset` returns to. */
  readonly defaultValue?: V | null | undefined;
  /** The app's reading of typed text; its context holds `defaultParse`. */
  readonly parse?: Parser<V> | undefined;
  /** The app's writing of the value; its context holds `defaultFormat`. */
  readonly format?: Formatter<V> | undefined;
  /** The input's own reading. */
  readonly defaultParse: (
    text: string,
    context: ParseContext<V>,
  ) => ParseResult<V>;
  /** The input's own writing. */
  readonly defaultFormat: (
    value: V | null,
    context: FormatContext<V>,
  ) => string;
  /** Whether two values are one; `Object.is` by default. Never called with `null`. */
  readonly equals?: ((a: V, b: V) => boolean) | undefined;
  readonly validators?: readonly Validator<V>[] | undefined;
  /** The input's own details, added to every event it fires. */
  readonly details?:
    ((current: FieldState<V>, previous: FieldState<V>) => D) | undefined;
  /**
   * Milliseconds typing must pause before the text is read (`onChange`),
   * for a search box. `onInput` fires at once, and a commit reads at once.
   * Needs `schedule`; 0, the default, reads at once.
   */
  readonly changeDelay?: number | undefined;
  /** Whether leaving the field commits it: true by default, false for a toggle, which commits as it flips. */
  readonly commitOnLeave?: boolean | undefined;
  /** The timer `changeDelay` runs on. */
  readonly schedule?: Schedule | undefined;
  readonly locale?: Intl.LocalesArgument;
  readonly messages: FormsMessages;
}

/**
 * One field's state and every request that moves it, for a renderer to
 * drive: forms-dom calls the text and focus requests from the browser's
 * events, the app the value requests. Each request runs its sequence of
 * handlers to the end before the next starts: one made from inside a
 * handler is queued behind it.
 */
export interface FieldController<V, D extends object = NoDetails, N = unknown> {
  readonly getState: () => FieldState<V>;
  /** The text on screen. */
  readonly getText: () => string;
  /** Every message the field holds, in display order; the same array until the state changes. */
  readonly getMessages: () => readonly FieldMessage[];
  /** Calls `listener` once after each request that changed the state. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replaces the options, silently: no listener is called. */
  readonly setOptions: (options: FieldOptions<V, D, N>) => void;
  /** `onBeforeInput` for an edit about to happen, and what to do with it. */
  readonly beforeInput: (
    edit: TextEdit<N> & { readonly cancelable: boolean },
  ) => BeforeInputDecision;
  /**
   * The text changed. Read at once, after `changeDelay`, or, while an input
   * method composes (`input.isComposing`), once composition ends. While the
   * field is idle the change is autofill: read and committed at once.
   */
  readonly input: (edit: TextEdit<N>) => void;
  /** An input method finished composing: the text is read. */
  readonly endComposition: (nativeEvent: N | null) => void;
  readonly focus: (nativeEvent: N | null) => void;
  /** Reads any unread text, then commits it. */
  readonly commit: (
    trigger: CommitTrigger,
    nativeEvent: N | null,
  ) => CommitOutcome;
  /** Focus went: the edit commits, unless Tab did already. */
  readonly blur: (nativeEvent: N | null) => void;
  /** Escape: back to the last commit. False when there is nothing to put back. */
  readonly revert: (nativeEvent: N | null) => boolean;
  /** The clear button: `null`, then a commit. */
  readonly clear: (nativeEvent: N | null) => CommitOutcome;
  /** A value chosen whole (a toggle, an option, a preset), then a commit. */
  readonly pick: (
    value: V | null,
    source: ChangeSource,
    trigger: CommitTrigger,
    nativeEvent: N | null,
  ) => CommitOutcome;
  /** The change chain to `value`, with `source: "api"`. */
  readonly setValue: (value: V | null) => void;
  /** The change chain back to `defaultValue` (or `null`), with `source: "api"`. */
  readonly reset: () => void;
  /**
   * The controlled value, which a renderer passes on every update. Adopted
   * whenever the user is not typing, with no event; while they type it is
   * held, and the first `sync` after the edit ends adopts it.
   */
  readonly sync: (value: V | null) => void;
  /** Messages show from now on: a form's submit reveals every field. */
  readonly reveal: () => void;
  /** Cancels a scheduled reading and ignores a pending check's answer. */
  readonly destroy: () => void;
}

/** What waits to read the draft's text. Each wait holds what reading it needs. */
type ReadWait<V, N> =
  | { readonly kind: "none" }
  | {
      readonly kind: "composing";
      /** The draft before the edits being read, which a refused change puts back. */
      readonly before: FieldDraft<V>;
      readonly cause: ChangeCause<N>;
    }
  | {
      readonly kind: "delayed";
      readonly before: FieldDraft<V>;
      readonly cause: ChangeCause<N>;
      readonly cancel: () => void;
    };

/** A pending check, with the blur its `onBlur` reports once it answers. */
interface CheckWait<N> {
  readonly check: PendingCheck<N>;
  readonly blurEvent: N | null;
}

const NO_READ = { kind: "none" } as const;

/** The source a commit reports, by what triggered it. */
const COMMIT_SOURCES: Readonly<Record<CommitTrigger, ChangeSource>> = {
  enter: "typing",
  tab: "typing",
  blur: "typing",
  picker: "picker",
  preset: "preset",
  clear: "clear",
  toggle: "toggle",
  autofill: "autofill",
};

/** Writes a value for what `purpose` says the text is for when it is called. */
function formatterOf<V, D extends object, N>(
  options: FieldOptions<V, D, N>,
  purpose: () => FormatPurpose,
): (value: V | null) => string {
  const format = options.format ?? options.defaultFormat;
  return (value) => {
    const context: FormatContext<V> = {
      defaultFormat: (shown) => options.defaultFormat(shown, context),
      locale: options.locale,
      messages: options.messages,
      purpose: purpose(),
    };
    return format(value, context);
  };
}

function parserOf<V, D extends object, N>(
  options: FieldOptions<V, D, N>,
): (text: string) => ParseResult<V> {
  const parse = options.parse ?? options.defaultParse;
  const context: ParseContext<V> = {
    defaultParse: (text) => options.defaultParse(text, context),
    locale: options.locale,
    messages: options.messages,
  };
  return (text) => parse(text, context);
}

function validatorOf<V, D extends object, N>(
  options: FieldOptions<V, D, N>,
): (value: V | null, text: string) => FieldMessage[] {
  const validators = options.validators ?? [];
  return (value, text) =>
    runValidators(validators, value, {
      text,
      locale: options.locale,
      messages: options.messages,
    });
}

/**
 * A controller for one field. The field starts idle with `value` when
 * given (controlled), else `defaultValue`, else `null`, validated but with
 * no message shown.
 */
export function createFieldController<
  V,
  D extends object = NoDetails,
  N = unknown,
>(initialOptions: FieldOptions<V, D, N>): FieldController<V, D, N> {
  let options = initialOptions;
  const startValue =
    options.value === undefined
      ? (options.defaultValue ?? null)
      : options.value;
  let state = createFieldState<V>(
    startValue,
    validatorOf(options)(
      startValue,
      formatterOf(options, () => "display")(startValue),
    ),
  );
  const listeners = new Set<() => void>();
  let read: ReadWait<V, N> = NO_READ;
  let waiting: CheckWait<N> | null = null;
  let attempts = 0;
  let running = false;
  const queue: (() => void)[] = [];
  let shown: { state: FieldState<V>; messages: FieldMessage[] } | null = null;
  // An input that declares details passes `details`; without it, `D` is
  // `NoDetails` and an empty object is all of them.
  const noDetails = (): D => ({}) as D;
  const purposeNow = (): FormatPurpose => formatPurpose(state.phase);

  function env(): FieldEnv<V, D, N> {
    return {
      get: () => state,
      dispatch: (action) => (state = fieldReducer(state, action)),
      handlers: options,
      parse: parserOf(options),
      format: formatterOf(options, purposeNow),
      same: (a, b) =>
        a === null || b === null
          ? a === b
          : (options.equals ?? Object.is)(a, b),
      validate: validatorOf(options),
      details: options.details ?? noDetails,
      messages: options.messages,
      commitOnLeave: options.commitOnLeave ?? true,
    };
  }

  function setRead(next: ReadWait<V, N>): void {
    if (read.kind === "delayed" && read !== next) {
      read.cancel();
    }
    read = next;
  }

  /**
   * Lets go of what the state no longer needs: a wait to read text that is
   * no longer unread, a check the field is no longer waiting for.
   */
  function release(): void {
    const { draft, phase } = state;
    if (draft.kind !== "text" || draft.reading.kind !== "pending") {
      setRead(NO_READ);
    }
    if (phase.kind !== "checking") {
      waiting = null;
    }
  }

  /**
   * Runs `request` to the end, then whatever its handlers asked for in the
   * meantime, then tells listeners once if the state changed. A request made
   * while one runs is queued and answers `queued` at once.
   */
  function run<T>(request: () => T, queued: T): T {
    if (running) {
      queue.push(() => {
        request();
      });
      return queued;
    }
    running = true;
    const before = state;
    try {
      const result = request();
      release();
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        next();
        release();
      }
      return result;
    } finally {
      running = false;
      queue.length = 0;
      if (state !== before) {
        for (const listener of [...listeners]) {
          listener();
        }
      }
    }
  }

  function perform(request: () => void): void {
    run(request, undefined);
  }

  /** Reads the draft's text now, or once `changeDelay` has passed. */
  function readSoon(before: FieldDraft<V>, cause: ChangeCause<N>): void {
    const delay = options.changeDelay ?? 0;
    const { schedule } = options;
    if (delay > 0 && schedule !== undefined) {
      setRead({
        kind: "delayed",
        before,
        cause,
        cancel: schedule(() => {
          perform(flushRead);
        }, delay),
      });
      return;
    }
    setRead(NO_READ);
    runRead(env(), before, cause);
  }

  /** Reads text still waiting to be read, at once: a commit needs its value. */
  function flushRead(): void {
    if (read.kind === "none") {
      return;
    }
    const { before, cause } = read;
    setRead(NO_READ);
    runRead(env(), before, cause);
  }

  function awaitCheck(check: PendingCheck<N>, blurEvent: N | null): void {
    waiting = { check, blurEvent };
    void check.answer.then((refusal) => {
      perform(() => {
        if (waiting?.check !== check) {
          return;
        }
        const settled = waiting;
        waiting = null;
        runSettle(env(), check, refusal, settled.blurEvent);
      });
    });
  }

  function track(step: CommitStep<N>, blurEvent: N | null): CommitOutcome {
    if (step.check !== null) {
      awaitCheck(step.check, blurEvent);
    }
    return step.outcome;
  }

  function input(edit: TextEdit<N>): void {
    if (state.phase.kind === "idle") {
      const check = runAutofill(env(), edit, ++attempts);
      if (check !== null) {
        awaitCheck(check, null);
      }
      return;
    }
    const before = read.kind === "none" ? state.draft : read.before;
    const edited = runEdit(env(), edit);
    if (edit.input?.isComposing === true) {
      if (edited) {
        setRead({ kind: "composing", before, cause: edit });
      }
      return;
    }
    // A plain input also ends a composition whose end was not reported.
    if (edited || read.kind === "composing") {
      readSoon(before, edit);
    }
  }

  return {
    getState: () => state,
    getText: () => fieldText(state, formatterOf(options, purposeNow)),
    getMessages: () => {
      if (shown?.state !== state) {
        shown = { state, messages: fieldMessages(state) };
      }
      return shown.messages;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptions: (next) => {
      options = next;
    },
    // Changes no state, so it runs even inside another request: the browser
    // needs its answer before the edit happens.
    beforeInput: (edit) => runBeforeInput(env(), edit),
    input: (edit) => {
      perform(() => {
        input(edit);
      });
    },
    endComposition: (nativeEvent) => {
      perform(() => {
        if (read.kind !== "composing") {
          return;
        }
        const { before, cause } = read;
        readSoon(before, {
          ...cause,
          nativeEvent,
          input: cause.input && { ...cause.input, isComposing: false },
        });
      });
    },
    focus: (nativeEvent) => {
      perform(() => {
        runFocus(env(), nativeEvent);
      });
    },
    commit: (trigger, nativeEvent) =>
      run(() => {
        flushRead();
        return track(
          runCommit(env(), {
            trigger,
            source: COMMIT_SOURCES[trigger],
            nativeEvent,
            attempt: ++attempts,
          }),
          trigger === "blur" ? nativeEvent : null,
        );
      }, CHECKING),
    blur: (nativeEvent) => {
      perform(() => {
        flushRead();
        if (waiting !== null) {
          waiting = { ...waiting, blurEvent: nativeEvent };
        }
        const check = runBlur(env(), nativeEvent, ++attempts);
        if (check !== null) {
          awaitCheck(check, nativeEvent);
        }
      });
    },
    revert: (nativeEvent) => run(() => runRevert(env(), nativeEvent), false),
    clear: (nativeEvent) =>
      run(
        () => track(runClear(env(), nativeEvent, ++attempts), null),
        CHECKING,
      ),
    pick: (value, source, trigger, nativeEvent) =>
      run(
        () =>
          track(
            runPick(env(), value, {
              trigger,
              source,
              nativeEvent,
              attempt: ++attempts,
            }),
            null,
          ),
        CHECKING,
      ),
    setValue: (value) => {
      perform(() => {
        runApiChange(env(), value);
      });
    },
    reset: () => {
      perform(() => {
        runApiChange(env(), options.defaultValue ?? null);
      });
    },
    sync: (value) => {
      perform(() => {
        runSync(env(), value);
      });
    },
    reveal: () => {
      perform(() => {
        runReveal(env());
      });
    },
    destroy: () => {
      setRead(NO_READ);
      waiting = null;
    },
  };
}
