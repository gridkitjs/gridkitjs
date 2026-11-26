import { useEffect } from "react";
import presetIndex from "@gridkitjs/theme-tailwind/presets/index.json";

// import.meta.glob takes only relative paths, not a package's exports.
const presetFiles = import.meta.glob<string>(
  "../../../packages/theme-tailwind/src/presets/*.css",
  { query: "?raw", import: "default", eager: true },
);
const presetCss = new Map(
  Object.entries(presetFiles).map(([path, css]) => [
    path.slice(path.lastIndexOf("/") + 1),
    css,
  ]),
);

/** The URL parameter a page keeps its preset in. */
export const PRESET_PARAM = "preset";

export const DEFAULT_PRESET = "default";

export const { presets } = presetIndex;

/** The preset `id` names, or the default when it names none. */
export function presetOrDefault(id: string | null): string {
  return presets.find((preset) => preset.id === id)?.id ?? DEFAULT_PRESET;
}

/**
 * Loads the preset `id` names after the theme's stylesheets, as a
 * consumer's import would, and removes it when the choice changes.
 */
export function usePresetStyle(id: string): void {
  const preset = presets.find((entry) => entry.id === id);

  useEffect(() => {
    if (preset === undefined) {
      return;
    }
    const style = document.createElement("style");
    style.dataset.gridkitPreset = preset.id;
    style.textContent = presetCss.get(preset.file) ?? "";
    document.head.append(style);
    return () => {
      style.remove();
    };
  }, [preset]);
}
