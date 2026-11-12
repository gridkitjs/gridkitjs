---
"@gridkitjs/core": minor
---

Breaking: saved state carries a version. `serializeGridState` writes `version: 1` on the object it returns, and `SerializedGridState` has the field, so `restoreState` can read a layout saved by an earlier release by the shape it was saved in:

```jsonc
// Before
{ "columnOrder": ["amount", "id"], "filter": [] }

// After
{ "version": 1, "columnOrder": ["amount", "id"], "filter": [] }
```

State saved by earlier releases, without a `version`, still restores, including a `groupExpansion` saved as a bare list of collapsed group ids. A `version` newer than the release reads makes `restoreState` throw a `TypeError` naming both versions, before any slice is set. A live state from `getState()` has no version and needs none.

Code that compares or validates the saved JSON by its exact keys, or builds a `SerializedGridState` by hand, must allow the new key:

```ts
// Before
const saved: SerializedGridState<Order> = { ...layout, filter: [] };

// After
const saved: SerializedGridState<Order> = { version: 1, ...layout, filter: [] };
```

A `groupExpansion` bare list is read only from a save with no `version`; under `version: 1` it throws like any other unreadable slice.
