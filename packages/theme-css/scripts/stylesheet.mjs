/**
 * Generates this package's stylesheet from theme-tailwind's, so the two
 * never drift. Tailwind compiles that source in the app's own build; this
 * rewrites the little Tailwind-only syntax it uses into plain CSS:
 *
 *  - `@variant dark`, nested in `:root`, becomes a top-level
 *    `@media (prefers-color-scheme: dark)` block, placed straight after
 *    `:root` so `.gridkit-light` and `.gridkit-dark`, which match `<html>`
 *    with the same specificity, still come later and win there.
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

export const SOURCE = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "theme-tailwind",
  "src",
  "styles.css",
);

export const TARGET = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "styles.css",
);

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

const HEADER = `/*
 * GridKit plain-CSS theme.
 *
 * Generated from packages/theme-tailwind/src/styles.css in the GridKit
 * repository by this package's scripts/write-stylesheet.mjs. Don't edit it
 * by hand: change the source and run the package's build.
 *
 * The theme tokens are the \`--gridkit-*\` custom properties declared on
 * \`:root\` below. A theme overrides them on \`:root\`, in a stylesheet loaded
 * after this one.
 *
 * Each colour is a raw \`-light\`/\`-dark\` pair and a live name the rules
 * read, pointed at one pair by whichever of these applies:
 *
 *  - \`:root\`, by default: light.
 *  - The \`prefers-color-scheme: dark\` query: dark, following the OS.
 *  - \`.gridkit-light\` / \`.gridkit-dark\`: one palette, whatever the OS
 *    prefers, for an app with its own theme toggle. Put either on \`<html>\`
 *    or on any ancestor of a grid.
 */

`;

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
 * @returns {Rule} The one top-level `:root` rule.
 */
function rootRule(root) {
  const matches = root.nodes.filter(
    (node) => isRule(node) && node.selector === ":root",
  );
  const [match] = matches;
  if (match === undefined || matches.length > 1 || !isRule(match)) {
    throw new Error(`Expected one top-level :root, found ${matches.length}`);
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
 * Moves the `@variant dark` block out of `:root` into a media query after
 * it.
 *
 * @param {Root} root
 */
function rewriteDarkVariant(root) {
  const light = rootRule(root);
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
    throw new Error("Expected one @variant dark inside :root");
  }
  const nodes = variant.nodes ?? [];
  if (nodes.some((node) => node.type !== "decl" && node.type !== "comment")) {
    throw new Error("@variant dark may hold only declarations");
  }

  const dark = postcss.rule({
    selector: ":root",
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
      throw new Error(`${selector} must come after :root`);
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
 * Rewrites theme-tailwind's stylesheet as plain CSS, comments and layout
 * kept as they are, less the source's own header comments.
 *
 * @param {string} source
 * @returns {string}
 */
export function toPlainCss(source) {
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
  rewriteDarkVariant(root);
  assertPlainCss(root);

  return root.toString();
}

/**
 * The stylesheet `write-stylesheet.mjs` writes to {@link TARGET}: the
 * source rewritten, under a header saying where it came from, formatted
 * with the repository's Prettier config.
 *
 * @returns {Promise<string>}
 */
export async function generateStylesheet() {
  const css = HEADER + toPlainCss(readFileSync(SOURCE, "utf8"));
  const config = await prettier.resolveConfig(TARGET);
  return prettier.format(css, { ...config, filepath: TARGET });
}
