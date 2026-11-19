---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

The stylesheet draws a loading grid's overlay (`.gridkit-grid-loading-overlay`): a translucent layer in the surface colour over the body, above pinned cells and under the sticky header and footer, with its message (`.gridkit-grid-loading-overlay-content`) centred in the rows in view. The message sticks under the header at the start edge, as wide as the scroll area's inside from the `--gridkit-loading-width` the grid sets on it, so it stays in view however the body scrolls. Over a body with no rows (`.is-empty`) the overlay is as tall as the empty message. `.gridkit-data-grid-body` is now `position: relative`, the box the overlay covers.
