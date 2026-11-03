---
"@gridkitjs/dom": minor
---

`attachToolbar(toolbar)` makes a `role="toolbar"` element a renderer drew one
tab stop, following the WAI-ARIA toolbar pattern. Its entries are found by
`data-gridkit-toolbar-item`, each entry's control being the entry itself or
the first focusable element in it; ArrowRight and ArrowLeft move between them,
wrapping, and Home and End go to the ends, passing over separators and
spacers and keeping `aria-disabled` controls focusable. The tab stop follows
focus and survives entries coming and going. A text field keeps Home, End and
the arrows while its caret has text to move through, and the arrows lead out
of it at either end.
