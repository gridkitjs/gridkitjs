---
"@gridkitjs/core": minor
---

**Breaking for a hand-built command host.** `GridCommandHost` has a new
required member, `writeClipboard(content)`, which puts a `CopyContent` on the
clipboard and announces it — the copy commands hand it what they copy. A host
you build yourself, for a renderer of your own or a test, has to add it; one
with no clipboard passes a member that does nothing:

```ts
// before
const host = {
  autoFitColumns() {},
  openPanel() {},
  announce() {},
  saveFile() {},
};

// after
const host = {
  autoFitColumns() {},
  openPanel() {},
  announce() {},
  saveFile() {},
  writeClipboard() {},
};
```
