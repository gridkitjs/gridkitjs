import type { FieldMessage } from "../messages/fieldMessage";
import type { ParseResult } from "../parse";
import type { CommitTrigger } from "./events";
import {
  CURRENT_DRAFT,
  IDLE_PHASE,
  unreadableMessage,
  type FieldDraft,
  type FieldPhase,
  type FieldState,
} from "./state";

/**
 * A step of a field's edit, as its controller asks for it. Parsing, the
 * app's hooks and value equality are the controller's, which passes their
 * results in (`read.reading`, `sync.equal`).
 *
 * - `focus`: the field gained focus.
 * - `edit`: the user changed the text; it is not read yet.
 * - `read`: how the typed text reads.
 * - `change`: the value changes; `text` is typed text that reads as it, or
 *   `null` to show the value formatted.
 * - `revert`: the draft is put back (a refused change, Escape).
 * - `validated`: what the validators say about the value now.
 * - `check`: an asynchronous `onBeforeCommit` starts deciding.
 * - `accept`, `refuse`: a commit is allowed or refused; `next` is the phase
 *   it leaves the field in.
 * - `blur`: the field lost focus.
 * - `sync`: a controlled value arrived; `equal` says whether it equals the
 *   field's value.
 * - `reveal`: messages show from now on.
 */
export type FieldAction<V> =
  | { readonly type: "focus" }
  | { readonly type: "edit"; readonly text: string }
  | { readonly type: "read"; readonly reading: ParseResult<V> }
  | {
      readonly type: "change";
      readonly value: V | null;
      readonly text: string | null;
    }
  | { readonly type: "revert"; readonly draft: FieldDraft<V> }
  | { readonly type: "validated"; readonly messages: readonly FieldMessage[] }
  | {
      readonly type: "check";
      readonly trigger: CommitTrigger;
      readonly attempt: number;
      readonly leaving: boolean;
    }
  | { readonly type: "accept"; readonly next: "editing" | "leaving" | "idle" }
  | {
      readonly type: "refuse";
      readonly message: FieldMessage;
      readonly next: "editing" | "idle";
    }
  | { readonly type: "blur" }
  | { readonly type: "sync"; readonly value: V | null; readonly equal: boolean }
  | { readonly type: "reveal" };

type EditPhase<V> = Exclude<FieldPhase<V>, { kind: "idle" }>;

/** `phase` as plain editing, keeping its two values. */
function editing<V>(phase: EditPhase<V>): FieldPhase<V> {
  return phase.kind === "editing"
    ? phase
    : {
        kind: "editing",
        initialValue: phase.initialValue,
        committedValue: phase.committedValue,
      };
}

/**
 * Every transition of a field. Pure: no parsing, no callbacks, no equality
 * of its own. An action that means nothing in the field's phase returns the
 * state unchanged.
 */
export function fieldReducer<V>(
  state: FieldState<V>,
  action: FieldAction<V>,
): FieldState<V> {
  const { phase } = state;
  switch (action.type) {
    case "focus":
      if (phase.kind === "idle") {
        return {
          ...state,
          phase: {
            kind: "editing",
            initialValue: state.value,
            committedValue: state.value,
          },
        };
      }
      return phase.kind === "leaving"
        ? { ...state, phase: editing(phase) }
        : state;

    case "edit":
      // An idle field takes no typing: autofill reaches it through a focus.
      return phase.kind === "idle"
        ? state
        : {
            ...state,
            draft: { kind: "text", text: action.text, reading: PENDING },
            refusal: null,
            phase: editing(phase),
          };

    case "read":
      return state.draft.kind === "text"
        ? { ...state, draft: { ...state.draft, reading: action.reading } }
        : state;

    case "change":
      return {
        ...state,
        value: action.value,
        draft:
          action.text === null
            ? CURRENT_DRAFT
            : {
                kind: "text",
                text: action.text,
                reading: { kind: "value", value: action.value },
              },
        refusal: null,
        // A change supersedes a pending check.
        phase: phase.kind === "checking" ? editing(phase) : phase,
      };

    case "revert":
      return phase.kind === "checking"
        ? state
        : { ...state, draft: action.draft };

    case "validated":
      return { ...state, validation: action.messages };

    case "check":
      return phase.kind === "editing"
        ? {
            ...state,
            phase: {
              kind: "checking",
              initialValue: phase.initialValue,
              committedValue: phase.committedValue,
              trigger: action.trigger,
              attempt: action.attempt,
              leaving: action.leaving,
            },
          }
        : state;

    case "accept":
      if (phase.kind !== "editing" && phase.kind !== "checking") {
        return state;
      }
      return {
        ...state,
        draft:
          unreadableMessage(state.draft) === null ? CURRENT_DRAFT : state.draft,
        refusal: null,
        revealed: true,
        phase:
          action.next === "idle"
            ? IDLE_PHASE
            : {
                kind: action.next,
                initialValue: phase.initialValue,
                committedValue: state.value,
              },
      };

    case "refuse":
      if (phase.kind !== "editing" && phase.kind !== "checking") {
        return state;
      }
      return {
        ...state,
        refusal: action.message,
        revealed: true,
        phase: action.next === "idle" ? IDLE_PHASE : editing(phase),
      };

    case "blur":
      return blur(state);

    case "sync":
      return sync(state, action.value, action.equal);

    case "reveal":
      return state.revealed ? state : { ...state, revealed: true };
  }
}

const PENDING = { kind: "pending" } as const;

/**
 * Focus went. A focused field goes idle and shows its messages; this is
 * reached only when leaving commits nothing (unreadable text, a toggle).
 * A pending check notes it, so its answer ends the edit.
 */
function blur<V>(state: FieldState<V>): FieldState<V> {
  const { phase } = state;
  switch (phase.kind) {
    case "idle":
      return state;
    case "editing":
      return { ...state, phase: IDLE_PHASE, revealed: true };
    case "checking":
      return { ...state, phase: { ...phase, leaving: true } };
    case "leaving":
      return { ...state, phase: IDLE_PHASE };
  }
}

/**
 * A controlled value is adopted whenever the user is not typing: always in
 * an idle field, and in a focused one while its draft shows the value. A
 * pending check holds it off; the next `sync` after the edit ends adopts it.
 */
function sync<V>(
  state: FieldState<V>,
  value: V | null,
  equal: boolean,
): FieldState<V> {
  const { phase } = state;
  if (equal || phase.kind === "checking") {
    return state;
  }
  if (phase.kind === "idle") {
    return { ...state, value, draft: CURRENT_DRAFT, refusal: null };
  }
  return state.draft.kind === "current"
    ? {
        ...state,
        value,
        refusal: null,
        phase: { ...phase, committedValue: value },
      }
    : state;
}
