---
"@gridkitjs/core": minor
---

`columnValueOptions` takes an optional `messages` in its query, the grid's own
partial `GridMessages`. A boolean option is then labelled `booleanTrue` /
`booleanFalse`, the same words its cells use, and `search` matches those
labels. Without it, booleans still read `"true"` / `"false"`.

```ts
columnValueOptions(rows, dataColumns, filter, "Active", {
  locale,
  messages: { booleanTrue: "ja", booleanFalse: "nein" },
});
```
