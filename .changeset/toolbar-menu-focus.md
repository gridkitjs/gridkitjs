---
"@gridkitjs/react": patch
---

A toolbar dropdown closed with Escape, or by an item that changed
nothing, no longer pulls focus into the toolbar on a later redraw of the grid.
A "More" menu open while the toolbar widens and takes its button away hands
focus to the toolbar rather than dropping it to the page.
