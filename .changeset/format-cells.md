---
"@gridkitjs/react": minor
---

Cells and aggregates without a template now render through `formatCellValue`
from `@gridkitjs/core`, and `DataGrid` takes a `locale` prop (`"de-DE"`, or a
list to fall back through).

- A `Date` cell renders as text instead of throwing, and a boolean cell reads
  `true`/`false` instead of rendering nothing.
- Formatting is opt-in: setting `locale`, or a column's `format`, formats
  that column's dates and numbers through `Intl` by its `type` — `currency`
  with `format.currency`, `percent` reading `0.25` as 25%, `date` and
  `time` showing only that part. Without either, numbers, totals and group
  values read exactly as before.
- Footer, group-summary and inline group aggregates then format like their
  column's values (a `count` reads as a plain number); a group header's value
  formats like its column's cells.
- Announcements name a column by its new `header` text when it has one, so a
  column with a markup `headerTemplate` is announced by name.
