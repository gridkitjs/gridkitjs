---
"@gridkitjs/react": minor
---

`DataGridApi` gains `subscribe(listener)`, a read/notify channel for reacting to grid state without polling the imperative getters — not a second, imperative-only way to drive that state. It's the primitive the new `use*State` hooks (added in following changes) are built on with `useSyncExternalStore`; most consumers should reach for one of those instead of calling `subscribe` directly.
