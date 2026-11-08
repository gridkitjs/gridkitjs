/**
 * The token manifest, `src/tokens.json`: every theme token `styles.css`
 * declares on `:root`, with what a theme builder or a docs page needs to
 * know about it. It ships as `@gridkitjs/theme-tailwind/tokens.json`, so the
 * typedefs below are its contract with whoever reads it; bump
 * `schemaVersion` when a field changes meaning or goes away.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export const MANIFEST_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "tokens.json",
);

/** In the order the manifest lists them, which is the order to show them. */
export const GROUPS = /** @type {const} */ ([
  "colors",
  "typography",
  "density",
  "borders",
  "shape",
  "details",
]);

export const TIERS = /** @type {const} */ (["basic", "advanced"]);

export const TYPES = /** @type {const} */ ([
  "color",
  "length",
  "number",
  "font-family",
  "font-weight",
  "text-transform",
  "shadow",
  "duration",
  "enum",
]);

/**
 * @typedef {object} ColorDefault
 * @property {string} light
 * @property {string} dark
 */

/**
 * @typedef {object} Token
 * @property {string} name The custom property, `--gridkit-<name>`. For a
 *   colour it is the live name the rules read; a theme sets the raw pair,
 *   `<name>-light` and `<name>-dark`, instead.
 * @property {(typeof GROUPS)[number]} group
 * @property {(typeof TIERS)[number]} tier `basic` for the palette and the
 *   base knobs, `advanced` for a token that tunes one part of the grid.
 * @property {(typeof TYPES)[number]} type
 * @property {string[]} [options] An `enum`'s values, and only an `enum`'s.
 * @property {string | ColorDefault} default The value `styles.css` declares,
 *   whitespace collapsed; a `ColorDefault` for a `color`, a string
 *   otherwise. It may read another token with `var()`.
 * @property {string} description One sentence, for the docs and the builder.
 */

/**
 * @typedef {object} TokenManifest
 * @property {1} schemaVersion
 * @property {Token[]} tokens Grouped in `GROUPS` order.
 */

/** @returns {TokenManifest} */
export function readManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

/**
 * The custom properties that hold the tokens' defaults: a colour's raw pair,
 * or the token itself. A theme overrides these and nothing else.
 *
 * @param {Token[]} tokens
 * @returns {Map<string, string>} Each property's default, by name.
 */
export function defaultDeclarations(tokens) {
  return new Map(
    tokens.flatMap((token) =>
      typeof token.default === "string"
        ? [[token.name, token.default]]
        : [
            [`${token.name}-light`, token.default.light],
            [`${token.name}-dark`, token.default.dark],
          ],
    ),
  );
}
