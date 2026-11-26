import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import postcss from "postcss";
import path from "node:path";
import { STYLESHEETS, generateStylesheet, toPlainCss } from "./stylesheet.mjs";

const DARK_QUERY = "@media (prefers-color-scheme: dark)";

/** A source with every construct the generator rewrites, plus `extra`. */
function source(extra = "") {
  return `/* The source's header. */
:root {
  --gridkit-accent: var(--gridkit-accent-light);

  @variant dark {
    --gridkit-accent: var(--gridkit-accent-dark);
  }
}

.gridkit-light {
  --gridkit-accent: var(--gridkit-accent-light);
}

.gridkit-dark {
  --gridkit-accent: var(--gridkit-accent-dark);
}

/* Registers the utilities. */
@theme inline {
  --color-gridkit-accent: var(--gridkit-accent);
}

@layer base {
  .grid-row {
    color: var(--gridkit-accent);
  }
}
${extra}`;
}

for (const stylesheet of STYLESHEETS) {
  const { target, paletteRoot } = stylesheet;

  describe(`the generated ${path.basename(target)}`, () => {
    test("matches theme-tailwind's (run pnpm --filter @gridkitjs/theme-css build)", async () => {
      assert.equal(
        readFileSync(target, "utf8"),
        await generateStylesheet(stylesheet),
      );
    });

    test("has no Tailwind-only at-rule", () => {
      const css = readFileSync(target, "utf8");
      for (const atRule of [
        "@variant",
        "@theme",
        "@apply",
        "@custom-variant",
      ]) {
        assert.ok(!css.includes(atRule), `${atRule} in ${target}`);
      }
    });

    test("puts the dark query before the palette classes", () => {
      const css = readFileSync(target, "utf8");
      const dark = css.indexOf(`${DARK_QUERY} {\n  ${paletteRoot} {`);
      assert.notEqual(dark, -1);
      assert.ok(dark < css.indexOf("\n.gridkit-light {"));
      assert.ok(dark < css.indexOf("\n.gridkit-dark {"));
    });
  });
}

describe("toPlainCss", () => {
  test("moves @variant dark into a media query after :root", () => {
    const [light, media, next] = postcss.parse(toPlainCss(source())).nodes;
    assert.ok(light?.type === "rule" && light.selector === ":root");
    assert.deepEqual(
      light.nodes.map((node) => node.type),
      ["decl"],
    );
    assert.ok(media?.type === "atrule");
    assert.equal(`@${media.name} ${media.params}`, DARK_QUERY);
    const [dark] = media.nodes ?? [];
    assert.ok(dark?.type === "rule" && dark.selector === ":root");
    assert.deepEqual(
      dark.nodes.map((node) =>
        node.type === "decl" ? `${node.prop}: ${node.value}` : node.type,
      ),
      ["--gridkit-accent: var(--gridkit-accent-dark)"],
    );
    assert.ok(next?.type === "rule" && next.selector === ".gridkit-light");
  });

  test("moves @variant dark out of another palette rule onto the same selector", () => {
    const css = source().replace(":root {", ":where(:root) {");
    const [light, media] = postcss.parse(
      toPlainCss(css, ":where(:root)"),
    ).nodes;
    assert.ok(light?.type === "rule" && light.selector === ":where(:root)");
    assert.ok(media?.type === "atrule");
    const [dark] = media.nodes ?? [];
    assert.ok(dark?.type === "rule" && dark.selector === ":where(:root)");
  });

  test("drops @theme inline, its comment and the source's header", () => {
    const css = toPlainCss(source());
    assert.ok(!css.includes("@theme"));
    assert.ok(!css.includes("Registers the utilities"));
    assert.ok(!css.includes("The source's header"));
  });

  test("keeps plain at-rules", () => {
    const css = toPlainCss(
      source("@media print {\n  .grid-row {\n    color: black;\n  }\n}\n"),
    );
    assert.ok(css.includes("@layer base {"));
    assert.ok(css.includes("@media print {"));
  });

  for (const [what, extra] of [
    ["an unknown at-rule", ".grid-row {\n  @apply flex;\n}\n"],
    ["@custom-variant", "@custom-variant dark (&:where(.dark, .dark *));\n"],
    [
      "a nested rule",
      ".grid-row {\n  & .grid-cell {\n    color: red;\n  }\n}\n",
    ],
    [
      "an at-rule nested in a rule",
      ".grid-row {\n  @media print {\n    color: red;\n  }\n}\n",
    ],
    ["a Tailwind function", ".grid-row {\n  padding: --spacing(2);\n}\n"],
    ["a @theme other than inline", "@theme {\n  --color-x: red;\n}\n"],
  ]) {
    test(`throws on ${what}`, () => {
      assert.throws(() => toPlainCss(source(extra)));
    });
  }

  test("throws when the palette classes come before :root", () => {
    const css = source().replace(
      /(:root \{[\s\S]*?\n\}\n)\n(\.gridkit-light \{[\s\S]*?\n\}\n)/,
      "$2\n$1",
    );
    assert.throws(() => toPlainCss(css), /\.gridkit-light must come after/);
  });
});
