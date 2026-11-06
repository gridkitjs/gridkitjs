---
"@gridkitjs/theme-tailwind": patch
---

Secondary text now meets WCAG AA contrast (4.5:1) on group rows. The light `--gridkit-fg-muted-light` default is darker, `oklch(0.5 0.015 250)` where it was `oklch(0.55 0.015 250)`, so a group row's `(n)` count and inline subtotals, which sat at about 4.4:1 on `--gridkit-surface-muted` and 4.1:1 on hover, now read at 5.5:1 and 5:1. Every other use of `--gridkit-fg-muted` in light mode is slightly darker too. The dark palette already met AA and is unchanged. A grid that overrides `--gridkit-fg-muted` or its `-light` value keeps its own colour.
