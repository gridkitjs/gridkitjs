/**
 * This package's presets: theme-tailwind's, copied as they are. A preset
 * sets only tokens on `:root`, which is plain CSS already, so the two
 * packages ship the same files.
 */
import path from "node:path";
import { readdirSync } from "node:fs";

export const PRESETS_SOURCE = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "theme-tailwind",
  "src",
  "presets",
);

export const PRESETS_TARGET = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "presets",
);

/**
 * @param {string} directory
 * @returns {string[]} The names of the files in it, sorted.
 */
export function presetFiles(directory) {
  return readdirSync(directory).sort();
}
