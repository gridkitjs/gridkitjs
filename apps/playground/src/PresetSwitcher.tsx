import { useEffect, useState } from "react";
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

const PARAM = "preset";
const { presets } = presetIndex;

function presetFromUrl(): string {
  const id = new URLSearchParams(window.location.search).get(PARAM);
  return presets.find((preset) => preset.id === id)?.id ?? "default";
}

/**
 * Loads one of the theme's presets after its stylesheet, as a consumer's
 * import would, and keeps the choice in the URL so a look can be linked to.
 */
export function PresetSwitcher() {
  const [id, setId] = useState(presetFromUrl);
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

  function choose(next: string) {
    setId(next);
    const url = new URL(window.location.href);
    if (next === "default") {
      url.searchParams.delete(PARAM);
    } else {
      url.searchParams.set(PARAM, next);
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
