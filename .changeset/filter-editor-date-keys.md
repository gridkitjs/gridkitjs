---
"@gridkitjs/core": patch
---

A checklist filter on a date column whose cells hold ISO strings now opens with
its values checked after a restore. `restoreState` revives a saved `in` list to
`Date`s, which still filtered correctly, but `initialFilterEditorDraft` showed
those values unchecked. Checklist values are now keyed the way the `in`
operator matches them, so on a date column a date string and the `Date` it
names count as the same value. `columnValueOptions` also merges strings that
spell the same date differently into one option, and returns the column's
`columnType`, which the draft uses for keying.
