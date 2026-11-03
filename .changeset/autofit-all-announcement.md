---
"@gridkitjs/react": patch
---

"Autofit all columns", and the ref's `autoFitColumns` when it fits more than
one column, announce once for the whole operation — "3 columns autofitted",
the new `columnsAutoFitted` message — rather than a resize per column, of which
a screen reader heard only the last.
