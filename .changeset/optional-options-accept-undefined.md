---
"@gridkitjs/core": patch
---

Every optional member of the grid's options and column definitions accepts `undefined`, as most already did, so a value that may be missing can be passed through under `exactOptionalPropertyTypes`. `locale={maybeLocale}` type-checks on `DataGrid`, as do `locale` in `CsvOptions` and `PrintOptions`, the members of `hoverable`, a column's `id`, `type`, `alignment`, `width`, `minWidth`, `maxWidth`, `resizable`, `reorderable`, `sortable`, `groupable`, `groupToggleIcon`, `groupByDraggable`, `wrap`, `headerClassName` and `cellClassName`, and the members of `wrap`.
