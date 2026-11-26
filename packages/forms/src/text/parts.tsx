import type {
  FieldMessage,
  FormsMessages,
  Severity,
} from "@gridkitjs/forms-core";
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type RefCallback,
} from "react";
import { warnOnce } from "../dev";
import { Field } from "../field/Field";
import { useFieldContext } from "../field/fieldContext";
import { FieldMessages } from "../field/FieldMessages";
import { classNames } from "../field/parts";
import { setRef } from "../refs";
import type { Density, FieldMode } from "../settings";
import type { TextControl } from "@gridkitjs/forms-dom";

function Icon({ children }: { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ClearIcon() {
  return (
    <Icon>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  );
}

export function EyeIcon() {
  return (
    <Icon>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  );
}

/** Keeps focus, and the selection, in the control when a button in its box is pressed. */
export function keepFocus(event: PointerEvent | MouseEvent): void {
  event.preventDefault();
}

/** The density state class; none for `standard`. */
export function densityClass(density: Density): string | false {
  return density !== "standard" && `is-${density}`;
}

/** Joins the ids that are set into one `aria-describedby`, or `undefined` for none. */
export function joinIds(
  ...ids: (string | false | undefined)[]
): string | undefined {
  const joined = ids.filter(Boolean).join(" ");
  return joined === "" ? undefined : joined;
}

/**
 * The native control, in state for the input's own behaviours, and one
 * ref that also points the app's `ref` at it.
 */
export function useControlElement<E extends TextControl>(
  ref: Ref<E> | undefined,
): readonly [E | null, RefCallback<E>] {
  const [element, setElement] = useState<E | null>(null);
  const merged = useCallback<RefCallback<E>>(
    (control) => {
      setElement(control);
      const release = setRef(ref, control);
      return () => {
        setElement(null);
        release?.();
      };
    },
    [ref],
  );
  return [element, merged];
}

/**
 * Outside a `Field`, an input given a `label` or a `description` draws a
 * `Field` around itself with them; otherwise it draws only itself.
 */
export function InputFrame({
  label,
  description,
  id,
  mode,
  density,
  readOnly,
  disabled,
  children,
}: {
  readonly label: ReactNode;
  readonly description: ReactNode;
  readonly id: string | undefined;
  readonly mode: FieldMode | undefined;
  readonly density: Density | undefined;
  readonly readOnly: boolean | undefined;
  readonly disabled: boolean | undefined;
  readonly children: ReactNode;
}) {
  const field = useFieldContext();
  const hasLabel = label !== undefined && label !== null;
  const hasDescription = description !== undefined && description !== null;
  if (field !== null || (!hasLabel && !hasDescription)) {
    return children;
  }
  return (
    <Field
      label={label}
      description={description}
      id={id}
      mode={mode}
      density={density}
      readOnly={readOnly}
      disabled={disabled}
    >
      {children}
    </Field>
  );
}

/**
 * A bare input's own message area, outside any `Field`; a `Field` lists
 * the messages itself, so inside one this draws nothing. Warns once in
 * development when the bare input has no name at all.
 */
export function OwnMessages({
  id,
  messages,
  strings,
  named,
}: {
  readonly id: string;
  readonly messages: readonly FieldMessage[];
  readonly strings: FormsMessages;
  /** The control has an `aria-label` or an `aria-labelledby`. */
  readonly named: boolean;
}) {
  const inField = useFieldContext() !== null;
  useEffect(() => {
    if (!inField && !named) {
      warnOnce(
        "input-label",
        "An input outside a Field has no label, aria-label or aria-labelledby, so it has no name. Give it one of them (a placeholder is not a name).",
      );
    }
  }, [inField, named]);
  return inField ? null : (
    <FieldMessages id={id} messages={messages} strings={strings} />
  );
}

/** The id of a bare input's own message area, when it has one. */
export function useOwnMessagesId(controlId: string): string | undefined {
  return useFieldContext() === null ? `${controlId}-messages` : undefined;
}

/**
 * The drawn box around a text control: its border, background and focus
 * ring, in the colour of the most serious message shown, with the
 * adornments, the clear button and the spinner inside it.
 */
export function ControlBox({
  severity,
  disabled,
  readOnly,
  loading,
  density,
  start,
  prefix,
  prefixId,
  suffix,
  suffixId,
  clear,
  end,
  children,
}: {
  readonly severity: Severity | null;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly loading: boolean;
  readonly density: Density;
  /** Before the prefix: the search icon. */
  readonly start?: ReactNode;
  readonly prefix: ReactNode;
  readonly prefixId: string;
  readonly suffix: ReactNode;
  readonly suffixId: string;
  /** The clear button's name and action, while it shows. */
  readonly clear: {
    readonly label: string;
    readonly onClear: (event: MouseEvent) => void;
  } | null;
  /** After the spinner: the password's reveal button. */
  readonly end?: ReactNode;
  /** The native control. */
  readonly children: ReactNode;
}) {
  return (
    <div
      className={classNames(
        "gridkit-forms-control",
        severity !== null && `is-${severity}`,
        disabled && "is-disabled",
        readOnly && "is-readonly",
        loading && "is-loading",
        densityClass(density),
      )}
    >
      {start}
      {hasNode(prefix) && (
        <span className="gridkit-forms-prefix" id={prefixId}>
          {prefix}
        </span>
      )}
      {children}
      {clear !== null && (
        <button
          type="button"
          className="gridkit-forms-clear-button"
          tabIndex={-1}
          aria-label={clear.label}
          onPointerDown={keepFocus}
          onMouseDown={keepFocus}
          onClick={clear.onClear}
        >
          <ClearIcon />
        </button>
      )}
      {loading && <span className="gridkit-forms-spinner" aria-hidden="true" />}
      {end}
      {hasNode(suffix) && (
        <span className="gridkit-forms-suffix" id={suffixId}>
          {suffix}
        </span>
      )}
    </div>
  );
}

export function hasNode(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}
