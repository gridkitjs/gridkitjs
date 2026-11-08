/**
 * Replaces `src/presets/` with a copy of theme-tailwind's presets.
 *
 * Usage: pnpm --filter @gridkitjs/theme-css build
 */
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { PRESETS_SOURCE, PRESETS_TARGET, presetFiles } from "./presets.mjs";

rmSync(PRESETS_TARGET, { recursive: true, force: true });
mkdirSync(PRESETS_TARGET);
for (const file of presetFiles(PRESETS_SOURCE)) {
  copyFileSync(
    path.join(PRESETS_SOURCE, file),
    path.join(PRESETS_TARGET, file),
  );
}
