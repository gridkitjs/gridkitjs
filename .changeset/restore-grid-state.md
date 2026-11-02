---
"@gridkitjs/core": minor
---

Grid state can be saved and put back. `serializeGridState(state)` returns a
`SerializedGridState` that survives `JSON.stringify` and back — a `Date`
filter value becomes its ISO string, and a predicate filter entry, which
cannot be written down, is left out with a `console.error` naming its column.
The controller's `restoreState(saved)` applies a full or partial state, from
`getState()` or from JSON: each slice that changes fires its callback,
subscribers are called once, and a restored page survives a restored sort.

The controller's `setFilter` now compares filters by content rather than by
entry identity, so setting a filter equal to the current one reports nothing.
