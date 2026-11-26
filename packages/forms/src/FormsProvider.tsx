import type { FormsMessages } from "@gridkitjs/forms-core";
import type { ReactNode } from "react";
import {
  FormSettingsProvider,
  useResolvedSettings,
  type Density,
} from "./settings";

export interface FormsProviderProps {
  /** Formats counts, for every forms component under it. */
  readonly locale?: Intl.LocalesArgument;
  /** Strings laid over the default English ones. */
  readonly messages?: Partial<FormsMessages> | undefined;
  readonly density?: Density | undefined;
  readonly children?: ReactNode;
}

/**
 * Sets the locale, strings and density of every forms component under it,
 * inside a `Form` or not. A `Form`, a layout level, a field or an input
 * that sets one of them itself wins over the provider.
 */
export function FormsProvider({
  locale,
  messages,
  density,
  children,
}: FormsProviderProps) {
  const settings = useResolvedSettings({ locale, messages, density });
  return (
    <FormSettingsProvider settings={settings}>{children}</FormSettingsProvider>
  );
}
