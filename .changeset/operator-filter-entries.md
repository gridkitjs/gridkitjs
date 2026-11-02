---
"@gridkitjs/core": minor
---

A fifth filter entry kind, `OperatorFilterEntry` — `{ columnId, operator, value }`
with `eq`, `ne`, `contains`, `notContains`, `startsWith`, `endsWith`, `gt`,
`gte`, `lt`, `lte`, `between`, `in`, `isEmpty` and `isNotEmpty` — expresses a
range, a value list or a blank check as plain data, so a filter that needed a
predicate can now be saved:

```ts
{ columnId: "amount", operator: "between", value: [10, 100] }
```

Blank cells (`null`, `undefined`, `""`) match only `isEmpty`, `ne` and
`notContains`. `serializeGridState` writes an operator entry's `Date`s as ISO
strings, and `restoreState` turns them back into `Date`s on date, date-time
and time columns. New types: `FilterOperator`, `FilterScalar`,
`OperatorFilterEntry`, `SerializedFilterScalar`,
`SerializedOperatorFilterEntry`.
