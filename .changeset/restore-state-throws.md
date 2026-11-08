---
"@gridkitjs/core": patch
---

`restoreState` given a saved state it can't read, such as a corrupted filter, still throws, but no longer leaves the grid half-restored: the slices set before the error now show in `getState()` and the view, fire their callbacks and call subscribers once before the error reaches the caller.
