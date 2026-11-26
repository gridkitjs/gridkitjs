import type { FormsMessages } from "@gridkitjs/forms-core";
import {
  attachEnterNavigation,
  findFirstInvalidControl,
} from "@gridkitjs/forms-dom";
import {
  useCallback,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefCallback,
  type SubmitEvent,
} from "react";
import { flushSync } from "react-dom";
import { classNames, withLabelWidth } from "../field/parts";
import { setRef } from "../refs";
import {
  FormSettingsProvider,
  useResolvedSettings,
  type Density,
  type FieldMode,
  type LabelPosition,
  type NecessityIndicator,
} from "../settings";
import { createFormContext, FormContext } from "./formContext";

export interface FormProps {
  /** `"display"` shows every field as text. */
  readonly mode?: FieldMode | undefined;
  readonly density?: Density | undefined;
  readonly labelPosition?: LabelPosition | undefined;
  /** The label column's width for `labelPosition="start"`, as a CSS length. */
  readonly labelWidth?: string | undefined;
  readonly necessityIndicator?: NecessityIndicator | undefined;
  /**
   * Enter in a single-line field, a checkbox or a switch moves to the next
   * field rather than submitting; from the last one it submits.
   */
  readonly enterMovesToNextField?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly locale?: Intl.LocalesArgument;
  /** Strings laid over the default English ones. */
  readonly messages?: Partial<FormsMessages> | undefined;
  /**
   * Lets every submit through without checking the fields, for a form
   * library that validates itself.
   */
  readonly noValidate?: boolean | undefined;
  /** Called only for a submit the form lets through. */
  readonly onSubmit?:
    ((event: SubmitEvent<HTMLFormElement>) => void) | undefined;
  /**
   * The form's `action`: a URL, or a React form action, which runs only
   * for a submit the form lets through.
   */
  readonly action?:
    string | ((formData: FormData) => void | Promise<void>) | undefined;
  readonly ref?: Ref<HTMLFormElement> | undefined;
  readonly id?: string | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
  readonly "aria-label"?: string | undefined;
  readonly "aria-labelledby"?: string | undefined;
  readonly children?: ReactNode;
}

/**
 * A `<form>` whose fields share its mode, density, label position and
 * width, necessity indicator, `readOnly` and `disabled`, and which refuses
 * a submit while a field holds an error.
 *
 * On a submit it reveals every field's messages, then looks for the first
 * invalid control in document order: a field showing an error, or a native
 * constraint of an app's own control. If there is one it cancels the
 * submit, so neither `onSubmit` nor a React form action runs, and moves
 * focus to the form's `MessageSummary` if it shows, or else to that
 * control, opening a collapsed section around it first. The browser's own
 * validation bubbles never show: the fields show their messages instead.
 */
export function Form({
  mode,
  density,
  labelPosition,
  labelWidth,
  necessityIndicator,
  enterMovesToNextField = false,
  readOnly,
  disabled,
  locale,
  messages,
  noValidate = false,
  onSubmit,
  action,
  ref,
  id,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
}: FormProps) {
  const settings = useResolvedSettings({
    mode,
    density,
    labelPosition,
    necessityIndicator,
    readOnly,
    disabled,
    locale,
    messages,
  });
  const [context] = useState(createFormContext);

  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const formRef = useCallback<RefCallback<HTMLFormElement>>(
    (element) => {
      setForm(element);
      const release = setRef(ref, element);
      return () => {
        setForm(null);
        release?.();
      };
    },
    [ref],
  );
  useLayoutEffect(() => {
    if (form === null || !enterMovesToNextField) {
      return undefined;
    }
    return attachEnterNavigation(form).detach;
  }, [form, enterMovesToNextField]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    if (!noValidate) {
      // Rendered at once, so the summary lists the messages before it is
      // focused.
      flushSync(() => {
        context.registry.revealAll();
      });
      const invalid = findFirstInvalidControl(event.currentTarget);
      if (invalid !== null) {
        event.preventDefault();
        const summary = context.getSummary();
        if (summary === null) {
          context.focusControl(invalid);
        } else {
          summary.focus();
        }
        return;
      }
    }
    onSubmit?.(event);
  }

  return (
    <form
      ref={formRef}
      id={id}
      noValidate
      action={action}
      onSubmit={handleSubmit}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={classNames(
        "gridkit-forms-form",
        settings.mode === "display" && "is-display",
        settings.density !== "standard" && `is-${settings.density}`,
        className,
      )}
      style={withLabelWidth(style, labelWidth)}
    >
      <FormContext value={context}>
        <FormSettingsProvider settings={settings}>
          {children}
        </FormSettingsProvider>
      </FormContext>
    </form>
  );
}
