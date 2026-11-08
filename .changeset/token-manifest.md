---
"@gridkitjs/theme-tailwind": minor
---

`@gridkitjs/theme-tailwind/tokens.json` lists every theme token the
stylesheet declares, for building theme tools or docs on top of it. Each
entry gives the token's `name`, its `group` (`colors`, `typography`,
`density`, `borders`, `shape` or `details`), a `tier` (`basic` for the
palette and the base knobs, `advanced` for a token that tunes one part of
the grid), its `type`, its `default` and a one-sentence `description`. A
colour is listed by its live name, such as `--gridkit-accent`, with a
`{ "light", "dark" }` default: override its `--gridkit-accent-light` and
`--gridkit-accent-dark` pair on `:root`.

```js
import manifest from "@gridkitjs/theme-tailwind/tokens.json" with { type: "json" };

const accent = manifest.tokens.find(
  (token) => token.name === "--gridkit-accent",
);
```
