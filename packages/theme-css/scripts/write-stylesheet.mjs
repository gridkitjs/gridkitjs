/**
 * Writes `src/styles.css`, generated from theme-tailwind's stylesheet.
 *
 * Usage: pnpm --filter @gridkitjs/theme-css build
 */
import { writeFileSync } from "node:fs";
import { TARGET, generateStylesheet } from "./stylesheet.mjs";

writeFileSync(TARGET, await generateStylesheet());
