---
"@gridkitjs/core": patch
"@gridkitjs/theme-tailwind": patch
---

Secondary text now meets WCAG AA contrast (4.5:1) on group rows. The light `--gridkit-fg-muted-light` default is darker, `oklch(0.5 0.015 250)` where it was `oklch(0.55 0.015 250)`, so a group row's `(n)` count and inline subtotals, which sat at about 4.4:1 on `--gridkit-surface-muted` and 4.1:1 on hover, now read at 5.5:1 and 5:1. Every other use of `--gridkit-fg-muted` in light mode is slightly darker too. The dark palette already met AA and is unchanged. A grid that overrides `--gridkit-fg-muted` or its `-light` value keeps its own colour.

`datasetIndex` is each row's position in the whole result as shown, as documented. A data row's `datasetIndex` used to stay at its index in `dataSource` through filtering, sorting and grouping, so in a grouped grid a group's first data row could share an `aria-rowindex` with the group row above it, and in a sorted or filtered grid `aria-rowindex` skipped about or ran past `aria-rowcount`. `filterRows`, `sortRows`, `groupRows` and `withGroupAggregates` now renumber `datasetIndex` alongside `rowIndex`, so every row, group row and summary row has its own `aria-rowindex`, in order, on every page and under virtualization. A `cellTemplate` that reads `datasetIndex` as a running row number now counts 1, 2, 3 down the grid however it is sorted; to reach a row's index in `dataSource`, look the row up by its id instead.
