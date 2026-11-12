---
"@gridkitjs/react": minor
---

`@gridkitjs/react` exports every core type its props, column definitions, callbacks and `DataGridApi` methods name, so a React app types a grid without importing from `@gridkitjs/core`. Added: `AggregateFn`, `AggregateResults`, `AggregateSpec`, `AggregateState`, `BuiltInAggregate`, `ColumnAlignment`, `ColumnFilterMenuOptions`, `ColumnOrderEvent`, `ColumnOrderState`, `ColumnSortEntry`, `ColumnSortEvent`, `ColumnSortState`, `ColumnType`, `ColumnWrapConfig`, `DisplayRow`, `ExportScalar`, `FieldPath`, `FooterTemplateContext`, `FormatLocale`, `GridFilterMenuOptions`, `GroupAggregateDisplay`, `GroupByEntry`, `GroupByEvent`, `GroupByState`, `GroupExpansionEvent`, `GroupExpansionState`, `PaginationChangeEvent`, `PaginationState`, `ResolvedGroupRow`, `ResolvedGroupSummaryRow` and `SortDirection`.

```ts
// Before
import type { ColumnSortState, PaginationState } from "@gridkitjs/core";

// After
import type { ColumnSortState, PaginationState } from "@gridkitjs/react";
```

The import from `@gridkitjs/core` still works.
