---
"@gridkitjs/dom": minor
---

`createLiveAnnouncer(container?)` adds a visually hidden, polite live region
(`role="status"`, class `gridkit-sr-only`) and returns `announce(text)` and
`destroy()`. Announcing the same text twice in a row reads it out twice.
