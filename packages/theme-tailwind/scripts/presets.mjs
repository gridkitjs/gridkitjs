/**
 * The presets: token-only stylesheets in `src/presets/`, each restyling the
 * grid when loaded after the theme's, and `src/presets/index.json`, which
 * lists them in the order to show them. They ship as
 * `@gridkitjs/theme-tailwind/presets/*`, and theme-css ships copies, so the
 * typedefs below are the index's contract with whoever reads it, such as a
 * theme builder; bump `schemaVersion` when a field changes meaning or goes
 * away.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export const PRESETS_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "presets",
);

export const PRESET_INDEX_PATH = path.join(PRESETS_DIR, "index.json");

/**
 * @typedef {object} PresetEntry
 * @property {string} id The file's name without `.css`, in kebab case.
 * @property {string} label The preset's name, to show.
 * @property {string} description One sentence, to show beside it.
 * @property {string} file The stylesheet, `<id>.css`, beside the index.
 */

/**
 * @typedef {object} PresetIndex
 * @property {1} schemaVersion
 * @property {PresetEntry[]} presets In the order to show them, `default`
 *   first.
 */

/** @returns {PresetIndex} */
export function readPresetIndex() {
  return JSON.parse(readFileSync(PRESET_INDEX_PATH, "utf8"));
}

/**
 * @param {string} file A preset's `file`, as the index gives it.
 * @returns {string}
 */
export function readPreset(file) {
  return readFileSync(path.join(PRESETS_DIR, file), "utf8");
}
