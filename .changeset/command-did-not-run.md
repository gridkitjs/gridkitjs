---
"@gridkitjs/core": minor
---

A command can say it did not run after all. `GridCommand.execute` may return `false`, and `runCommand` then returns `false`, so a renderer does not report it to `onCommand`. `GridCommandHost.saveFile` may return `false` for a file it drops unsaved, and the built-in export commands pass that on. Both still accept members that return nothing, so existing commands and hosts work unchanged.
