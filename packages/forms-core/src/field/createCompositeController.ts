import type { FormsMessages } from "../messages/formsMessages";
import {
  unreadable,
  type FormatContext,
  type FormatPurpose,
  type ParseResult,
} from "../parse";
import {
  createFieldController,
  type FieldController,
  type FieldOptions,
} from "./createFieldController";
import type { CommitTrigger, FieldBeforeInputEvent, NoDetails } from "./events";
import type { ChangeCause, CommitOutcome } from "./plan";
import { unreadableMessage, type FieldState } from "./state";

/** Each part's value, by part name; `null` for an empty part. */
export type PartValues<P extends Record<string, unknown>> = {
  readonly [K in keyof P]: P[K] | null;
};

/** Each part's text, by part name. */
export type PartTexts<P extends Record<string, unknown>> = {
  readonly [K in keyof P]: string;
};

/**
 * Which part an event is about: the part whose edit it is, `"all"` for a
 * value set whole (`setValue`, a controlled value, a revert or clear), and
 * on a commit the part that differs from the last commit (`"all"` when
 * several do, `null` when none does).
 */
export type PartChange<P extends Record<string, unknown>> =
  keyof P | "all" | null;

/** How one part reads and writes its text. The composite owns its value and events. */
export type PartOptions<T, N = unknown> = Pick<
  FieldOptions<T, NoDetails, N>,
  | "parse"
  | "format"
  | "defaultParse"
  | "defaultFormat"
  | "equals"
  | "filterInput"
  | "locale"
>;

/** What `assemble` knows beside the parts' values. */
export interface AssembleContext {
  readonly locale: Intl.LocalesArgument;
  readonly messages: FormsMessages;
}

/** What a composite input's `details` is told beside the field's state. */
export interface CompositeDetailsContext<P extends Record<string, unknown>> {
  readonly changed: PartChange<P>;
  readonly parts: { readonly [K in keyof P]: FieldState<P[K]> };
  readonly texts: PartTexts<P>;
}

/**
 * What a composite input is given: the field's options, as for one input,
 * with how each part reads and writes, and how the parts' values make the
 * one value the app sees and back. The renderer passes the latest on every
 * update through `setOptions`.
 */
export interface CompositeFieldOptions<
  V,
  P extends Record<string, unknown>,
  D extends object = NoDetails,
  N = unknown,
> extends Omit<
  FieldOptions<V, D, N>,
  | "parse"
  | "format"
  | "defaultParse"
  | "defaultFormat"
  | "details"
  | "filterInput"
  | "changeDelay"
  | "schedule"
  | "commitOnLeave"
> {
  /** Each part, in the order the parts are read: a part's unreadable text is reported first. */
  readonly parts: { readonly [K in keyof P]: PartOptions<P[K], N> };
  /** The value the parts make, or why they make none (an end before its start). */
  readonly assemble: (
    parts: PartValues<P>,
    context: AssembleContext,
  ) => ParseResult<V>;
  /** Each part's value within `value`. */
  readonly split: (value: V | null) => PartValues<P>;
  /** The field's text, which events carry: the parts' texts, joined. */
  readonly join: (texts: PartTexts<P>) => string;
  /** The input's own details, added to every event the field fires. */
  readonly details?:
    | ((
        current: FieldState<V>,
        previous: FieldState<V>,
        context: CompositeDetailsContext<P>,
      ) => D)
    | undefined;
}

/**
 * One part's controller, for a renderer to attach a control to as it
 * would a field's: its text and state are the part's own; its edits,
 * Enter, Escape and the clear button act on the whole field.
 */
export type PartController<T, N = unknown> = Pick<
  FieldController<T, NoDetails, N>,
  | "getState"
  | "getText"
  | "getMessages"
  | "subscribe"
  | "beforeInput"
  | "input"
  | "endComposition"
  | "filterComposition"
  | "focus"
  | "commit"
  | "blur"
  | "revert"
  | "clear"
  | "reset"
  | "change"
>;

/** The field and its parts, whole: one object until any of them changes. */
export interface CompositeState<V, P extends Record<string, unknown>> {
  readonly field: FieldState<V>;
  readonly parts: { readonly [K in keyof P]: FieldState<P[K]> };
}

/**
 * An input made of parts (both ends of a range, an amount and its
 * currency) driven as one field. Expect this API to change while its first
 * users settle it.
 */
export interface CompositeController<
  V,
  P extends Record<string, unknown>,
  D extends object = NoDetails,
  N = unknown,
> {
  /** The field the app sees: its events, value and messages. */
  readonly field: Omit<FieldController<V, D, N>, "setOptions">;
  /** One controller per part, for a renderer to attach a control to. */
  readonly parts: { readonly [K in keyof P]: PartController<P[K], N> };
  readonly getState: () => CompositeState<V, P>;
  /** Calls `listener` after each request that changed the field or a part. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replaces the options, silently. */
  readonly setOptions: (options: CompositeFieldOptions<V, P, D, N>) => void;
  /**
   * Focus left the whole input (a part's own blur cannot tell): the field
   * commits with `trigger` `"tab"` or `"blur"`, then `onBlur`.
   */
  readonly leave: (by: "tab" | "blur", nativeEvent: N | null) => void;
  /** Cancels what the field and its parts wait for. */
  readonly destroy: () => void;
}

/** What the field is doing, which its events' `PartChange` reports. */
type Activity<P> =
  | { readonly kind: "whole" }
  | { readonly kind: "part"; readonly part: keyof P }
  | { readonly kind: "commit" };

const WHOLE = { kind: "whole" } as const;
const COMMITTING = { kind: "commit" } as const;

/** A value the composite pushes into a part. */
const API: ChangeCause<never> = {
  source: "api",
  nativeEvent: null,
  input: null,
};

/**
 * A controller for an input made of parts. Each part is a field of its
 * own with no app handlers: it reads, filters and writes its text as a
 * lone input does. The composite relays every part edit to the field the
 * app sees as an edit of the joined text, so `onBeforeInput` and `onInput`
 * fire with the part's edit, and the field reads its value from the parts
 * (`assemble`), then runs the change chain. A value the field takes whole
 * (`setValue` in `onBeforeChange`, a controlled value, a revert, a clear)
 * is pushed into the parts by `split`; a part whose text already reads as
 * its value keeps it while the user types, and every part shows its value
 * formatted once the field commits.
 *
 * Tab from part to part commits only the part, normalizing its text.
 * Enter in a part commits the field; Escape reverts it. Focus entering a
 * part of an idle field fires `onFocus`; focus leaving the whole input is
 * the renderer's to report through `leave`. Parts read at once: they take
 * no `changeDelay`.
 */
export function createCompositeController<
  V,
  P extends Record<string, unknown>,
  D extends object = NoDetails,
  N = unknown,
>(
  initialOptions: CompositeFieldOptions<V, P, D, N>,
): CompositeController<V, P, D, N> {
  let options = initialOptions;
  let activity: Activity<P> = WHOLE;
  // The part names, in the order the options list them. `keyof P` holds
  // exactly these keys, which `Object.keys` cannot say.
  const names = Object.keys(options.parts) as (keyof P)[];

  /** One entry per part, made by `make`. */
  function eachPart<R>(make: (name: keyof P) => R): Record<keyof P, R> {
    // `fromEntries` loses the keys' type; there is one entry per name.
    return Object.fromEntries(
      names.map((name) => [name, make(name)]),
    ) as Record<keyof P, R>;
  }

  function during<R>(next: Activity<P>, request: () => R): R {
    const before = activity;
    activity = next;
    try {
      return request();
    } finally {
      activity = before;
    }
  }

  function same(a: V | null, b: V | null): boolean {
    return a === null || b === null
      ? a === b
      : (options.equals ?? Object.is)(a, b);
  }

  function samePart<K extends keyof P>(
    name: K,
    a: P[K] | null,
    b: P[K] | null,
  ): boolean {
    return a === null || b === null
      ? a === b
      : (options.parts[name].equals ?? Object.is)(a, b);
  }

  function formatPart<K extends keyof P>(
    name: K,
    value: P[K] | null,
    purpose: FormatPurpose,
  ): string {
    const own = options.parts[name];
    const context: FormatContext<P[K]> = {
      defaultFormat: (shown) => own.defaultFormat(shown, context),
      locale: own.locale ?? options.locale,
      messages: options.messages,
      purpose,
    };
    return (own.format ?? own.defaultFormat)(value, context);
  }

  function partOptions<K extends keyof P>(
    name: K,
    value: P[K] | null,
  ): FieldOptions<P[K], NoDetails, N> {
    const own = options.parts[name];
    return {
      ...own,
      defaultValue: value,
      locale: own.locale ?? options.locale,
      messages: options.messages,
      onBeforeInput: (event) => {
        relayBeforeInput(name, event);
      },
    };
  }

  const startValue =
    options.value === undefined
      ? (options.defaultValue ?? null)
      : options.value;
  const startParts = options.split(startValue);
  // One controller per part; `eachPart` keys them by name.
  const parts = eachPart((name) =>
    createFieldController(partOptions(name, startParts[name])),
  ) as unknown as {
    readonly [K in keyof P]: FieldController<P[K], NoDetails, N>;
  };

  function texts(): PartTexts<P> {
    return eachPart((name) => parts[name].getText());
  }

  /** What the parts make now: the first unreadable part's message, or `assemble`'s reading. */
  function readParts(): ParseResult<V> {
    for (const name of names) {
      const message = unreadableMessage(parts[name].getState().draft);
      if (message !== null) {
        return unreadable(message);
      }
    }
    // Each entry is its part's value.
    const values = eachPart(
      (name) => parts[name].getState().value,
    ) as PartValues<P>;
    return options.assemble(values, {
      locale: options.locale,
      messages: options.messages,
    });
  }

  function changedNow(previous: FieldState<V>): PartChange<P> {
    switch (activity.kind) {
      case "part":
        return activity.part;
      case "whole":
        return "all";
      case "commit": {
        const { phase } = previous;
        if (phase.kind === "idle") {
          return "all";
        }
        const now = options.split(previous.value);
        const committed = options.split(phase.committedValue);
        const differ = names.filter(
          (name) => !samePart(name, now[name], committed[name]),
        );
        const [only] = differ;
        if (differ.length === 0 || only === undefined) {
          return null;
        }
        return differ.length === 1 ? only : "all";
      }
    }
  }

  function fieldOptions(): FieldOptions<V, D, N> {
    const { details } = options;
    return {
      ...options,
      defaultParse: () => readParts(),
      defaultFormat: (value, context) => {
        const values = options.split(value);
        return options.join(
          eachPart((name) => formatPart(name, values[name], context.purpose)),
        );
      },
      details:
        details &&
        ((current, previous) =>
          details(current, previous, {
            changed: changedNow(previous),
            // Each entry is its part's state.
            parts: eachPart((name) => parts[name].getState()) as {
              readonly [K in keyof P]: FieldState<P[K]>;
            },
            texts: texts(),
          })),
    };
  }

  const field = createFieldController(fieldOptions());

  /** The app's `onBeforeInput` for a part's edit, as an edit of the joined text. */
  function relayBeforeInput<K extends keyof P>(
    name: K,
    event: FieldBeforeInputEvent<P[K], NoDetails, N>,
  ): void {
    const decision = during({ kind: "part", part: name }, () =>
      field.beforeInput({
        text: options.join({ ...texts(), [name]: event.text }),
        source: event.source,
        nativeEvent: event.nativeEvent,
        input: event.input,
        cancelable: event.cancelable,
      }),
    );
    if (decision.kind === "prevent") {
      event.preventDefault();
    } else if (decision.kind === "rewrite") {
      event.setData(decision.data);
    }
  }

  /** A part's text changed: the field sees an edit of the joined text. */
  function relayEdit(name: keyof P, cause: ChangeCause<N>): void {
    during({ kind: "part", part: name }, () => {
      field.input({ ...cause, text: options.join(texts()) });
    });
  }

  /**
   * Shows the field's value in the parts. A part keeps its text when it
   * already holds its value and, unless `exact`, while that text reads as
   * it (typed digits not yet normalized). A part being composed is left to
   * the input method.
   */
  function showValue(exact: boolean): void {
    const target = options.split(field.getState().value);
    for (const name of names) {
      const part = parts[name];
      const { draft, value } = part.getState();
      if (draft.kind === "text" && draft.reading.kind === "pending") {
        continue;
      }
      const reads = draft.kind === "current" || draft.reading.kind === "value";
      if (
        samePart(name, value, target[name]) &&
        (draft.kind === "current" || (!exact && reads))
      ) {
        continue;
      }
      part.change(target[name], API);
    }
  }

  /**
   * After each request that changed the field: an idle field shows its
   * value in every part exactly (a swapped range's texts change places);
   * otherwise a value the parts do not make came from elsewhere, and is
   * pushed into them. Text that cannot be read is the user's, left alone.
   */
  function followField(): void {
    const state = field.getState();
    if (state.draft.kind === "current" && state.phase.kind === "idle") {
      showValue(true);
      return;
    }
    if (state.draft.kind === "text" && state.draft.reading.kind !== "value") {
      return;
    }
    const made = readParts();
    if (made.kind === "value" && same(made.value, state.value)) {
      return;
    }
    showValue(false);
  }
  field.subscribe(followField);

  function commitWhole(
    trigger: CommitTrigger,
    nativeEvent: N | null,
  ): CommitOutcome {
    return during(COMMITTING, () => {
      const outcome = field.commit(trigger, nativeEvent);
      if (outcome.kind === "accepted") {
        showValue(true);
      }
      return outcome;
    });
  }

  function facade<K extends keyof P>(name: K): PartController<P[K], N> {
    const part = parts[name];
    return {
      getState: part.getState,
      getText: part.getText,
      getMessages: part.getMessages,
      subscribe: part.subscribe,
      beforeInput: part.beforeInput,
      input: (edit) => {
        part.input(edit);
        relayEdit(name, edit);
      },
      endComposition: (nativeEvent) => {
        part.endComposition(nativeEvent);
        during({ kind: "part", part: name }, () => {
          field.endComposition(nativeEvent);
        });
      },
      filterComposition: part.filterComposition,
      focus: (nativeEvent) => {
        part.focus(nativeEvent);
        field.focus(nativeEvent);
      },
      commit: (trigger, nativeEvent) =>
        trigger === "tab"
          ? part.commit(trigger, nativeEvent)
          : commitWhole(trigger, nativeEvent),
      blur: part.blur,
      revert: (nativeEvent) => {
        const reverted = field.revert(nativeEvent);
        if (reverted) {
          showValue(true);
        }
        return reverted;
      },
      clear: field.clear,
      reset: field.reset,
      change: (value, cause) => {
        part.change(value, cause);
        relayEdit(name, cause);
      },
    };
  }

  // One facade per part; `eachPart` keys them by name.
  const facades = eachPart(facade) as unknown as {
    readonly [K in keyof P]: PartController<P[K], N>;
  };

  let snapshot: CompositeState<V, P> | null = null;

  return {
    field,
    parts: facades,
    getState: () => {
      const fieldState = field.getState();
      if (
        snapshot?.field !== fieldState ||
        names.some((name) => snapshot?.parts[name] !== parts[name].getState())
      ) {
        snapshot = {
          field: fieldState,
          // Each entry is its part's state.
          parts: eachPart((name) => parts[name].getState()) as {
            readonly [K in keyof P]: FieldState<P[K]>;
          },
        };
      }
      return snapshot;
    },
    subscribe: (listener) => {
      const unsubscribes = [
        field.subscribe(listener),
        ...names.map((name) => parts[name].subscribe(listener)),
      ];
      return () => {
        for (const unsubscribe of unsubscribes) {
          unsubscribe();
        }
      };
    },
    setOptions: (next) => {
      options = next;
      field.setOptions(fieldOptions());
      for (const name of names) {
        parts[name].setOptions(partOptions(name, parts[name].getState().value));
      }
    },
    leave: (by, nativeEvent) => {
      during(COMMITTING, () => {
        if (field.getState().phase.kind === "idle") {
          return;
        }
        if (by === "tab") {
          field.commit("tab", nativeEvent);
        }
        field.blur(nativeEvent);
      });
    },
    destroy: () => {
      field.destroy();
      for (const name of names) {
        parts[name].destroy();
      }
    },
  };
}
