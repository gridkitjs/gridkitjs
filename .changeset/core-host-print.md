---
"@gridkitjs/core": minor
---

**Breaking for a hand-built command host.** `GridCommandHost` has a new
required member, `print(document, options)`, which puts a `PrintDocument` on
paper — the `print` command hands it the document it built and the
`PrintOptions` it built it under. A host you build yourself, for a renderer of
your own or a test, has to add it; one that cannot print passes a member that
does nothing:

```ts
// before
const host = {
  autoFitColumns() {},
  openPanel() {},
  announce() {},
  saveFile() {},
  writeClipboard() {},
};

// after
const host = {
  autoFitColumns() {},
  openPanel() {},
  announce() {},
  saveFile() {},
  writeClipboard() {},
  print() {},
};
```
