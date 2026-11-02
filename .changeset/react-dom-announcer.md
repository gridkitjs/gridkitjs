---
"@gridkitjs/react": minor
---

`@gridkitjs/react` now depends on `@gridkitjs/dom`, which holds the browser
behaviours `DataGrid` attaches. Nothing changes at a call site.

The live region is now created by `@gridkitjs/dom`'s `createLiveAnnouncer`,
still as the last child of the grid's viewport element. One difference a
screen-reader user can hear: an announcement identical to the one before it —
the same column resized to the same width twice — is now read out again
rather than silently dropped.
