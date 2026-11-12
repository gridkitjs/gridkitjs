---
"@gridkitjs/core": patch
"@gridkitjs/dom": patch
"@gridkitjs/react": patch
"@gridkitjs/export-xlsx": patch
---

The packages declare `"sideEffects": false`, so a bundler drops the modules an app imports nothing from. None of them does work at import.
