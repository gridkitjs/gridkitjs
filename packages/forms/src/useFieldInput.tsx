import {
  createFieldController,
  hasError,
  resolveFormsMessages,
  type FieldMessage,
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
  type Validator,
} from "@gridkitjs/forms-core";
import {
  attachTextInput,
  scheduleTimeout,
  type TextControl,
} from "@gridkitjs/forms-dom";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type Ref,
  type RefCallback,
} from "react";
import { DisplayValue } from "./DisplayValue";
import type { FieldHandlers } from "./events";
import { useFieldContext } from "./field/fieldContext";
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
   * The messages to show: none until a commit attempt or `revealMessages`,
   * and none while disabled. A `Field` around the input lists them itself.
   */
  readonly messages: readonly FieldMessage[];
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

function validatorsOf<V>(
  validate: Validator<V> | readonly Validator<V>[] | undefined,
): readonly Validator<V>[] {
  if (validate === undefined) {
    return [];
  }
  return typeof validate === "function" ? [validate] : validate;
}

/** Points `ref` at `element`, and returns what lets go of it again. */
function setRef<T>(ref: Ref<T> | undefined, element: T): (() => void) | null {
  if (typeof ref === "function") {
    const cleanup = ref(element);
    return typeof cleanup === "function"
      ? cleanup
      : () => {
          ref(null);
        };
  }
  if (ref === undefined || ref === null) {
    return null;
  }
  ref.current = element;
  return () => {
    ref.current = null;
  };
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
 * and whether the control is focused and empty.
 */
export function useFieldInput<
  V,
  E extends TextControl = HTMLInputElement,
  D extends object = NoDetails,
>(props: FieldInputProps<V, E, D>, kind: FieldInputKind<V>): FieldInput<V, E> {
  const field = useFieldContext();
  const formSettings = useFormSettings();
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
  const options: FieldOptions<V, D, Event> = {
    value: props.value,
    defaultValue: props.defaultValue,
    parse: props.parse,
    format: props.format,
    defaultParse: kind.defaultParse,
    defaultFormat: kind.defaultFormat,
    validators: validatorsOf(props.validate),
    schedule: scheduleTimeout,
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
  const [controller] = useState(() => createFieldController(options));
  controller.setOptions(options);
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
  useLayoutEffect(() => {
    if (control === null) {
      return undefined;
    }
    return attachTextInput(control, controller).detach;
  }, [control, controller]);

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
  const shown =
    state.revealed && !disabled ? controller.getMessages() : NO_MESSAGES;

  const setControlMessages = field?.setControlMessages;
  useLayoutEffect(() => {
    if (setControlMessages === undefined) {
      return undefined;
    }
    setControlMessages(shown);
    return () => {
      setControlMessages(NO_MESSAGES);
    };
  }, [setControlMessages, shown]);

  const setControlState = field?.setControlState;
  const focused = isFocused(state.phase);
  const empty = text === "";
  useLayoutEffect(() => {
    if (setControlState === undefined) {
      return undefined;
    }
    setControlState({ focused, empty });
    return () => {
      setControlState(null);
    };
  }, [setControlState, focused, empty]);

  const ownId = useId();
  return {
    state,
    text,
    messages: shown,
    mode,
    displayValue: <DisplayValue text={text} emptyText={messages.emptyValue} />,
    controlProps: {
      ref: controlRef,
      id: field?.controlId ?? props.id ?? ownId,
      defaultValue: text,
      readOnly,
      disabled,
      "aria-invalid": hasError(shown) || field?.invalid === true || undefined,
      "aria-describedby": field?.describedBy,
      "aria-required": field?.required === true || undefined,
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
