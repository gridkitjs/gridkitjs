---
"@gridkitjs/core": minor
---

Navigation and resize maths take the writing direction. `nextFocusForKey`
takes an optional `direction` (`"ltr"` or `"rtl"`) after `isSkippableRow`:
in `"rtl"`, `ArrowLeft` moves to the next column and `ArrowRight` to the
previous one. `applyColumnResize` takes an optional `direction` after
`position`: in `"rtl"` the dragged edge is the column's left one, so a
leftward drag grows it. `@gridkitjs/core/renderer` adds the
`WritingDirection` type and `inlineStep(key, direction)`, which says which
way a horizontal arrow moves along a row. Both parameters default to
`"ltr"`, so left-to-right callers are unaffected.
