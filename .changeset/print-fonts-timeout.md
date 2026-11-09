---
"@gridkitjs/dom": patch
---

`printDocument` waits at most 3 seconds for the print frame's fonts before
opening the print dialog. A font that never finished loading used to keep
the print from ever opening or settling, and every later print was refused
as if that one were still open.
