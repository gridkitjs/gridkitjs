---
"@gridkitjs/react": minor
---

`DataGrid` marks pinned columns for the stylesheet to stick. Each header,
body, footer and group summary cell of a column pinned to the start or end
carries `is-pinned-start` or `is-pinned-end`, plus `is-pinned-edge` on the
pinned column beside the scrolling ones, and `--gridkit-pin-offset` in its
`style`: the summed widths of the columns pinned between it and its edge.
While a column is pinned, `.gridkit-data-grid-tables` carries
`--gridkit-pinned-start-width` and `--gridkit-pinned-end-width`, the width
pinned to each edge. A grid with no pinned column renders as before.
