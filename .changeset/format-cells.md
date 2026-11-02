---
"@gridkitjs/react": minor
---

Cells and aggregates without a template now render through `formatCellValue`
from `@gridkitjs/core`, and `DataGrid` takes a `locale` prop (`"de-DE"`, or a
list to fall back through) that formatting uses.

- A `Date` cell renders as text instead of throwing, and a boolean cell reads
  `true`/`false` instead of rendering nothing.
- Numbers in a `number`, `decimal`, `currency` or `percent` column are
  formatted through `Intl.NumberFormat` — `1234.5` in a `number` column now
  reads `1,234.5`. Set a column's `format` (`{ useGrouping: false }`, say) to
  change that; numbers in other columns are shown as they are.
- Footer, group-summary and inline group aggregates format like their
  column's values (a `count` reads as a plain number); a group header's value
  formats like its column's cells.
- Announcements name a column by its new `header` text when it has one, so a
  column with a markup `headerTemplate` is announced by name.
