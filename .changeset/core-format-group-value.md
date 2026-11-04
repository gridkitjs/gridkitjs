---
"@gridkitjs/core": minor
"@gridkitjs/react": patch
---

`formatGroupValue(value, column, locale, messages)` is exported from
`@gridkitjs/core`: the text a group's own value reads as, as the grouped
column's cells read it, with a missing value reading
`messages.blankGroupValue`. The React grid's group headers now use it, so a
header and an export name a group the same way; nothing changes on screen.
