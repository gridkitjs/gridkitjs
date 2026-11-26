import type { FieldMessage } from "@gridkitjs/forms-core";
import { createContext, useContext } from "react";
import type { FormSettings } from "../settings";

/**
 * What an input tells the `Field` around it about its control, so a
 * floating label knows whether to rest inside the control or rise above.
 */
export interface FieldControlState {
  readonly focused: boolean;
  /** No text in the control. */
  readonly empty: boolean;
  /** Something sits at the control's start, such as a prefix, where a resting label would cover it. */
  readonly startAdornment?: boolean | undefined;
}

/** What a `Field` gives the input inside it. */
export interface FieldContextValue {
  /** The control's `id`, which the label's `for` names. */
  readonly controlId: string;
  /** The field's own settings, its props laid over the form's. */
  readonly settings: FormSettings;
  /** `aria-describedby` for the control: the description and the messages. */
  readonly describedBy: string;
  readonly required: boolean;
  /** An error is shown under the field, from the app or from the input. */
  readonly invalid: boolean;
  /** The input's shown messages, which the field lists with its own. */
  readonly setControlMessages: (messages: readonly FieldMessage[]) => void;
  /** `null` when the input goes. */
  readonly setControlState: (state: FieldControlState | null) => void;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

/** The `Field` around the caller, or `null` outside one. */
export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}
