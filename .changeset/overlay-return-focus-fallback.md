---
"@gridkitjs/dom": minor
---

`attachOverlay` takes a `returnFocusFallback` option: a function naming where
focus goes on detach when `returnFocusTo` is `null` or has left the page, as a
menu button does when an item in its menu hides it. Without it, focus falls to
the page as before.
