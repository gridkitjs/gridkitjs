import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Density, FieldMode, NecessityIndicator } from "@gridkitjs/forms";
import {
  DEFAULT_PRESET,
  PRESET_PARAM,
  presetOrDefault,
  usePresetStyle,
} from "../presets";

export type ColorScheme = "system" | "light" | "dark";
export type Direction = "ltr" | "rtl";

/**
 * What the page controls set. `necessityIndicator` says which labels are
 * marked: required ones with a star, the others in words, or none. The
 * page applies `preset`, `colorScheme`,
 * `direction` and `locale` to the document; each section hands the rest to
 * the components it shows.
 */
export interface PlaygroundSettings {
  readonly preset: string;
  readonly colorScheme: ColorScheme;
  readonly direction: Direction;
  readonly density: Density;
  readonly mode: FieldMode;
  readonly necessityIndicator: NecessityIndicator;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  /** A BCP 47 tag, for the components' `locale` and the page's `lang`. */
  readonly locale: string;
}

export interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

export const COLOR_SCHEMES: readonly Option<ColorScheme>[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const DENSITIES: readonly Option<Density>[] = [
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "comfortable", label: "Comfortable" },
];

export const FIELD_MODES: readonly Option<FieldMode>[] = [
  { value: "edit", label: "Edit" },
  { value: "display", label: "Display" },
];

export const NECESSITY_INDICATORS: readonly Option<NecessityIndicator>[] = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "none", label: "None" },
];

const localeNames = new Intl.DisplayNames(["en"], { type: "language" });

// Locales that differ in digits, separators, date order and script.
export const LOCALES: readonly Option<string>[] = [
  "en-US",
  "en-GB",
  "de-DE",
  "fr-FR",
  "ar-EG",
  "hi-IN",
  "ja-JP",
].map((tag) => ({ value: tag, label: localeNames.of(tag) ?? tag }));

const DEFAULTS: PlaygroundSettings = {
  preset: DEFAULT_PRESET,
  colorScheme: "system",
  direction: "ltr",
  density: "standard",
  mode: "edit",
  necessityIndicator: "required",
  disabled: false,
  readOnly: false,
  locale: "en-US",
};

const PARAMS: Readonly<Record<keyof PlaygroundSettings, string>> = {
  preset: PRESET_PARAM,
  colorScheme: "scheme",
  direction: "dir",
  density: "density",
  mode: "mode",
  necessityIndicator: "necessity",
  disabled: "disabled",
  readOnly: "readonly",
  locale: "locale",
};

const TEXT_SETTINGS = [
  "preset",
  "colorScheme",
  "direction",
  "density",
  "mode",
  "necessityIndicator",
  "locale",
] as const;

const FLAG_SETTINGS = ["disabled", "readOnly"] as const;

function optionOr<T extends string>(
  options: readonly Option<T>[],
  value: string | null,
  fallback: T,
): T {
  return options.find((option) => option.value === value)?.value ?? fallback;
}

function settingsFromUrl(): PlaygroundSettings {
  const params = new URLSearchParams(window.location.search);
  return {
    preset: presetOrDefault(params.get(PARAMS.preset)),
    colorScheme: optionOr(
      COLOR_SCHEMES,
      params.get(PARAMS.colorScheme),
      DEFAULTS.colorScheme,
    ),
    direction: params.get(PARAMS.direction) === "rtl" ? "rtl" : "ltr",
    density: optionOr(DENSITIES, params.get(PARAMS.density), DEFAULTS.density),
    mode: optionOr(FIELD_MODES, params.get(PARAMS.mode), DEFAULTS.mode),
    necessityIndicator: optionOr(
      NECESSITY_INDICATORS,
      params.get(PARAMS.necessityIndicator),
      DEFAULTS.necessityIndicator,
    ),
    disabled: params.has(PARAMS.disabled),
    readOnly: params.has(PARAMS.readOnly),
    locale: optionOr(LOCALES, params.get(PARAMS.locale), DEFAULTS.locale),
  };
}

/** The current URL with every setting that is not its default in it. */
function urlWithSettings(settings: PlaygroundSettings): URL {
  const url = new URL(window.location.href);
  for (const key of TEXT_SETTINGS) {
    if (settings[key] === DEFAULTS[key]) {
      url.searchParams.delete(PARAMS[key]);
    } else {
      url.searchParams.set(PARAMS[key], settings[key]);
    }
  }
  for (const key of FLAG_SETTINGS) {
    if (settings[key]) {
      url.searchParams.set(PARAMS[key], "");
    } else {
      url.searchParams.delete(PARAMS[key]);
    }
  }
  return url;
}

interface SettingsContextValue {
  readonly settings: PlaygroundSettings;
  readonly change: (changes: Partial<PlaygroundSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Holds the page controls' settings, starting from the URL and keeping it
 * current so a combination can be linked to.
 */
export function PlaygroundSettingsProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [settings, setSettings] = useState(settingsFromUrl);
  const { colorScheme, direction, locale } = settings;

  usePresetStyle(settings.preset);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("gridkit-light", colorScheme === "light");
    root.classList.toggle("gridkit-dark", colorScheme === "dark");
    root.dir = direction;
    root.lang = locale;
  }, [colorScheme, direction, locale]);

  useEffect(() => {
    window.history.replaceState(null, "", urlWithSettings(settings));
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      change: (changes) => {
        setSettings((current) => ({ ...current, ...changes }));
      },
    }),
    [settings],
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
}

/** The page controls' settings, and `change` to set some of them. */
export function usePlaygroundSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (value === null) {
    throw new Error(
      "usePlaygroundSettings needs a PlaygroundSettingsProvider above it.",
    );
  }
  return value;
}
