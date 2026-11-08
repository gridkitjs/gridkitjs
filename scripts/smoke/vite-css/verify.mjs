/**
 * Checks the build kept the theme with no Tailwind in it: Vite resolved
 * `@gridkitjs/theme-css/styles.css` from the installed package and emitted
 * its tokens, its dark palette and its grid rules, and a preset through the
 * package's `presets/*` export, with the app's own token override after the
 * theme's default.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const assets = path.join(import.meta.dirname, "dist", "assets");
const css = readdirSync(assets)
  .filter((file) => file.endsWith(".css"))
  .map((file) => readFileSync(path.join(assets, file), "utf8"))
  .join("\n");

/** @type {[string, boolean][]} */
const checks = [
  ["a .gridkit-data-grid rule", css.includes(".gridkit-data-grid")],
  ["the --gridkit-spacing token", css.includes("--gridkit-spacing:")],
  [
    "the dark palette under prefers-color-scheme",
    /@media\s*\(prefers-color-scheme:\s*dark\)/.test(css),
  ],
  ["the .gridkit-dark class", /\.gridkit-dark\s*\{/.test(css)],
  ["the high-contrast preset", /--gridkit-focus-ring-width:\s*3px/.test(css)],
  [
    "the app's accent after the theme's",
    css.lastIndexOf("--gridkit-accent-light:") >
      css.indexOf("--gridkit-accent-light:"),
  ],
];

for (const [what, passed] of checks) {
  if (!passed) {
    console.error(`The built CSS lacks ${what}.`);
    process.exitCode = 1;
  }
}
