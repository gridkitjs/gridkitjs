import type { NoDetails } from "@gridkitjs/forms-core";
import type {
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import type { Density } from "../settings";
import type { FieldInputProps } from "../useFieldInput";

/** Every input's props: the value, the events, validation and the shared states. */
export interface InputBaseProps<
  V,
  E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement,
  D extends object = NoDetails,
> extends Omit<FieldInputProps<V, E, D>, "parse" | "format" | "onBeforeInput"> {
  /** Shows a spinner in the box and marks the control busy. */
  readonly loading?: boolean | undefined;
  /** The `Field`'s or the form's otherwise. */
  readonly density?: Density | undefined;
  readonly autoFocus?: boolean | undefined;
  /**
   * Outside a `Field`, draws one around the input with this label, as a
   * `Field` would. Inside one, the `Field`'s label is used.
   */
  readonly label?: ReactNode;
  /** Outside a `Field`, the help text under the control, as a `Field`'s `description`. */
  readonly description?: ReactNode;
  readonly "aria-label"?: string | undefined;
  readonly "aria-labelledby"?: string | undefined;
  /** More descriptions for the control, after the input's own. */
  readonly "aria-describedby"?: string | undefined;
  /** On the input's root. */
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
}

/**
 * The attributes a text input sets on its native control itself, which
 * `controlProps` cannot override.
 */
export type ManagedControlProps =
  | "value"
  | "defaultValue"
  | "name"
  | "id"
  | "type"
  | "disabled"
  | "readOnly"
  | "required"
  | "form"
  | "placeholder"
  | "inputMode"
  | "enterKeyHint"
  | "autoComplete"
  | "autoFocus"
  | "maxLength"
  | "minLength"
  | "pattern"
  | "children"
  | "dangerouslySetInnerHTML"
  | `aria-${string}`
  | `on${string}`;

/** Every text input's props: `InputBaseProps` plus the text, the box and its buttons. */
export interface TextInputBaseProps<
  V,
  E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement,
  D extends object = NoDetails,
>
  extends
    InputBaseProps<V, E, D>,
    Pick<FieldInputProps<V, E, D>, "parse" | "format" | "onBeforeInput"> {
  /** Shown while the field is empty; with a floating label, only while the label is raised. Never a label. */
  readonly placeholder?: string | undefined;
  /** Inside the box, at the inline start: a unit, a currency, an icon. Read with the control. */
  readonly prefix?: ReactNode;
  /** Inside the box, at the inline end. Read with the control. */
  readonly suffix?: ReactNode;
  /** A button in the box that empties the field, shown while it has text and can be edited. */
  readonly clearable?: boolean | undefined;
  /** Selects all the text on focus from the keyboard or from code, not from a click. */
  readonly selectOnFocus?: boolean | undefined;
  readonly inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  readonly enterKeyHint?: HTMLAttributes<HTMLInputElement>["enterKeyHint"];
  /** What the browser's autofill and password managers offer. */
  readonly autoComplete?: InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  /**
   * Attributes for the native control the input does not manage, such as
   * `spellCheck` or `autoCapitalize`: those an `<input>` and a `<textarea>`
   * share.
   */
  readonly controlProps?:
    Omit<HTMLAttributes<HTMLElement>, ManagedControlProps> | undefined;
}
