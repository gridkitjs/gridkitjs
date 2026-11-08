import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PRESETS_SOURCE, PRESETS_TARGET, presetFiles } from "./presets.mjs";

const STALE = "run pnpm --filter @gridkitjs/theme-css build";

test(`ships theme-tailwind's preset files, and no other (${STALE})`, () => {
  assert.deepEqual(presetFiles(PRESETS_TARGET), presetFiles(PRESETS_SOURCE));
});

test(`ships each preset as theme-tailwind has it (${STALE})`, () => {
  const differing = presetFiles(PRESETS_SOURCE).filter(
    (file) =>
      readFileSync(path.join(PRESETS_TARGET, file), "utf8") !==
      readFileSync(path.join(PRESETS_SOURCE, file), "utf8"),
  );
  assert.deepEqual(differing, []);
});
