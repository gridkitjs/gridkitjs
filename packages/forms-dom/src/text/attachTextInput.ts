import type {
  ChangeSource,
  FieldController,
  FieldMessage,
  InputFilterDecision,
  TextEdit,
  TextInputDetails,
} from "@gridkitjs/forms-core";
import { applyEdit, type TextRange } from "./applyEdit";

/** The native controls a text input draws. */
export type TextControl = HTMLInputElement | HTMLTextAreaElement;

/**
 * What `attachTextInput` asks of the field it drives: a forms-core
 * `FieldController`, or one part of a composite input.
 */
export type TextInputController<V, D extends object> = Pick<
  FieldController<V, D, Event>,
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
>;

/** What a renderer can change about the pipeline while it is attached. */
export interface TextInputOptions {
  /**
   * Selects all the text when the control gains focus from the keyboard or
   * from code. A press of a pointer places the caret as usual.
   */
  readonly selectOnFocus?: boolean | undefined;
  /**
   * What Escape does: puts back the last committed text (`"revert"`, the
   * default), empties the field (`"clear"`, for a search box), or nothing.
   * It takes the key only when it changed something.
   */
  readonly escape?: "revert" | "clear" | "none" | undefined;
  /** Called just before Escape empties the field, for the renderer's `onClear`. */
  readonly onClear?: ((nativeEvent: Event) => void) | undefined;
  /**
   * Where the caret goes when the field's text is written into the focused
   * control: given the text before, the caret in it and the text after.
   * By default it keeps its distance from the end of the text.
   */
  readonly mapCaret?:
    | ((previousText: string, caret: number, nextText: string) => number)
    | undefined;
  /**
   * What the keypad's decimal key types, whatever the keyboard layout
   * gives: a number field's decimal separator, so the keypad "." of a US
   * keyboard types "," in a German field.
   */
  readonly decimalKey?: string | undefined;
  /**
   * The furthest a click may leave the caret in the text: a mask's first
   * empty slot. A click that places the caret past it moves it there; a
   * selection is left alone.
   */
  readonly lastCaret?: ((text: string) => number) | undefined;
}

export interface AttachedTextInput {
  /** Replaces the options, from the next event on. */
  readonly setOptions: (options: TextInputOptions) => void;
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
 *   last `suffixLength` code units, in place of what lay there in
 *   `before`, the text when it began. Writes to the control wait for it.
 * - `rewriting`: inserting the data `onBeforeInput` gave in place of the
 *   browser's edit, or the whole text the field's filter replaced it
 *   with, which is reported once inserted; the events the insert itself
 *   fires are ignored. `before` is as for `editing`.
 * - `detached`: every listener is gone.
 */
type TextPipelineState =
  | { readonly kind: "ready" }
  | { readonly kind: "editing"; readonly before: TextSnapshot }
  | {
      readonly kind: "composing";
      readonly start: number;
      readonly suffixLength: number;
      readonly before: string;
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
  execCommand(
    commandId: "insertText" | "delete",
    showUI: boolean,
    value?: string,
  ): boolean;
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

/** The default caret rule: the same distance from the end of the text. */
function caretFromEnd(
  previousText: string,
  caret: number,
  nextText: string,
): number {
  return Math.max(0, nextText.length - (previousText.length - caret));
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
 * - `beforeinput` asks `onBeforeInput`, then the field's own
 *   `filterInput`, with the text the edit would leave, then lets the edit
 *   happen, prevents it, inserts the handler's data in its place, or
 *   replaces the whole text and places the caret as the filter says.
 *   `input` reports the text the edit left. Where it came from (`typing`,
 *   `paste`, `drop`, `undo`) is read from its `inputType`; text that
 *   changes while the field is not being edited is `autofill`.
 * - With `options.decimalKey`, the keypad's decimal key types that text,
 *   judged as any other typing, in place of what the layout gives.
 * - While an input method composes, every `input` reports `isComposing`
 *   and the text is read once `compositionend` arrives. Then the field's
 *   `filterInput` judges the composed text as one insert over the range
 *   the composition replaced (`filterComposition`), and its replacement,
 *   rewrite or refusal is written as for any edit.
 * - With `options.lastCaret`, a click that leaves the caret past it moves
 *   the caret there.
 * - Enter commits (in a `<textarea>`, Ctrl+Enter or Cmd+Enter, since Enter
 *   is a new line); Tab commits and, when `onBeforeCommit` refuses at once,
 *   keeps focus by preventing the key; Escape puts back the last committed
 *   text, or empties the field, as `options.escape` says, and takes the key
 *   when it changed something. Keys an input method is using, and keys
 *   another listener prevented, are left alone.
 * - With `options.selectOnFocus`, focus from the keyboard or from code
 *   selects all the text.
 * - A `reset` of the control's form that nobody prevented resets the
 *   field, with `source: "api"`.
 *
 * After every change of the field it writes the controller's text into
 * the control when the two differ, never while an input method composes.
 * On a focused control a refused change is put back with the selection it
 * had before the edit, and any other write places the selection by
 * `options.mapCaret`, by default at its distance from the end of the
 * text, so separators a formatter adds before the caret do not move it. A
 * write to an unfocused control leaves the selection alone. The control's
 * custom validity holds the field's first error, shown or not yet, so a
 * plain `<form>` refuses to submit it.
 *
 * Inserting the handler's data, and replacing the text, go through the
 * browser's editing commands where the browser allows it, so they can be
 * undone; elsewhere the text is set directly. Setting the text from code
 * (a refused change put back, a commit normalizing the text, a value from
 * the app) cannot be undone.
 */
export function attachTextInput<V, D extends object>(
  control: TextControl,
  controller: TextInputController<V, D>,
  initialOptions: TextInputOptions = {},
): AttachedTextInput {
  let options = initialOptions;
  let state: TextPipelineState = READY;
  let customValidity = "";
  // A pointer pressed on the unfocused control: the focus that follows
  // places the caret, so it selects nothing. That focus, or the press's
  // click where focus comes later (a touch), clears it.
  let pointerFocus = false;
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
    const previous = control.value;
    control.value = text;
    if (selectionStart !== null && selectionEnd !== null) {
      const map = options.mapCaret ?? caretFromEnd;
      control.setSelectionRange(
        map(previous, selectionStart, text),
        map(previous, selectionEnd, text),
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

  /**
   * Replaces the whole text with `text`, as the field's own filter asked,
   * and puts the caret at `caret`. Text that stays the same only moves the
   * caret.
   */
  function replace(cause: TextEdit<Event>, text: string, caret: number): void {
    if (control.value !== text) {
      state = { kind: "rewriting", before: snapshot(control) };
      control.setSelectionRange(0, control.value.length);
      const editing: EditingDocument = control.ownerDocument;
      const inserted =
        text === ""
          ? editing.execCommand("delete", false)
          : editing.execCommand("insertText", false, text);
      if (!inserted || control.value !== text) {
        control.value = text;
      }
      controller.input({ ...cause, text: control.value });
      state = READY;
    }
    if (control.value === text) {
      control.setSelectionRange(caret, caret);
    }
  }

  /** What the app and the field's filter decide about an edit the browser is about to make. */
  function decide(
    inputType: string | null,
    data: string | null,
    nativeEvent: Event,
    cancelable: boolean,
    composing: boolean,
  ): {
    readonly edit: TextEdit<Event>;
    readonly decision: InputFilterDecision;
  } {
    const range = selection();
    const proposed =
      range === null || inputType === null
        ? null
        : applyEdit(control.value, range, inputType, data);
    const input: TextInputDetails = {
      inputType,
      data,
      selectionStart: range?.start ?? null,
      selectionEnd: range?.end ?? null,
      isComposing: composing,
    };
    const edit: TextEdit<Event> = {
      text: proposed ?? control.value,
      source: sourceOf(inputType),
      input,
      nativeEvent,
    };
    const decision = controller.beforeInput({
      ...edit,
      cancelable: cancelable && !composing,
    });
    return { edit, decision };
  }

  /** Inserts the data of a rewrite, or replaces the text, as `decision` says. */
  function applyOwn(
    edit: TextEdit<Event>,
    decision: InputFilterDecision,
  ): void {
    if (decision.kind === "rewrite") {
      rewrite(
        {
          ...edit,
          input: edit.input && { ...edit.input, data: decision.data },
        },
        decision.data,
      );
    } else if (decision.kind === "replace") {
      replace(edit, decision.text, decision.caret);
    }
  }

  function onBeforeInput(event: InputEvent): void {
    const inputType = event.inputType === "" ? null : event.inputType;
    if (state.kind === "rewriting" || editsNothing(inputType)) {
      return;
    }
    const { edit, decision } = decide(
      inputType,
      event.data,
      event,
      event.cancelable,
      event.isComposing || state.kind === "composing",
    );
    if (decision.kind === "allow") {
      if (state.kind !== "composing") {
        state = { kind: "editing", before: snapshot(control) };
      }
      return;
    }
    event.preventDefault();
    applyOwn(edit, decision);
  }

  /**
   * Types `data` as though the keyboard had: the app and the filter judge
   * it, then it is inserted. For a key whose own text is replaced, such as
   * the keypad's decimal key.
   */
  function typeText(data: string, nativeEvent: KeyboardEvent): void {
    const { edit, decision } = decide(
      "insertText",
      data,
      nativeEvent,
      true,
      false,
    );
    applyOwn(
      edit,
      decision.kind === "allow" ? { kind: "rewrite", data } : decision,
    );
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
      before: control.value,
    };
  }

  /**
   * Asks the field's filter about the text a composition left, as one
   * insert over the range it replaced, and writes what the filter decides:
   * its text, the composed text rewritten, or, when it refuses, the text
   * from before the composition.
   */
  function filterComposed(
    composition: Extract<TextPipelineState, { kind: "composing" }>,
    nativeEvent: CompositionEvent,
  ): void {
    const { start, suffixLength, before } = composition;
    const data = control.value.slice(
      start,
      control.value.length - suffixLength,
    );
    const replacedEnd = before.length - suffixLength;
    if (data === "" || replacedEnd < start) {
      return;
    }
    const edit: TextEdit<Event> = {
      text: control.value,
      source: "typing",
      input: {
        inputType: "insertCompositionText",
        data,
        selectionStart: start,
        selectionEnd: replacedEnd,
        isComposing: false,
      },
      nativeEvent,
    };
    const decision = controller.filterComposition(edit, before);
    switch (decision.kind) {
      case "allow":
        return;
      case "prevent":
        replace(edit, before, start);
        return;
      case "rewrite":
        replace(
          edit,
          before.slice(0, start) + decision.data + before.slice(replacedEnd),
          start + decision.data.length,
        );
        return;
      case "replace":
        replace(edit, decision.text, decision.caret);
        return;
    }
  }

  function onCompositionEnd(event: CompositionEvent): void {
    const composition = state.kind === "composing" ? state : null;
    // Firefox ends a composition committed in one step before the `input`
    // that reports its text, so the text is reported here; otherwise the
    // render below would write the old text over it. That late `input`
    // then finds nothing new.
    if (control.value !== controller.getText()) {
      controller.input({
        text: control.value,
        source: "typing",
        input: {
          inputType: "insertCompositionText",
          data: event.data,
          selectionStart: control.selectionStart,
          selectionEnd: control.selectionEnd,
          isComposing: true,
        },
        nativeEvent: event,
      });
    }
    state = READY;
    if (composition !== null) {
      filterComposed(composition, event);
    }
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
    // With Num Lock off the key is Delete, and stays one.
    if (
      event.code === "NumpadDecimal" &&
      event.key.length === 1 &&
      options.decimalKey !== undefined &&
      !modified &&
      !control.readOnly &&
      !control.disabled
    ) {
      event.preventDefault();
      typeText(options.decimalKey, event);
      return;
    }
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
        if (!modified && !event.shiftKey && escape(event)) {
          event.preventDefault();
        }
        return;
    }
  }

  /** Does what Escape does, and says whether it changed anything. */
  function escape(event: KeyboardEvent): boolean {
    switch (options.escape ?? "revert") {
      case "revert":
        return controller.revert(event);
      case "clear":
        if (control.readOnly || controller.getText() === "") {
          return false;
        }
        options.onClear?.(event);
        controller.clear(event);
        return true;
      case "none":
        return false;
    }
  }

  function onFocus(event: FocusEvent): void {
    controller.focus(event);
    if (options.selectOnFocus === true && !pointerFocus) {
      control.select();
    }
    pointerFocus = false;
  }

  /** Moves a caret a click left past `options.lastCaret` back to it. */
  function limitCaret(): void {
    const { lastCaret } = options;
    const { selectionStart, selectionEnd } = control;
    if (
      lastCaret === undefined ||
      selectionStart === null ||
      selectionStart !== selectionEnd ||
      !hasFocus(control)
    ) {
      return;
    }
    const last = lastCaret(control.value);
    if (selectionStart > last) {
      control.setSelectionRange(last, last);
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
  element.addEventListener("focus", onFocus, { signal });
  element.addEventListener(
    "pointerdown",
    () => {
      pointerFocus = !hasFocus(control);
    },
    { signal },
  );
  element.addEventListener(
    "click",
    () => {
      pointerFocus = false;
      limitCaret();
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
    setOptions: (next) => {
      options = next;
    },
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
