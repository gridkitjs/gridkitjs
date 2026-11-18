---
"@gridkitjs/react": minor
---

A column's `alignment`, and an `AggregateSpec.alignment` in the footer or a
group's summary row, follow the reading direction: `"left"` and `"right"`
are the reading-start and reading-end sides, so under `dir="rtl"` text
columns align right and number columns left. Cells now carry
`text-align: start` or `end` in their inline style where they carried
`left` or `right`; `"center"` is unchanged. Left-to-right pages are
unaffected: they render exactly as before, though a test reading the
computed `text-align` sees `start` or `end`.
