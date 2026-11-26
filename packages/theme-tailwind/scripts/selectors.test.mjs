/**
 * Keeps every rule in the stylesheets inside GridKit's own elements: each
 * selector names at least one `gridkit-` class, so no rule can restyle a
 * host page's own elements, a bare `is-*` state class included. The only
 * exceptions are `:root` and `:where(:root)`, which declare the theme
 * tokens.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { parseCss } from "./css.mjs";

/** @import { CssBlock } from "./css.mjs" */

const SRC = path.resolve(import.meta.dirname, "..", "src");
const STYLESHEETS = ["styles.css", "forms.css"];
const TOKEN_ROOTS = new Set([":root", ":where(:root)"]);
const GRIDKIT_CLASS = /\.gridkit-[a-z0-9]/;

/**
 * A selector list split at its top-level commas, leaving those inside
 * `:is()`, `:where()` and the like alone.
 *
 * @param {string} prelude
 * @returns {string[]}
 */
function selectors(prelude) {
  /** @type {string[]} */
  const list = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < prelude.length; i++) {
    const char = prelude.charAt(i);
    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
    } else if (char === "," && depth === 0) {
      list.push(prelude.slice(start, i).trim());
      start = i + 1;
    }
  }
  list.push(prelude.slice(start).trim());
  return list;
}

/**
 * Whether a selector matches only inside the grid: it names a `gridkit-`
 * class outside a `:not()`, which would otherwise match everything else.
 *
 * @param {string} selector
 * @returns {boolean}
 */
function isScoped(selector) {
  return GRIDKIT_CLASS.test(selector.replace(/:not\([^()]*\)/g, ""));
}

/**
 * Every selector in a block and the blocks nested in it that is not scoped
 * to the grid, skipping at-rules' own preludes and the token roots.
 *
 * @param {CssBlock} block
 * @returns {string[]}
 */
function unscopedSelectors(block) {
  return block.blocks.flatMap((child) => {
    const own =
      child.prelude.startsWith("@") || TOKEN_ROOTS.has(child.prelude)
        ? []
        : selectors(child.prelude).filter((selector) => !isScoped(selector));
    return [...own, ...unscopedSelectors(child)];
  });
}

describe("selector scoping", () => {
  test("finds a selector without a gridkit- class", () => {
    const sheet = parseCss(
      [
        ".menu-item { color: red; }",
        ".gridkit-menu .is-selected, .is-selected { color: red; }",
        ":not(.gridkit-menu) > .menu-item { color: red; }",
        ".gridkit-grid-row:where([data-a], [data-b]) { color: red; }",
        "@media print { .gridkit-grid-row, .grid-row { color: red; } }",
      ].join("\n"),
    );
    assert.deepEqual(unscopedSelectors(sheet), [
      ".menu-item",
      ".is-selected",
      ":not(.gridkit-menu) > .menu-item",
      ".grid-row",
    ]);
  });
});

for (const file of STYLESHEETS) {
  describe(file, () => {
    const sheet = parseCss(readFileSync(path.join(SRC, file), "utf8"));

    test("names a gridkit- class in every selector", () => {
      assert.deepEqual(unscopedSelectors(sheet), []);
    });
  });
}
