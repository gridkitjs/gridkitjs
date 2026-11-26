import type {
  ChangeSource,
  FieldController,
  FieldMessage,
  TextEdit,
  TextInputDetails,
} from "@gridkitjs/forms-core";
import { applyEdit, type TextRange } from "./applyEdit";

/** The native controls a text input draws. */
export type TextControl = HTMLInputElement | HTMLTextAreaElement;

export interface AttachedTextInput {
  /**
   * Removes every listener and clears the control's custom validity. The
   * controller is left as it is, so another control can be attached to it.
   */
  readonly detach: () => void;
}

/** The text and selection before an edit, which a refused change puts back. */
interface TextSnapshot {
  readonly text: string;
  readonly selectionStart: number | null;
  readonly selectionEnd: number | null;
  readonly selectionDirection: "forward" | "backward" | "none" | null;
}

/**
 * What the pipeline is in the middle of:
 *
 * - `ready`: nothing.
 * - `editing`: the browser is making an edit `onBeforeInput` allowed;
 *   `before` is the text and selection it started from.
 * - `composing`: an input method owns the text between `start` and the
 *   last `suffixLength` code units. Writes to the control wait for it.
 * - `rewriting`: inserting the data `onBeforeInput` gave in place of the
 *   browser's edit, which is reported once inserted; the events the insert
 *   itself fires are ignored. `before` is as for `editing`.
 * - `detached`: every listener is gone.
 */
type TextPipelineState =
  | { readonly kind: "ready" }
  | { readonly kind: "editing"; readonly before: TextSnapshot }
  | {
      readonly kind: "composing";
      readonly start: number;
      readonly suffixLength: number;
    }
  | { readonly kind: "rewriting"; readonly before: TextSnapshot }
  | { readonly kind: "detached" };

const READY: TextPipelineState = { kind: "ready" };
const DETACHED: TextPipelineState = { kind: "detached" };

/**
 * The one legacy call. `document.execCommand` is deprecated, but inserting
 * text through it is still the only way the browser's undo history keeps
 * an insert made from code.
 */
interface EditingDocument {
  execCommand(commandId: "insertText", showUI: boolean, value: string): boolean;
}

/**
 * `keyCode` is deprecated, but 229 is the only sign WebKit gives that the
 * Enter ending a composition went to the input method: it fires that
 * keydown after `compositionend`, with `isComposing` false.
 */
interface LegacyKeyboardEvent {
  readonly keyCode: number;
}

/** Where a browser edit came from, by its `inputType`. */
function sourceOf(inputType: string | null): ChangeSource {
  if (inputType === null) {
    return "typing";
  }
  if (inputType.startsWith("insertFromPaste")) {
    return "paste";
  }
  if (inputType === "insertFromDrop" || inputType === "deleteByDrag") {
    return "drop";
  }
  return inputType.startsWith("history") ? "undo" : "typing";
}

function hasFocus(control: TextControl): boolean {
  const root = control.getRootNode();
  return (
    (root instanceof Document || root instanceof ShadowRoot) &&
    root.activeElement === control
  );
}

function snapshot(control: TextControl): TextSnapshot {
  return {
    text: control.value,
    selectionStart: control.selectionStart,
    selectionEnd: control.selectionEnd,
    selectionDirection: control.selectionDirection,
  };
}

function errorText(messages: readonly FieldMessage[]): string {
  return messages.find((message) => message.severity === "error")?.text ?? "";
}

/**
 * Connects a native text control to a forms-core field controller, so the
 * controller decides what the control's text means and the control shows
 * what the controller holds. The renderer draws the control and calls
 * this once it is in the page.
 *
 * Reads the control's events into the controller's requests, each with the
 * browser event as its `nativeEvent`:
 *
 * - `focus` and `blur` start and end the edit; the blur commits it, unless
 *   Tab did.
 * - `beforeinput` asks `onBeforeInput` with the text the edit would leave,
 *   then lets the edit happen, prevents it, or inserts the handler's data
 *   in its place. `input` reports the text the edit left. Where it came
 *   from (`typing`, `paste`, `drop`, `undo`) is read from its `inputType`;
 *   text that changes while the field is not being edited is `autofill`.
 * - While an input method composes, every `input` reports `isComposing`
 *   and the text is read once `compositionend` arrives.
 * - Enter commits (in a `<textarea>`, Ctrl+Enter or Cmd+Enter, since Enter
 *   is a new line); Tab commits and, when `onBeforeCommit` refuses at once,
 *   keeps focus by preventing the key; Escape puts back the last committed
 *   text and takes the key when it did. Keys an input method is using, and
 *   keys another listener prevented, are left alone.
 * - A `reset` of the control's form that nobody prevented resets the
 *   field, with `source: "api"`.
 *
 * After every change of the field it writes the controller's text into
 * the control when the two differ, never while an input method composes.
 * On a focused control a refused change is put back with the selection it
 * had before the edit, and any other write keeps the selection's distance
 * from the end of the text, so separators a formatter adds before the
 * caret do not move it. A write to an unfocused control leaves the
 * selection alone. The control's custom validity holds the field's first
 * error, shown or not yet, so a plain `<form>` refuses to submit it.
 *
 * Inserting the handler's data goes through the browser's editing commands
 * where the browser allows it, so it can be undone; elsewhere it is set
 * directly. Setting the text from code (a refused change put back, a
 * commit normalizing the text, a value from the app) cannot be undone.
 */
export function attachTextInput<V, D extends object>(
  control: TextControl,
  controller: FieldController<V, D, Event>,
): AttachedTextInput {
  let state: TextPipelineState = READY;
  let customValidity = "";
  const listeners = new AbortController();
  const { signal } = listeners;

  function selection(): TextRange | null {
    const { selectionStart, selectionEnd } = control;
    if (state.kind === "composing") {
      return {
        start: state.start,
        end: control.value.length - state.suffixLength,
      };
    }
    return selectionStart === null || selectionEnd === null
      ? null
      : { start: selectionStart, end: selectionEnd };
  }

  function details(event: Event): TextInputDetails | null {
    if (!(event instanceof InputEvent)) {
      return null;
    }
    return {
      inputType: event.inputType === "" ? null : event.inputType,
      data: event.data,
      selectionStart: control.selectionStart,
      selectionEnd: control.selectionEnd,
      isComposing: event.isComposing,
    };
  }

  /** Puts `text` in the control, keeping the selection by the caret rule. */
  function writeText(text: string): void {
    if (!hasFocus(control)) {
      control.value = text;
      return;
    }
    const before =
      state.kind === "editing" || state.kind === "rewriting"
        ? state.before
        : null;
    if (before?.text === text) {
      control.value = text;
      if (before.selectionStart !== null && before.selectionEnd !== null) {
        control.setSelectionRange(
          before.selectionStart,
          before.selectionEnd,
          before.selectionDirection ?? undefined,
        );
      }
      return;
    }
    const { selectionStart, selectionEnd, selectionDirection } = control;
    const length = control.value.length;
    control.value = text;
    if (selectionStart !== null && selectionEnd !== null) {
      control.setSelectionRange(
        Math.max(0, text.length - (length - selectionStart)),
        Math.max(0, text.length - (length - selectionEnd)),
        selectionDirection ?? undefined,
      );
    }
  }

  /** Shows what the controller holds: its text, and its first error as the custom validity. */
  function render(): void {
    if (state.kind === "composing" || state.kind === "detached") {
      return;
    }
    const text = controller.getText();
    if (control.value !== text) {
      writeText(text);
    }
    const validity = errorText(controller.getMessages());
    if (validity !== customValidity) {
      customValidity = validity;
      control.setCustomValidity(validity);
    }
  }

  /** Inserts `data` where the browser was about to edit, as the edit `cause` describes. */
  function rewrite(cause: TextEdit<Event>, data: string): void {
    const range = selection();
    state = { kind: "rewriting", before: snapshot(control) };
    const editing: EditingDocument = control.ownerDocument;
    if (!editing.execCommand("insertText", false, data) && range !== null) {
      control.setRangeText(data, range.start, range.end, "end");
    }
    controller.input({ ...cause, text: control.value });
    state = READY;
  }

  /** Chromium fires a line break's `beforeinput` for Enter in an `<input>`, which takes no line breaks. */
  function editsNothing(inputType: string | null): boolean {
    return (
      control instanceof HTMLInputElement &&
      (inputType === "insertLineBreak" || inputType === "insertParagraph")
    );
  }

  function onBeforeInput(event: InputEvent): void {
    const inputType = event.inputType === "" ? null : event.inputType;
    if (state.kind === "rewriting" || editsNothing(inputType)) {
      return;
    }
    const range = selection();
    const data = event.data;
    const proposed =
      range === null || inputType === null
        ? null
        : applyEdit(control.value, range, inputType, data);
    const input: TextInputDetails = {
      inputType,
      data,
      selectionStart: range?.start ?? null,
      selectionEnd: range?.end ?? null,
      isComposing: event.isComposing || state.kind === "composing",
    };
    const edit: TextEdit<Event> = {
      text: proposed ?? control.value,
      source: sourceOf(inputType),
      input,
      nativeEvent: event,
    };
    const decision = controller.beforeInput({
      ...edit,
      cancelable: event.cancelable && !input.isComposing,
    });
    switch (decision.kind) {
      case "allow":
        if (state.kind !== "composing") {
          state = { kind: "editing", before: snapshot(control) };
        }
        return;
      case "prevent":
        event.preventDefault();
        return;
      case "rewrite":
        event.preventDefault();
        rewrite(
          { ...edit, input: { ...input, data: decision.data } },
          decision.data,
        );
        return;
    }
  }

  function onInput(event: Event): void {
    if (state.kind === "rewriting") {
      return;
    }
    const input = details(event);
    controller.input({
      text: control.value,
      source:
        controller.getState().phase.kind === "idle"
          ? "autofill"
          : sourceOf(input?.inputType ?? null),
      input,
      nativeEvent: event,
    });
    if (state.kind === "editing") {
      state = READY;
    }
  }

  function onCompositionStart(): void {
    const range = selection() ?? { start: 0, end: control.value.length };
    state = {
      kind: "composing",
      start: range.start,
      suffixLength: control.value.length - range.end,
    };
  }

  function onCompositionEnd(event: CompositionEvent): void {
    state = READY;
    controller.endComposition(event);
    render();
  }

  function isComposing(event: KeyboardEvent): boolean {
    const legacy: LegacyKeyboardEvent = event;
    return (
      event.isComposing || state.kind === "composing" || legacy.keyCode === 229
    );
  }

  function commitsOnEnter(event: KeyboardEvent): boolean {
    return control instanceof HTMLTextAreaElement
      ? event.ctrlKey || event.metaKey
      : true;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented || isComposing(event)) {
      return;
    }
    const modified = event.ctrlKey || event.altKey || event.metaKey;
    switch (event.key) {
      case "Enter":
        if (commitsOnEnter(event)) {
          controller.commit("enter", event);
        }
        return;
      case "Tab":
        if (!modified && controller.commit("tab", event).kind === "refused") {
          event.preventDefault();
        }
        return;
      case "Escape":
        if (!modified && !event.shiftKey && controller.revert(event)) {
          event.preventDefault();
        }
        return;
    }
  }

  // On the document, so the app's own listeners have had their say first.
  function onReset(event: Event): void {
    if (event.defaultPrevented || event.target !== control.form) {
      return;
    }
    controller.reset();
    // The browser's reset, which follows this event, puts back this text.
    control.defaultValue = controller.getText();
  }

  // A union of the two controls loses the event map, so listen through one type.
  const element: HTMLElement = control;
  element.addEventListener(
    "focus",
    (event) => {
      controller.focus(event);
    },
    { signal },
  );
  element.addEventListener(
    "blur",
    (event) => {
      controller.blur(event);
    },
    { signal },
  );
  element.addEventListener("beforeinput", onBeforeInput, { signal });
  element.addEventListener("input", onInput, { signal });
  element.addEventListener("compositionstart", onCompositionStart, { signal });
  element.addEventListener("compositionend", onCompositionEnd, { signal });
  element.addEventListener("keydown", onKeyDown, { signal });
  control.ownerDocument.addEventListener("reset", onReset, { signal });
  const unsubscribe = controller.subscribe(render);

  // A control focused before it was attached (`autofocus`) starts its edit now.
  if (hasFocus(control)) {
    controller.focus(null);
  }
  render();

  return {
    detach: () => {
      if (state.kind === "detached") {
        return;
      }
      state = DETACHED;
      listeners.abort();
      unsubscribe();
      control.setCustomValidity("");
    },
  };
}
