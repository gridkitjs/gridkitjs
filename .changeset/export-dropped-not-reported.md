---
"@gridkitjs/react": patch
---

An export dropped because another is still being written is no longer reported to `onCommand`, and `runCommand` returns `false` for it. Choosing a slow export twice used to report two exports while saving one file.
