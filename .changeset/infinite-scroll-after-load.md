---
"@gridkitjs/dom": patch
---

`attachInfiniteScroll` no longer starts a second load straight after one
finishes when the new rows have pushed the sentinel out of range. It read
where the sentinel was from the observer's last report, made before the rows
arrived, so in a busy browser a load at the bottom of the list could be
followed by another nobody scrolled for. A finished load now restarts the
observer, and the next load starts only if the sentinel is still in range.
This fixes `DataGrid`'s `infiniteScroll` in `@gridkitjs/react` too.
