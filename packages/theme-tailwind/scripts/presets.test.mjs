/**
 * Keeps the presets in `src/presets/` in step with the token manifest and
 * their index: each is one `:root` block setting only theme tokens, a
 * colour through its raw pair; `default.css` sets every token to its
 * default; `index.json` lists every file and no other; and no preset makes
 * the grid's text unreadable.
 */
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { describe, test } from "node:test";
import { customProperties, parseCss } from "./css.mjs";
import { defaultDeclarations, readManifest } from "./manifest.mjs";
import { PRESETS_DIR, readPreset, readPresetIndex } from "./presets.mjs";

/** @import { CssBlock } from "./css.mjs" */
/** @import { PresetEntry } from "./presets.mjs" */

const ENTRY_FIELDS = ["id", "label", "description", "file"];
const PRESET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SIDES = /** @type {const} */ (["light", "dark"]);

/**
 * The text and background pairs a preset has to keep readable: the menus'
 * text on their background, and secondary text on every background it sits
 * on, a group row and its hover included.
 */
const CONTRAST_PAIRS = [
  ["fg", "surface"],
  ["fg-muted", "surface"],
  ["fg-muted", "surface-muted"],
  ["fg-muted", "selected"],
];

/** WCAG's AA minimum for body text, and AAA's for the presets held to it. */
const AA = 4.5;
const AAA = 7;
const AAA_PRESETS = new Set(["high-contrast"]);

const { tokens } = readManifest();
const defaults = defaultDeclarations(tokens);
const liveColors = new Set(
  tokens.filter(({ type }) => type === "color").map(({ name }) => name),
);
const index = readPresetIndex();

/**
 * @param {PresetEntry} entry
 * @returns {CssBlock} The preset's `:root` block, once it is the file's
 *   only content.
 */
function presetRoot({ file }) {
  const sheet = parseCss(readPreset(file));
  const [root] = sheet.blocks;
  assert.equal(sheet.declarations.length, 0, "a declaration outside :root");
  assert.ok(
    root !== undefined && sheet.blocks.length === 1 && root.prelude === ":root",
    "not one :root block",
  );
  assert.equal(root.blocks.length, 0, "a block inside :root");
  return root;
}

/**
 * The relative luminance WCAG defines, of an `oklch(L C H)` colour: the
 * oklab coordinates to linear sRGB, clipped to its gamut.
 *
 * @param {string} color
 * @returns {number}
 */
function luminance(color) {
  const match =
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)$/.exec(color);
  if (match === null) {
    throw new Error(`Can't check the contrast of ${color}: not oklch(L C H)`);
  }
  const [, l = "", percent, c = "", h = ""] = match;
  const lightness = Number(l) / (percent === "" ? 1 : 100);
  const hue = (Number(h) * Math.PI) / 180;
  const a = Number(c) * Math.cos(hue);
  const b = Number(c) * Math.sin(hue);

  const long = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const [red, green, blue] = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ].map((channel) => Math.min(Math.max(channel, 0), 1));
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

/**
 * @param {string} foreground
 * @param {string} background
 * @returns {number} WCAG's contrast ratio, from 1 to 21.
 */
function contrast(foreground, background) {
  const [darker, lighter] = [luminance(foreground), luminance(background)].sort(
    (x, y) => x - y,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/**
 * A property's value with the preset loaded after the theme, following a
 * value that is only `var()` of another.
 *
 * @param {Map<string, string>} values
 * @param {string} name
 * @returns {string}
 */
function resolve(values, name) {
  const value = values.get(name);
  if (value === undefined) {
    throw new Error(`${name} is not set`);
  }
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference?.[1] === undefined ? value : resolve(values, reference[1]);
}

describe("presets/index.json", () => {
  test("has schema 1 and well-formed entries", () => {
    assert.equal(index.schemaVersion, 1);
    const problems = index.presets.flatMap((entry) => {
      const { id, label, description, file } = entry;
      return [
        Object.keys(entry).sort().join() === [...ENTRY_FIELDS].sort().join()
          ? []
          : [`${id}: fields are not ${ENTRY_FIELDS.join(", ")}`],
        PRESET_ID.test(id) ? [] : [`${id}: id is not kebab case`],
        file === `${id}.css` ? [] : [`${id}: file is not ${id}.css`],
        typeof label === "string" && label !== ""
          ? []
          : [`${id}: label is empty`],
        typeof description === "string" && /^\S[^\n]*\.$/.test(description)
          ? []
          : [`${id}: description is not one sentence`],
      ].flat();
    });
    assert.deepEqual(problems, []);
  });

  test("lists default first", () => {
    assert.equal(index.presets[0]?.id, "default");
  });

  test("lists every preset file once, and no other", () => {
    const listed = index.presets.map(({ file }) => file);
    assert.deepEqual(
      listed.filter((file, position) => listed.indexOf(file) !== position),
      [],
      "listed twice",
    );
    const files = readdirSync(PRESETS_DIR).filter((file) =>
      file.endsWith(".css"),
    );
    assert.deepEqual([...listed].sort(), files.sort());
  });
});

describe("presets", () => {
  test("default.css sets every token to its default", () => {
    const entry = index.presets.find(({ id }) => id === "default");
    assert.ok(entry !== undefined);
    assert.deepEqual(customProperties(presetRoot(entry)), defaults);
  });

  for (const entry of index.presets) {
    describe(entry.file, () => {
      test("starts with a comment naming the preset", () => {
        assert.match(
          readPreset(entry.file),
          new RegExp(`^/\\*\\n \\* GridKit preset: ${entry.label}\\.`),
        );
      });

      test("is one :root block of custom properties", () => {
        const properties = presetRoot(entry)
          .declarations.map(({ property }) => property)
          .filter((property) => !property.startsWith("--"));
        assert.deepEqual(properties, []);
      });

      test("sets only tokens, a colour by its pair", () => {
        const problems = [...customProperties(presetRoot(entry)).keys()]
          .filter((name) => !defaults.has(name))
          .map((name) =>
            liveColors.has(name)
              ? `${name} is a live colour: set ${name}-light and ${name}-dark`
              : `${name} is not a token`,
          );
        assert.deepEqual(problems, []);
      });

      const minimum = AAA_PRESETS.has(entry.id) ? AAA : AA;
      test(`keeps text at ${minimum}:1 contrast in light and dark`, () => {
        const values = new Map([
          ...defaults,
          ...customProperties(presetRoot(entry)),
        ]);
        const problems = SIDES.flatMap((side) =>
          CONTRAST_PAIRS.flatMap(([text, background]) => {
            const ratio = contrast(
              resolve(values, `--gridkit-${text}-${side}`),
              resolve(values, `--gridkit-${background}-${side}`),
            );
            return ratio < minimum
              ? [`${side}: ${text} on ${background} is ${ratio.toFixed(2)}:1`]
              : [];
          }),
        );
        assert.deepEqual(problems, []);
      });
    });
  }
});
