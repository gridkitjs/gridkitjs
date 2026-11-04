---
"@gridkitjs/core": minor
---

**Breaking for a hand-built command host.** `GridCommandHost` has a new
required member, `saveFile(file)`, which saves an `ExportFile` (or a promise of
one) — the export commands hand it the file they write. A host you build
yourself, for a renderer of your own or a test, has to add it; one with no
file to save to passes a member that does nothing:

```ts
// before
const host = { autoFitColumns() {}, openPanel() {}, announce() {} };

// after
const host = {
  autoFitColumns() {},
  openPanel() {},
  announce() {},
  saveFile() {},
};
```
