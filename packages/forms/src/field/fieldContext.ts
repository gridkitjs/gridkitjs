import type { FieldMessage, Severity } from "@gridkitjs/forms-core";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
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
  /** The input needs a value by a `required` of its own, so the field marks its label. */
  readonly required?: boolean | undefined;
}

/** What a `Field`, or a `FieldGroup`, gives the inputs inside it. */
export interface FieldContextValue {
  /**
   * The control's `id`, which the label's `for` names; `null` in a
   * group, whose inputs each keep their own.
   */
  readonly controlId: string | null;
  /** The field's own settings, its props laid over the form's. */
  readonly settings: FormSettings;
  /** `aria-describedby` for the control: the description and the messages. */
  readonly describedBy: string;
  /** The field's `required`: the input checks for a value. */
  readonly required: boolean;
  /**
   * An error is shown under the field: from the app, or in a single field
   * from its input. In a group each input marks only its own errors.
   */
  readonly invalid: boolean;
  /**
   * The most serious message shown under a single field, which its
   * control's border takes; `null` in a group, whose inputs each take
   * their own.
   */
  readonly severity: Severity | null;
  /**
   * The shown messages of the input `reporter` names (its own `useId`),
   * which the field lists with its own; none takes the report back.
   */
  readonly setControlMessages: (
    reporter: string,
    messages: readonly FieldMessage[],
  ) => void;
  /** `null` when the input goes. A group ignores it. */
  readonly setControlState: (state: FieldControlState | null) => void;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

/** The `Field` around the caller, or `null` outside one. */
export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

const NO_MESSAGES: readonly FieldMessage[] = [];
const NO_REPORTS: ReadonlyMap<string, readonly FieldMessage[]> = new Map();

/**
 * What the inputs inside a field or a group report as their shown
 * messages, in the order they first reported, and the setter they report
 * through.
 */
export function useControlMessages(): readonly [
  readonly FieldMessage[],
  FieldContextValue["setControlMessages"],
] {
  const [reports, setReports] = useState(NO_REPORTS);
  const setControlMessages = useCallback(
    (reporter: string, messages: readonly FieldMessage[]) => {
      setReports((current) => {
        if (messages.length === 0) {
          if (!current.has(reporter)) {
            return current;
          }
          const next = new Map(current);
          next.delete(reporter);
          return next;
        }
        return current.get(reporter) === messages
          ? current
          : new Map(current).set(reporter, messages);
      });
    },
    [],
  );
  const messages = useMemo(
    () => (reports.size === 0 ? NO_MESSAGES : [...reports.values()].flat()),
    [reports],
  );
  return [messages, setControlMessages];
}
