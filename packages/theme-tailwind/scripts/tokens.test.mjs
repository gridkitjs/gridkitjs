/**
 * Keeps `src/tokens.json` and `src/styles.css` in step. The stylesheet's
 * theme tokens are the custom properties its `:root` block declares; the
 * manifest has to list each of them with the default declared there, and
 * each colour has to be wired up the way the palette comment in
 * `styles.css` describes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import {
  allDeclarations,
  childBlock,
  customProperties,
  parseCss,
} from "./css.mjs";
import {
  GROUPS,
  TIERS,
  TYPES,
  defaultDeclarations,
  readManifest,
} from "./manifest.mjs";

/** @import { Token } from "./manifest.mjs" */

const STYLESHEET = path.resolve(import.meta.dirname, "..", "src", "styles.css");
const TOKEN_NAME = /^--gridkit-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_FIELDS = new Set([
  "name",
  "group",
  "tier",
  "type",
  "options",
  "default",
  "description",
]);
const SIDES = /** @type {const} */ (["light", "dark"]);

const manifest = readManifest();
const { tokens } = manifest;
const colors = tokens.filter((token) => token.type === "color");
const defaults = defaultDeclarations(tokens);

const sheet = parseCss(readFileSync(STYLESHEET, "utf8"));
const root = childBlock(sheet, ":root");
const rootProperties = customProperties(root);

/**
 * Each colour's live name pointed at one side of its pair, as a palette
 * block declares it.
 *
 * @param {(typeof SIDES)[number]} side
 * @returns {Map<string, string>}
 */
function pointers(side) {
  return new Map(colors.map(({ name }) => [name, `var(${name}-${side})`]));
}

/**
 * @param {Token} token
 * @returns {string[]} What is wrong with the entry, if anything.
 */
function entryProblems(token) {
  const { name, group, tier, type, options, description } = token;
  /** @type {string[]} */
  const problems = [];
  /** @param {string} problem */
  const report = (problem) => problems.push(`${name}: ${problem}`);

  for (const field of Object.keys(token)) {
    if (!TOKEN_FIELDS.has(field)) report(`unknown field "${field}"`);
  }
  if (!TOKEN_NAME.test(name)) report("not a --gridkit-<kebab-case> name");
  if (!GROUPS.includes(group)) report(`unknown group "${group}"`);
  if (!TIERS.includes(tier)) report(`unknown tier "${tier}"`);
  if (!TYPES.includes(type)) report(`unknown type "${type}"`);

  if (type === "color") {
    const value = token.default;
    if (
      typeof value !== "object" ||
      typeof value.light !== "string" ||
      typeof value.dark !== "string"
    ) {
      report('a colour\'s default is { "light", "dark" }');
    }
    if (/-(?:light|dark)$/.test(name)) {
      report("a colour's name can't end in its pair's -light or -dark");
    }
  } else if (typeof token.default !== "string") {
    report("default is not a string");
  }

  if (type === "enum") {
    if (!Array.isArray(options) || !options.includes(token.default)) {
      report("an enum's default is one of its options");
    }
  } else if (options !== undefined) {
    report("only an enum has options");
  }

  if (typeof description !== "string" || !/^\S[^\n]*\.$/.test(description)) {
    report("description is not one sentence");
  }
  return problems;
}

describe("tokens.json", () => {
  test("has schema 1 and well-formed entries", () => {
    assert.equal(manifest.schemaVersion, 1);
    assert.deepEqual(tokens.flatMap(entryProblems), []);
  });

  test("lists each token once", () => {
    const names = tokens.map(({ name }) => name);
    assert.deepEqual(
      names.filter((name, index) => names.indexOf(name) !== index),
      [],
    );
  });

  test(`lists tokens group by group: ${GROUPS.join(", ")}`, () => {
    const outOfOrder = tokens.filter((token, index) => {
      const previous = tokens[index - 1];
      return (
        previous !== undefined &&
        GROUPS.indexOf(token.group) < GROUPS.indexOf(previous.group)
      );
    });
    assert.deepEqual(
      outOfOrder.map(({ name }) => name),
      [],
    );
  });
});

describe("styles.css", () => {
  const declaredForTokens = new Set([
    ...defaults.keys(),
    ...colors.map(({ name }) => name),
  ]);

  test("declares every tokens.json token on :root", () => {
    assert.deepEqual(
      [...declaredForTokens].filter((name) => !rootProperties.has(name)),
      [],
    );
  });

  test("declares no custom property on :root that tokens.json lacks", () => {
    assert.deepEqual(
      [...rootProperties.keys()].filter((name) => !declaredForTokens.has(name)),
      [],
    );
  });

  test("declares each default as tokens.json gives it", () => {
    const differing = [...defaults]
      .filter(
        ([name, value]) =>
          rootProperties.has(name) && rootProperties.get(name) !== value,
      )
      .map(
        ([name, value]) =>
          `${name}: "${rootProperties.get(name)}" in styles.css, "${value}" in tokens.json`,
      );
    assert.deepEqual(differing, []);
  });

  /*
   * A custom property holding `var()` resolves on the element that declares
   * it, so a default on `:root` that read a live colour would keep its light
   * value inside `.gridkit-dark`. A raw colour reads only raw colours of its
   * own side; any other default reads only tokens that are not colours.
   */
  test("declares no default that reads a value the palette swaps", () => {
    const sideOfRaw = new Map(
      colors.flatMap(({ name }) =>
        SIDES.map((side) => [`${name}-${side}`, side]),
      ),
    );
    const singles = new Set(
      tokens.filter(({ type }) => type !== "color").map(({ name }) => name),
    );
    const problems = [...defaults].flatMap(([name, value]) => {
      const side = sideOfRaw.get(name);
      return [...value.matchAll(/var\((--[\w-]+)/g)]
        .map(([, read]) => read)
        .filter((read) =>
          side === undefined
            ? !singles.has(read)
            : sideOfRaw.get(read) !== side,
        )
        .map((read) => `${name} reads ${read}`);
    });
    assert.deepEqual(problems, []);
  });

  test("points every live colour at its light value on :root", () => {
    assert.deepEqual(
      new Map(colors.map(({ name }) => [name, rootProperties.get(name)])),
      pointers("light"),
    );
  });

  test("points every live colour, and nothing else, at its dark value under @variant dark", () => {
    assert.deepEqual(
      customProperties(childBlock(root, "@variant dark")),
      pointers("dark"),
    );
  });

  test("points every live colour, and nothing else, at its light value in .gridkit-light", () => {
    assert.deepEqual(
      customProperties(childBlock(sheet, ".gridkit-light")),
      pointers("light"),
    );
  });

  test("points every live colour, and nothing else, at its dark value in .gridkit-dark", () => {
    assert.deepEqual(
      customProperties(childBlock(sheet, ".gridkit-dark")),
      pointers("dark"),
    );
  });

  test("registers every colour, and nothing else, in @theme inline", () => {
    assert.deepEqual(
      customProperties(childBlock(sheet, "@theme inline")),
      new Map(
        colors.map(({ name }) => [
          `--color-gridkit-${name.slice("--gridkit-".length)}`,
          `var(${name})`,
        ]),
      ),
    );
  });

  /*
   * `@theme inline` reads every colour to register its utility, which says
   * nothing about whether the grid uses it, so it doesn't count.
   */
  test("reads every token with var()", () => {
    const values = allDeclarations(
      sheet,
      (block) => block.prelude === "@theme inline",
    ).map(({ value }) => value);
    const unread = tokens.filter(
      ({ name }) =>
        !values.some((value) =>
          new RegExp(`var\\(${name}\\s*[,)]`).test(value),
        ),
    );
    assert.deepEqual(
      unread.map(({ name }) => name),
      [],
    );
  });
});
