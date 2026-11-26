---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

Three new palette colours for messages of each severity, beside
`--gridkit-error`: `--gridkit-warning` (the accent turned amber),
`--gridkit-success` (the accent turned green) and `--gridkit-info` (the
accent), each a `-light`/`-dark` pair like the other colours, with
`bg-gridkit-warning` and the rest as Tailwind utilities. They follow a
preset's accent, and fall back to the text colour where relative colour
syntax is unsupported, as `--gridkit-error` does. The default preset lists
them; the grid's own styles do not change.
