import {
  createCompositeController,
  hasError,
  type CompositeController,
  type CompositeFieldOptions,
  type CompositeState,
  type FieldMessage,
  type FormsMessages,
  type NoDetails,
  type PartController,
  type Severity,
} from "@gridkitjs/forms-core";
import {
  attachFocusGroup,
  attachTextInput,
  type AttachedTextInput,
  type TextInputOptions,
} from "@gridkitjs/forms-dom";
import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
  type RefCallback,
} from "react";
import { useControlElement } from "./text/parts";
import type { FieldMode } from "./settings";
import {
  isFocused,
  useControllerLifecycle,
  useFieldReport,
  useInputSettings,
  useShownMessages,
  validatorsOf,
  type FieldInputProps,
} from "./useFieldInput";

/** The props `useCompositeInput` reads; an input made of parts passes on its own. */
export type CompositeInputProps<V, D extends object = NoDetails> = Omit<
  FieldInputProps<V, HTMLInputElement, D>,
  "parse" | "format" | "ref"
>;

/** How an input made of parts reads its parts and makes its value: the composite's own options. */
export type CompositeInputSpec<
  V,
  P extends Record<string, unknown>,
  D extends object = NoDetails,
> = Pick<
  CompositeFieldOptions<V, P, D, Event>,
  "parts" | "assemble" | "split" | "join" | "equals" | "details"
>;

/** What `useCompositeInput` gives the input that calls it, to draw. */
export interface CompositeInput<
  V,
  P extends Record<string, unknown>,
  D extends object = NoDetails,
> {
  readonly composite: CompositeController<V, P, D, Event>;
  readonly state: CompositeState<V, P>;
  /** The field's text: the parts' texts, joined. */
  readonly text: string;
  /** As `useFieldInput`'s: the messages to show, and the most serious one's severity. */
  readonly messages: readonly FieldMessage[];
  readonly severity: Severity | null;
  /** Whether a shown error, `invalid` or the `Field` marks the input invalid. */
  readonly invalid: boolean;
  readonly mode: FieldMode;
  readonly readOnly: boolean;
  readonly disabled: boolean;
  /** The input's own `required`, or the `Field`'s. */
  readonly required: boolean;
  /** The first control's `id`: the `Field`'s inside one, so its label points there. */
  readonly controlId: string;
  /** The `Field`'s description and messages, for each control's `aria-describedby`. */
  readonly describedBy: string | undefined;
  readonly strings: FormsMessages;
  readonly locale: Intl.LocalesArgument;
  /** Fires `onClear`, then empties the field and commits it. */
  readonly clear: (nativeEvent: Event | null) => void;
  /** The element around every part: focus leaving it commits the field. */
  readonly setRoot: RefCallback<HTMLElement>;
}

const NO_MESSAGES: readonly FieldMessage[] = [];

/**
 * Binds an input made of parts to one field, as `useFieldInput` binds one
 * control: forms-core's composite controller, made once and handed the
 * latest props and `spec` on every render; a controlled `value`; the
 * `Field` and form around it; and forms-dom's focus group on `setRoot`, so
 * focus leaving every part commits the field. Each part's control is
 * attached with `usePartControl`. `focusTarget` is the control
 * `handleRef`'s `focus` moves to.
 */
export function useCompositeInput<
  V,
  P extends Record<string, unknown>,
  D extends object = NoDetails,
>(
  props: CompositeInputProps<V, D>,
  spec: CompositeInputSpec<V, P, D>,
  focusTarget: HTMLInputElement | null,
): CompositeInput<V, P, D> {
  const { field, form, ownId, readOnly, disabled, mode, locale, messages } =
    useInputSettings(props);
  const options: CompositeFieldOptions<V, P, D, Event> = {
    ...spec,
    value: props.value,
    defaultValue: props.defaultValue,
    validators: validatorsOf(props.validate),
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
  const [composite] = useState(() => createCompositeController(options));
  composite.setOptions(options);
  const state = useSyncExternalStore(
    composite.subscribe,
    composite.getState,
    composite.getState,
  );
  const controller = composite.field;
  useControllerLifecycle(controller, props.value, form);

  const [root, setRoot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (root === null) {
      return undefined;
    }
    const group = attachFocusGroup(root, {
      onLeave: (by, nativeEvent) => {
        composite.leave(by, nativeEvent);
      },
    });
    return () => {
      group.detach();
    };
  }, [root, composite]);

  useImperativeHandle(
    props.handleRef,
    () => ({
      element: focusTarget,
      focus: (focusOptions) => {
        focusTarget?.focus(focusOptions);
      },
      blur: () => {
        const active = focusTarget?.ownerDocument.activeElement;
        if (active instanceof HTMLElement && root?.contains(active) === true) {
          active.blur();
        }
      },
      getValue: () => controller.getState().value,
      getText: controller.getText,
      setValue: controller.setValue,
      reset: controller.reset,
      revealMessages: controller.reveal,
    }),
    [focusTarget, root, controller],
  );

  const text = controller.getText();
  // A disabled field is not validated, so it shows none of its own messages.
  const own =
    state.field.revealed && !disabled ? controller.getMessages() : NO_MESSAGES;
  const { shown, severity } = useShownMessages(
    own,
    props.message,
    props.invalid,
    field,
  );
  const required = props.required === true;
  const partTexts = Object.keys(spec.parts).map((name) =>
    composite.parts[name as keyof P].getText(),
  );
  useFieldReport(field, ownId, shown, {
    focused: isFocused(state.field.phase),
    empty: partTexts.every((partText) => partText === ""),
    required,
    // A resting label would cover the parts and the separator between them.
    startAdornment: true,
  });
  const { onClear } = props;

  return {
    composite,
    state,
    text,
    messages: shown,
    severity,
    invalid:
      hasError(shown) || props.invalid === true || field?.invalid === true,
    mode,
    readOnly,
    disabled,
    required: required || field?.required === true,
    controlId: field?.controlId ?? props.id ?? ownId,
    describedBy: field?.describedBy,
    strings: messages,
    locale,
    clear: (nativeEvent) => {
      onClear?.({
        previousValue: controller.getState().value,
        previousText: controller.getText(),
        nativeEvent,
      });
      controller.clear(nativeEvent);
    },
    setRoot: setRoot,
  };
}

/**
 * Attaches forms-dom's text pipeline to one part's control, handing it
 * every render's options, and points `ref` at the control too. Returns the
 * control, once it is in the page, and the ref to give it.
 */
export function usePartControl<T>(
  part: PartController<T, Event>,
  ref: Ref<HTMLInputElement> | undefined,
  options: TextInputOptions,
): readonly [HTMLInputElement | null, RefCallback<HTMLInputElement>] {
  const [element, controlRef] = useControlElement(ref);
  const pipeline = useRef<AttachedTextInput | null>(null);
  useLayoutEffect(() => {
    if (element === null) {
      return undefined;
    }
    const attached = attachTextInput(element, part);
    pipeline.current = attached;
    return () => {
      attached.detach();
      pipeline.current = null;
    };
  }, [element, part]);
  // Every render's options, the attaching render's included: this effect
  // runs straight after the one above, before any event can arrive.
  useLayoutEffect(() => {
    pipeline.current?.setOptions(options);
  });
  return [element, controlRef];
}
