---
"@gridkitjs/core": minor
---

Aggregate functions: `computeAggregates` reduces rows through built-in reducers (`sum`, `avg`, `min`, `max`, `count`, `countDistinct`) or a custom `AggregateFn`, and `withGroupAggregates` attaches each group's own subtotal to its header. New exports: `computeAggregates`, `withGroupAggregates`, and the types `AggregateFn`/`AggregateSpec`/`AggregateState`/`AggregateResults`/`BuiltInAggregate`/`FooterTemplateContext`.

Every aggregate — built-in or custom — is always computed from the full leaf-row set in scope, never combined from already-computed child results, so a non-associative aggregate (a custom "distinct count", for example) is never silently wrong at a nested group level. A collapsed group's subtotal is recomputed the same way, independent of its own collapse state.

Breaking: `ResolvedGroupRow` gains a required `aggregates: AggregateResults` field (empty when no aggregates are active) — a caller constructing one directly, or doing an exhaustive shape check against the old type, needs to account for it. `ColumnDefinition` gains an optional `footerTemplate` for rendering a column's own aggregate result.
