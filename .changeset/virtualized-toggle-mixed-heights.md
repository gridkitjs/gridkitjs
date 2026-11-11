---
"@gridkitjs/react": patch
---

Turning `virtualized` on keeps the focused cell and the scroll position in a
body whose row heights differ from `estimatedRowHeight`. The first window was
placed by the estimate, so far down a body of tall or mixed rows it could miss
the rows on screen, drop the browser's focus and jump the scroll.
