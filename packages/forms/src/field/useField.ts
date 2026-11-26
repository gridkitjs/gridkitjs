import { toFieldMessages, type FieldMessageInput } from "@gridkitjs/forms-core";
import { useCallback, useId, useLayoutEffect, useRef } from "react";
import { useFormContext } from "../form/formContext";
import { useFormSettings, type Density, type FieldMode } from "../settings";
import { useFieldContext, type FieldControlState } from "./fieldContext";

/** The attributes `useField` gives an app's own control, to spread on it. */
export interface FieldControlProps {
  readonly id: string;
  readonly "aria-describedby": string | undefined;
  readonly "aria-invalid": true | undefined;
  readonly "aria-required": true | undefined;
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

/** What an app's own input tells `useField`. */
export interface UseFieldOptions {
  /**
   * Called when the `Form` around the input reveals every field's
   * messages, on a submit attempt, so the input shows its own messages as
   * a commit would. The form looks for an invalid control right after, so
   * a native constraint or `setCustomValidity` set here refuses the submit.
   */
  readonly onReveal?: (() => void) | undefined;
}

/** What `useField` gives an app's own input. */
export interface UseFieldResult {
  /** Spread onto the control. */
  readonly controlProps: FieldControlProps;
  readonly mode: FieldMode;
  readonly density: Density;
  /** The field is marked required: the input checks for a value itself. */
  readonly required: boolean;
  /**
   * Lists the input's own messages under the field, with the field's. Call
   * it from an effect, with `null` once there are none.
   */
  readonly reportMessages: (
    messages: FieldMessageInput | readonly FieldMessageInput[] | null,
  ) => void;
  /**
   * Tells the field whether the control is focused and empty, which a
   * floating label follows, and whether the input needs a value by a
   * `required` of its own, which marks the label. Call it from an effect
   * whenever any of them changes.
   */
  readonly reportControlState: (state: FieldControlState) => void;
}

/**
 * Wires an app's own input into the `Field` around it: the control's `id`
 * that the label names, its description, the invalid and required states,
 * and `readOnly` and `disabled` from the field and the form. Outside a
 * `Field` it gives the form's settings and an `id` of its own, and the
 * reports go nowhere.
 */
export function useField(options: UseFieldOptions = {}): UseFieldResult {
  const field = useFieldContext();
  const form = useFormContext();
  const formSettings = useFormSettings();
  const ownId = useId();

  // The latest callback, read when the form reveals, so a new function on
  // every render does not add the input to the form again.
  const onReveal = useRef(options.onReveal);
  useLayoutEffect(() => {
    onReveal.current = options.onReveal;
  });
  useLayoutEffect(
    () =>
      form?.registry.addRevealer(() => {
        onReveal.current?.();
      }),
    [form],
  );
  const settings = field?.settings ?? formSettings;
  const setControlMessages = field?.setControlMessages;
  const setControlState = field?.setControlState;

  const reportMessages = useCallback(
    (messages: FieldMessageInput | readonly FieldMessageInput[] | null) => {
      setControlMessages?.(ownId, toFieldMessages(messages, "app"));
    },
    [setControlMessages, ownId],
  );
  const reportControlState = useCallback(
    (state: FieldControlState) => {
      setControlState?.(state);
    },
    [setControlState],
  );

  return {
    controlProps: {
      id: field?.controlId ?? ownId,
      "aria-describedby": field?.describedBy,
      "aria-invalid": field?.invalid === true || undefined,
      "aria-required": field?.required === true || undefined,
      disabled: settings.disabled,
      readOnly: settings.readOnly,
    },
    mode: settings.mode,
    density: settings.density,
    required: field?.required ?? false,
    reportMessages,
    reportControlState,
  };
}
