import { toFieldMessages, type FieldMessageInput } from "@gridkitjs/forms-core";
import { useCallback, useId } from "react";
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
   * floating label follows. Call it from an effect whenever either changes.
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
export function useField(): UseFieldResult {
  const field = useFieldContext();
  const formSettings = useFormSettings();
  const ownId = useId();
  const settings = field?.settings ?? formSettings;
  const setControlMessages = field?.setControlMessages;
  const setControlState = field?.setControlState;

  const reportMessages = useCallback(
    (messages: FieldMessageInput | readonly FieldMessageInput[] | null) => {
      setControlMessages?.(toFieldMessages(messages, "app"));
    },
    [setControlMessages],
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
