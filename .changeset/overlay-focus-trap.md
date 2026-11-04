---
"@gridkitjs/dom": minor
---

`attachOverlay` takes a `trapFocus` option for a dialog-like panel: Tab from
its last tabbable element moves to its first, and Shift+Tab from its first to
its last, instead of leaving the panel and dismissing it with `"blur"`. A
pointer down outside, or focus moved out by a script, still dismisses it.
