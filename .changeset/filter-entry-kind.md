---
"@gridkitjs/core": minor
---

Breaking: every `FilterEntry` names its kind in a `kind` field — `"text"`, `"value"`, `"predicate"`, `"operator"` or `"group"` — so a filter you write in code, for `defaultFilter`, the `filter` prop or `setFilter`, adds it to each entry, nested ones included. `{ columnId: "Region", query: "%st" }` is now `{ kind: "text", columnId: "Region", query: "%st" }`, and `{ combinator: "or", entries: [...] }` is now `{ kind: "group", combinator: "or", entries: [...] }`. `setFilter` throws on an entry without `kind`. `serializeGridState` writes `kind`, and a filter saved before this release still restores through `restoreState`, which tells each entry's kind from its fields.
