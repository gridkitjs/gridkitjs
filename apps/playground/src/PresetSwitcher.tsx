import { useState } from "react";
import {
  DEFAULT_PRESET,
  PRESET_PARAM,
  presetOrDefault,
  presets,
  usePresetStyle,
} from "./presets";

function presetFromUrl(): string {
  return presetOrDefault(
    new URLSearchParams(window.location.search).get(PRESET_PARAM),
  );
}

/**
 * Loads one of the theme's presets after its stylesheet and keeps the
 * choice in the URL so a look can be linked to.
 */
export function PresetSwitcher() {
  const [id, setId] = useState(presetFromUrl);
  const preset = presets.find((entry) => entry.id === id);
  usePresetStyle(id);

  function choose(next: string) {
    setId(next);
    const url = new URL(window.location.href);
    if (next === DEFAULT_PRESET) {
      url.searchParams.delete(PRESET_PARAM);
    } else {
      url.searchParams.set(PRESET_PARAM, next);
    }
    window.history.replaceState(null, "", url);
  }

  return (
    <label className="mt-4 flex items-center gap-2 text-sm">
      Theme preset
      <select
        className="rounded border border-gray-300 px-2 py-1"
        value={id}
        onChange={(event) => {
          choose(event.target.value);
        }}
      >
        {presets.map((entry) => (
          <option key={entry.id} value={entry.id} title={entry.description}>
            {entry.label}
          </option>
        ))}
      </select>
      <span className="text-gray-600">{preset?.description}</span>
    </label>
  );
}
