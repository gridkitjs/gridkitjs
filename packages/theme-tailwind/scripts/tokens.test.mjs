/**
 * Keeps `src/tokens.json`, the stylesheets and `docs/tokens.mdx` in step.
 *
 * The shared tokens, which the grid and the forms both read, are the custom
 * properties `styles.css` declares on `:root`. The forms tokens,
 * `--gridkit-forms-*`, are declared only in `forms.css`, on `:where(:root)`,
 * beside its copy of the palette and of every shared token its rules read.
 * The manifest has to list each token with the default declared for it,
 * each colour has to be wired up the way the palette comment in
 * `styles.css` describes, and the docs page's tables have to be the ones
 * the manifest generates.
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
import { DOCS_PAGE, withTokenTables } from "./token-docs.mjs";

/** @import { CssBlock, CssDeclaration } from "./css.mjs" */
/** @import { Token } from "./manifest.mjs" */

const SRC = path.resolve(import.meta.dirname, "..", "src");
const TOKEN_NAME = /^--gridkit-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORMS_TOKEN = /^--gridkit-forms-/;
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
const sharedTokens = tokens.filter(({ name }) => !FORMS_TOKEN.test(name));
const formsTokens = tokens.filter(({ name }) => FORMS_TOKEN.test(name));
const tokenNames = new Set(tokens.map(({ name }) => name));
const colorNames = new Set(colors.map(({ name }) => name));

/**
 * @param {string} file
 * @returns {CssBlock}
 */
function readSheet(file) {
  return parseCss(readFileSync(path.join(SRC, file), "utf8"));
}

const styles = readSheet("styles.css");
const forms = readSheet("forms.css");

/**
 * The token a custom property belongs to: the token itself, or the colour
 * whose raw pair it is.
 *
 * @param {string} property
 * @returns {string | undefined}
 */
function tokenOf(property) {
  if (tokenNames.has(property)) {
    return property;
  }
  const color = property.replace(/-(?:light|dark)$/, "");
  return color !== property && colorNames.has(color) ? color : undefined;
}

/**
 * The custom properties that hold these tokens' defaults, and each colour's
 * live name: everything a stylesheet declares on its root for them.
 *
 * @param {Token[]} declared
 * @returns {Set<string>}
 */
function rootDeclarations(declared) {
  return new Set([
    ...defaultDeclarations(declared).keys(),
    ...declared.filter(({ type }) => type === "color").map(({ name }) => name),
  ]);
}

/**
 * Each colour's live name pointed at one side of its pair, as a palette
 * block declares it.
 *
 * @param {Token[]} declared The colours a stylesheet declares.
 * @param {(typeof SIDES)[number]} side
 * @returns {Map<string, string>}
 */
function pointers(declared, side) {
  return new Map(declared.map(({ name }) => [name, `var(${name}-${side})`]));
}

/**
 * Every value in a stylesheet that could read a token. `@theme inline`
 * reads every colour to register its utility, which says nothing about
 * whether a rule uses it, so it doesn't count.
 *
 * @param {CssBlock} sheet
 * @returns {CssDeclaration[]}
 */
function readingDeclarations(sheet) {
  return allDeclarations(sheet, (block) => block.prelude === "@theme inline");
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

/**
 * The checks every stylesheet's palette takes: its root declares exactly
 * these tokens' defaults and live colours, each default as the manifest
 * gives it, and each colour is pointed at its pair in all four palette
 * blocks and registered in `@theme inline`.
 *
 * @param {CssBlock} sheet
 * @param {string} rootPrelude
 * @param {Token[]} declared
 */
function testPalette(sheet, rootPrelude, declared) {
  const root = childBlock(sheet, rootPrelude);
  const rootProperties = customProperties(root);
  const expected = rootDeclarations(declared);
  const declaredColors = declared.filter(({ type }) => type === "color");

  test(`declares its tokens on ${rootPrelude}`, () => {
    assert.deepEqual(
      [...expected].filter((name) => !rootProperties.has(name)),
      [],
    );
  });

  test(`declares no other custom property on ${rootPrelude}`, () => {
    assert.deepEqual(
      [...rootProperties.keys()].filter((name) => !expected.has(name)),
      [],
    );
  });

  test("declares each default as tokens.json gives it", () => {
    const differing = [...defaultDeclarations(declared)]
      .filter(
        ([name, value]) =>
          rootProperties.has(name) && rootProperties.get(name) !== value,
      )
      .map(
        ([name, value]) =>
          `${name}: "${rootProperties.get(name)}" in the stylesheet, "${value}" in tokens.json`,
      );
    assert.deepEqual(differing, []);
  });

  test(`points every live colour at its light value on ${rootPrelude}`, () => {
    assert.deepEqual(
      new Map(
        declaredColors.map(({ name }) => [name, rootProperties.get(name)]),
      ),
      pointers(declaredColors, "light"),
    );
  });

  test("points every live colour, and nothing else, at its dark value under @variant dark", () => {
    assert.deepEqual(
      customProperties(childBlock(root, "@variant dark")),
      pointers(declaredColors, "dark"),
    );
  });

  test("points every live colour, and nothing else, at its light value in .gridkit-light", () => {
    assert.deepEqual(
      customProperties(childBlock(sheet, ".gridkit-light")),
      pointers(declaredColors, "light"),
    );
  });

  test("points every live colour, and nothing else, at its dark value in .gridkit-dark", () => {
    assert.deepEqual(
      customProperties(childBlock(sheet, ".gridkit-dark")),
      pointers(declaredColors, "dark"),
    );
  });

  test("registers every colour, and nothing else, in @theme inline", () => {
    assert.deepEqual(
      customProperties(childBlock(sheet, "@theme inline")),
      new Map(
        declaredColors.map(({ name }) => [
          `--color-gridkit-${name.slice("--gridkit-".length)}`,
          `var(${name})`,
        ]),
      ),
    );
  });
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

  /*
   * A custom property holding `var()` resolves on the element that declares
   * it, so a default on `:root` that read a live colour would keep its light
   * value inside `.gridkit-dark`. A raw colour reads only raw colours of its
   * own side; any other default reads only tokens that are not colours.
   */
  test("gives no default that reads a value the palette swaps", () => {
    const sideOfRaw = new Map(
      colors.flatMap(({ name }) =>
        SIDES.map((side) => [`${name}-${side}`, side]),
      ),
    );
    const singles = new Set(
      tokens.filter(({ type }) => type !== "color").map(({ name }) => name),
    );
    const problems = [...defaultDeclarations(tokens)].flatMap(
      ([name, value]) => {
        const side = sideOfRaw.get(name);
        return [...value.matchAll(/var\((--[\w-]+)/g)]
          .map(([, read]) => read)
          .filter((read) =>
            side === undefined
              ? !singles.has(read)
              : sideOfRaw.get(read) !== side,
          )
          .map((read) => `${name} reads ${read}`);
      },
    );
    assert.deepEqual(problems, []);
  });
});

describe("styles.css", () => {
  testPalette(styles, ":root", sharedTokens);
});

describe("forms.css", () => {
  const declared = new Set(
    [...customProperties(childBlock(forms, ":where(:root)")).keys()].map(
      (property) => tokenOf(property) ?? property,
    ),
  );
  const copied = sharedTokens.filter(({ name }) => declared.has(name));

  testPalette(forms, ":where(:root)", [...copied, ...formsTokens]);

  /*
   * The palette travels with every stylesheet, for the colour utilities;
   * any other shared token is copied only if this sheet reads it, so it
   * still works alone. A declaration reading its own token, as a colour's
   * live name reads its pair, doesn't count.
   */
  test("copies the palette and exactly the shared tokens it reads", () => {
    const palette = sharedTokens
      .filter(({ type, tier }) => type === "color" && tier === "basic")
      .map(({ name }) => name);
    const read = readingDeclarations(forms).flatMap(({ property, value }) =>
      [...value.matchAll(/var\((--[\w-]+)/g)]
        .map(([, name = ""]) => tokenOf(name))
        .filter((name) => name !== undefined && name !== tokenOf(property)),
    );
    const needed = new Set(
      [...palette, ...read].filter((name) => !FORMS_TOKEN.test(name)),
    );
    assert.deepEqual(copied.map(({ name }) => name).sort(), [...needed].sort());
  });
});

describe("both stylesheets", () => {
  test("read every token with var()", () => {
    const values = [styles, forms]
      .flatMap(readingDeclarations)
      .map(({ value }) => value);
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

describe("docs/tokens.mdx", () => {
  test("shows the tables tokens.json generates", () => {
    const page = readFileSync(DOCS_PAGE, "utf8");
    assert.equal(
      withTokenTables(page, tokens),
      page,
      "The token tables are stale: run pnpm --filter @gridkitjs/theme-tailwind docs:tokens",
    );
  });
});
