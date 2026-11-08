/**
 * Checks the build kept the theme: Tailwind resolved
 * `@gridkitjs/theme-tailwind/styles.css` from the installed package and
 * emitted its grid rules, and a preset through the package's `presets/*`
 * export.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const assets = path.join(import.meta.dirname, "dist", "assets");
const css = readdirSync(assets)
  .filter((file) => file.endsWith(".css"))
  .map((file) => readFileSync(path.join(assets, file), "utf8"))
  .join("\n");

if (!css.includes(".gridkit-data-grid")) {
  console.error("The built CSS has no .gridkit-data-grid rule.");
  process.exitCode = 1;
}
if (!/--gridkit-font-variant-numeric:\s*tabular-nums/.test(css)) {
  console.error("The built CSS lacks the spreadsheet preset.");
  process.exitCode = 1;
}
