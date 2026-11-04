---
"@gridkitjs/dom": minor
---

`writeClipboard({ text, html })` puts a copy on the clipboard as both
`text/plain` and `text/html`, through the async Clipboard API with a
`ClipboardItem`, else its `writeText`, else the legacy `copy` event for a page
outside a secure context. It returns a promise that rejects only when every
way fails. `isNativeCopy(target)` says whether a copy key pressed there belongs
to the browser — in a text field, or with text highlighted on the page — so a
renderer copying on Ctrl+C can leave it alone.
