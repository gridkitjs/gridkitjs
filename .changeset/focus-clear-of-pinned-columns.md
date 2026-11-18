---
"@gridkitjs/dom": patch
"@gridkitjs/theme-tailwind": patch
"@gridkitjs/theme-css": patch
---

A cell that keyboard focus moves to, or that `scrollToColumn` scrolls to, is
no longer left partly under a pinned column. The stylesheet gives every
unpinned header and body cell a `scroll-margin-inline` of the pinned columns'
widths at each edge, and `createGridFocus` now scrolls a header cell to the
`nearest` edge after a key moves focus to it, as it already did for body
cells; Chromium and WebKit left a header cell where focus found it.
