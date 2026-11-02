---
"@gridkitjs/core": minor
"@gridkitjs/react": minor
---

`@gridkitjs/core` exports `GridOptions<Row>`: every grid setting that names no
renderer type — data, row identity, what the user may do, starting state and
change callbacks — in one interface, with the `Borders`, `HoverableConfig` and
`GroupByBarVisibility` types it uses. `DataGridProps<Row>` is now composed
from it plus `ReactRenderSlots<Row>` (`columns`, `pager`, `infiniteScroll`),
the selection callbacks and `ref`; every prop keeps its name and type.
`@gridkitjs/react` still exports `Borders`, `HoverableConfig` and
`GroupByBarVisibility`, and now also `GridOptions` and `ReactRenderSlots`.
