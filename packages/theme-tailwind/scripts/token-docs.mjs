/**
 * The token tables on `docs/tokens.mdx`, generated from the manifest. Each
 * group's table sits between two MDX comments, `tokens:<group>` before it
 * and `/tokens:<group>` after, and the prose around them is written by
 * hand. `write-token-docs.mjs` rewrites the tables, and the token test
 * fails while they differ from the manifest.
 */
import path from "node:path";
import { GROUPS } from "./manifest.mjs";

/** @import { ColorDefault, Token } from "./manifest.mjs" */

export const DOCS_PAGE = path.resolve(
  import.meta.dirname,
  "..",
  "docs",
  "tokens.mdx",
);

/** @param {string} text */
function code(text) {
  return `\`${text}\``;
}

/**
 * Laid out the way Prettier lays out a table, every column padded to its
 * widest cell, so a regenerated page is already formatted.
 *
 * @param {string[]} header
 * @param {string[][]} rows
 * @returns {string}
 */
function markdownTable(header, rows) {
  const widths = header.map((_, column) =>
    Math.max(3, ...[header, ...rows].map((row) => row[column]?.length ?? 0)),
  );
  /** @param {string[]} cells */
  const line = (cells) =>
    `| ${cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join(" | ")} |`;
  return [
    line(header),
    line(widths.map((width) => "-".repeat(width))),
    ...rows.map(line),
  ].join("\n");
}

/**
 * The manifest's descriptions are plain text; on the page, a token they
 * mention is set as code.
 *
 * @param {string} description
 */
function prose(description) {
  return description.replace(/--gridkit-[\w-]+/g, code);
}

/**
 * @param {Token[]} tokens One group's.
 * @returns {string}
 */
function colorTable(tokens) {
  return markdownTable(
    ["Token", "Tier", "Light", "Dark", "Description"],
    tokens.map(({ name, tier, default: value, description }) => {
      const { light, dark } = /** @type {ColorDefault} */ (value);
      return [code(name), tier, code(light), code(dark), prose(description)];
    }),
  );
}

/**
 * @param {Token[]} tokens One group's.
 * @returns {string}
 */
function valueTable(tokens) {
  return markdownTable(
    ["Token", "Tier", "Type", "Default", "Description"],
    tokens.map(({ name, tier, type, options, default: value, description }) => [
      code(name),
      tier,
      options === undefined ? code(type) : options.map(code).join(", "),
      code(/** @type {string} */ (value)),
      prose(description),
    ]),
  );
}

/**
 * @param {string} page
 * @param {string} group
 * @param {string} table
 * @returns {string}
 */
function replaceTable(page, group, table) {
  const start = `{/* tokens:${group} */}`;
  const end = `{/* /tokens:${group} */}`;
  const from = page.indexOf(start);
  const to = page.indexOf(end);
  if (
    from === -1 ||
    to < from ||
    page.includes(start, from + 1) ||
    page.includes(end, to + 1)
  ) {
    throw new Error(`Expected one ${start} followed by one ${end}`);
  }
  return `${page.slice(0, from + start.length)}\n\n${table}\n\n${page.slice(to)}`;
}

/**
 * @param {string} page The page's text.
 * @param {Token[]} tokens
 * @returns {string} The page with each group's table rewritten.
 */
export function withTokenTables(page, tokens) {
  return GROUPS.reduce((text, group) => {
    const members = tokens.filter((token) => token.group === group);
    const table =
      group === "colors" ? colorTable(members) : valueTable(members);
    return replaceTable(text, group, table);
  }, page);
}
