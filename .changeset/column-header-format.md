---
"@gridkitjs/core": minor
---

Columns gain a plain-text `header`, and values gain a formatting layer.

- `ColumnDefinition.header` names a column as text. The header shows it when
  there is no `headerTemplate`; `resolveColumnHeaderText(column)` returns it
  (or a text label, or the field path) for announcements and exports.
- `ColumnDefinition.format` takes `Intl.NumberFormatOptions` or
  `Intl.DateTimeFormatOptions`, and `ColumnDefinition.valueFormatter`
  (`(value, row) => string`) overrides it outright.
- `formatCellValue(value, column, locale?, row?)` turns a value into the text
  a cell shows: dates by `type` (`date`, `time`, otherwise date and time),
  numeric types through `Intl.NumberFormat` (`currency` with
  `format.currency`, `percent` reading `0.25` as 25%), booleans as
  `"true"`/`"false"`, `null` as empty text. `formatAggregateValue` does the
  same for aggregate results, reading a `count` as a plain number.
