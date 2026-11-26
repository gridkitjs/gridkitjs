import {
  createFieldController,
  hasError,
  mostSevere,
  resolveFormsMessages,
  sortFieldMessages,
  toFieldMessages,
  type FieldMessage,
  type FieldMessageInput,
  type FieldOptions,
  type FieldPhase,
  type FieldState,
  type FormatContext,
  type Formatter,
  type FormsMessages,
  type NoDetails,
  type ParseContext,
  type ParseResult,
  type Parser,
  type Severity,
  type Validator,
} from "@gridkitjs/forms-core";
import {
  attachTextInput,
  scheduleTimeout,
  type AttachedTextInput,
  type TextControl,
  type TextInputOptions,
} from "@gridkitjs/forms-dom";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type Ref,
  type RefCallback,
} from "react";
import { DisplayValue } from "./DisplayValue";
import type { FieldClearEvent, FieldHandlers } from "./events";
import { useFieldContext } from "./field/fieldContext";
import { useFormContext } from "./form/formContext";
import { setRef } from "./refs";
import { useFormSettings, type FieldMode } from "./settings";

/** What an input does from code: focus it, read it, change it. */
export interface InputHandle<V> {
  /** The focusable element, while it is in the page. */
  readonly element: HTMLElement | null;
  focus(options?: FocusOptions): void;
  blur(): void;
  getValue(): V | null;
  getText(): string;
  /** `onBeforeChange`, `onChange` and `onValidate`, with `source: "api"`; no commit. */
  setValue(value: V | null): void;
  /** Back to `defaultValue`, or `null`, as `setValue` changes it. */
  reset(): void;
  /** Shows the field's messages from now on, as a commit attempt would. */
  revealMessages(): void;
}

/** How an input reads, writes and submits its value. */
export interface FieldInputKind<V> {
  /** The input's own reading of text, which a `parse` prop can wrap. */
  readonly defaultParse: (
    text: string,
    context: ParseContext<V>,
  ) => ParseResult<V>;
  /** The input's own writing of the value, which a `format` prop can wrap. */
  readonly defaultFormat: (
    value: V | null,
    context: FormatContext<V>,
  ) => string;
  /**
   * The value as its hidden input submits it, the same in every locale.
   * Never called with `null`, which submits `""`.
   */
  readonly serialize: (value: V) => string;
}

/** The props `useFieldInput` reads; an input passes on its own. */
export interface FieldInputProps<
  V,
  E extends TextControl = HTMLInputElement,
  D extends object = NoDetails,
> extends FieldHandlers<V, D> {
  /** Present, `null` included, means controlled. */
  readonly value?: V | null | undefined;
  /** The value of an uncontrolled field at first, and what `reset` returns to. */
  readonly defaultValue?: V | null | undefined;
  /** The app's reading of typed text; `context.defaultParse` is the input's own. */
  readonly parse?: Parser<V> | undefined;
  /** The app's writing of the value; `context.defaultFormat` is the input's own. */
  readonly format?: Formatter<V> | undefined;
  readonly validate?: Validator<V> | readonly Validator<V>[] | undefined;
  /**
   * The control needs a value: it sets `aria-required` and marks the label
   * of the `Field` around it. The input adds the check to `validate`.
   */
  readonly required?: boolean | undefined;
  /** The app's messages, always shown with the field's own; a string is an error. */
  readonly message?:
    FieldMessageInput | readonly FieldMessageInput[] | undefined;
  /** Shows the error state with no message, for a form library that shows its errors elsewhere. */
  readonly invalid?: boolean | undefined;
  /** Called first when the field is cleared, before its change and commit. */
  readonly onClear?: ((event: FieldClearEvent<V>) => void) | undefined;
  /** Submits the value under this name, through a hidden input. */
  readonly name?: string | undefined;
  /** The `id` of a `<form>` elsewhere in the page that the value belongs to. */
  readonly form?: string | undefined;
  readonly readOnly?: boolean | undefined;
  /** Disabled, and not submitted. */
  readonly disabled?: boolean | undefined;
  /** `"display"` shows the value as text; the `Field` or form around it sets it otherwise. */
  readonly mode?: FieldMode | undefined;
  /** The control's `id` outside a `Field`; inside one, the field's is used. */
  readonly id?: string | undefined;
  readonly locale?: Intl.LocalesArgument;
  /** Strings laid over the default English ones. */
  readonly messages?: Partial<FormsMessages> | undefined;
  /** The native control. */
  readonly ref?: Ref<E> | undefined;
  readonly handleRef?: Ref<InputHandle<V>> | undefined;
}

/** How the input that calls `useFieldInput` behaves, which its own props decide. */
export interface FieldInputOptions extends TextInputOptions {
  /**
   * Something sits at the control's start (a prefix, an icon), where a
   * resting floating label would cover it, so the label stays raised.
   */
  readonly startAdornment?: boolean | undefined;
  /**
   * Milliseconds typing must pause before the text is read (`onChange`),
   * for a search box; `onInput` fires at once and a commit reads at once.
   */
  readonly changeDelay?: number | undefined;
}

/** The props `useFieldInput` gives the native control. */
export interface FieldControlBinding<E extends TextControl> {
  readonly ref: RefCallback<E>;
  readonly id: string;
  /** The text on screen. The control's live text is forms-dom's, so it is never a controlled `value`. */
  readonly defaultValue: string;
  readonly readOnly: boolean | undefined;
  readonly disabled: boolean | undefined;
  readonly "aria-invalid": true | undefined;
  /** The description and messages of the `Field` around it. */
  readonly "aria-describedby": string | undefined;
  readonly "aria-required": true | undefined;
}

/** What `useFieldInput` gives the input that calls it, to draw. */
export interface FieldInput<V, E extends TextControl = HTMLInputElement> {
  readonly state: FieldState<V>;
  /** The text on screen. */
  readonly text: string;
  /**
   * The messages to show: the app's `message`, and the field's own from
   * the first commit attempt or `revealMessages` on, except while
   * disabled. A `Field` around the input lists them itself.
   */
  readonly messages: readonly FieldMessage[];
  /**
   * The most serious message shown, under the input or anywhere in the
   * `Field` around it, or `"error"` for `invalid`: the control box's
   * border colour.
   */
  readonly severity: Severity | null;
  /** Fires `onClear`, then empties the field and commits it (`source` and `trigger` `"clear"`). */
  readonly clear: (nativeEvent: Event | null) => void;
  /** The props', the `Field`'s or the form's. */
  readonly mode: FieldMode;
  /** The value as text, to draw in place of the control in display mode. */
  readonly displayValue: ReactElement;
  /** Spread onto the native control. */
  readonly controlProps: FieldControlBinding<E>;
  /** The hidden input carrying `name`, to draw beside the control; `null` without one. */
  readonly hiddenInput: ReactElement | null;
}

const NO_MESSAGES: readonly FieldMessage[] = [];

/** Whether the control has focus, from where the field is in an edit. */
function isFocused(phase: FieldPhase<unknown>): boolean {
  switch (phase.kind) {
    case "editing":
    case "leaving":
      return true;
    case "checking":
      return !phase.leaving;
    default:
      return false;
  }
}

/** `validate` as a list. */
export function validatorsOf<V>(
  validate: Validator<V> | readonly Validator<V>[] | undefined,
): readonly Validator<V>[] {
  if (validate === undefined) {
    return [];
  }
  return typeof validate === "function" ? [validate] : validate;
}

/**
 * Binds a native text control to a field: the value and draft model, the
 * events in their order, controlled and imperative changes, validation and
 * the hidden input that submits the value. The input that calls it draws
 * the control with `controlProps` spread on it, and `hiddenInput` beside
 * it; it renders nothing itself.
 *
 * It only wires: forms-core's controller decides every event, and forms-dom
 * connects it to the control once the control is in the page. The latest
 * props reach the controller on every render. A controlled `value` is
 * passed on after every render and adopted whenever the user is not
 * typing, with no event; `handleRef`'s `setValue` and `reset` fire the
 * change events with `source: "api"`.
 *
 * Inside a `Field` the control takes the field's `id`, description,
 * required and invalid states, and `readOnly`, `disabled` and `mode` from
 * the field and the form, and the hook tells the field its shown messages
 * and whether the control is focused, empty and required. `options` are
 * the calling input's own behaviour; the latest reach forms-dom after
 * every render.
 */
export function useFieldInput<
  V,
  E extends TextControl = HTMLInputElement,
  D extends object = NoDetails,
>(
  props: FieldInputProps<V, E, D>,
  kind: FieldInputKind<V>,
  options: FieldInputOptions = {},
): FieldInput<V, E> {
  const field = useFieldContext();
  const form = useFormContext();
  const formSettings = useFormSettings();
  const ownId = useId();
  const settings = field?.settings ?? formSettings;
  const readOnly = props.readOnly === true || settings.readOnly;
  const disabled = props.disabled === true || settings.disabled;
  const mode = props.mode ?? settings.mode;
  const locale = props.locale ?? settings.locale;
  const messages = useMemo(
    () =>
      props.messages === undefined && props.locale === undefined
        ? settings.messages
        : resolveFormsMessages(
            { ...settings.messageOverrides, ...props.messages },
            locale,
          ),
    [props.messages, props.locale, settings, locale],
  );
  const fieldOptions: FieldOptions<V, D, Event> = {
    value: props.value,
    defaultValue: props.defaultValue,
    parse: props.parse,
    format: props.format,
    defaultParse: kind.defaultParse,
    defaultFormat: kind.defaultFormat,
    validators: validatorsOf(props.validate),
    schedule: scheduleTimeout,
    changeDelay: options.changeDelay,
    locale,
    messages,
    onFocus: props.onFocus,
    onBeforeInput: props.onBeforeInput,
    onInput: props.onInput,
    onBeforeChange: props.onBeforeChange,
    onChange: props.onChange,
    onValidate: props.onValidate,
    onBeforeCommit: props.onBeforeCommit,
    onCommit: props.onCommit,
    onBlur: props.onBlur,
  };
  const [controller] = useState(() => createFieldController(fieldOptions));
  controller.setOptions(fieldOptions);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  const { value } = props;
  useLayoutEffect(() => {
    if (value !== undefined) {
      controller.sync(value);
    }
  });
  useEffect(
    () => () => {
      controller.destroy();
    },
    [controller],
  );
  useLayoutEffect(
    () => form?.registry.addRevealer(controller.reveal),
    [form, controller],
  );

  // The control in state, not a ref, so that a new `ref` prop rebinds the
  // app's ref without detaching the pipeline mid-edit.
  const [control, setControl] = useState<E | null>(null);
  const { ref } = props;
  const controlRef = useCallback<RefCallback<E>>(
    (element) => {
      setControl(element);
      const release = setRef(ref, element);
      return () => {
        setControl(null);
        release?.();
      };
    },
    [ref],
  );
  const { onClear } = props;
  function fireClear(nativeEvent: Event | null): void {
    onClear?.({
      previousValue: controller.getState().value,
      previousText: controller.getText(),
      nativeEvent,
    });
  }
  const pipelineOptions: TextInputOptions = {
    selectOnFocus: options.selectOnFocus,
    escape: options.escape,
    onClear: fireClear,
  };
  const pipeline = useRef<AttachedTextInput | null>(null);
  useLayoutEffect(() => {
    if (control === null) {
      return undefined;
    }
    const attached = attachTextInput(control, controller);
    pipeline.current = attached;
    return () => {
      attached.detach();
      pipeline.current = null;
    };
  }, [control, controller]);
  // Every render's options, the attaching render's included: this effect
  // runs straight after the one above, before any event can arrive.
  useLayoutEffect(() => {
    pipeline.current?.setOptions(pipelineOptions);
  });

  useImperativeHandle(
    props.handleRef,
    () => ({
      element: control,
      focus: (focusOptions) => {
        control?.focus(focusOptions);
      },
      blur: () => {
        control?.blur();
      },
      getValue: () => controller.getState().value,
      getText: controller.getText,
      setValue: controller.setValue,
      reset: controller.reset,
      revealMessages: controller.reveal,
    }),
    [control, controller],
  );

  const text = controller.getText();
  // A disabled field is not validated, so it shows none of its own messages.
  const own =
    state.revealed && !disabled ? controller.getMessages() : NO_MESSAGES;
  const { message } = props;
  const shown = useMemo(
    () =>
      message === undefined
        ? own
        : sortFieldMessages([...own, ...toFieldMessages(message, "app")]),
    [own, message],
  );
  const fieldSeverity = field?.severity ?? null;
  const severity =
    props.invalid === true
      ? "error"
      : mostSevere([
          ...shown.map((shownMessage) => shownMessage.severity),
          ...(fieldSeverity === null ? [] : [fieldSeverity]),
        ]);

  const setControlMessages = field?.setControlMessages;
  useLayoutEffect(() => {
    if (setControlMessages === undefined) {
      return undefined;
    }
    setControlMessages(ownId, shown);
    return () => {
      setControlMessages(ownId, NO_MESSAGES);
    };
  }, [setControlMessages, ownId, shown]);

  const setControlState = field?.setControlState;
  const focused = isFocused(state.phase);
  const empty = text === "";
  const required = props.required === true;
  const startAdornment = options.startAdornment === true;
  useLayoutEffect(() => {
    if (setControlState === undefined) {
      return undefined;
    }
    setControlState({ focused, empty, required, startAdornment });
    return () => {
      setControlState(null);
    };
  }, [setControlState, focused, empty, required, startAdornment]);

  return {
    state,
    text,
    messages: shown,
    severity,
    clear: (nativeEvent) => {
      fireClear(nativeEvent);
      controller.clear(nativeEvent);
    },
    mode,
    displayValue: <DisplayValue text={text} emptyText={messages.emptyValue} />,
    controlProps: {
      ref: controlRef,
      id: field?.controlId ?? props.id ?? ownId,
      defaultValue: text,
      readOnly,
      disabled,
      "aria-invalid":
        hasError(shown) ||
        props.invalid === true ||
        field?.invalid === true ||
        undefined,
      "aria-describedby": field?.describedBy,
      "aria-required": required || field?.required === true || undefined,
    },
    hiddenInput:
      props.name === undefined ? null : (
        <input
          type="hidden"
          name={props.name}
          form={props.form}
          disabled={disabled}
          value={state.value === null ? "" : kind.serialize(state.value)}
        />
      ),
  };
}
