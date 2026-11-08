---
"@gridkitjs/dom": patch
---

`printDocument` cleans up after a print that fails. When the browser fails
to open the print dialog, the listeners the print added to `window` are
removed along with its frame. When the frame is taken out of the page
before it loads, the promise rejects instead of never settling, so later
prints are no longer refused as if that one were still open.
