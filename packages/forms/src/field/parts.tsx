import {
  sortFieldMessages,
  toFieldMessages,
  type FieldMessage,
  type FieldMessageInput,
  type FormsMessages,
} from "@gridkitjs/forms-core";
import { useMemo, type CSSProperties } from "react";
import type { NecessityIndicator } from "../settings";

/** Columns a field, a group or a fieldset takes in a `FormLayout`. */
export type FieldSpan = 1 | 2 | 3 | 4 | "full";

/** The state class for `span`; none for one column. */
export function spanClass(span: FieldSpan | undefined): string | false {
  return span !== undefined && span !== 1 && `is-span-${String(span)}`;
}

/** `style` with the label column's width set, when there is one. */
export function withLabelWidth(
  style: CSSProperties | undefined,
  labelWidth: string | undefined,
): CSSProperties | undefined {
  return labelWidth === undefined
    ? style
    : ({
        ...style,
        "--gridkit-forms-label-width": labelWidth,
      } as CSSProperties);
}

/** Joins the class names that are set. */
export function classNames(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

const NO_MESSAGES: readonly FieldMessage[] = [];

/**
 * The messages a field or group shows: its inputs' and the app's, most
 * serious first. A disabled one shows only the app's.
 */
export function useShownMessages(
  controlMessages: readonly FieldMessage[],
  message: FieldMessageInput | readonly FieldMessageInput[] | undefined,
  disabled: boolean,
): readonly FieldMessage[] {
  return useMemo(
    () =>
      sortFieldMessages([
        ...(disabled ? NO_MESSAGES : controlMessages),
        ...toFieldMessages(message, "app"),
      ]),
    [disabled, controlMessages, message],
  );
}

/**
 * The marker after a label: a star for a required field, hidden from
 * screen readers since the control's `aria-required` says it, or
 * "(optional)" for the others, read as part of the label.
 */
export function NecessityMarker({
  required,
  indicator,
  strings,
}: {
  readonly required: boolean;
  readonly indicator: NecessityIndicator;
  readonly strings: FormsMessages;
}) {
  if (required && indicator === "required") {
    return (
      <span className="gridkit-forms-field-required" aria-hidden="true">
        *
      </span>
    );
  }
  if (!required && indicator === "optional") {
    return (
      <span className="gridkit-forms-field-optional">
        {` (${strings.optional})`}
      </span>
    );
  }
  return null;
}
