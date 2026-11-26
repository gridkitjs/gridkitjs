/**
 * Generates this package's stylesheets from theme-tailwind's, so the two
 * never drift. Tailwind compiles those sources in the app's own build; this
 * rewrites the little Tailwind-only syntax they use into plain CSS:
 *
 *  - `@variant dark`, nested in the rule declaring the palette (`:root`, or
 *    `:where(:root)` in the forms stylesheet), becomes a top-level
 *    `@media (prefers-color-scheme: dark)` block on the same selector,
 *    placed straight after that rule so `.gridkit-light` and
 *    `.gridkit-dark`, which match `<html>` with at least its specificity,
 *    still come later and win there.
 *  - `@theme inline`, which only registers Tailwind utilities, is dropped.
 *
 * Anything else Tailwind-only, or CSS nesting a consumer's build may not
 * flatten, throws rather than shipping: teach this file to rewrite it, or
 * keep it out of the source.
 */
import path from "node:path";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import * as prettier from "prettier";

/** @import { AtRule, ChildNode, Container, Root, Rule } from "postcss" */

const SOURCE_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "theme-tailwind",
  "src",
);
const TARGET_DIR = path.resolve(import.meta.dirname, "..", "src");

/** At-rules plain CSS understands, kept as they are. */
const PLAIN_AT_RULES = new Set([
  "container",
  "keyframes",
  "layer",
  "media",
  "supports",
]);

/** Tailwind's functions, which only its build resolves. */
const TAILWIND_FUNCTION = /(?:^|[^\w-])(?:--alpha|--spacing|--theme|theme)\(/;

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * @param {string} file
 * @returns {string} The header's lines saying where a stylesheet came from.
 */
function generatedFrom(file) {
  return `Generated from packages/theme-tailwind/src/${file} in the GridKit
 * repository by this package's scripts/write-stylesheet.mjs. Don't edit it
 * by hand: change the source and run the package's build.`;
}

/**
 * @param {string} paletteRoot
 * @param {string} pinned What `.gridkit-light` and `.gridkit-dark` pin.
 * @returns {string} The header's lines saying how the palette swaps.
 */
function paletteNote(paletteRoot, pinned) {
  return `Each colour is a raw \`-light\`/\`-dark\` pair and a live name the rules
 * read, pointed at one pair by whichever of these applies:
 *
 *  - \`${paletteRoot}\`, by default: light.
 *  - The \`prefers-color-scheme: dark\` query: dark, following the OS.
 *  - \`.gridkit-light\` / \`.gridkit-dark\`: one palette, whatever the OS
 *    prefers, for an app with its own theme toggle. Put either on \`<html>\`
 *    or on any ancestor of ${pinned}.`;
}

/**
 * @typedef {object} Stylesheet
 * @property {string} source The theme-tailwind file it is generated from.
 * @property {string} target The file in this package it is written to.
 * @property {string} paletteRoot The selector of the rule declaring its
 *   palette, which holds the `@variant dark` block.
 * @property {string} header The comment that opens the generated file.
 */

/** @type {Stylesheet[]} */
export const STYLESHEETS = [
  {
    source: path.join(SOURCE_DIR, "styles.css"),
    target: path.join(TARGET_DIR, "styles.css"),
    paletteRoot: ":root",
    header: `/*
 * GridKit plain-CSS theme.
 *
 * ${generatedFrom("styles.css")}
 *
 * The theme tokens are the \`--gridkit-*\` custom properties declared on
 * \`:root\` below. A theme overrides them on \`:root\`, in a stylesheet loaded
 * after this one.
 *
 * ${paletteNote(":root", "a grid")}
 */

`,
  },
  {
    source: path.join(SOURCE_DIR, "forms.css"),
    target: path.join(TARGET_DIR, "forms.css"),
    paletteRoot: ":where(:root)",
    header: `/*
 * GridKit plain-CSS theme: the forms stylesheet.
 *
 * ${generatedFrom("forms.css")}
 *
 * Import it alone, in an app with forms but no grid, or beside styles.css,
 * before or after it. It reads the grid's theme tokens and declares the
 * ones it needs, with the grid's defaults, on \`:where(:root)\` below. That
 * has no specificity, so a preset or a theme's own tokens on \`:root\` win
 * wherever they are loaded.
 *
 * ${paletteNote(":where(:root)", "a grid or a form")}
 */

`,
  },
];

/**
 * @param {ChildNode} node
 * @returns {node is Rule}
 */
function isRule(node) {
  return node.type === "rule";
}

/**
 * Removes a node with the comments directly before it, which describe it.
 *
 * @param {ChildNode} node
 */
function removeWithComments(node) {
  let previous = node.prev();
  while (previous?.type === "comment") {
    const comment = previous;
    previous = comment.prev();
    comment.remove();
  }
  node.remove();
}

/**
 * @param {Root} root
 * @param {string} selector
 * @returns {Rule} The one top-level rule with this selector.
 */
function onlyRule(root, selector) {
  const matches = root.nodes.filter(
    (node) => isRule(node) && node.selector === selector,
  );
  const [match] = matches;
  if (match === undefined || matches.length > 1 || !isRule(match)) {
    throw new Error(
      `Expected one top-level ${selector}, found ${matches.length}`,
    );
  }
  return match;
}

/**
 * The index of the top-level rule with this selector.
 *
 * @param {Root} root
 * @param {string} selector
 */
function ruleIndex(root, selector) {
  const index = root.nodes.findIndex(
    (node) => isRule(node) && node.selector === selector,
  );
  if (index === -1) {
    throw new Error(`Expected a top-level ${selector} rule`);
  }
  return index;
}

/**
 * Moves the `@variant dark` block out of the palette's rule into a media
 * query after it.
 *
 * @param {Root} root
 * @param {string} paletteRoot The palette rule's selector.
 */
function rewriteDarkVariant(root, paletteRoot) {
  const light = onlyRule(root, paletteRoot);
  const variants = light.nodes.filter(
    (node) => node.type === "atrule" && node.name === "variant",
  );
  const [variant] = variants;
  if (
    variant === undefined ||
    variants.length > 1 ||
    variant.type !== "atrule" ||
    variant.params !== "dark"
  ) {
    throw new Error(`Expected one @variant dark inside ${paletteRoot}`);
  }
  const nodes = variant.nodes ?? [];
  if (nodes.some((node) => node.type !== "decl" && node.type !== "comment")) {
    throw new Error("@variant dark may hold only declarations");
  }

  const dark = postcss.rule({
    selector: paletteRoot,
    nodes,
    raws: { semicolon: true },
  });
  removeWithComments(variant);
  light.raws.semicolon = true;
  light.after(
    postcss.atRule({
      name: "media",
      params: DARK_QUERY,
      nodes: [dark],
      raws: { before: "\n\n" },
    }),
  );

  const media = root.index(light) + 1;
  for (const selector of [".gridkit-light", ".gridkit-dark"]) {
    if (ruleIndex(root, selector) < media) {
      throw new Error(`${selector} must come after ${paletteRoot}`);
    }
  }
}

/** @param {Rule | AtRule} node */
function describe(node) {
  return node.type === "rule" ? node.selector : `@${node.name} ${node.params}`;
}

/**
 * Throws on any at-rule, nesting or function plain CSS lacks.
 *
 * @param {Container} container
 */
function assertPlainCss(container) {
  container.each((node) => {
    if (node.type === "atrule" && !PLAIN_AT_RULES.has(node.name)) {
      throw new Error(`Unknown at-rule ${describe(node)}`);
    }
    if (node.type === "decl" && TAILWIND_FUNCTION.test(node.value)) {
      throw new Error(`Tailwind function in ${node.prop}: ${node.value}`);
    }
    if (node.type === "rule" || node.type === "atrule") {
      if (container.type === "rule") {
        throw new Error(`Nested CSS: ${describe(node)}`);
      }
      assertPlainCss(node);
    }
  });
}

/**
 * Rewrites one of theme-tailwind's stylesheets as plain CSS, comments and
 * layout kept as they are, less the source's own header comments.
 *
 * @param {string} source
 * @param {string} [paletteRoot] The selector of the rule declaring its
 *   palette.
 * @returns {string}
 */
export function toPlainCss(source, paletteRoot = ":root") {
  const root = postcss.parse(source);

  while (root.first?.type === "comment") {
    root.first.remove();
  }
  for (const node of [...root.nodes]) {
    if (node.type !== "atrule" || node.name !== "theme") {
      continue;
    }
    if (node.params !== "inline") {
      throw new Error(`Unknown at-rule @theme ${node.params}`);
    }
    removeWithComments(node);
  }
  rewriteDarkVariant(root, paletteRoot);
  assertPlainCss(root);

  return root.toString();
}

/**
 * What `write-stylesheet.mjs` writes to a stylesheet's target: its source
 * rewritten, under its header, formatted with the repository's Prettier
 * config.
 *
 * @param {Stylesheet} stylesheet
 * @returns {Promise<string>}
 */
export async function generateStylesheet({
  source,
  target,
  paletteRoot,
  header,
}) {
  const css = header + toPlainCss(readFileSync(source, "utf8"), paletteRoot);
  const config = await prettier.resolveConfig(target);
  return prettier.format(css, { ...config, filepath: target });
}
