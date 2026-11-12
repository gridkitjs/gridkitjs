/**
 * Keeps `docs/class-names.mdx` in step with the grid: every class and
 * `data-gridkit-*` attribute that `core`, `dom` or `react` writes in its
 * source is in the first column of one of the page's tables, and every name
 * there is still written somewhere. A name built at run time, such as
 * `is-sorted-${direction}`, shows up in the source as its prefix
 * (`is-sorted-`), which the page covers with any name that starts with it.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

const PACKAGES = path.resolve(import.meta.dirname, "..", "..");
const SOURCE_DIRS = ["core", "dom", "react"].map((name) =>
  path.join(PACKAGES, name, "src"),
);
const DOCS_PAGE = path.resolve(
  import.meta.dirname,
  "..",
  "docs",
  "class-names.mdx",
);

/** A class or attribute name, not part of a longer one or a `--` token. */
const NAME = /(?<![\w$-])(?:gridkit-|is-|data-gridkit-)[\w-]*/g;
const SOURCE_FILE = /\.tsx?$/;
const TEST_FILE = /\.(?:test|spec)\.tsx?$/;

/**
 * Every `.ts` and `.tsx` file under `dir`, tests left out.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function sourceFiles(dir) {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => SOURCE_FILE.test(file) && !TEST_FILE.test(file))
    .map((file) => path.join(dir, file));
}

/**
 * `code` without its comments, which mention names the grid does not
 * render, such as a consumer's own class in an example.
 *
 * @param {string} code
 * @returns {string}
 */
function withoutComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * The names written in source code: whole names, and the prefixes of names
 * built at run time, which end in `-`.
 *
 * @param {string} code
 * @returns {Set<string>}
 */
function sourceNames(code) {
  return new Set(withoutComments(code).match(NAME));
}

/**
 * The names in the first column of the page's tables, header rows left out.
 *
 * @param {string} mdx
 * @returns {Set<string>}
 */
function pageNames(mdx) {
  const firstCells = mdx
    .split("\n")
    .map((line) => /^\|([^|]*)\|/.exec(line)?.[1] ?? "")
    .filter((cell) => cell.includes("`"));
  return new Set(firstCells.flatMap((cell) => cell.match(NAME) ?? []));
}

/**
 * The source's names the page does not list, and the page's names the
 * source no longer writes.
 *
 * @param {Set<string>} source
 * @param {Set<string>} page
 * @returns {{ missing: string[]; stale: string[] }}
 */
function compare(source, page) {
  const prefixes = [...source].filter((name) => name.endsWith("-"));
  const covered = (/** @type {string} */ name) =>
    source.has(name) || prefixes.some((prefix) => name.startsWith(prefix));
  return {
    missing: [...source]
      .filter((name) =>
        name.endsWith("-")
          ? ![...page].some((listed) => listed.startsWith(name))
          : !page.has(name),
      )
      .sort(),
    stale: [...page].filter((name) => !covered(name)).sort(),
  };
}

describe("comparing source and page", () => {
  const source = sourceNames(
    [
      "/** Adds `is-overdue` in the example. */",
      '<tr className="gridkit-grid-row" data-gridkit-row-id={id} />',
      "// gridkit-old-name",
      "const level = `is-group-level-${String(depth)}`;",
      'style={{ "--gridkit-body-height": height }}',
      'const url = "https://example.com";',
    ].join("\n"),
  );

  test("reads names and run-time prefixes from code, not comments", () => {
    assert.deepEqual(
      [...source].sort(),
      ["data-gridkit-row-id", "gridkit-grid-row", "is-group-level-"].sort(),
    );
  });

  test("finds names missing from the page and names no longer rendered", () => {
    const page = pageNames(
      [
        "| Class | Description |",
        "| ----- | ----------- |",
        "| `.gridkit-grid-row` | A row, unlike `.gridkit-in-prose`. |",
        "| `.is-group-level-N` | Its depth. |",
        "| `.gridkit-gone` | Removed. |",
      ].join("\n"),
    );
    assert.deepEqual(compare(source, page), {
      missing: ["data-gridkit-row-id"],
      stale: ["gridkit-gone"],
    });
  });
});

describe("docs/class-names.mdx", () => {
  const source = new Set(
    SOURCE_DIRS.flatMap(sourceFiles).flatMap((file) => [
      ...sourceNames(readFileSync(file, "utf8")),
    ]),
  );
  const page = pageNames(readFileSync(DOCS_PAGE, "utf8"));

  test("lists every class and data attribute the grid renders, and no other", () => {
    assert.deepEqual(compare(source, page), { missing: [], stale: [] });
  });
});
