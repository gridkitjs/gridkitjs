---
"@gridkitjs/core": patch
---

A column with no `type` sorts numbers numerically and `Date`s chronologically,
so descending gives 1000, 999 … 2, 1 rather than 997, 993 … 97. Grouping, a
filter checklist and `min`/`max` aggregates order such a column the same way.
Any other pair, numeric strings included, still compares as text: set
`type: "number"` on a column of numeric strings.
