/**
 * Writes `src/styles.css` and `src/forms.css`, generated from
 * theme-tailwind's stylesheets.
 *
 * Usage: pnpm --filter @gridkitjs/theme-css build
 */
import { writeFileSync } from "node:fs";
import { STYLESHEETS, generateStylesheet } from "./stylesheet.mjs";

for (const stylesheet of STYLESHEETS) {
  writeFileSync(stylesheet.target, await generateStylesheet(stylesheet));
}
