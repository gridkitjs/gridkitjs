import {
  defaultFormsMessages,
  resolveFormsMessages,
  type FormsMessages,
} from "@gridkitjs/forms-core";
import { createContext, useContext, useMemo, type ReactNode } from "react";

/** How tightly fields are drawn. */
export type Density = "compact" | "standard" | "comfortable";

/** `"display"` shows a field's value as text, with no control to operate. */
export type FieldMode = "edit" | "display";

/**
 * Where a field's label sits: above the control (`"top"`), inside it until
 * the field is focused or filled (`"floating"`), beside it (`"start"`), or
 * nowhere visible while still naming the control (`"hidden"`).
 */
export type LabelPosition = "top" | "floating" | "start" | "hidden";

/**
 * Which fields a label marks: required ones with an asterisk
 * (`"required"`), the others with "(optional)" (`"optional"`), or none.
 */
export type NecessityIndicator = "required" | "optional" | "none";

/** What every field under a level of a form shares, worked out for that level. */
export interface FormSettings {
  readonly mode: FieldMode;
  readonly density: Density;
  readonly labelPosition: LabelPosition;
  readonly necessityIndicator: NecessityIndicator;
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly locale: Intl.LocalesArgument;
  /** The app's strings, laid over the defaults; `undefined` for none. */
  readonly messageOverrides: Partial<FormsMessages> | undefined;
  /** Every string, the overrides laid over the defaults for `locale`. */
  readonly messages: FormsMessages;
}

/** What one level (a form, a section, a field) sets; `undefined` takes the level above's. */
export interface FormSettingsOverrides {
  readonly mode?: FieldMode | undefined;
  readonly density?: Density | undefined;
  readonly labelPosition?: LabelPosition | undefined;
  readonly necessityIndicator?: NecessityIndicator | undefined;
  readonly readOnly?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly locale?: Intl.LocalesArgument;
  readonly messages?: Partial<FormsMessages> | undefined;
}

const DEFAULT_SETTINGS: FormSettings = {
  mode: "edit",
  density: "standard",
  labelPosition: "top",
  necessityIndicator: "required",
  readOnly: false,
  disabled: false,
  locale: undefined,
  messageOverrides: undefined,
  messages: defaultFormsMessages,
};

const FormSettingsContext = createContext<FormSettings>(DEFAULT_SETTINGS);

/** The settings of the nearest level above, or the defaults outside any. */
export function useFormSettings(): FormSettings {
  return useContext(FormSettingsContext);
}

/**
 * `overrides` laid over `parent`: the nearest level wins, except that
 * `readOnly` and `disabled` set anywhere above stay set.
 */
export function resolveFormSettings(
  parent: FormSettings,
  overrides: FormSettingsOverrides,
): FormSettings {
  const locale = overrides.locale ?? parent.locale;
  const messageOverrides =
    overrides.messages === undefined
      ? parent.messageOverrides
      : { ...parent.messageOverrides, ...overrides.messages };
  return {
    mode: overrides.mode ?? parent.mode,
    density: overrides.density ?? parent.density,
    labelPosition: overrides.labelPosition ?? parent.labelPosition,
    necessityIndicator:
      overrides.necessityIndicator ?? parent.necessityIndicator,
    readOnly: parent.readOnly || overrides.readOnly === true,
    disabled: parent.disabled || overrides.disabled === true,
    locale,
    messageOverrides,
    messages:
      locale === parent.locale && messageOverrides === parent.messageOverrides
        ? parent.messages
        : resolveFormsMessages(messageOverrides, locale),
  };
}

/**
 * The settings of the level above with `overrides` laid over them,
 * memoized on each override, so a level re-rendering with the same props
 * re-renders none of its fields.
 */
export function useResolvedSettings(
  overrides: FormSettingsOverrides,
): FormSettings {
  const parent = useFormSettings();
  const {
    mode,
    density,
    labelPosition,
    necessityIndicator,
    readOnly,
    disabled,
    locale,
    messages,
  } = overrides;
  return useMemo(
    () =>
      resolveFormSettings(parent, {
        mode,
        density,
        labelPosition,
        necessityIndicator,
        readOnly,
        disabled,
        locale,
        messages,
      }),
    [
      parent,
      mode,
      density,
      labelPosition,
      necessityIndicator,
      readOnly,
      disabled,
      locale,
      messages,
    ],
  );
}

/** Gives every field under it `settings`. */
export function FormSettingsProvider({
  settings,
  children,
}: {
  readonly settings: FormSettings;
  readonly children: ReactNode;
}) {
  return <FormSettingsContext value={settings}>{children}</FormSettingsContext>;
}
