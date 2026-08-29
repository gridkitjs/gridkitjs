---
"@gridkitjs/theme-tailwind": minor
---

`.gridkit-data-grid-body`: the row area's scroll container, styled to honor `@gridkitjs/react`'s new `height` prop (`overflow-y: auto`, height driven by the prop or `auto` when it's unset). No `position: sticky` is added for the header or footer — splitting them into their own tables already keeps them out of the region that scrolls, so there's nothing to stick. Add your own CSS targeting `.gridkit-data-grid-header`/`.gridkit-data-grid-footer` for a divider or shadow at the seam.
